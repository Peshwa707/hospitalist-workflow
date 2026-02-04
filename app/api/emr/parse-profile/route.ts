import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  EMR_PROFILE_PARSER_SYSTEM_PROMPT,
  buildEmrProfileParserUserMessage,
} from '@/lib/prompts/emr-profile-parser';
import { getAnthropicClient } from '@/lib/api-client';
import type { ParsedPatientProfile, Vitals, LabResult, Medication } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const client = getAnthropicClient();
    const { emrText } = await request.json();

    if (!emrText || typeof emrText !== 'string') {
      return NextResponse.json(
        { error: 'EMR text is required' },
        { status: 400 }
      );
    }

    if (emrText.trim().length < 100) {
      return NextResponse.json(
        { error: 'EMR text is too short. Please paste at least 100 characters of EMR data.' },
        { status: 400 }
      );
    }

    const userMessage = buildEmrProfileParserUserMessage(emrText);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: EMR_PROFILE_PARSER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text content from response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse the JSON response
    let parsed: ParsedPatientProfile;
    try {
      // Clean up the response - remove any markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const rawParsed = JSON.parse(cleanContent);

      // Normalize the parsed data
      parsed = {
        mrn: rawParsed.mrn ? String(rawParsed.mrn).toUpperCase() : null,
        roomNumber: rawParsed.roomNumber ? String(rawParsed.roomNumber) : null,
        admissionDate: normalizeDate(rawParsed.admissionDate),
        primaryDiagnoses: normalizeDiagnoses(rawParsed.primaryDiagnoses),
        allergies: normalizeAllergies(rawParsed.allergies),
        codeStatus: rawParsed.codeStatus ? String(rawParsed.codeStatus) : null,
        vitals: normalizeVitals(rawParsed.vitals),
        labs: normalizeLabs(rawParsed.labs),
        medications: normalizeMedications(rawParsed.medications),
        parseNotes: rawParsed.parseNotes || '',
        confidence: normalizeConfidence(rawParsed.confidence),
        extractedFrom: normalizeExtractedFrom(rawParsed.extractedFrom),
      };
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse EMR data. The format may not be recognized.' },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('EMR profile parse error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to parse EMR data' },
      { status: 500 }
    );
  }
}

function normalizeDate(date: unknown): string | null {
  if (!date || typeof date !== 'string') return null;

  // Try to parse and format the date
  try {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch {
    return null;
  }
}

function normalizeDiagnoses(diagnoses: unknown): string[] {
  if (!Array.isArray(diagnoses)) return [];
  return diagnoses
    .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
    .map((d) => d.trim());
}

function normalizeAllergies(allergies: unknown): string[] {
  if (!Array.isArray(allergies)) return [];
  return allergies
    .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
    .map((a) => a.trim());
}

function normalizeVitals(raw: Record<string, unknown> | null): Vitals | null {
  if (!raw) return null;

  const vitals: Vitals = {};

  if (typeof raw.temperature === 'number') vitals.temperature = raw.temperature;
  if (typeof raw.heartRate === 'number') vitals.heartRate = raw.heartRate;
  if (typeof raw.bloodPressure === 'string') vitals.bloodPressure = raw.bloodPressure;
  if (typeof raw.respiratoryRate === 'number') vitals.respiratoryRate = raw.respiratoryRate;
  if (typeof raw.oxygenSaturation === 'number') vitals.oxygenSaturation = raw.oxygenSaturation;
  if (typeof raw.oxygenDevice === 'string') vitals.oxygenDevice = raw.oxygenDevice;
  if (typeof raw.recordedAt === 'string') vitals.recordedAt = raw.recordedAt;

  return Object.keys(vitals).length > 0 ? vitals : null;
}

function normalizeLabs(raw: unknown[] | null): LabResult[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item) => ({
      name: String(item.name || ''),
      value: String(item.value || ''),
      unit: item.unit ? String(item.unit) : undefined,
      referenceRange: item.referenceRange ? String(item.referenceRange) : undefined,
      flag: normalizeFlag(item.flag),
    }))
    .filter((lab) => lab.name && lab.value);
}

function normalizeFlag(flag: unknown): 'high' | 'low' | 'critical' | undefined {
  if (typeof flag !== 'string') return undefined;
  const normalized = flag.toLowerCase();
  if (normalized === 'high' || normalized === 'h') return 'high';
  if (normalized === 'low' || normalized === 'l') return 'low';
  if (normalized === 'critical' || normalized === 'c') return 'critical';
  return undefined;
}

function normalizeMedications(raw: unknown[] | null): Medication[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item) => ({
      name: String(item.name || ''),
      dose: String(item.dose || ''),
      route: String(item.route || ''),
      frequency: String(item.frequency || ''),
    }))
    .filter((med) => med.name);
}

function normalizeConfidence(confidence: unknown): 'high' | 'medium' | 'low' {
  if (typeof confidence !== 'string') return 'low';
  const normalized = confidence.toLowerCase();
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  return 'low';
}

function normalizeExtractedFrom(
  extractedFrom: unknown
): 'admission_note' | 'progress_note' | 'hp' | 'discharge' | 'unknown' {
  if (typeof extractedFrom !== 'string') return 'unknown';
  const normalized = extractedFrom.toLowerCase();
  if (normalized === 'admission_note') return 'admission_note';
  if (normalized === 'progress_note') return 'progress_note';
  if (normalized === 'hp') return 'hp';
  if (normalized === 'discharge') return 'discharge';
  return 'unknown';
}

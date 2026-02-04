import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  EMR_PARSER_SYSTEM_PROMPT,
  buildEmrParserUserMessage,
} from '@/lib/prompts/emr-parser';
import { getAnthropicClient } from '@/lib/api-client';
import type { Vitals, LabResult, Medication } from '@/lib/types';

export interface ParsedEmrData {
  vitals: Vitals | null;
  labs: LabResult[];
  medications: Medication[];
  parseNotes?: string;
}

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

    if (emrText.trim().length < 10) {
      return NextResponse.json(
        { error: 'EMR text is too short to parse' },
        { status: 400 }
      );
    }

    const userMessage = buildEmrParserUserMessage(emrText);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: EMR_PARSER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text content from response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse the JSON response
    let parsed: ParsedEmrData;
    try {
      // Clean up the response - remove any markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const rawParsed = JSON.parse(cleanContent);

      // Normalize the parsed data
      parsed = {
        vitals: normalizeVitals(rawParsed.vitals),
        labs: normalizeLabs(rawParsed.labs),
        medications: normalizeMedications(rawParsed.medications),
        parseNotes: rawParsed.parseNotes,
      };
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse EMR data' },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('EMR parse error:', error);

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

  // Return null if no vitals were extracted
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

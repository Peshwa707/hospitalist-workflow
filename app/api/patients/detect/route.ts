import { NextResponse } from 'next/server';
import { getPatientByMrn, getAllPatients, createPatient } from '@/lib/db';
import { getAnthropicClient } from '@/lib/api-client';
import type { Patient, ParsedPatientProfile } from '@/lib/types';

const MODEL = 'claude-haiku-4-5-20251001';

const DETECT_PROMPT = `You are a medical data parser. Extract patient identifiers and clinical data from the provided text.

Return a JSON object with these fields:
{
  "mrn": string or null (Medical Record Number - look for "MRN:", "MR#:", "Medical Record:", etc.),
  "roomNumber": string or null,
  "admissionDate": string or null (ISO format YYYY-MM-DD if found),
  "primaryDiagnoses": string[] (main diagnoses/problems),
  "allergies": string[] (or ["NKDA"] if stated no known allergies),
  "codeStatus": string or null ("Full Code", "DNR", "DNR/DNI", "Comfort Care"),
  "vitals": {
    "temperature": number or null,
    "heartRate": number or null,
    "bloodPressure": string or null,
    "respiratoryRate": number or null,
    "oxygenSaturation": number or null,
    "oxygenDevice": string or null
  } or null,
  "medications": [] (array of {name, dose, route, frequency} objects),
  "labs": [] (array of {name, value, unit, flag} objects),
  "confidence": "high" | "medium" | "low"
}

IMPORTANT:
- Do NOT include patient names, DOB, SSN, addresses, or other PHI
- Only extract MRN as the identifier
- If no MRN found, set mrn to null
- Return ONLY the JSON object, no other text`;

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide clinical text to analyze' },
        { status: 400 }
      );
    }

    const client = getAnthropicClient();

    // Parse the text with AI
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Parse this clinical text and extract patient data:\n\n${text.trim()}\n\nReturn only the JSON object.`
      }],
      system: DETECT_PROMPT,
    });

    const responseText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse the JSON response
    let parsed: ParsedPatientProfile;
    try {
      // Clean up response - remove markdown code blocks if present
      const jsonStr = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse clinical data' },
        { status: 500 }
      );
    }

    // Check if we found an MRN and if patient exists
    let existingPatient: Patient | null = null;
    let action: 'existing' | 'new' | 'update' = 'new';

    if (parsed.mrn) {
      existingPatient = getPatientByMrn(parsed.mrn.toUpperCase());
      if (existingPatient) {
        action = 'existing';
      }
    }

    return NextResponse.json({
      action,
      existingPatient,
      parsedProfile: {
        ...parsed,
        mrn: parsed.mrn?.toUpperCase() || null,
        parseNotes: existingPatient
          ? `Found existing patient with MRN ${existingPatient.mrn}`
          : parsed.mrn
            ? `New patient detected with MRN ${parsed.mrn}`
            : 'No MRN found - will generate one',
        extractedFrom: 'unknown',
      },
      rawText: text,
    });

  } catch (error) {
    console.error('Patient detect error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze clinical text' },
      { status: 500 }
    );
  }
}

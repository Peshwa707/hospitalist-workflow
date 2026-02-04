import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  HP_GENERATOR_SYSTEM_PROMPT,
  buildHpGeneratorUserMessage,
} from '@/lib/prompts/hp-generator';
import { getPatientById, saveNoteWithPatient, saveAnalysisMetrics } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { HpInput, HpOutput } from '@/lib/types';

const MODEL = 'claude-sonnet-4-20250514';
const ANALYSIS_TYPE = 'hp-generation';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const input: HpInput = await request.json();

    // Validate required fields
    if (!input.patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Get patient data
    const patient = getPatientById(input.patientId);
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const userMessage = buildHpGeneratorUserMessage({
      patient,
      chiefComplaint: input.chiefComplaint,
      additionalHistory: input.additionalHistory,
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: HP_GENERATOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text content from response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const output: HpOutput = {
      content,
      generatedAt: new Date().toISOString(),
      patientId: input.patientId,
      patientMrn: patient.mrn,
    };

    // Save to database
    const noteId = saveNoteWithPatient('hp', patient.mrn, input, output, input.patientId);
    output.id = noteId;

    // Save metrics for learning
    const latencyMs = Date.now() - startTime;
    saveAnalysisMetrics({
      noteId,
      analysisType: ANALYSIS_TYPE,
      modelUsed: MODEL,
      promptVersion: getPromptVersion('hp'),
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs,
      finishReason: response.stop_reason ?? undefined,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error('H&P generation error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate H&P: ${errorMessage}` },
      { status: 500 }
    );
  }
}

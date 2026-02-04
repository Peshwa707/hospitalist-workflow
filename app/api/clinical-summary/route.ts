import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  CLINICAL_SUMMARY_SYSTEM_PROMPT,
  buildClinicalSummaryPrompt,
  parseClinicalSummaryResponse,
} from '@/lib/prompts/clinical-summary';
import { saveNoteWithPatient, saveAnalysisMetrics } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { ClinicalDataDumpInput, ClinicalSummaryOutput } from '@/lib/types';

// Use Sonnet for complex parsing + reasoning
const MODEL = 'claude-sonnet-4-20250514';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const input: ClinicalDataDumpInput & { patientId?: number; patientMrn?: string } = await request.json();

    if (!input.rawData || input.rawData.trim().length < 20) {
      return NextResponse.json(
        { error: 'Please provide clinical data (minimum 20 characters)' },
        { status: 400 }
      );
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: CLINICAL_SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildClinicalSummaryPrompt(input) }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const output: ClinicalSummaryOutput = parseClinicalSummaryResponse(content);

    // Save to database
    const patientMrn = input.patientMrn || 'SUMMARY';
    const noteId = saveNoteWithPatient(
      'clinical_summary',
      patientMrn,
      input,
      output,
      input.patientId
    );
    output.id = noteId;

    // Save metrics
    const latencyMs = Date.now() - startTime;
    saveAnalysisMetrics({
      noteId,
      analysisType: 'clinical_summary',
      modelUsed: MODEL,
      promptVersion: getPromptVersion('clinical_summary'),
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs,
      finishReason: response.stop_reason ?? undefined,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error('Clinical summary error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate clinical summary' },
      { status: 500 }
    );
  }
}

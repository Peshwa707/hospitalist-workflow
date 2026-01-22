import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  DISCHARGE_SUMMARY_SYSTEM_PROMPT,
  buildDischargeSummaryUserMessage,
} from '@/lib/prompts/discharge-summary';
import { saveNote, saveAnalysisMetrics } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import type { DischargeSummaryInput, DischargeSummaryOutput } from '@/lib/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-haiku-4-5-20251001';
const ANALYSIS_TYPE = 'discharge-summary';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const input: DischargeSummaryInput = await request.json();

    // Validate required fields
    if (
      !input.patientInitials ||
      !input.admissionDate ||
      !input.dischargeDate ||
      !input.admittingDiagnosis ||
      !input.dischargeDiagnosis ||
      !input.hospitalCourse
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: patientInitials, admissionDate, dischargeDate, admittingDiagnosis, dischargeDiagnosis, hospitalCourse',
        },
        { status: 400 }
      );
    }

    const userMessage = buildDischargeSummaryUserMessage(input);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: DISCHARGE_SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text content from response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const output: DischargeSummaryOutput = {
      content,
      generatedAt: new Date().toISOString(),
      input,
    };

    // Save to database
    const noteId = saveNote('discharge', input.patientInitials, input, output);
    output.id = noteId;

    // Save metrics for learning
    const latencyMs = Date.now() - startTime;
    saveAnalysisMetrics({
      noteId,
      analysisType: ANALYSIS_TYPE,
      modelUsed: MODEL,
      promptVersion: getPromptVersion('discharge-summary'),
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs,
      finishReason: response.stop_reason ?? undefined,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error('Discharge summary generation error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate discharge summary' },
      { status: 500 }
    );
  }
}

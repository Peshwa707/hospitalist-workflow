import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  DISCHARGE_DESTINATION_SYSTEM_PROMPT,
  getDischargeDestinationPrompt,
  parseDischargeDestinationResponse,
} from '@/lib/prompts/discharge-destination';
import { saveNote, saveAnalysisMetrics } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { DischargeDestinationInput, DischargeDestinationOutput } from '@/lib/types';

const MODEL = 'claude-sonnet-4-20250514';
const ANALYSIS_TYPE = 'discharge-destination';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const input: DischargeDestinationInput = await request.json();

    if (!input.clinicalSummary || input.clinicalSummary.trim().length < 50) {
      return NextResponse.json(
        { error: 'Please provide a clinical summary (minimum 50 characters)' },
        { status: 400 }
      );
    }

    const userMessage = getDischargeDestinationPrompt(
      input.clinicalSummary,
      input.functionalStatus,
      input.socialSupport,
      input.insuranceType,
      input.patientPreferences
    );

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: DISCHARGE_DESTINATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    try {
      const output: DischargeDestinationOutput & { id?: number } = parseDischargeDestinationResponse(content);

      // Save to database for feedback tracking
      const noteId = saveNote('analysis', 'DISPO', input, output);
      output.id = noteId;

      // Save metrics for learning
      const latencyMs = Date.now() - startTime;
      saveAnalysisMetrics({
        noteId,
        analysisType: ANALYSIS_TYPE,
        modelUsed: MODEL,
        promptVersion: getPromptVersion('discharge-destination'),
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        latencyMs,
        finishReason: response.stop_reason ?? undefined,
      });

      return NextResponse.json(output);
    } catch (parseError) {
      console.error('Failed to parse discharge destination JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse analysis results. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Discharge destination analysis error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze discharge destination' },
      { status: 500 }
    );
  }
}

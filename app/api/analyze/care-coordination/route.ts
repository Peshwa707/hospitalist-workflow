import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  CARE_COORDINATION_SYSTEM_PROMPT,
  getCareCoordinationPrompt,
  parseCareCoordinationResponse,
} from '@/lib/prompts/care-coordination';
import { saveNote, saveAnalysisMetrics } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import type { CareCoordinationInput, CareCoordinationOutput } from '@/lib/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';
const ANALYSIS_TYPE = 'care-coordination';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const input: CareCoordinationInput = await request.json();

    if (!input.clinicalSummary || input.clinicalSummary.trim().length < 50) {
      return NextResponse.json(
        { error: 'Please provide a clinical summary (minimum 50 characters)' },
        { status: 400 }
      );
    }

    const userMessage = getCareCoordinationPrompt(
      input.clinicalSummary,
      input.currentCareTeam,
      input.patientGoals
    );

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: CARE_COORDINATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    try {
      const output: CareCoordinationOutput & { id?: number } = parseCareCoordinationResponse(content);

      // Save to database for feedback tracking
      const noteId = saveNote('analysis', 'CARE', input, output);
      output.id = noteId;

      // Save metrics for learning
      const latencyMs = Date.now() - startTime;
      saveAnalysisMetrics({
        noteId,
        analysisType: ANALYSIS_TYPE,
        modelUsed: MODEL,
        promptVersion: getPromptVersion('care-coordination'),
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        latencyMs,
        finishReason: response.stop_reason ?? undefined,
      });

      return NextResponse.json(output);
    } catch (parseError) {
      console.error('Failed to parse care coordination JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse analysis results. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Care coordination analysis error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze care coordination needs' },
      { status: 500 }
    );
  }
}

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  BLIND_SPOT_CHALLENGE_SYSTEM_PROMPT,
  buildBlindSpotChallengePrompt,
  parseBlindSpotChallengeResponse,
} from '@/lib/prompts/blind-spot-challenge';
import { saveAnalysisMetrics, saveNoteWithPatient, getPatientById } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { PatientBriefing, BlindSpotChallengeOutput } from '@/lib/types';

// Use Sonnet for deeper reasoning on blind spots
const MODEL = 'claude-sonnet-4-20250514';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const { patientId, briefing, currentAssessment } = await request.json() as {
      patientId: number;
      briefing: PatientBriefing;
      currentAssessment?: string;
    };

    if (!patientId || !briefing) {
      return NextResponse.json(
        { error: 'Patient ID and briefing are required' },
        { status: 400 }
      );
    }

    const patient = getPatientById(patientId);
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: BLIND_SPOT_CHALLENGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildBlindSpotChallengePrompt(briefing, currentAssessment) }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const output: BlindSpotChallengeOutput = parseBlindSpotChallengeResponse(content);

    // Save to database
    const noteId = saveNoteWithPatient(
      'briefing',
      patient.mrn,
      { patientId, type: 'challenge', briefing, currentAssessment },
      output,
      patientId
    );

    // Save metrics
    const latencyMs = Date.now() - startTime;
    saveAnalysisMetrics({
      noteId,
      analysisType: 'blind_spot_challenge',
      modelUsed: MODEL,
      promptVersion: getPromptVersion('blind_spot_challenge'),
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs,
      finishReason: response.stop_reason ?? undefined,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error('Blind spot challenge error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate blind spot challenge' },
      { status: 500 }
    );
  }
}

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  PROGRESS_NOTE_SYSTEM_PROMPT,
  buildProgressNoteUserMessage,
} from '@/lib/prompts/progress-note';
import { saveNote, saveNoteWithPatient, saveAnalysisMetrics } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { ProgressNoteInput, ProgressNoteOutput } from '@/lib/types';

const MODEL = 'claude-haiku-4-5-20251001';
const ANALYSIS_TYPE = 'progress-note';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const input: ProgressNoteInput = await request.json();

    // Validate required fields
    if (!input.patientMrn || !input.diagnosis || !input.subjective) {
      return NextResponse.json(
        { error: 'Missing required fields: patientMrn, diagnosis, subjective' },
        { status: 400 }
      );
    }

    const userMessage = buildProgressNoteUserMessage(input);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: PROGRESS_NOTE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text content from response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const output: ProgressNoteOutput = {
      content,
      generatedAt: new Date().toISOString(),
      input,
    };

    // Save to database (with patient ID if provided)
    const noteId = input.patientId
      ? saveNoteWithPatient('progress', input.patientMrn, input, output, input.patientId)
      : saveNote('progress', input.patientMrn, input, output);
    output.id = noteId;

    // Save metrics for learning
    const latencyMs = Date.now() - startTime;
    saveAnalysisMetrics({
      noteId,
      analysisType: ANALYSIS_TYPE,
      modelUsed: MODEL,
      promptVersion: getPromptVersion('progress-note'),
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs,
      finishReason: response.stop_reason ?? undefined,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error('Progress note generation error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate progress note' },
      { status: 500 }
    );
  }
}

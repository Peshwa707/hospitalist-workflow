import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  SIGNOUT_SYSTEM_PROMPT,
  buildSignoutUserMessage,
  parseSignoutResponse,
} from '@/lib/prompts/signout';
import { getPatientById, getTasksByPatientId, getNotesByPatientId, getNoteById, saveAnalysisMetrics, saveNoteWithPatient } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { PatientSignout } from '@/lib/types';

// Use Haiku for speed
const MODEL = 'claude-3-5-haiku-20241022';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const { patientId, shiftType } = await request.json();

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
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

    // Get pending tasks
    const tasks = getTasksByPatientId(patientId);
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

    // Get recent notes
    const noteSummaries = getNotesByPatientId(patientId);
    const recentNotes: string[] = [];
    for (const summary of noteSummaries.slice(0, 3)) {
      const fullNote = getNoteById(summary.id);
      if (fullNote) {
        const output = JSON.parse(fullNote.output_json);
        recentNotes.push(output.content || JSON.stringify(output).slice(0, 500));
      }
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SIGNOUT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildSignoutUserMessage(patient, recentNotes, pendingTasks) }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const output: PatientSignout = parseSignoutResponse(content, patient);

    // Save to database
    const noteId = saveNoteWithPatient(
      'signout',
      patient.mrn,
      { patientId, shiftType },
      output,
      patientId
    );

    // Save metrics
    const latencyMs = Date.now() - startTime;
    saveAnalysisMetrics({
      noteId,
      analysisType: 'signout',
      modelUsed: MODEL,
      promptVersion: getPromptVersion('signout'),
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs,
      finishReason: response.stop_reason ?? undefined,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error('Signout error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate signout' },
      { status: 500 }
    );
  }
}

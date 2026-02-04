import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  PRE_ROUND_BRIEFING_SYSTEM_PROMPT,
  buildBriefingUserMessage,
  parseBriefingResponse,
} from '@/lib/prompts/pre-round-briefing';
import { getPatientById, getTasksByPatientId, getNotesByPatientId, getNoteById, saveAnalysisMetrics, saveNoteWithPatient } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { PatientBriefing } from '@/lib/types';

// Use Haiku for speed during morning rounds
const MODEL = 'claude-3-5-haiku-20241022';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const { patientId } = await request.json();

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

    // Calculate hospital day
    const admissionDate = patient.admissionDate ? new Date(patient.admissionDate) : new Date();
    const today = new Date();
    const hospitalDay = Math.ceil((today.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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
      system: PRE_ROUND_BRIEFING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildBriefingUserMessage(patient, hospitalDay, recentNotes, pendingTasks) }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const output: PatientBriefing = parseBriefingResponse(content, patient, hospitalDay);

    // Save to database
    const noteId = saveNoteWithPatient(
      'briefing',
      patient.mrn,
      { patientId, hospitalDay },
      output,
      patientId
    );

    // Save metrics
    const latencyMs = Date.now() - startTime;
    saveAnalysisMetrics({
      noteId,
      analysisType: 'briefing',
      modelUsed: MODEL,
      promptVersion: getPromptVersion('briefing'),
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs,
      finishReason: response.stop_reason ?? undefined,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error('Briefing error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate briefing' },
      { status: 500 }
    );
  }
}

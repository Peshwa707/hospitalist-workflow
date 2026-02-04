import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  PRE_ROUND_BRIEFING_SYSTEM_PROMPT,
  buildBriefingUserMessage,
  parseBriefingResponse,
} from '@/lib/prompts/pre-round-briefing';
import { getAllPatients, getPatientById, getTasksByPatientId, getNotesByPatientId, getNoteById, saveAnalysisMetrics, saveNoteWithPatient } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { PatientBriefing } from '@/lib/types';

// Use Haiku for speed during morning rounds
const MODEL = 'claude-3-5-haiku-20241022';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const { patientIds } = await request.json();

    // Get patients to brief
    let patients = getAllPatients();
    if (patientIds && Array.isArray(patientIds) && patientIds.length > 0) {
      patients = patientIds
        .map((id: number) => getPatientById(id))
        .filter((p): p is NonNullable<typeof p> => p !== null);
    }

    if (patients.length === 0) {
      return NextResponse.json(
        { error: 'No patients found' },
        { status: 404 }
      );
    }

    // Generate briefings in parallel (with concurrency limit)
    const briefings: PatientBriefing[] = [];
    const errors: { patientId: number; error: string }[] = [];

    // Process in batches of 5 to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < patients.length; i += batchSize) {
      const batch = patients.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (patient) => {
          // Calculate hospital day
          const admissionDate = patient.admissionDate ? new Date(patient.admissionDate) : new Date();
          const today = new Date();
          const hospitalDay = Math.ceil((today.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          // Get pending tasks
          const tasks = getTasksByPatientId(patient.id!);
          const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

          // Get recent notes
          const noteSummaries = getNotesByPatientId(patient.id!);
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

          const briefing = parseBriefingResponse(content, patient, hospitalDay);

          // Save to database
          const noteId = saveNoteWithPatient(
            'briefing',
            patient.mrn,
            { patientId: patient.id, hospitalDay },
            briefing,
            patient.id
          );

          // Save metrics
          saveAnalysisMetrics({
            noteId,
            analysisType: 'briefing',
            modelUsed: MODEL,
            promptVersion: getPromptVersion('briefing'),
            inputTokens: response.usage?.input_tokens,
            outputTokens: response.usage?.output_tokens,
            latencyMs: Date.now() - startTime,
            finishReason: response.stop_reason ?? undefined,
          });

          return briefing;
        })
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          briefings.push(result.value);
        } else {
          errors.push({
            patientId: batch[j].id!,
            error: result.reason?.message || 'Unknown error',
          });
        }
      }
    }

    const totalLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      briefings,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        totalPatients: patients.length,
        successCount: briefings.length,
        errorCount: errors.length,
        totalLatencyMs,
      },
    });
  } catch (error) {
    console.error('Batch briefing error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate batch briefings' },
      { status: 500 }
    );
  }
}

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  SIGNOUT_SYSTEM_PROMPT,
  buildSignoutUserMessage,
  parseSignoutResponse,
} from '@/lib/prompts/signout';
import { getAllPatients, getPatientById, getTasksByPatientId, getNotesByPatientId, getNoteById, saveAnalysisMetrics, saveNoteWithPatient } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { PatientSignout } from '@/lib/types';

// Use Haiku for speed
const MODEL = 'claude-3-5-haiku-20241022';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const { patientIds, shiftType } = await request.json();

    // Get patients for signout
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

    // Generate signouts in parallel (with concurrency limit)
    const signouts: PatientSignout[] = [];
    const errors: { patientId: number; error: string }[] = [];

    // Process in batches of 5 to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < patients.length; i += batchSize) {
      const batch = patients.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (patient) => {
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
            system: SIGNOUT_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: buildSignoutUserMessage(patient, recentNotes, pendingTasks) }],
          });

          const content = response.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('\n');

          const signout = parseSignoutResponse(content, patient);

          // Save to database
          const noteId = saveNoteWithPatient(
            'signout',
            patient.mrn,
            { patientId: patient.id, shiftType },
            signout,
            patient.id
          );

          // Save metrics
          saveAnalysisMetrics({
            noteId,
            analysisType: 'signout',
            modelUsed: MODEL,
            promptVersion: getPromptVersion('signout'),
            inputTokens: response.usage?.input_tokens,
            outputTokens: response.usage?.output_tokens,
            latencyMs: Date.now() - startTime,
            finishReason: response.stop_reason ?? undefined,
          });

          return signout;
        })
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          signouts.push(result.value);
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
      signouts,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        totalPatients: patients.length,
        successCount: signouts.length,
        errorCount: errors.length,
        totalLatencyMs,
        shiftType: shiftType || 'day',
      },
    });
  } catch (error) {
    console.error('Batch signout error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate batch signouts' },
      { status: 500 }
    );
  }
}

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  CONSULT_PRE_BRIEF_SYSTEM_PROMPT,
  buildConsultPreBriefPrompt,
  parseConsultPreBriefResponse,
} from '@/lib/prompts/consult-pre-brief';
import { getPatientById, getNotesByPatientId, getNoteById, saveAnalysisMetrics, saveNoteWithPatient } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { ConsultPreBrief } from '@/lib/types';

// Use Haiku for speed on phone calls
const MODEL = 'claude-3-5-haiku-20241022';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const { patientId, specialty, consultQuestion, urgency } = await request.json();

    if (!patientId || !specialty || !consultQuestion || !urgency) {
      return NextResponse.json(
        { error: 'Patient ID, specialty, consult question, and urgency are required' },
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
      system: CONSULT_PRE_BRIEF_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: buildConsultPreBriefPrompt(patient, specialty, consultQuestion, urgency, recentNotes)
      }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const output: ConsultPreBrief = parseConsultPreBriefResponse(content, patient, specialty);

    // Save to database
    const noteId = saveNoteWithPatient(
      'signout',
      patient.mrn,
      { patientId, type: 'consult_brief', specialty, consultQuestion, urgency },
      output,
      patientId
    );

    // Save metrics
    const latencyMs = Date.now() - startTime;
    saveAnalysisMetrics({
      noteId,
      analysisType: 'consult_pre_brief',
      modelUsed: MODEL,
      promptVersion: getPromptVersion('consult_pre_brief'),
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs,
      finishReason: response.stop_reason ?? undefined,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error('Consult pre-brief error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate consult pre-brief' },
      { status: 500 }
    );
  }
}

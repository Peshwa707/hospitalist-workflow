import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { saveNoteWithPatient, saveAnalysisMetrics, getPatientById } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';

const MODEL = 'claude-sonnet-4-20250514';
const ANALYSIS_TYPE = 'progress-note';

const SYSTEM_PROMPT = `You are a medical documentation assistant helping a hospitalist physician draft progress notes.

The user will provide unstructured clinical data - this could be a mix of:
- Dictated notes
- Copy-pasted EMR data
- Vitals, labs, physical exam findings
- Patient complaints and updates
- Any other clinical information

Your job is to:
1. Analyze and extract all relevant clinical information
2. Organize it into a proper SOAP-format progress note
3. Maintain professional medical documentation standards

IMPORTANT GUIDELINES:
- Your output will be reviewed and verified by a physician before use
- Do NOT invent or fabricate any clinical information not explicitly provided
- If information is missing for a section, use "[pending]" or "[to be updated]"
- Be concise but thorough
- Use appropriate medical terminology and abbreviations

OUTPUT FORMAT:
Generate a complete SOAP-format progress note with these sections:

SUBJECTIVE:
Patient's symptoms, complaints, overnight events

OBJECTIVE:
Vitals: [extract from input]
Physical Exam: [extract from input]
Labs/Studies: [extract from input]

ASSESSMENT:
[Hospital day X] [Primary diagnosis/problem]
Clinical trajectory: [improving/stable/worsening based on data]
- Problem 1: [assessment]
- Problem 2: [assessment]

PLAN:
1. [Problem 1]: [specific plan]
2. [Problem 2]: [specific plan]
- Disposition: [discharge planning if applicable]

Always maintain professional medical documentation standards.`;

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { patientId, rawInput, directContent } = body;

    // If directContent is provided, skip AI generation and save directly
    // This is used by voice-to-note where content is already generated
    if (directContent && typeof directContent === 'string' && directContent.trim()) {
      let patientMrn = 'UNKNOWN';
      if (patientId) {
        const patient = getPatientById(patientId);
        if (patient) {
          patientMrn = patient.mrn;
        }
      }

      const output = {
        content: directContent,
        generatedAt: new Date().toISOString(),
        input: { rawInput: rawInput || 'Voice dictation', patientId },
      };

      const noteId = saveNoteWithPatient(
        'progress',
        patientMrn,
        { rawInput: rawInput || 'Voice dictation' },
        output,
        patientId || undefined
      );

      return NextResponse.json({
        id: noteId,
        content: directContent,
        generatedAt: output.generatedAt,
      });
    }

    // Standard flow: generate note via AI
    const client = getAnthropicClient();

    if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: rawInput' },
        { status: 400 }
      );
    }

    // Get patient context if provided
    let patientContext = '';
    let patientMrn = 'UNKNOWN';
    if (patientId) {
      const patient = getPatientById(patientId);
      if (patient) {
        patientMrn = patient.mrn;
        const hospitalDay = patient.admissionDate
          ? Math.ceil(
              (new Date().getTime() - new Date(patient.admissionDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 1;

        patientContext = `
PATIENT CONTEXT:
- MRN: ${patient.mrn}
- Room: ${patient.roomNumber || 'N/A'}
- Hospital Day: ${hospitalDay}
- Diagnoses: ${patient.primaryDiagnoses.join(', ') || 'N/A'}
- Code Status: ${patient.codeStatus || 'N/A'}
- Allergies: ${patient.allergies.join(', ') || 'NKDA'}

`;
      }
    }

    const userMessage = `${patientContext}CLINICAL INPUT (analyze and organize into SOAP note):

${rawInput.trim()}

Please generate a complete SOAP progress note from the above information.`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text content from response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const output = {
      content,
      generatedAt: new Date().toISOString(),
      input: { rawInput, patientId },
    };

    // Save to database
    const noteId = saveNoteWithPatient(
      'progress',
      patientMrn,
      { rawInput },
      output,
      patientId || undefined
    );

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

    return NextResponse.json({
      id: noteId,
      content,
      generatedAt: output.generatedAt,
    });
  } catch (error) {
    console.error('Simple progress note generation error:', error);

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

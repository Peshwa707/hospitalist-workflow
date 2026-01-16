import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  DISCHARGE_SUMMARY_SYSTEM_PROMPT,
  buildDischargeSummaryUserMessage,
} from '@/lib/prompts/discharge-summary';
import { saveNote } from '@/lib/db';
import type { DischargeSummaryInput, DischargeSummaryOutput } from '@/lib/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const input: DischargeSummaryInput = await request.json();

    // Validate required fields
    if (
      !input.patientInitials ||
      !input.admissionDate ||
      !input.dischargeDate ||
      !input.admittingDiagnosis ||
      !input.dischargeDiagnosis ||
      !input.hospitalCourse
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: patientInitials, admissionDate, dischargeDate, admittingDiagnosis, dischargeDiagnosis, hospitalCourse',
        },
        { status: 400 }
      );
    }

    const userMessage = buildDischargeSummaryUserMessage(input);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: DISCHARGE_SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text content from response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const output: DischargeSummaryOutput = {
      content,
      generatedAt: new Date().toISOString(),
      input,
    };

    // Save to database
    const noteId = saveNote('discharge', input.patientInitials, input, output);
    output.id = noteId;

    return NextResponse.json(output);
  } catch (error) {
    console.error('Discharge summary generation error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate discharge summary' },
      { status: 500 }
    );
  }
}

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  PROGRESS_NOTE_SYSTEM_PROMPT,
  buildProgressNoteUserMessage,
} from '@/lib/prompts/progress-note';
import { saveNote, saveNoteWithPatient } from '@/lib/db';
import type { ProgressNoteInput, ProgressNoteOutput } from '@/lib/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const input: ProgressNoteInput = await request.json();

    // Validate required fields
    if (!input.patientInitials || !input.diagnosis || !input.subjective) {
      return NextResponse.json(
        { error: 'Missing required fields: patientInitials, diagnosis, subjective' },
        { status: 400 }
      );
    }

    const userMessage = buildProgressNoteUserMessage(input);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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
      ? saveNoteWithPatient('progress', input.patientInitials, input, output, input.patientId)
      : saveNote('progress', input.patientInitials, input, output);
    output.id = noteId;

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

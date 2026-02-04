import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { getNoteById, updateNoteContent, getPatientById } from '@/lib/db';
import {
  HP_GENERATOR_SYSTEM_PROMPT,
  buildHpGeneratorUserMessage,
} from '@/lib/prompts/hp-generator';
import {
  PROGRESS_NOTE_SYSTEM_PROMPT,
  buildProgressNoteUserMessage,
} from '@/lib/prompts/progress-note';
import { getAnthropicClient } from '@/lib/api-client';

// POST /api/notes/[id]/regenerate - Regenerate note with new data
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getAnthropicClient();
    const { id } = await params;
    const noteId = parseInt(id, 10);

    if (isNaN(noteId)) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
    }

    const note = getNoteById(noteId);
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const body = await request.json();
    const { newData, mode } = body; // mode: 'append' | 'replace'

    if (!newData || typeof newData !== 'string') {
      return NextResponse.json({ error: 'New data is required' }, { status: 400 });
    }

    const existingOutput = JSON.parse(note.output_json);
    const existingInput = JSON.parse(note.input_json);
    let newContent: string;

    if (note.type === 'hp') {
      // Regenerate H&P with new data
      const patient = note.patient_id ? getPatientById(note.patient_id) : null;

      const regeneratePrompt = `You are updating an existing H&P document with new clinical information.

EXISTING H&P:
${existingOutput.content}

NEW CLINICAL DATA TO INCORPORATE:
${newData}

MODE: ${mode === 'append' ? 'Add this new information to the existing H&P, preserving previous content and adding the new data in appropriate sections.' : 'Regenerate the H&P incorporating this new information, which may supersede previous data.'}

Generate the updated H&P document.`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: HP_GENERATOR_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: regeneratePrompt }],
      });

      newContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

    } else if (note.type === 'progress') {
      // Regenerate progress note with new data
      const regeneratePrompt = `You are updating an existing progress note with new clinical information.

EXISTING PROGRESS NOTE:
${existingOutput.content}

NEW CLINICAL DATA TO INCORPORATE:
${newData}

MODE: ${mode === 'append' ? 'Add this new information to the existing progress note, updating relevant sections.' : 'Regenerate the progress note incorporating this new information.'}

Generate the updated SOAP progress note.`;

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: PROGRESS_NOTE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: regeneratePrompt }],
      });

      newContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

    } else {
      return NextResponse.json(
        { error: 'Cannot regenerate this note type' },
        { status: 400 }
      );
    }

    // Update the note in database
    updateNoteContent(noteId, newContent);

    return NextResponse.json({
      id: noteId,
      content: newContent,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error regenerating note:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to regenerate note' },
      { status: 500 }
    );
  }
}

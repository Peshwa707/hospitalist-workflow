import { NextResponse } from 'next/server';
import { getNoteById, saveEmbedding, getEmbedding } from '@/lib/db';
import {
  generateEmbedding,
  extractNoteText,
  serializeVector,
  generateContentHash,
} from '@/lib/embeddings';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { noteId, force = false } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: 'noteId is required' },
        { status: 400 }
      );
    }

    // Get the note
    const note = getNoteById(noteId);
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Check if embedding already exists
    const existingEmbedding = getEmbedding(noteId);
    const noteText = extractNoteText(note);
    const contentHash = generateContentHash(noteText);

    // Skip if embedding exists and content hasn't changed (unless force=true)
    if (existingEmbedding && existingEmbedding.content_hash === contentHash && !force) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Embedding already exists and content unchanged',
        noteId,
        model: existingEmbedding.embedding_model,
        dimensions: existingEmbedding.embedding_dimensions,
      });
    }

    // Generate new embedding
    const { vector, model, dimensions } = await generateEmbedding(noteText);
    const vectorBuffer = serializeVector(vector);

    // Save to database
    const embeddingId = saveEmbedding(
      noteId,
      model,
      vectorBuffer,
      dimensions,
      contentHash
    );

    return NextResponse.json({
      success: true,
      skipped: false,
      noteId,
      embeddingId,
      model,
      dimensions,
      textLength: noteText.length,
    });
  } catch (error) {
    console.error('Embedding generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate embedding', details: String(error) },
      { status: 500 }
    );
  }
}

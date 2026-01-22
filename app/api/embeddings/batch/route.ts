import { NextResponse } from 'next/server';
import {
  getNotesWithoutEmbeddings,
  getNotesNeedingReembedding,
  saveEmbedding,
  getEmbedding,
} from '@/lib/db';
import {
  generateEmbedding,
  extractNoteText,
  serializeVector,
  generateContentHash,
  getEmbeddingConfig,
} from '@/lib/embeddings';
import type { DBNote } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reembedAll = false, limit = 100 } = body;

    const config = getEmbeddingConfig();

    // Get notes that need embedding
    let notesToProcess: DBNote[];

    if (reembedAll) {
      // Get notes that have embeddings with different model
      const needsReembedding = getNotesNeedingReembedding(config.model);
      const noEmbedding = getNotesWithoutEmbeddings();
      notesToProcess = [...noEmbedding, ...needsReembedding].slice(0, limit);
    } else {
      notesToProcess = getNotesWithoutEmbeddings().slice(0, limit);
    }

    if (notesToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped: 0,
        errors: 0,
        message: 'All notes already have embeddings',
      });
    }

    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [] as { noteId: number; error: string }[],
    };

    for (const note of notesToProcess) {
      try {
        const noteText = extractNoteText(note);
        const contentHash = generateContentHash(noteText);

        // Check if we can skip (content unchanged)
        const existing = getEmbedding(note.id);
        if (existing && existing.content_hash === contentHash && existing.embedding_model === config.model) {
          results.skipped++;
          continue;
        }

        // Generate embedding
        const { vector, model, dimensions } = await generateEmbedding(noteText);
        const vectorBuffer = serializeVector(vector);

        saveEmbedding(
          note.id,
          model,
          vectorBuffer,
          dimensions,
          contentHash
        );

        results.processed++;
      } catch (err) {
        results.errors++;
        results.errorDetails.push({
          noteId: note.id,
          error: String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      model: config.model,
      provider: config.provider,
      totalNotesToProcess: notesToProcess.length,
    });
  } catch (error) {
    console.error('Batch embedding error:', error);
    return NextResponse.json(
      { error: 'Failed to process batch embeddings', details: String(error) },
      { status: 500 }
    );
  }
}

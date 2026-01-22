import { NextResponse } from 'next/server';
import { getAllNotesWithEmbeddings, getNoteById, getEmbedding } from '@/lib/db';
import {
  generateEmbedding,
  extractNoteText,
  cosineSimilarity,
  deserializeVector,
} from '@/lib/embeddings';
import type { SimilarNote, DBNote } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, noteId, topK = 5, minSimilarity = 0.3 } = body;

    if (!query && !noteId) {
      return NextResponse.json(
        { error: 'Either query text or noteId is required' },
        { status: 400 }
      );
    }

    // Get query vector
    let queryVector: number[];
    let queryModel: string;

    if (noteId) {
      // Use existing note's embedding
      const note = getNoteById(noteId);
      if (!note) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }

      const embedding = getEmbedding(noteId);
      if (!embedding) {
        // Generate embedding on the fly
        const noteText = extractNoteText(note);
        const result = await generateEmbedding(noteText);
        queryVector = result.vector;
        queryModel = result.model;
      } else {
        queryVector = deserializeVector(embedding.embedding_vector);
        queryModel = embedding.embedding_model;
      }
    } else {
      // Generate embedding for query text
      const result = await generateEmbedding(query);
      queryVector = result.vector;
      queryModel = result.model;
    }

    // Get all notes with embeddings
    const notesWithEmbeddings = getAllNotesWithEmbeddings();

    // Calculate similarities
    const similarities: { note: DBNote; similarity: number }[] = [];

    for (const { note, embedding } of notesWithEmbeddings) {
      // Skip the query note itself
      if (noteId && note.id === noteId) {
        continue;
      }

      // Only compare same-model embeddings for accuracy
      if (embedding.embedding_model !== queryModel) {
        continue;
      }

      const noteVector = deserializeVector(embedding.embedding_vector);
      const similarity = cosineSimilarity(queryVector, noteVector);

      if (similarity >= minSimilarity) {
        similarities.push({ note, similarity });
      }
    }

    // Sort by similarity (descending) and take top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topResults = similarities.slice(0, topK);

    // Format results
    const results: SimilarNote[] = topResults.map(({ note, similarity }) => ({
      note,
      similarity: Math.round(similarity * 1000) / 1000, // Round to 3 decimal places
    }));

    return NextResponse.json({
      success: true,
      query: query || `Note #${noteId}`,
      model: queryModel,
      totalCompared: notesWithEmbeddings.length - (noteId ? 1 : 0),
      results,
    });
  } catch (error) {
    console.error('Embedding search error:', error);
    return NextResponse.json(
      { error: 'Failed to search embeddings', details: String(error) },
      { status: 500 }
    );
  }
}

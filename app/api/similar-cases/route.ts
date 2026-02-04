import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  SIMILAR_CASE_SUMMARY_SYSTEM_PROMPT,
  buildCaseSummaryPrompt,
  parseCaseSummaryResponse,
  CROSS_CASE_SYNTHESIS_SYSTEM_PROMPT,
  buildCrossCaseSynthesisPrompt,
  parseCrossCaseSynthesisResponse,
} from '@/lib/prompts/similar-case-summary';
import {
  generateEmbedding,
  cosineSimilarity,
  deserializeVector,
  extractNoteText,
} from '@/lib/embeddings';
import { getNoteById, getAllNotesWithEmbeddings, saveAnalysisMetrics } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { SimilarCaseSummary, SimilarCasesOutput, DBNote } from '@/lib/types';

// Haiku for individual case summaries, Sonnet for synthesis
const SUMMARY_MODEL = 'claude-3-5-haiku-20241022';
const SYNTHESIS_MODEL = 'claude-sonnet-4-20250514';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const { noteId, query, topK = 5, minSimilarity = 0.5 } = await request.json();

    // Get the query embedding
    let queryVector: number[];

    if (noteId) {
      // Find similar cases to an existing note
      const note = getNoteById(noteId);
      if (!note) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
      const noteText = extractNoteText(note);
      const embedding = await generateEmbedding(noteText);
      queryVector = embedding.vector;
    } else if (query) {
      // Find similar cases to a text query
      const embedding = await generateEmbedding(query);
      queryVector = embedding.vector;
    } else {
      return NextResponse.json(
        { error: 'Either noteId or query is required' },
        { status: 400 }
      );
    }

    // Get all notes with embeddings
    const notesWithEmbeddings = getAllNotesWithEmbeddings();

    if (notesWithEmbeddings.length === 0) {
      return NextResponse.json({
        cases: [],
        generatedAt: new Date().toISOString(),
      });
    }

    // Calculate similarities
    const similarities: { note: DBNote; similarity: number }[] = [];

    for (const { note, embedding } of notesWithEmbeddings) {
      // Skip the query note itself if searching by noteId
      if (noteId && note.id === noteId) continue;

      const storedVector = deserializeVector(embedding.embedding_vector);

      // Only compare if dimensions match
      if (storedVector.length === queryVector.length) {
        const similarity = cosineSimilarity(queryVector, storedVector);
        if (similarity >= minSimilarity) {
          similarities.push({ note, similarity });
        }
      }
    }

    // Sort by similarity and take top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topMatches = similarities.slice(0, topK);

    if (topMatches.length === 0) {
      return NextResponse.json({
        cases: [],
        generatedAt: new Date().toISOString(),
      });
    }

    // Generate summaries for each similar case
    const caseSummaries: SimilarCaseSummary[] = [];

    for (const match of topMatches) {
      try {
        const noteText = extractNoteText(match.note);

        const response = await client.messages.create({
          model: SUMMARY_MODEL,
          max_tokens: 1024,
          system: SIMILAR_CASE_SUMMARY_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildCaseSummaryPrompt(noteText, match.note.type) }],
        });

        const content = response.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('\n');

        const summary = parseCaseSummaryResponse(content, match.note, match.similarity);
        caseSummaries.push(summary);
      } catch (error) {
        console.error(`Error summarizing note ${match.note.id}:`, error);
        // Continue with other notes even if one fails
      }
    }

    // Generate cross-case synthesis if we have multiple cases
    let output: SimilarCasesOutput;

    if (caseSummaries.length >= 2) {
      try {
        const synthesisResponse = await client.messages.create({
          model: SYNTHESIS_MODEL,
          max_tokens: 1500,
          system: CROSS_CASE_SYNTHESIS_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildCrossCaseSynthesisPrompt(caseSummaries) }],
        });

        const synthesisContent = synthesisResponse.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('\n');

        output = parseCrossCaseSynthesisResponse(synthesisContent, caseSummaries);
      } catch (error) {
        console.error('Synthesis error:', error);
        output = {
          cases: caseSummaries,
          generatedAt: new Date().toISOString(),
        };
      }
    } else {
      output = {
        cases: caseSummaries,
        generatedAt: new Date().toISOString(),
      };
    }

    // Log metrics (use a pseudo note ID since this isn't saved as a note)
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      ...output,
      metadata: {
        queryType: noteId ? 'note' : 'text',
        totalCandidates: notesWithEmbeddings.length,
        matchesFound: similarities.length,
        casesReturned: caseSummaries.length,
        latencyMs,
      },
    });
  } catch (error) {
    console.error('Similar cases error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to find similar cases' },
      { status: 500 }
    );
  }
}

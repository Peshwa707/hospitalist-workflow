// Embeddings service for semantic search and case similarity
// Supports both local (Xenova/transformers) and API-based (OpenAI) embeddings

import OpenAI from 'openai';
import crypto from 'crypto';
import type { DBNote } from './types';

// Provider configuration - default to local for offline capability
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'local';

// Local embedding model dimensions (all-MiniLM-L6-v2)
const LOCAL_EMBEDDING_DIMENSIONS = 384;
// OpenAI embedding model dimensions (text-embedding-3-small)
const OPENAI_EMBEDDING_DIMENSIONS = 1536;

// Lazy-loaded local embedder
let localEmbedder: any = null;

/**
 * Generate embedding for text using configured provider
 */
export async function generateEmbedding(text: string): Promise<{
  vector: number[];
  model: string;
  dimensions: number;
}> {
  // Truncate very long texts to avoid token limits
  const truncatedText = text.slice(0, 8000);

  if (EMBEDDING_PROVIDER === 'openai') {
    return generateOpenAIEmbedding(truncatedText);
  }
  return generateLocalEmbedding(truncatedText);
}

/**
 * Generate embedding using OpenAI API
 */
async function generateOpenAIEmbedding(text: string): Promise<{
  vector: number[];
  model: string;
  dimensions: number;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai');
  }

  const openai = new OpenAI({ apiKey });
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return {
    vector: response.data[0].embedding,
    model: 'text-embedding-3-small',
    dimensions: OPENAI_EMBEDDING_DIMENSIONS,
  };
}

/**
 * Generate embedding using local Xenova/transformers model
 * Uses all-MiniLM-L6-v2 which produces 384-dimensional embeddings
 */
async function generateLocalEmbedding(text: string): Promise<{
  vector: number[];
  model: string;
  dimensions: number;
}> {
  if (!localEmbedder) {
    // Dynamic import to avoid loading transformers at startup
    const { pipeline } = await import('@xenova/transformers');
    localEmbedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  const output = await localEmbedder(text, { pooling: 'mean', normalize: true });
  return {
    vector: Array.from(output.data as Float32Array),
    model: 'all-MiniLM-L6-v2',
    dimensions: LOCAL_EMBEDDING_DIMENSIONS,
  };
}

/**
 * Extract searchable text content from a note
 */
export function extractNoteText(note: DBNote): string {
  const output = JSON.parse(note.output_json);

  switch (note.type) {
    case 'progress':
    case 'discharge':
    case 'hp':
      return output.content || '';

    case 'analysis':
      // Combine differential diagnoses and workup for semantic search
      const parts: string[] = [];

      if (output.differentialDiagnosis && Array.isArray(output.differentialDiagnosis)) {
        parts.push(
          output.differentialDiagnosis
            .map((d: { diagnosis: string; reasoning: string }) =>
              `${d.diagnosis}: ${d.reasoning}`
            )
            .join('\n')
        );
      }

      if (output.recommendedWorkup && Array.isArray(output.recommendedWorkup)) {
        parts.push(
          output.recommendedWorkup
            .map((w: { test: string; rationale: string }) =>
              `${w.test}: ${w.rationale}`
            )
            .join('\n')
        );
      }

      if (output.suggestedConsults && Array.isArray(output.suggestedConsults)) {
        parts.push(
          output.suggestedConsults
            .map((c: { specialty: string; reason: string }) =>
              `Consult ${c.specialty}: ${c.reason}`
            )
            .join('\n')
        );
      }

      return parts.join('\n\n') || JSON.stringify(output);

    default:
      return JSON.stringify(output);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Serialize a vector to a Buffer for SQLite BLOB storage
 */
export function serializeVector(vector: number[]): Buffer {
  const buffer = Buffer.alloc(vector.length * 4); // 4 bytes per float32
  for (let i = 0; i < vector.length; i++) {
    buffer.writeFloatLE(vector[i], i * 4);
  }
  return buffer;
}

/**
 * Deserialize a Buffer back to a vector
 */
export function deserializeVector(buffer: Buffer): number[] {
  const vector: number[] = [];
  for (let i = 0; i < buffer.length; i += 4) {
    vector.push(buffer.readFloatLE(i));
  }
  return vector;
}

/**
 * Generate a content hash for change detection
 */
export function generateContentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/**
 * Get the current embedding provider configuration
 */
export function getEmbeddingConfig(): {
  provider: string;
  model: string;
  dimensions: number;
} {
  if (EMBEDDING_PROVIDER === 'openai') {
    return {
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: OPENAI_EMBEDDING_DIMENSIONS,
    };
  }
  return {
    provider: 'local',
    model: 'all-MiniLM-L6-v2',
    dimensions: LOCAL_EMBEDDING_DIMENSIONS,
  };
}

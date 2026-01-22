import { NextResponse } from 'next/server';
import { getEmbeddingStats } from '@/lib/db';
import { getEmbeddingConfig } from '@/lib/embeddings';

export async function GET() {
  try {
    const stats = getEmbeddingStats();
    const config = getEmbeddingConfig();

    return NextResponse.json({
      success: true,
      stats,
      currentConfig: config,
    });
  } catch (error) {
    console.error('Embedding stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get embedding stats', details: String(error) },
      { status: 500 }
    );
  }
}

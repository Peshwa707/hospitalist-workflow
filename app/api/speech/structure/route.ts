import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  SPEECH_STRUCTURING_SYSTEM_PROMPT,
  buildSpeechStructuringUserMessage,
} from '@/lib/prompts/speech-structuring';
import { getAnthropicClient } from '@/lib/api-client';
import type { SpeechStructuredData } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const client = getAnthropicClient();
    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    if (transcript.trim().length < 10) {
      return NextResponse.json(
        { error: 'Transcript is too short to process' },
        { status: 400 }
      );
    }

    const userMessage = buildSpeechStructuringUserMessage(transcript);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SPEECH_STRUCTURING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text content from response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse the JSON response
    let structured: SpeechStructuredData;
    try {
      // Clean up the response - remove any markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      structured = JSON.parse(cleanContent);
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse structured response' },
        { status: 500 }
      );
    }

    // Validate the response structure
    const validFields = [
      'subjective',
      'vitals',
      'labs',
      'physicalExam',
      'assessmentNotes',
      'planNotes',
    ];

    const result: SpeechStructuredData = {};
    for (const field of validFields) {
      const value = structured[field as keyof SpeechStructuredData];
      if (typeof value === 'string' && value.trim()) {
        result[field as keyof SpeechStructuredData] = value.trim();
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Speech structuring error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process dictation' },
      { status: 500 }
    );
  }
}

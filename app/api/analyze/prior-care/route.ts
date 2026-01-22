import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  PRIOR_CARE_SUMMARY_SYSTEM_PROMPT,
  buildPriorCareSummaryUserMessage,
} from '@/lib/prompts/prior-care-summary';
import { saveNote } from '@/lib/db';
import type { PriorCareSummaryInput, PriorCareSummaryOutput } from '@/lib/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const input: PriorCareSummaryInput = await request.json();

    if (!input.documents || input.documents.trim().length < 100) {
      return NextResponse.json(
        { error: 'Please provide clinical documents (at least 100 characters)' },
        { status: 400 }
      );
    }

    const userMessage = buildPriorCareSummaryUserMessage(
      input.documents,
      input.patientContext
    );

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: PRIOR_CARE_SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text content from response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse the JSON response
    let summary: PriorCareSummaryOutput;
    try {
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      summary = JSON.parse(cleanContent);
      summary.generatedAt = new Date().toISOString();
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse summary response' },
        { status: 500 }
      );
    }

    // Save to database
    saveNote(
      'analysis',
      'PRIOR',
      { documents: input.documents.substring(0, 500) + '...', patientContext: input.patientContext },
      summary
    );

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Prior care summary error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate prior care summary' },
      { status: 500 }
    );
  }
}

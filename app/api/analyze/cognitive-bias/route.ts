import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  COGNITIVE_BIAS_SYSTEM_PROMPT,
  getCognitiveBiasPrompt,
  parseCognitiveBiasResponse,
} from '@/lib/prompts/cognitive-bias';
import type { CognitiveBiasInput } from '@/lib/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const input: CognitiveBiasInput = await request.json();

    if (!input.clinicalReasoning || input.clinicalReasoning.trim().length < 50) {
      return NextResponse.json(
        { error: 'Please provide clinical reasoning details (minimum 50 characters)' },
        { status: 400 }
      );
    }

    const userMessage = getCognitiveBiasPrompt(
      input.clinicalReasoning,
      input.workingDiagnosis,
      input.differentialConsidered
    );

    // Use Sonnet for this complex analysis task
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: COGNITIVE_BIAS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    try {
      const output = parseCognitiveBiasResponse(content);
      return NextResponse.json(output);
    } catch (parseError) {
      console.error('Failed to parse cognitive bias JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse analysis results. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Cognitive bias analysis error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze for cognitive biases' },
      { status: 500 }
    );
  }
}

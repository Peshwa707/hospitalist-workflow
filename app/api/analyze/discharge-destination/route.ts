import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  DISCHARGE_DESTINATION_SYSTEM_PROMPT,
  getDischargeDestinationPrompt,
  parseDischargeDestinationResponse,
} from '@/lib/prompts/discharge-destination';
import type { DischargeDestinationInput } from '@/lib/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const input: DischargeDestinationInput = await request.json();

    if (!input.clinicalSummary || input.clinicalSummary.trim().length < 50) {
      return NextResponse.json(
        { error: 'Please provide a clinical summary (minimum 50 characters)' },
        { status: 400 }
      );
    }

    const userMessage = getDischargeDestinationPrompt(
      input.clinicalSummary,
      input.functionalStatus,
      input.socialSupport,
      input.insuranceType,
      input.patientPreferences
    );

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: DISCHARGE_DESTINATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    try {
      const output = parseDischargeDestinationResponse(content);
      return NextResponse.json(output);
    } catch (parseError) {
      console.error('Failed to parse discharge destination JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse analysis results. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Discharge destination analysis error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze discharge destination' },
      { status: 500 }
    );
  }
}

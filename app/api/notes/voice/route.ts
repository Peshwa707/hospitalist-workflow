import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { voiceToNotePrompt, VOICE_TO_NOTE_SYSTEM_PROMPT } from '@/lib/prompts/voice-to-note';

// Lazy initialization to avoid build-time errors when API keys are not set
let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const patientId = formData.get('patientId') as string | null;
    const patientContext = formData.get('patientContext') as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 25MB for Whisper)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    const openaiClient = getOpenAIClient();
    const anthropicClient = getAnthropicClient();

    // Step 1: Transcribe with Whisper
    const transcription = await openaiClient.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      prompt: 'Medical dictation for hospital progress note. Terms: vitals, labs, assessment, plan, medications, diagnosis, subjective, objective, physical exam, heart rate, blood pressure, oxygen saturation, respiratory rate, temperature.',
    });

    if (!transcription.text || transcription.text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No speech detected in the audio' },
        { status: 400 }
      );
    }

    // Step 2: Generate SOAP note with Claude
    const message = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: VOICE_TO_NOTE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: voiceToNotePrompt(transcription.text, patientContext || undefined),
        },
      ],
    });

    // Safely extract text from Claude response
    const soapNote = message.content.length > 0 && message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    if (!soapNote) {
      return NextResponse.json(
        { success: false, error: 'AI failed to generate a note. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        transcription: transcription.text,
        soapNote,
        patientId: patientId || null,
      },
    });
  } catch (error) {
    console.error('Voice-to-note error:', error);

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Invalid OpenAI API key. Please check your configuration.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Transcription failed: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Invalid Anthropic API key. Please check your configuration.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Note generation failed: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process voice note' },
      { status: 500 }
    );
  }
}

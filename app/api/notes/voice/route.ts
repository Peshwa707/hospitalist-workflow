import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { voiceToNotePrompt, VOICE_TO_NOTE_SYSTEM_PROMPT } from '@/lib/prompts/voice-to-note';

// Lazy initialization for Google Gemini API
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not set');
    }

    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let transcription: string;
    let patientId: string | null = null;
    let patientContext: string | null = null;

    // Handle both JSON (browser speech) and FormData
    if (contentType.includes('application/json')) {
      const body = await request.json();
      transcription = body.transcription;
      patientId = body.patientId || null;
      patientContext = body.patientContext || null;
    } else {
      const formData = await request.formData();
      transcription = formData.get('transcription') as string;
      patientId = formData.get('patientId') as string | null;
      patientContext = formData.get('patientContext') as string | null;
    }

    if (!transcription || transcription.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No transcription provided' },
        { status: 400 }
      );
    }

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    // Generate SOAP note with Gemini
    const fullPrompt = `${VOICE_TO_NOTE_SYSTEM_PROMPT}\n\n${voiceToNotePrompt(transcription, patientContext || undefined)}`;
    const result = await model.generateContent(fullPrompt);

    const response = result.response;
    const soapNote = response.text();

    if (!soapNote) {
      return NextResponse.json(
        { success: false, error: 'AI failed to generate a note. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        transcription,
        soapNote,
        patientId: patientId || null,
      },
    });
  } catch (error) {
    console.error('Voice-to-note error:', error);

    const message = error instanceof Error ? error.message : 'Failed to process voice note';

    // Check for specific Google API errors
    if (message.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Google API key. Please check your configuration.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

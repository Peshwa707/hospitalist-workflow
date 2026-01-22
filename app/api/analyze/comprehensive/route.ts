import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  ADMISSION_ANALYZER_SYSTEM_PROMPT,
  buildAdmissionAnalyzerUserMessage,
} from '@/lib/prompts/admission-analyzer';
import {
  CARE_COORDINATION_SYSTEM_PROMPT,
  getCareCoordinationPrompt,
  parseCareCoordinationResponse,
} from '@/lib/prompts/care-coordination';
import {
  DISCHARGE_DESTINATION_SYSTEM_PROMPT,
  getDischargeDestinationPrompt,
  parseDischargeDestinationResponse,
} from '@/lib/prompts/discharge-destination';
import {
  COGNITIVE_BIAS_SYSTEM_PROMPT,
  getCognitiveBiasPrompt,
  parseCognitiveBiasResponse,
} from '@/lib/prompts/cognitive-bias';
import { saveNote } from '@/lib/db';
import type {
  ComprehensiveAnalysisInput,
  ComprehensiveAnalysisOutput,
  AdmissionAnalysisOutput,
} from '@/lib/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function runAnalysis(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

function parseAdmissionResponse(content: string): AdmissionAnalysisOutput {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in admission response');

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    differentialDiagnosis: parsed.differentialDiagnosis || [],
    recommendedWorkup: parsed.recommendedWorkup || [],
    suggestedConsults: parsed.suggestedConsults || [],
    dischargeReadiness: parsed.dischargeReadiness || {
      assessment: 'Unable to assess',
      barriers: [],
      estimatedLOS: 'Unknown',
    },
    limitations: parsed.limitations || '',
    generatedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const input: ComprehensiveAnalysisInput = await request.json();

    if (!input.admissionNote || input.admissionNote.trim().length < 50) {
      return NextResponse.json(
        { error: 'Please provide a complete admission note (minimum 50 characters)' },
        { status: 400 }
      );
    }

    // Run all analyses in parallel
    const [admissionContent, careCoordContent, dischargeContent, biasContent] = await Promise.all([
      // Admission Analysis
      runAnalysis(
        ADMISSION_ANALYZER_SYSTEM_PROMPT,
        buildAdmissionAnalyzerUserMessage({ admissionNote: input.admissionNote })
      ),
      // Care Coordination
      runAnalysis(
        CARE_COORDINATION_SYSTEM_PROMPT,
        getCareCoordinationPrompt(input.admissionNote)
      ),
      // Discharge Destination
      runAnalysis(
        DISCHARGE_DESTINATION_SYSTEM_PROMPT,
        getDischargeDestinationPrompt(
          input.admissionNote,
          input.functionalStatus,
          input.socialSupport,
          input.insuranceType
        )
      ),
      // Cognitive Bias Check
      runAnalysis(
        COGNITIVE_BIAS_SYSTEM_PROMPT,
        getCognitiveBiasPrompt(input.admissionNote)
      ),
    ]);

    // Parse all responses
    const output: ComprehensiveAnalysisOutput = {
      admission: parseAdmissionResponse(admissionContent),
      careCoordination: parseCareCoordinationResponse(careCoordContent),
      dischargeDestination: parseDischargeDestinationResponse(dischargeContent),
      cognitiveBias: parseCognitiveBiasResponse(biasContent),
      generatedAt: new Date().toISOString(),
    };

    // Extract patient initials from the note
    const initialsMatch = input.admissionNote.match(/\b([A-Z])\w*\s+([A-Z])/);
    const patientInitials = initialsMatch
      ? `${initialsMatch[1]}${initialsMatch[2]}`
      : 'XX';

    // Save to database
    const noteId = saveNote('analysis', patientInitials, input, output);
    output.admission.id = noteId;

    return NextResponse.json(output);
  } catch (error) {
    console.error('Comprehensive analysis error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to complete comprehensive analysis' },
      { status: 500 }
    );
  }
}

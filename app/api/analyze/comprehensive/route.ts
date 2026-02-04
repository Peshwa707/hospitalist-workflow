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
import { saveNote, saveNoteWithPatient, saveAnalysisMetrics, createTasksFromAnalysis } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type {
  ComprehensiveAnalysisInput,
  ComprehensiveAnalysisOutput,
  AdmissionAnalysisOutput,
} from '@/lib/types';

interface ExtendedComprehensiveInput extends ComprehensiveAnalysisInput {
  patientId?: number;
}

const MODEL = 'claude-sonnet-4-20250514';

interface AnalysisResult {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
}

async function runAnalysis(
  client: Anthropic,
  systemPrompt: string,
  userMessage: string
): Promise<AnalysisResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return {
    content: response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n'),
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    finishReason: response.stop_reason ?? undefined,
  };
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
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const input: ExtendedComprehensiveInput = await request.json();

    if (!input.admissionNote || input.admissionNote.trim().length < 50) {
      return NextResponse.json(
        { error: 'Please provide a complete admission note (minimum 50 characters)' },
        { status: 400 }
      );
    }

    // Run all analyses in parallel
    const [admissionResult, careCoordResult, dischargeResult, biasResult] = await Promise.all([
      // Admission Analysis
      runAnalysis(
        client,
        ADMISSION_ANALYZER_SYSTEM_PROMPT,
        buildAdmissionAnalyzerUserMessage({ admissionNote: input.admissionNote })
      ),
      // Care Coordination
      runAnalysis(
        client,
        CARE_COORDINATION_SYSTEM_PROMPT,
        getCareCoordinationPrompt(input.admissionNote)
      ),
      // Discharge Destination
      runAnalysis(
        client,
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
        client,
        COGNITIVE_BIAS_SYSTEM_PROMPT,
        getCognitiveBiasPrompt(input.admissionNote)
      ),
    ]);

    // Parse all responses
    const output: ComprehensiveAnalysisOutput = {
      admission: parseAdmissionResponse(admissionResult.content),
      careCoordination: parseCareCoordinationResponse(careCoordResult.content),
      dischargeDestination: parseDischargeDestinationResponse(dischargeResult.content),
      cognitiveBias: parseCognitiveBiasResponse(biasResult.content),
      generatedAt: new Date().toISOString(),
    };

    // Use placeholder MRN for standalone analysis (no PHI extraction)
    const patientMrn = 'ANALYSIS';

    // Save to database (with patient association if provided)
    const noteId = input.patientId
      ? saveNoteWithPatient('analysis', patientMrn, input, output, input.patientId)
      : saveNote('analysis', patientMrn, input, output);
    output.admission.id = noteId;

    // Auto-create tasks from analysis if patient ID is provided
    if (input.patientId) {
      createTasksFromAnalysis(
        input.patientId,
        output.admission.recommendedWorkup || [],
        output.admission.suggestedConsults || []
      );
    }

    // Save metrics for learning (aggregate tokens from all analyses)
    const latencyMs = Date.now() - startTime;
    const totalInputTokens = (admissionResult.inputTokens || 0) +
      (careCoordResult.inputTokens || 0) +
      (dischargeResult.inputTokens || 0) +
      (biasResult.inputTokens || 0);
    const totalOutputTokens = (admissionResult.outputTokens || 0) +
      (careCoordResult.outputTokens || 0) +
      (dischargeResult.outputTokens || 0) +
      (biasResult.outputTokens || 0);

    saveAnalysisMetrics({
      noteId,
      analysisType: 'comprehensive',
      modelUsed: MODEL,
      promptVersion: getPromptVersion('comprehensive'),
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs,
      finishReason: 'end_turn',
    });

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

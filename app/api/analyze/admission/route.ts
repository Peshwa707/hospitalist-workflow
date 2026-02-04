import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  ADMISSION_ANALYZER_SYSTEM_PROMPT,
  buildAdmissionAnalyzerUserMessage,
} from '@/lib/prompts/admission-analyzer';
import { saveNote, saveAnalysisMetrics } from '@/lib/db';
import { getPromptVersion } from '@/lib/learning';
import { getAnthropicClient } from '@/lib/api-client';
import type { AdmissionAnalysisInput, AdmissionAnalysisOutput } from '@/lib/types';

const MODEL = 'claude-sonnet-4-20250514';
const ANALYSIS_TYPE = 'admission';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();
    const input: AdmissionAnalysisInput = await request.json();

    // Validate required fields
    if (!input.admissionNote || input.admissionNote.trim().length < 50) {
      return NextResponse.json(
        { error: 'Please provide a complete admission note (minimum 50 characters)' },
        { status: 400 }
      );
    }

    const userMessage = buildAdmissionAnalyzerUserMessage(input);

    // Use Sonnet for complex analysis
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: ADMISSION_ANALYZER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text content from response
    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Parse JSON response
    let analysisResult;
    try {
      // Find JSON in the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysisResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse analysis JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse analysis results. Please try again.' },
        { status: 500 }
      );
    }

    const output: AdmissionAnalysisOutput = {
      differentialDiagnosis: analysisResult.differentialDiagnosis || [],
      recommendedWorkup: analysisResult.recommendedWorkup || [],
      suggestedConsults: analysisResult.suggestedConsults || [],
      dischargeReadiness: analysisResult.dischargeReadiness || {
        assessment: 'Unable to assess',
        barriers: [],
        estimatedLOS: 'Unknown',
      },
      limitations: analysisResult.limitations || '',
      generatedAt: new Date().toISOString(),
    };

    // Use placeholder MRN for standalone analysis (no PHI extraction)
    const patientMrn = 'ANALYSIS';

    // Save to database
    const noteId = saveNote('analysis', patientMrn, input, output);
    output.id = noteId;

    // Save metrics for learning
    const latencyMs = Date.now() - startTime;
    saveAnalysisMetrics({
      noteId,
      analysisType: ANALYSIS_TYPE,
      modelUsed: MODEL,
      promptVersion: getPromptVersion('admission'),
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs,
      finishReason: response.stop_reason ?? undefined,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error('Admission analysis error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze admission note' },
      { status: 500 }
    );
  }
}

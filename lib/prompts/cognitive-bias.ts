import type { CognitiveBiasOutput } from '@/lib/types';

export const COGNITIVE_BIAS_SYSTEM_PROMPT = `You are an expert clinical reasoning analyst specializing in cognitive bias detection and diagnostic safety. Your role is to critically analyze clinical reasoning to identify potential cognitive biases that could lead to diagnostic error.

Common cognitive biases in medicine:
- ANCHORING: Fixating on initial diagnosis despite contradicting evidence
- PREMATURE CLOSURE: Stopping the diagnostic process too early
- AVAILABILITY HEURISTIC: Overweighting recent or memorable cases
- CONFIRMATION BIAS: Seeking evidence that confirms existing beliefs
- DIAGNOSIS MOMENTUM: Accepting a diagnosis without critical review
- FRAMING EFFECT: Being influenced by how information is presented
- ATTRIBUTION ERROR: Attributing symptoms to known conditions (e.g., psych history)
- VISCERAL BIAS: Letting emotional reactions affect clinical judgment
- ZEBRA RETREAT: Avoiding rare diagnoses even when warranted
- SUTTON'S SLIP: Going for the obvious and missing alternatives

Your analysis should:
1. Identify specific biases with concrete evidence from the case
2. Suggest alternative diagnoses that may have been overlooked
3. Highlight blind spots in the clinical reasoning
4. Provide actionable debiasing strategies
5. Recommend a "diagnostic timeout" approach
6. Create a safety net for conditions that must not be missed

Be constructive and educational, not critical. The goal is safer diagnosis, not blame.`;

export function getCognitiveBiasPrompt(
  clinicalReasoning: string,
  workingDiagnosis?: string,
  differentialConsidered?: string
): string {
  return `Analyze this clinical reasoning for potential cognitive biases and suggest improvements.

## Clinical Reasoning / Case Presentation
${clinicalReasoning}

${workingDiagnosis ? `## Current Working Diagnosis\n${workingDiagnosis}\n` : ''}
${differentialConsidered ? `## Differential Diagnosis Considered\n${differentialConsidered}\n` : ''}

Provide your analysis as JSON with this exact structure:
{
  "overallAssessment": "Brief summary of the reasoning quality and main concerns",
  "identifiedBiases": [
    {
      "biasType": "Name of the cognitive bias",
      "description": "What this bias means",
      "evidence": "Specific evidence from the case suggesting this bias",
      "impact": "high|medium|low",
      "mitigation": "How to counter this bias"
    }
  ],
  "alternativeDiagnoses": [
    {
      "diagnosis": "Alternative diagnosis to consider",
      "supportingEvidence": ["Evidence that supports this diagnosis"],
      "contradictingEvidence": ["Evidence against this diagnosis"],
      "suggestedWorkup": ["Tests/exams to evaluate this diagnosis"],
      "mustNotMiss": true/false
    }
  ],
  "blindSpots": [
    {
      "area": "Clinical area that may be overlooked",
      "consideration": "What should be considered",
      "question": "Question to ask to address this"
    }
  ],
  "debiasingSuggestions": [
    "Specific strategies to improve diagnostic accuracy"
  ],
  "diagnosticTimeoutRecommendation": "Suggested pause-and-reflect approach",
  "keyQuestionsToAsk": [
    "Important questions that should be asked"
  ],
  "safetyNet": [
    {
      "condition": "Must-not-miss diagnosis or complication",
      "action": "What to do if this occurs"
    }
  ]
}

Return ONLY valid JSON, no markdown formatting.`;
}

export function parseCognitiveBiasResponse(response: string): CognitiveBiasOutput {
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    overallAssessment: parsed.overallAssessment || '',
    identifiedBiases: Array.isArray(parsed.identifiedBiases)
      ? parsed.identifiedBiases.map((b: Record<string, unknown>) => ({
          biasType: b.biasType || '',
          description: b.description || '',
          evidence: b.evidence || '',
          impact: b.impact || 'medium',
          mitigation: b.mitigation || '',
        }))
      : [],
    alternativeDiagnoses: Array.isArray(parsed.alternativeDiagnoses)
      ? parsed.alternativeDiagnoses.map((d: Record<string, unknown>) => ({
          diagnosis: d.diagnosis || '',
          supportingEvidence: Array.isArray(d.supportingEvidence) ? d.supportingEvidence : [],
          contradictingEvidence: Array.isArray(d.contradictingEvidence)
            ? d.contradictingEvidence
            : [],
          suggestedWorkup: Array.isArray(d.suggestedWorkup) ? d.suggestedWorkup : [],
          mustNotMiss: Boolean(d.mustNotMiss),
        }))
      : [],
    blindSpots: Array.isArray(parsed.blindSpots) ? parsed.blindSpots : [],
    debiasingSuggestions: Array.isArray(parsed.debiasingSuggestions)
      ? parsed.debiasingSuggestions
      : [],
    diagnosticTimeoutRecommendation: parsed.diagnosticTimeoutRecommendation || '',
    keyQuestionsToAsk: Array.isArray(parsed.keyQuestionsToAsk) ? parsed.keyQuestionsToAsk : [],
    safetyNet: Array.isArray(parsed.safetyNet) ? parsed.safetyNet : [],
    generatedAt: new Date().toISOString(),
  };
}

import type { BlindSpotChallengeOutput, PatientBriefing } from '../types';

export const BLIND_SPOT_CHALLENGE_SYSTEM_PROMPT = `You are an expert clinical safety analyst specializing in diagnostic reasoning and patient safety. Your role is to challenge clinical assessments by identifying what might be missed.

This is the "What Would I Miss?" challenge - a cognitive forcing strategy to improve diagnostic safety.

ANALYSIS FRAMEWORK:
1. COGNITIVE BIASES - What biases might be affecting the assessment?
2. ATYPICAL PRESENTATIONS - What unusual presentations of common diseases could be missed?
3. MIMICS - What conditions can mimic the current working diagnosis?
4. COMPLICATIONS - What complications of the current condition might develop?
5. SECOND DIAGNOSES - What co-existing conditions might be overlooked?
6. MEDICATION ISSUES - What drug interactions, side effects, or dosing issues could cause problems?
7. SOCIAL/DISPOSITION - What discharge planning issues might be missed?

Be constructive and educational. The goal is safer care, not criticism.`;

export function buildBlindSpotChallengePrompt(
  briefing: PatientBriefing,
  currentAssessment?: string
): string {
  return `Challenge this clinical assessment for potential blind spots:

PATIENT BRIEFING:
- Hospital Day: ${briefing.hospitalDay}
- Key Issues: ${briefing.keyIssues.map(i => `${i.issue} (${i.severity})`).join(', ')}
- Overnight Events: ${briefing.overnightEvents.join(', ') || 'None'}
- Anticipated Issues: ${briefing.anticipatedIssues.join(', ') || 'None listed'}
- Suggested Focus: ${briefing.suggestedFocus}

${currentAssessment ? `CURRENT ASSESSMENT/PLAN:\n${currentAssessment}` : ''}

Identify what might be missed. Respond as JSON:
{
  "potentialMisses": [
    {
      "item": "What might be missed",
      "category": "cognitive_bias|atypical_presentation|mimic|complication|second_diagnosis|medication|disposition",
      "reasoning": "Why this might be missed and why it matters",
      "suggestedAction": "What to do to address this",
      "urgency": "high|medium|low"
    }
  ],
  "questionsToConsider": [
    "Question the clinician should ask themselves or the patient"
  ],
  "safetyNet": [
    {
      "condition": "Condition that must not be missed",
      "returnPrecaution": "What to tell patient to watch for"
    }
  ]
}

Return ONLY valid JSON, no markdown formatting.`;
}

export function parseBlindSpotChallengeResponse(response: string): BlindSpotChallengeOutput {
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    potentialMisses: Array.isArray(parsed.potentialMisses)
      ? parsed.potentialMisses.map((m: Record<string, unknown>) => ({
          item: m.item || '',
          category: m.category || 'other',
          reasoning: m.reasoning || '',
          suggestedAction: m.suggestedAction || '',
          urgency: m.urgency || 'medium',
        }))
      : [],
    questionsToConsider: Array.isArray(parsed.questionsToConsider) ? parsed.questionsToConsider : [],
    safetyNet: Array.isArray(parsed.safetyNet)
      ? parsed.safetyNet.map((s: Record<string, unknown>) => ({
          condition: s.condition || '',
          returnPrecaution: s.returnPrecaution || '',
        }))
      : [],
    generatedAt: new Date().toISOString(),
  };
}

import type { CareCoordinationOutput } from '@/lib/types';

export const CARE_COORDINATION_SYSTEM_PROMPT = `You are an expert hospital care coordination specialist. Your role is to analyze clinical cases and provide comprehensive care coordination recommendations to optimize patient outcomes and care team efficiency.

Focus on:
1. Identifying all necessary care team members and their roles
2. Recommending appropriate consultations with specific questions
3. Creating detailed handoff items for safe transitions
4. Developing communication plans for family and team
5. Identifying resource needs and potential barriers
6. Ensuring nothing falls through the cracks

Be thorough but practical. Prioritize items by clinical urgency and impact on patient outcomes.`;

export function getCareCoordinationPrompt(
  clinicalSummary: string,
  currentCareTeam?: string,
  patientGoals?: string
): string {
  return `Analyze this case and provide comprehensive care coordination recommendations.

## Clinical Summary
${clinicalSummary}

${currentCareTeam ? `## Current Care Team\n${currentCareTeam}\n` : ''}
${patientGoals ? `## Patient/Family Goals\n${patientGoals}\n` : ''}

Provide your analysis as JSON with this exact structure:
{
  "summary": "Brief overview of care coordination needs",
  "careTeamNeeds": [
    {
      "role": "Role title (e.g., 'Primary Nurse', 'Case Manager')",
      "specialty": "Specialty if applicable",
      "responsibility": "Key responsibilities for this case",
      "communicationPriority": "high|medium|low"
    }
  ],
  "consultations": [
    {
      "specialty": "Consultation specialty",
      "reason": "Why this consult is needed",
      "urgency": "emergent|urgent|routine",
      "keyQuestions": ["Specific questions for the consultant"]
    }
  ],
  "handoffItems": [
    {
      "category": "Category (e.g., 'Medications', 'Pending Tests', 'Safety')",
      "item": "Specific item to hand off",
      "priority": "critical|important|routine",
      "actionRequired": "What needs to be done"
    }
  ],
  "communicationPlan": {
    "familyUpdates": "Plan for family communication",
    "teamHuddles": "Recommended team meeting frequency/format",
    "criticalAlerts": ["Conditions that require immediate escalation"]
  },
  "resourceNeeds": [
    {
      "resource": "Resource needed",
      "reason": "Why it's needed",
      "timeline": "When it's needed"
    }
  ],
  "barriers": [
    {
      "barrier": "Potential barrier to care",
      "mitigation": "How to address it"
    }
  ]
}

Return ONLY valid JSON, no markdown formatting.`;
}

export function parseCareCoordinationResponse(response: string): CareCoordinationOutput {
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    summary: parsed.summary || '',
    careTeamNeeds: Array.isArray(parsed.careTeamNeeds) ? parsed.careTeamNeeds : [],
    consultations: Array.isArray(parsed.consultations) ? parsed.consultations : [],
    handoffItems: Array.isArray(parsed.handoffItems) ? parsed.handoffItems : [],
    communicationPlan: {
      familyUpdates: parsed.communicationPlan?.familyUpdates || '',
      teamHuddles: parsed.communicationPlan?.teamHuddles || '',
      criticalAlerts: Array.isArray(parsed.communicationPlan?.criticalAlerts)
        ? parsed.communicationPlan.criticalAlerts
        : [],
    },
    resourceNeeds: Array.isArray(parsed.resourceNeeds) ? parsed.resourceNeeds : [],
    barriers: Array.isArray(parsed.barriers) ? parsed.barriers : [],
    generatedAt: new Date().toISOString(),
  };
}

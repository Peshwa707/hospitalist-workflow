import type { DischargeDestinationOutput } from '@/lib/types';

export const DISCHARGE_DESTINATION_SYSTEM_PROMPT = `You are an expert hospital discharge planner with deep knowledge of post-acute care settings. Your role is to analyze patients and recommend the most appropriate discharge destination based on clinical, functional, social, and insurance factors.

Discharge destination options:
- HOME: Independent at home, no services needed
- HOME_HEALTH: Home with visiting nurse, PT/OT, or other services
- SNF (Skilled Nursing Facility): 24/7 nursing care, rehabilitation
- LTAC (Long-Term Acute Care): Complex medical needs, ventilator weaning
- IRF (Inpatient Rehab Facility): Intensive rehabilitation (3+ hours/day)
- HOSPICE: Comfort-focused end-of-life care
- AMA: Against medical advice (identify risk factors)

Consider:
1. Medical stability and ongoing care needs
2. Functional status (mobility, ADLs, cognition)
3. Social support and home environment
4. Insurance coverage and authorization requirements
5. Patient and family preferences
6. Geographic and resource availability

Be realistic about barriers and requirements for each destination.`;

export function getDischargeDestinationPrompt(
  clinicalSummary: string,
  functionalStatus?: string,
  socialSupport?: string,
  insuranceType?: string,
  patientPreferences?: string
): string {
  return `Analyze this case and recommend the most appropriate discharge destination.

## Clinical Summary
${clinicalSummary}

${functionalStatus ? `## Functional Status\n${functionalStatus}\n` : ''}
${socialSupport ? `## Social Support\n${socialSupport}\n` : ''}
${insuranceType ? `## Insurance\n${insuranceType}\n` : ''}
${patientPreferences ? `## Patient/Family Preferences\n${patientPreferences}\n` : ''}

Provide your analysis as JSON with this exact structure:
{
  "recommendedDestination": {
    "destination": "home|home_health|snf|ltac|irf|hospice|ama",
    "label": "Human-readable label (e.g., 'Skilled Nursing Facility')",
    "likelihood": "most_likely",
    "reasoning": "Why this is the recommended destination",
    "requirements": ["What must be in place for this to work"],
    "barriers": ["Current barriers to this destination"]
  },
  "alternativeDestinations": [
    {
      "destination": "destination code",
      "label": "Human-readable label",
      "likelihood": "possible|unlikely",
      "reasoning": "Why this could be considered",
      "requirements": ["Requirements for this option"],
      "barriers": ["Barriers to this option"]
    }
  ],
  "dischargeCriteria": [
    {
      "criterion": "Specific criterion for discharge",
      "met": true/false,
      "notes": "Additional context"
    }
  ],
  "taskList": [
    {
      "task": "Specific task to complete",
      "owner": "Who should do this (e.g., 'Case Manager', 'MD', 'RN')",
      "priority": "high|medium|low",
      "status": "pending",
      "dueBy": "Timeline (e.g., 'Before discharge', 'Day of discharge')"
    }
  ],
  "equipmentNeeds": ["DME and equipment needed"],
  "followUpNeeds": [
    {
      "specialty": "Follow-up type",
      "timeframe": "When (e.g., '1-2 weeks')",
      "reason": "Why needed"
    }
  ],
  "medicationReconciliation": [
    {
      "action": "continue|discontinue|modify|new",
      "medication": "Medication name/class",
      "notes": "Changes or instructions"
    }
  ],
  "patientEducation": ["Key education topics"],
  "redFlags": ["Warning signs to watch for after discharge"],
  "estimatedDischargeDate": "Estimated date or 'TBD'"
}

Return ONLY valid JSON, no markdown formatting.`;
}

export function parseDischargeDestinationResponse(response: string): DischargeDestinationOutput {
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  type DestinationType = 'home' | 'home_health' | 'snf' | 'ltac' | 'irf' | 'hospice' | 'ama';
  const validDestinations: DestinationType[] = ['home', 'home_health', 'snf', 'ltac', 'irf', 'hospice', 'ama'];

  const parseDestination = (dest: Record<string, unknown>) => {
    const rawDest = (dest.destination as string)?.toLowerCase() || 'home';
    const destination: DestinationType = validDestinations.includes(rawDest as DestinationType)
      ? (rawDest as DestinationType)
      : 'home';

    return {
      destination,
      label: (dest.label as string) || '',
      likelihood: (dest.likelihood as 'most_likely' | 'possible' | 'unlikely') || 'possible',
      reasoning: (dest.reasoning as string) || '',
      requirements: Array.isArray(dest.requirements) ? dest.requirements : [],
      barriers: Array.isArray(dest.barriers) ? dest.barriers : [],
    };
  };

  return {
    recommendedDestination: parseDestination(parsed.recommendedDestination || {}),
    alternativeDestinations: Array.isArray(parsed.alternativeDestinations)
      ? parsed.alternativeDestinations.map(parseDestination)
      : [],
    dischargeCriteria: Array.isArray(parsed.dischargeCriteria) ? parsed.dischargeCriteria : [],
    taskList: Array.isArray(parsed.taskList)
      ? parsed.taskList.map((t: Record<string, unknown>) => ({
          ...t,
          status: t.status || 'pending',
        }))
      : [],
    equipmentNeeds: Array.isArray(parsed.equipmentNeeds) ? parsed.equipmentNeeds : [],
    followUpNeeds: Array.isArray(parsed.followUpNeeds) ? parsed.followUpNeeds : [],
    medicationReconciliation: Array.isArray(parsed.medicationReconciliation)
      ? parsed.medicationReconciliation
      : [],
    patientEducation: Array.isArray(parsed.patientEducation) ? parsed.patientEducation : [],
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    estimatedDischargeDate: parsed.estimatedDischargeDate || undefined,
    generatedAt: new Date().toISOString(),
  };
}

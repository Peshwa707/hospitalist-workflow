import type { Patient, PatientTask, PatientBriefing } from '../types';

export const PRE_ROUND_BRIEFING_SYSTEM_PROMPT = `You are a clinical decision support assistant helping a hospitalist physician prepare for morning rounds.

Your job is to synthesize all available patient information into a concise, actionable morning briefing that helps the physician prepare for each patient encounter.

IMPORTANT GUIDELINES:
- Prioritize safety-critical information (vital sign changes, critical labs, overnight events)
- Highlight action items that need immediate attention
- Be concise but comprehensive - rounds time is limited
- Flag any concerning trends or deterioration
- Include pending tasks and anticipated issues for the day

FORMAT YOUR RESPONSE AS VALID JSON.`;

export function buildBriefingUserMessage(
  patient: Patient,
  hospitalDay: number,
  recentNotes: string[],
  pendingTasks: PatientTask[]
): string {
  const tasksFormatted = pendingTasks
    .map(t => `- [${t.priority.toUpperCase()}] ${t.task} (${t.category})${t.notes ? ': ' + t.notes : ''}`)
    .join('\n');

  const labsFormatted = patient.recentLabs
    .map(l => `- ${l.name}: ${l.value}${l.flag ? ` [${l.flag.toUpperCase()}]` : ''}`)
    .join('\n');

  const vitalsFormatted = patient.recentVitals
    ? `T: ${patient.recentVitals.temperature || 'N/A'}, HR: ${patient.recentVitals.heartRate || 'N/A'}, BP: ${patient.recentVitals.bloodPressure || 'N/A'}, RR: ${patient.recentVitals.respiratoryRate || 'N/A'}, SpO2: ${patient.recentVitals.oxygenSaturation || 'N/A'}${patient.recentVitals.oxygenDevice ? ` on ${patient.recentVitals.oxygenDevice}` : ''}`
    : 'No recent vitals recorded';

  return `Generate a morning briefing for this patient:

PATIENT INFORMATION:
- MRN: ${patient.mrn}
- Room: ${patient.roomNumber || 'Unknown'}
- Hospital Day: ${hospitalDay}
- Admission Date: ${patient.admissionDate || 'Unknown'}
- Primary Diagnoses: ${patient.primaryDiagnoses.join(', ') || 'None listed'}
- Code Status: ${patient.codeStatus || 'Unknown'}
- Allergies: ${patient.allergies.join(', ') || 'NKDA'}

CURRENT MEDICATIONS:
${patient.activeMedications.map(m => `- ${m.name} ${m.dose} ${m.route} ${m.frequency}`).join('\n') || 'None listed'}

RECENT VITALS:
${vitalsFormatted}

RECENT LABS:
${labsFormatted || 'No recent labs'}

PENDING TASKS:
${tasksFormatted || 'No pending tasks'}

RECENT CLINICAL NOTES:
${recentNotes.slice(0, 3).join('\n\n---\n\n') || 'No recent notes'}

Provide your briefing as JSON with this structure:
{
  "keyIssues": [
    {"issue": "string", "severity": "critical|important|routine", "context": "string"}
  ],
  "overnightEvents": ["string"],
  "pendingTasks": [
    {"task": "string", "priority": "stat|urgent|routine", "category": "string"}
  ],
  "labsToReview": [
    {"test": "string", "value": "string", "trend": "string?", "flag": "string?"}
  ],
  "anticipatedIssues": ["string"],
  "suggestedFocus": "string - one sentence summary of what to focus on during rounds"
}

Return ONLY valid JSON, no markdown formatting.`;
}

export function parseBriefingResponse(
  response: string,
  patient: Patient,
  hospitalDay: number
): PatientBriefing {
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    patientId: patient.id!,
    patientMrn: patient.mrn,
    roomNumber: patient.roomNumber,
    hospitalDay,
    keyIssues: Array.isArray(parsed.keyIssues) ? parsed.keyIssues : [],
    overnightEvents: Array.isArray(parsed.overnightEvents) ? parsed.overnightEvents : [],
    pendingTasks: Array.isArray(parsed.pendingTasks) ? parsed.pendingTasks : [],
    labsToReview: Array.isArray(parsed.labsToReview) ? parsed.labsToReview : [],
    anticipatedIssues: Array.isArray(parsed.anticipatedIssues) ? parsed.anticipatedIssues : [],
    suggestedFocus: parsed.suggestedFocus || '',
    generatedAt: new Date().toISOString(),
  };
}

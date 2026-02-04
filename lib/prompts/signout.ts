import type { Patient, PatientTask, PatientSignout } from '../types';

export const SIGNOUT_SYSTEM_PROMPT = `You are a clinical decision support assistant helping hospitalists create safe, comprehensive shift handoff documents.

Your job is to generate structured signout information that follows I-PASS or SBAR principles:
- Illness severity
- Patient summary (one-liner)
- Action list (pending items)
- Situation awareness (if-then scenarios)
- Synthesis (overall assessment)

CRITICAL: Handoffs are high-risk moments for patient safety. Be thorough about:
- Anticipating overnight issues
- Creating actionable if-then scenarios
- Highlighting time-sensitive items
- Ensuring code status is clear`;

export function buildSignoutUserMessage(
  patient: Patient,
  recentNotes: string[],
  pendingTasks: PatientTask[]
): string {
  const tasksFormatted = pendingTasks
    .map(t => `- [${t.priority.toUpperCase()}] ${t.task} (${t.category})${t.notes ? ': ' + t.notes : ''}`)
    .join('\n');

  const medsFormatted = patient.activeMedications
    .map(m => `- ${m.name} ${m.dose} ${m.route} ${m.frequency}`)
    .join('\n');

  const labsFormatted = patient.recentLabs
    .map(l => `- ${l.name}: ${l.value}${l.flag ? ` [${l.flag.toUpperCase()}]` : ''}`)
    .join('\n');

  return `Generate a shift signout for this patient:

PATIENT:
- MRN: ${patient.mrn}
- Room: ${patient.roomNumber || 'Unknown'}
- Admission Date: ${patient.admissionDate || 'Unknown'}
- Primary Diagnoses: ${patient.primaryDiagnoses.join(', ') || 'None listed'}
- Code Status: ${patient.codeStatus || 'VERIFY'}
- Allergies: ${patient.allergies.join(', ') || 'NKDA'}

MEDICATIONS:
${medsFormatted || 'None listed'}

RECENT LABS:
${labsFormatted || 'No recent labs'}

PENDING TASKS:
${tasksFormatted || 'No pending tasks'}

RECENT NOTES:
${recentNotes.slice(0, 2).join('\n\n---\n\n') || 'No recent notes'}

Generate signout as JSON:
{
  "oneLiner": "Age, relevant history, presenting problem, hospital course summary - max 2 sentences",
  "activeIssues": [
    {"problem": "string", "status": "string", "plan": "string"}
  ],
  "ifThenScenarios": [
    {"condition": "If X happens", "action": "Then do Y", "escalation": "Call if Z"}
  ],
  "overnightConcerns": [
    {"concern": "string", "likelihood": "high|medium|low", "preparation": "string"}
  ],
  "pendingItems": [
    {"item": "string", "expectedTime": "string?", "action": "string"}
  ],
  "codeStatus": "Full code/DNR/DNI/etc - must be verified"
}

Return ONLY valid JSON, no markdown formatting.`;
}

export function parseSignoutResponse(
  response: string,
  patient: Patient
): PatientSignout {
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    patientId: patient.id!,
    patientMrn: patient.mrn,
    roomNumber: patient.roomNumber,
    oneLiner: parsed.oneLiner || '',
    activeIssues: Array.isArray(parsed.activeIssues) ? parsed.activeIssues : [],
    ifThenScenarios: Array.isArray(parsed.ifThenScenarios) ? parsed.ifThenScenarios : [],
    overnightConcerns: Array.isArray(parsed.overnightConcerns) ? parsed.overnightConcerns : [],
    pendingItems: Array.isArray(parsed.pendingItems) ? parsed.pendingItems : [],
    codeStatus: parsed.codeStatus || patient.codeStatus || 'VERIFY',
    generatedAt: new Date().toISOString(),
  };
}

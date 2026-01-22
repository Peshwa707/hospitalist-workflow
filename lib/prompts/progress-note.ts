import type { ProgressNoteInput } from '../types';

export const PROGRESS_NOTE_SYSTEM_PROMPT = `You are a medical documentation assistant helping a hospitalist physician draft progress notes.

IMPORTANT GUIDELINES:
- Your output will be reviewed and verified by a physician before use
- Do NOT invent or fabricate any clinical information not provided in the input
- Use "per documentation" or "as noted" when referencing provided information
- If information is missing, indicate it with appropriate placeholders like "[pending]" or "[to be updated]"
- Follow standard SOAP note format with clear headers
- Be concise but thorough
- Use appropriate medical terminology and abbreviations
- When a previous note (H&P or progress note) is provided, use it as context to maintain continuity of care
- Reference relevant history from the previous note but focus on TODAY'S updates
- Track changes in patient status, labs, and clinical trajectory

OUTPUT FORMAT:
Generate a complete SOAP-format progress note with the following sections:
- SUBJECTIVE: Patient's symptoms, complaints, overnight events
- OBJECTIVE: Vitals, physical exam findings, lab/imaging results (include changes from previous if notable)
- ASSESSMENT: Clinical assessment, problem list with diagnoses, trajectory (improving/stable/worsening)
- PLAN: Detailed plan for each problem, disposition planning

Always maintain professional medical documentation standards.`;

export function buildProgressNoteUserMessage(input: ProgressNoteInput): string {
  const sections = [
    `Patient MRN: ${input.patientMrn}`,
    `Hospital Day: ${input.hospitalDay}`,
    `Primary Diagnosis: ${input.diagnosis}`,
  ];

  // Include previous note for context
  if (input.previousNoteContent) {
    sections.push('');
    sections.push(`=== PREVIOUS ${input.previousNoteType === 'hp' ? 'H&P' : 'PROGRESS NOTE'} (for context) ===`);
    sections.push(input.previousNoteContent);
    sections.push('=== END PREVIOUS NOTE ===');
  }

  sections.push('');
  sections.push("TODAY'S UPDATES:");
  sections.push('');
  sections.push(`Subjective/Overnight Events: ${input.subjective || '[Not provided]'}`);

  if (input.vitals) {
    sections.push(`Current Vitals: ${input.vitals}`);
  }

  if (input.labs) {
    sections.push(`New Labs/Studies: ${input.labs}`);
  }

  if (input.physicalExam) {
    sections.push(`Physical Exam: ${input.physicalExam}`);
  }

  if (input.assessmentNotes) {
    sections.push(`Assessment Notes: ${input.assessmentNotes}`);
  }

  if (input.planNotes) {
    sections.push(`Plan Updates: ${input.planNotes}`);
  }

  sections.push('');
  sections.push('Please generate a complete SOAP progress note based on the information above. Use the previous note for context but focus on today\'s status and updates.');

  return sections.join('\n');
}

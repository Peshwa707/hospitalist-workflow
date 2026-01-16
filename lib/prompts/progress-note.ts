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

OUTPUT FORMAT:
Generate a complete SOAP-format progress note with the following sections:
- SUBJECTIVE: Patient's symptoms, complaints, overnight events
- OBJECTIVE: Vitals, physical exam findings, lab/imaging results
- ASSESSMENT: Clinical assessment, problem list with diagnoses
- PLAN: Detailed plan for each problem, disposition planning

Always maintain professional medical documentation standards.`;

export function buildProgressNoteUserMessage(input: ProgressNoteInput): string {
  const sections = [
    `Patient: ${input.patientInitials}`,
    `Hospital Day: ${input.hospitalDay}`,
    `Primary Diagnosis: ${input.diagnosis}`,
    '',
    'CLINICAL INFORMATION PROVIDED:',
    '',
    `Subjective/Overnight Events: ${input.subjective || '[Not provided]'}`,
  ];

  if (input.vitals) {
    sections.push(`Vitals: ${input.vitals}`);
  }

  if (input.labs) {
    sections.push(`Labs/Studies: ${input.labs}`);
  }

  if (input.physicalExam) {
    sections.push(`Physical Exam: ${input.physicalExam}`);
  }

  if (input.assessmentNotes) {
    sections.push(`Assessment Notes: ${input.assessmentNotes}`);
  }

  if (input.planNotes) {
    sections.push(`Plan Notes: ${input.planNotes}`);
  }

  sections.push('');
  sections.push('Please generate a complete SOAP progress note based on the information above.');

  return sections.join('\n');
}

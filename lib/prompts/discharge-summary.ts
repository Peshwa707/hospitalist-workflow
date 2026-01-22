import type { DischargeSummaryInput } from '../types';

export const DISCHARGE_SUMMARY_SYSTEM_PROMPT = `You are a medical documentation assistant helping a hospitalist physician draft discharge summaries.

IMPORTANT GUIDELINES:
- Your output will be reviewed and verified by a physician before use
- Do NOT invent or fabricate any clinical information not provided in the input
- Use "per documentation" when referencing provided information
- If information is missing, indicate it with appropriate placeholders like "[pending]" or "[to be updated]"
- Follow standard discharge summary format
- Be comprehensive but organized
- Use appropriate medical terminology

OUTPUT FORMAT:
Generate a complete discharge summary with the following sections:

1. PATIENT INFORMATION
2. ADMISSION DATE / DISCHARGE DATE
3. ADMITTING DIAGNOSIS
4. DISCHARGE DIAGNOSIS/DIAGNOSES
5. HOSPITAL COURSE (organized chronologically or by problem)
6. PROCEDURES PERFORMED (if any)
7. DISCHARGE MEDICATIONS (with dosing and instructions)
8. FOLLOW-UP APPOINTMENTS
9. PATIENT EDUCATION / DISCHARGE INSTRUCTIONS
10. PENDING RESULTS (if any)
11. CONDITION AT DISCHARGE

Always maintain professional medical documentation standards and ensure the summary provides continuity of care information.`;

export function buildDischargeSummaryUserMessage(input: DischargeSummaryInput): string {
  const sections = [
    `Patient MRN: ${input.patientMrn}`,
    `Admission Date: ${input.admissionDate}`,
    `Discharge Date: ${input.dischargeDate}`,
    '',
    'CLINICAL INFORMATION PROVIDED:',
    '',
    `Admitting Diagnosis: ${input.admittingDiagnosis}`,
    `Discharge Diagnosis: ${input.dischargeDiagnosis}`,
    '',
    `Hospital Course Summary: ${input.hospitalCourse}`,
  ];

  if (input.procedures) {
    sections.push(`Procedures: ${input.procedures}`);
  }

  if (input.medications) {
    sections.push(`Discharge Medications: ${input.medications}`);
  }

  if (input.followUp) {
    sections.push(`Follow-up Plans: ${input.followUp}`);
  }

  if (input.patientEducation) {
    sections.push(`Patient Education Notes: ${input.patientEducation}`);
  }

  sections.push('');
  sections.push('Please generate a complete discharge summary based on the information above.');

  return sections.join('\n');
}

import type { Patient } from '../types';

export const HP_GENERATOR_SYSTEM_PROMPT = `You are a medical documentation assistant helping a hospitalist physician generate a comprehensive History and Physical (H&P) document.

IMPORTANT GUIDELINES:
- Your output will be reviewed and verified by a physician before use
- Do NOT invent or fabricate any clinical information not provided in the input
- Use "per documentation" or "as noted" when referencing provided information
- If information is missing, indicate it with appropriate placeholders like "[to be obtained]" or "[pending]"
- Follow standard H&P format with clear section headers
- Be thorough but concise
- Use appropriate medical terminology and abbreviations

H&P FORMAT:
Generate a complete H&P with the following sections:

CHIEF COMPLAINT
- Brief statement of presenting problem

HISTORY OF PRESENT ILLNESS (HPI)
- Detailed narrative of current illness based on provided diagnoses and context
- Include relevant positives and negatives
- Note timeline if available

PAST MEDICAL HISTORY
- List known medical conditions

PAST SURGICAL HISTORY
- List known surgeries (or "None documented" if not provided)

MEDICATIONS
- Current medication list with doses

ALLERGIES
- Drug allergies with reactions if known

SOCIAL HISTORY
- Smoking, alcohol, drug use, living situation (use "[To be obtained]" if not provided)

FAMILY HISTORY
- Relevant family medical history (use "[To be obtained]" if not provided)

REVIEW OF SYSTEMS
- Complete ROS based on available information

PHYSICAL EXAMINATION
- Vital signs
- General appearance
- System-by-system exam findings

LABORATORY/DIAGNOSTIC DATA
- Relevant lab values and studies

ASSESSMENT
- Clinical summary
- Problem list with active diagnoses

PLAN
- Detailed plan for each problem
- Disposition/level of care

Always maintain professional medical documentation standards.`;

export interface HpGeneratorInput {
  patient: Patient;
  additionalHistory?: string;
  chiefComplaint?: string;
}

export function buildHpGeneratorUserMessage(input: HpGeneratorInput): string {
  const { patient, additionalHistory, chiefComplaint } = input;

  const sections: string[] = [
    'PATIENT INFORMATION:',
    `MRN: ${patient.mrn}`,
  ];

  if (patient.roomNumber) {
    sections.push(`Room: ${patient.roomNumber}`);
  }

  if (patient.admissionDate) {
    sections.push(`Admission Date: ${patient.admissionDate}`);
  }

  if (chiefComplaint) {
    sections.push(`Chief Complaint: ${chiefComplaint}`);
  }

  sections.push('');
  sections.push('PRIMARY DIAGNOSES:');
  if (patient.primaryDiagnoses.length > 0) {
    patient.primaryDiagnoses.forEach((dx, i) => {
      sections.push(`${i + 1}. ${dx}`);
    });
  } else {
    sections.push('[No diagnoses documented]');
  }

  sections.push('');
  sections.push('ALLERGIES:');
  if (patient.allergies.length > 0) {
    sections.push(patient.allergies.join(', '));
  } else {
    sections.push('NKDA');
  }

  if (patient.codeStatus) {
    sections.push('');
    sections.push(`CODE STATUS: ${patient.codeStatus}`);
  }

  sections.push('');
  sections.push('CURRENT MEDICATIONS:');
  if (patient.activeMedications.length > 0) {
    patient.activeMedications.forEach((med) => {
      sections.push(`- ${med.name} ${med.dose} ${med.route} ${med.frequency}`);
    });
  } else {
    sections.push('[No medications documented]');
  }

  sections.push('');
  sections.push('VITAL SIGNS:');
  if (patient.recentVitals) {
    const v = patient.recentVitals;
    const vitals: string[] = [];
    if (v.temperature) vitals.push(`T: ${v.temperature}°F`);
    if (v.heartRate) vitals.push(`HR: ${v.heartRate}`);
    if (v.bloodPressure) vitals.push(`BP: ${v.bloodPressure}`);
    if (v.respiratoryRate) vitals.push(`RR: ${v.respiratoryRate}`);
    if (v.oxygenSaturation) {
      vitals.push(`O2 Sat: ${v.oxygenSaturation}%${v.oxygenDevice ? ` on ${v.oxygenDevice}` : ' on RA'}`);
    }
    sections.push(vitals.join(', ') || '[No vitals documented]');
  } else {
    sections.push('[No vitals documented]');
  }

  sections.push('');
  sections.push('LABORATORY DATA:');
  if (patient.recentLabs.length > 0) {
    patient.recentLabs.forEach((lab) => {
      let labStr = `${lab.name}: ${lab.value}`;
      if (lab.unit) labStr += ` ${lab.unit}`;
      if (lab.flag) labStr += ` (${lab.flag.toUpperCase()})`;
      if (lab.referenceRange) labStr += ` [Ref: ${lab.referenceRange}]`;
      sections.push(`- ${labStr}`);
    });
  } else {
    sections.push('[No labs documented]');
  }

  if (additionalHistory) {
    sections.push('');
    sections.push('ADDITIONAL HISTORY/CONTEXT:');
    sections.push(additionalHistory);
  }

  sections.push('');
  sections.push('Please generate a complete H&P document based on the information above. Use appropriate placeholders for any missing information that would typically be included.');

  return sections.join('\n');
}

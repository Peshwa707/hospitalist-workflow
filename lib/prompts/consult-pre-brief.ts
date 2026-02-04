import type { Patient, ConsultPreBrief } from '../types';

// Specialty-specific context for optimized consult pre-briefs
const SPECIALTY_CONTEXT: Record<string, string> = {
  cardiology: `Focus on: cardiac history, risk factors (HTN, DM, HLD, smoking, family hx), ECG findings, troponins, BNP, echo results, anticoagulation status, current cardiac meds.`,
  nephrology: `Focus on: baseline creatinine, current GFR, urine output, electrolytes (K, Na, Ca, Phos), urinalysis, proteinuria, nephrotoxic meds, volume status, dialysis history.`,
  pulmonology: `Focus on: pulmonary history, smoking history, baseline O2, current respiratory status, ABG/VBG, chest imaging, PFTs if available, current respiratory support.`,
  gastroenterology: `Focus on: GI/liver history, relevant labs (LFTs, lipase, ammonia), imaging findings, bleeding history, alcohol use, current GI meds, endoscopy history.`,
  infectious_disease: `Focus on: infection site, culture data, current antibiotics (start date, doses), prior infections/organisms, immunocompromise, travel/exposures, fever curve, WBC trend.`,
  hematology: `Focus on: CBC with diff, coagulation studies, bleeding/clotting history, anticoagulation, transfusion history, malignancy history, smear findings if available.`,
  oncology: `Focus on: cancer type/stage, treatment history, last chemo/radiation, performance status, current complications, tumor markers, recent imaging.`,
  neurology: `Focus on: neuro exam findings, mental status changes, seizure history, stroke risk factors, relevant imaging (CT/MRI head), current neuro meds.`,
  surgery: `Focus on: surgical indication, relevant anatomy/imaging, anticoagulation status, NPO status, comorbidities affecting surgical risk, relevant labs (CBC, coags, type & screen).`,
  psychiatry: `Focus on: psychiatric history, current mental status, safety assessment, current psych meds, substance use, capacity concerns, social situation.`,
  default: `Focus on: relevant history, pertinent exam findings, labs and imaging, current management, specific question for the consultant.`,
};

export const CONSULT_PRE_BRIEF_SYSTEM_PROMPT = `You are a clinical communication specialist helping hospitalists prepare efficient, focused consult requests.

Your job is to distill patient information into a specialty-optimized brief that:
1. Respects the consultant's time with concise, relevant information
2. Includes the specific question being asked
3. Provides urgency justification
4. Highlights the most pertinent findings for that specialty

Remember: Good consults have a clear question, relevant background, and appropriate urgency.`;

export function buildConsultPreBriefPrompt(
  patient: Patient,
  specialty: string,
  consultQuestion: string,
  urgency: 'emergent' | 'urgent' | 'routine',
  recentNotes: string[]
): string {
  const specialtyContext = SPECIALTY_CONTEXT[specialty.toLowerCase().replace(/\s+/g, '_')] || SPECIALTY_CONTEXT.default;

  const labsFormatted = patient.recentLabs
    .map(l => `${l.name}: ${l.value}${l.flag ? ` [${l.flag}]` : ''}`)
    .join(', ');

  const vitalsFormatted = patient.recentVitals
    ? `T: ${patient.recentVitals.temperature || '-'}, HR: ${patient.recentVitals.heartRate || '-'}, BP: ${patient.recentVitals.bloodPressure || '-'}, RR: ${patient.recentVitals.respiratoryRate || '-'}, SpO2: ${patient.recentVitals.oxygenSaturation || '-'}${patient.recentVitals.oxygenDevice ? ` on ${patient.recentVitals.oxygenDevice}` : ''}`
    : 'Not recorded';

  return `Generate a consult pre-brief for ${specialty}:

SPECIALTY FOCUS:
${specialtyContext}

CONSULT DETAILS:
- Specialty: ${specialty}
- Urgency: ${urgency}
- Question: ${consultQuestion}

PATIENT:
- MRN: ${patient.mrn}
- Primary Diagnoses: ${patient.primaryDiagnoses.join(', ') || 'None listed'}
- Allergies: ${patient.allergies.join(', ') || 'NKDA'}

MEDICATIONS:
${patient.activeMedications.map(m => `${m.name} ${m.dose} ${m.route} ${m.frequency}`).join(', ') || 'None listed'}

VITALS: ${vitalsFormatted}

LABS: ${labsFormatted || 'None available'}

RECENT CLINICAL CONTEXT:
${recentNotes.slice(0, 2).join('\n\n') || 'No recent notes'}

Generate a pre-brief as JSON:
{
  "oneLineSummary": "Age, relevant history, reason for admission, current status - max 2 sentences",
  "relevantHistory": ["History items most relevant to this specialty"],
  "pertinentFindings": [
    {"category": "exam|lab|imaging|vitals", "finding": "string", "significance": "why this matters to the consultant"}
  ],
  "specificQuestion": "The clear, answerable question for the consultant",
  "relevantData": {
    "labs": ["Most relevant lab values for this specialty"],
    "imaging": ["Relevant imaging findings"],
    "vitals": "Current vital signs if relevant"
  },
  "urgencyJustification": "Why this consult needs to be seen at the requested urgency"
}

Return ONLY valid JSON, no markdown formatting.`;
}

export function parseConsultPreBriefResponse(
  response: string,
  patient: Patient,
  specialty: string
): ConsultPreBrief {
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    specialty,
    patientMrn: patient.mrn,
    oneLineSummary: parsed.oneLineSummary || '',
    relevantHistory: Array.isArray(parsed.relevantHistory) ? parsed.relevantHistory : [],
    pertinentFindings: Array.isArray(parsed.pertinentFindings) ? parsed.pertinentFindings : [],
    specificQuestion: parsed.specificQuestion || '',
    relevantData: {
      labs: Array.isArray(parsed.relevantData?.labs) ? parsed.relevantData.labs : [],
      imaging: Array.isArray(parsed.relevantData?.imaging) ? parsed.relevantData.imaging : [],
      vitals: parsed.relevantData?.vitals || undefined,
    },
    urgencyJustification: parsed.urgencyJustification || '',
    generatedAt: new Date().toISOString(),
  };
}

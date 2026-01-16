// Core TypeScript interfaces for the Hospitalist Workflow App

export interface ProgressNoteInput {
  patientInitials: string;
  hospitalDay: number;
  diagnosis: string;
  subjective: string;
  vitals?: string;
  labs?: string;
  physicalExam?: string;
  assessmentNotes?: string;
  planNotes?: string;
}

export interface ProgressNoteOutput {
  id?: number;
  content: string;
  generatedAt: string;
  input: ProgressNoteInput;
}

export interface DischargeSummaryInput {
  patientInitials: string;
  admissionDate: string;
  dischargeDate: string;
  admittingDiagnosis: string;
  dischargeDiagnosis: string;
  hospitalCourse: string;
  procedures?: string;
  medications?: string;
  followUp?: string;
  patientEducation?: string;
}

export interface DischargeSummaryOutput {
  id?: number;
  content: string;
  generatedAt: string;
  input: DischargeSummaryInput;
}

export interface AdmissionAnalysisInput {
  admissionNote: string;
}

export interface DifferentialDiagnosis {
  diagnosis: string;
  likelihood: 'high' | 'moderate' | 'low';
  reasoning: string;
}

export interface WorkupRecommendation {
  test: string;
  priority: 'stat' | 'routine' | 'consider';
  rationale: string;
}

export interface ConsultRecommendation {
  specialty: string;
  urgency: 'emergent' | 'urgent' | 'routine';
  reason: string;
}

export interface AdmissionAnalysisOutput {
  id?: number;
  differentialDiagnosis: DifferentialDiagnosis[];
  recommendedWorkup: WorkupRecommendation[];
  suggestedConsults: ConsultRecommendation[];
  dischargeReadiness: {
    assessment: string;
    barriers: string[];
    estimatedLOS: string;
  };
  limitations: string;
  generatedAt: string;
}

export interface NoteHistoryItem {
  id: number;
  type: 'progress' | 'discharge' | 'analysis';
  patientInitials: string;
  summary: string;
  createdAt: string;
}

// Database schema types
export interface DBNote {
  id: number;
  type: 'progress' | 'discharge' | 'analysis';
  patient_initials: string;
  input_json: string;
  output_json: string;
  created_at: string;
}

// Core TypeScript interfaces for the Hospitalist Workflow App

// Patient Profile Types
export interface Medication {
  name: string;
  dose: string;
  route: string;
  frequency: string;
}

export interface Vitals {
  temperature?: number;
  heartRate?: number;
  bloodPressure?: string;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  oxygenDevice?: string;
  recordedAt?: string;
}

export interface LabResult {
  name: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: 'high' | 'low' | 'critical';
  recordedAt?: string;
}

export interface Patient {
  id?: number;
  initials: string;
  roomNumber?: string;
  admissionDate?: string;
  primaryDiagnoses: string[];
  activeMedications: Medication[];
  allergies: string[];
  codeStatus?: string;
  recentVitals?: Vitals;
  recentLabs: LabResult[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DBPatient {
  id: number;
  initials: string;
  room_number: string | null;
  admission_date: string | null;
  primary_diagnoses: string;  // JSON array
  active_medications: string; // JSON array
  allergies: string;          // JSON array
  code_status: string | null;
  recent_vitals: string | null;  // JSON object
  recent_labs: string;           // JSON array
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Prior Care Summary Types
export interface PriorCareDocument {
  type: 'office_note' | 'discharge_summary' | 'consultation' | 'procedure' | 'other';
  date?: string;
  provider?: string;
  content: string;
}

export interface PriorCareSummaryInput {
  documents: string; // Raw pasted text containing multiple documents
  patientContext?: string; // Optional context about current admission
}

export interface MedicalProblem {
  problem: string;
  status: 'active' | 'resolved' | 'chronic' | 'unknown';
  lastMentioned?: string;
  keyDetails?: string;
}

export interface PriorCareSummaryOutput {
  patientOverview: string;
  activeProblems: MedicalProblem[];
  resolvedProblems: MedicalProblem[];
  surgicalHistory: string[];
  relevantMedications: {
    medication: string;
    indication?: string;
    changes?: string;
  }[];
  recentHospitalizations: {
    date?: string;
    reason: string;
    keyFindings?: string;
  }[];
  importantFindings: {
    category: string;
    finding: string;
    date?: string;
  }[];
  preventiveCare: {
    item: string;
    lastDate?: string;
    status?: string;
  }[];
  socialAndFunctional: string;
  keyContacts: {
    role: string;
    name?: string;
    specialty?: string;
  }[];
  clinicalPearls: string[];
  generatedAt: string;
}

// Speech Structuring Types
export interface SpeechStructuredData {
  subjective?: string;
  vitals?: string;
  labs?: string;
  physicalExam?: string;
  assessmentNotes?: string;
  planNotes?: string;
}

export interface ProgressNoteInput {
  patientId?: number;
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

// Care Coordination Types
export interface CareCoordinationInput {
  clinicalSummary: string;
  currentCareTeam?: string;
  patientGoals?: string;
}

export interface CareTeamMember {
  role: string;
  specialty?: string;
  responsibility: string;
  communicationPriority: 'high' | 'medium' | 'low';
}

export interface ConsultationNeed {
  specialty: string;
  reason: string;
  urgency: 'emergent' | 'urgent' | 'routine';
  keyQuestions: string[];
}

export interface HandoffItem {
  category: string;
  item: string;
  priority: 'critical' | 'important' | 'routine';
  actionRequired?: string;
}

export interface CareCoordinationOutput {
  summary: string;
  careTeamNeeds: CareTeamMember[];
  consultations: ConsultationNeed[];
  handoffItems: HandoffItem[];
  communicationPlan: {
    familyUpdates: string;
    teamHuddles: string;
    criticalAlerts: string[];
  };
  resourceNeeds: {
    resource: string;
    reason: string;
    timeline: string;
  }[];
  barriers: {
    barrier: string;
    mitigation: string;
  }[];
  generatedAt: string;
}

// Discharge Destination Planning Types
export interface DischargeDestinationInput {
  clinicalSummary: string;
  functionalStatus?: string;
  socialSupport?: string;
  insuranceType?: string;
  patientPreferences?: string;
}

export interface DischargeDestination {
  destination: 'home' | 'home_health' | 'snf' | 'ltac' | 'irf' | 'hospice' | 'ama';
  label: string;
  likelihood: 'most_likely' | 'possible' | 'unlikely';
  reasoning: string;
  requirements: string[];
  barriers: string[];
}

export interface DischargeTask {
  task: string;
  owner: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  dueBy?: string;
}

export interface DischargeDestinationOutput {
  recommendedDestination: DischargeDestination;
  alternativeDestinations: DischargeDestination[];
  dischargeCriteria: {
    criterion: string;
    met: boolean;
    notes?: string;
  }[];
  taskList: DischargeTask[];
  equipmentNeeds: string[];
  followUpNeeds: {
    specialty: string;
    timeframe: string;
    reason: string;
  }[];
  medicationReconciliation: {
    action: 'continue' | 'discontinue' | 'modify' | 'new';
    medication: string;
    notes?: string;
  }[];
  patientEducation: string[];
  redFlags: string[];
  estimatedDischargeDate?: string;
  generatedAt: string;
}

// Cognitive Bias Checker Types
export interface CognitiveBiasInput {
  clinicalReasoning: string;
  workingDiagnosis?: string;
  differentialConsidered?: string;
}

export interface IdentifiedBias {
  biasType: string;
  description: string;
  evidence: string;
  impact: 'high' | 'medium' | 'low';
  mitigation: string;
}

export interface AlternativeDiagnosis {
  diagnosis: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  suggestedWorkup: string[];
  mustNotMiss: boolean;
}

export interface CognitiveBiasOutput {
  overallAssessment: string;
  identifiedBiases: IdentifiedBias[];
  alternativeDiagnoses: AlternativeDiagnosis[];
  blindSpots: {
    area: string;
    consideration: string;
    question: string;
  }[];
  debiasingSuggestions: string[];
  diagnosticTimeoutRecommendation: string;
  keyQuestionsToAsk: string[];
  safetyNet: {
    condition: string;
    action: string;
  }[];
  generatedAt: string;
}

// Comprehensive Analysis Types (unified input)
export interface ComprehensiveAnalysisInput {
  admissionNote: string;
  functionalStatus?: string;
  socialSupport?: string;
  insuranceType?: string;
}

export interface ComprehensiveAnalysisOutput {
  admission: AdmissionAnalysisOutput;
  careCoordination: CareCoordinationOutput;
  dischargeDestination: DischargeDestinationOutput;
  cognitiveBias: CognitiveBiasOutput;
  generatedAt: string;
}

// Database schema types
export interface DBNote {
  id: number;
  type: 'progress' | 'discharge' | 'analysis';
  patient_id: number | null;
  patient_initials: string;
  input_json: string;
  output_json: string;
  created_at: string;
}

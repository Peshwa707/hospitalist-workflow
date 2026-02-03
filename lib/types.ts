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
  mrn: string;  // Medical Record Number - the only patient identifier stored
  roomNumber?: string;
  admissionDate?: string;
  primaryDiagnoses: string[];
  activeMedications: Medication[];
  allergies: string[];
  codeStatus?: string;
  recentVitals?: Vitals;
  recentLabs: LabResult[];
  notes?: string;  // Clinical notes only - no PHI
  createdAt?: string;
  updatedAt?: string;
}

export interface DBPatient {
  id: number;
  mrn: string;  // Medical Record Number
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
  patientMrn: string;
  hospitalDay: number;
  diagnosis: string;
  subjective: string;
  vitals?: string;
  labs?: string;
  physicalExam?: string;
  assessmentNotes?: string;
  planNotes?: string;
  previousNoteContent?: string; // H&P or previous progress note to build upon
  previousNoteType?: 'hp' | 'progress';
}

export interface ProgressNoteOutput {
  id?: number;
  content: string;
  generatedAt: string;
  input: ProgressNoteInput;
}

export interface DischargeSummaryInput {
  patientMrn: string;
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
  type: 'progress' | 'discharge' | 'analysis' | 'hp' | 'clinical_summary' | 'briefing' | 'signout';
  patientMrn: string;
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
  type: 'progress' | 'discharge' | 'analysis' | 'hp' | 'clinical_summary' | 'briefing' | 'signout';
  patient_id: number | null;
  patient_mrn: string;
  input_json: string;
  output_json: string;
  created_at: string;
}

// ML Integration: Feedback and Learning Types

export interface Feedback {
  id?: number;
  noteId: number;
  rating?: number;  // 1-5
  wasHelpful?: boolean;
  wasAccurate?: boolean;
  wasUsed?: boolean;
  modifications?: string;
  feedbackText?: string;
  createdAt?: string;
}

export interface DBFeedback {
  id: number;
  note_id: number;
  rating: number | null;
  was_helpful: number | null;  // SQLite stores booleans as 0/1
  was_accurate: number | null;
  was_used: number | null;
  modifications: string | null;
  feedback_text: string | null;
  created_at: string;
}

export interface AnalysisMetrics {
  id?: number;
  noteId: number;
  analysisType: string;
  modelUsed: string;
  promptVersion: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  finishReason?: string;
  errorCode?: string;
  createdAt?: string;
}

export interface DBAnalysisMetrics {
  id: number;
  note_id: number;
  analysis_type: string;
  model_used: string;
  prompt_version: string;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  finish_reason: string | null;
  error_code: string | null;
  created_at: string;
}

export interface LearningInsight {
  analysisType: string;
  averageRating: number;
  totalFeedback: number;
  helpfulRate: number;
  accuracyRate: number;
  usageRate: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface DashboardMetrics {
  totalAnalyses: number;
  totalFeedback: number;
  averageRating: number;
  feedbackRate: number;
  byType: Record<string, LearningInsight>;
  recentTrend: { date: string; rating: number; count: number }[];
  modelPerformance: {
    model: string;
    avgLatency: number;
    avgTokens: number;
    count: number;
  }[];
}

// H&P Generation Types
export interface HpInput {
  patientId: number;
  chiefComplaint?: string;
  additionalHistory?: string;
}

export interface HpOutput {
  id?: number;
  content: string;
  generatedAt: string;
  patientId: number;
  patientMrn: string;
}

// EMR-to-Patient Profile Types
export interface ParsedPatientProfile {
  mrn: string | null;  // Medical Record Number - only identifier extracted
  roomNumber: string | null;
  admissionDate: string | null;
  primaryDiagnoses: string[];
  allergies: string[];
  codeStatus: string | null;
  vitals: Vitals | null;
  labs: LabResult[];
  medications: Medication[];
  parseNotes: string;
  confidence: 'high' | 'medium' | 'low';
  extractedFrom: 'admission_note' | 'progress_note' | 'hp' | 'discharge' | 'unknown';
  // PHI fields explicitly NOT extracted: name, DOB, SSN, address, phone, email, insurance
}

// Patient Task/Checklist Types
export interface PatientTask {
  id?: number;
  patientId: number;
  task: string;
  category: 'workup' | 'consult' | 'medication' | 'discharge' | 'follow_up' | 'other';
  priority: 'stat' | 'urgent' | 'routine';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  source: 'ai_analysis' | 'manual';
  notes?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DBPatientTask {
  id: number;
  patient_id: number;
  task: string;
  category: string;
  priority: string;
  status: string;
  source: string;
  notes: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Patient Notes Summary
export interface PatientNoteSummary {
  id: number;
  type: 'progress' | 'discharge' | 'analysis' | 'hp';
  summary: string;
  createdAt: string;
}

// Embeddings Types for Semantic Search
export interface NoteEmbedding {
  id: number;
  noteId: number;
  embeddingModel: string;
  embeddingVector: number[];
  embeddingDimensions: number;
  contentHash: string;
  createdAt: string;
}

export interface DBNoteEmbedding {
  id: number;
  note_id: number;
  embedding_model: string;
  embedding_vector: Buffer;
  embedding_dimensions: number;
  content_hash: string | null;
  created_at: string;
}

export interface SimilarNote {
  note: DBNote;
  similarity: number;
}

// ============ Pre-Round Briefing Types ============

export interface PatientBriefing {
  patientId: number;
  patientMrn: string;
  roomNumber?: string;
  hospitalDay: number;
  keyIssues: { issue: string; severity: 'critical' | 'important' | 'routine'; context: string }[];
  overnightEvents: string[];
  pendingTasks: { task: string; priority: 'stat' | 'urgent' | 'routine'; category: string }[];
  labsToReview: { test: string; value: string; trend?: string; flag?: string }[];
  anticipatedIssues: string[];
  suggestedFocus: string;
  generatedAt: string;
}

export interface BlindSpotChallengeOutput {
  potentialMisses: { item: string; category: string; reasoning: string; suggestedAction: string; urgency: string }[];
  questionsToConsider: string[];
  safetyNet: { condition: string; returnPrecaution: string }[];
  generatedAt: string;
}

// ============ Similar Cases RAG Types ============

export interface SimilarCaseSummary {
  noteId: number;
  noteType: string;
  patientMrn: string;
  similarity: number;
  createdAt: string;
  presentation: string;
  keyFindings: string[];
  workupPerformed: string[];
  outcome?: string;
  lessonsLearned?: string[];
}

export interface SimilarCasesOutput {
  cases: SimilarCaseSummary[];
  synthesizedInsights?: {
    commonPatterns: string[];
    typicalWorkup: string[];
    pitfalls: string[];
  };
  generatedAt: string;
}

// ============ Signout Types ============

export interface PatientSignout {
  patientId: number;
  patientMrn: string;
  roomNumber?: string;
  oneLiner: string;
  activeIssues: { problem: string; status: string; plan: string }[];
  ifThenScenarios: { condition: string; action: string; escalation?: string }[];
  overnightConcerns: { concern: string; likelihood: string; preparation: string }[];
  pendingItems: { item: string; expectedTime?: string; action: string }[];
  codeStatus: string;
  generatedAt: string;
}

export interface ConsultPreBrief {
  specialty: string;
  patientMrn: string;
  oneLineSummary: string;
  relevantHistory: string[];
  pertinentFindings: { category: string; finding: string; significance: string }[];
  specificQuestion: string;
  relevantData: { labs?: string[]; imaging?: string[]; vitals?: string };
  urgencyJustification: string;
  generatedAt: string;
}

// ============ Clinical Summary Types ============

export interface ClinicalDataDumpInput {
  rawData: string;
  dataHints?: string[];
  patientContext?: string;
  focusAreas?: string[];
}

export interface ClinicalSummaryOutput {
  id?: number;
  parsedDataTypes: { types: string[]; confidence: string; parseNotes: string };
  summary: {
    oneLiner: string;
    activeProblems: { problem: string; status: string; supportingData: string[] }[];
    keyFindings: { category: string; finding: string; significance: 'critical' | 'important' | 'routine' }[];
  };
  clinicalTrajectory: 'improving' | 'stable' | 'worsening' | 'unclear';
  nextSteps: {
    category: 'workup' | 'treatment' | 'consult' | 'disposition' | 'monitoring';
    action: string;
    priority: 'stat' | 'urgent' | 'routine';
    rationale: string;
  }[];
  gapsIdentified: { gap: string; importance: string; suggestion: string }[];
  safetyConsiderations: string[];
  generatedAt: string;
}

export interface EmbeddingStats {
  totalNotes: number;
  notesWithEmbeddings: number;
  coveragePercent: number;
  modelBreakdown: Record<string, number>;
}

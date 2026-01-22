import Database from 'better-sqlite3';
import path from 'path';
import type {
  DBNote, NoteHistoryItem, Patient, DBPatient,
  Feedback, DBFeedback, AnalysisMetrics, DBAnalysisMetrics,
  PatientTask, DBPatientTask, PatientNoteSummary
} from './types';

// Database file stored in project root
const DB_PATH = path.join(process.cwd(), 'hospitalist.db');

// Singleton pattern for database connection
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const database = db!;

  // Create tables first (without patient_id in notes - will add via migration)
  database.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('progress', 'discharge', 'analysis', 'hp')),
      patient_initials TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      initials TEXT NOT NULL UNIQUE,
      room_number TEXT,
      admission_date TEXT,
      primary_diagnoses TEXT DEFAULT '[]',
      active_medications TEXT DEFAULT '[]',
      allergies TEXT DEFAULT '[]',
      code_status TEXT,
      recent_vitals TEXT,
      recent_labs TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Add patient_id column to existing notes table if it doesn't exist
  try {
    database.exec('ALTER TABLE notes ADD COLUMN patient_id INTEGER REFERENCES patients(id)');
  } catch {
    // Column already exists, ignore
  }

  // Create indices after all columns exist
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_patient ON notes(patient_initials);
    CREATE INDEX IF NOT EXISTS idx_notes_patient_id ON notes(patient_id);
    CREATE INDEX IF NOT EXISTS idx_patients_initials ON patients(initials);
  `);

  // ML Integration: Feedback and Analysis Metrics tables
  database.exec(`
    -- Feedback on AI-generated analyses
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      was_helpful BOOLEAN,
      was_accurate BOOLEAN,
      was_used BOOLEAN,
      modifications TEXT,
      feedback_text TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Metrics for each AI call (for learning signals)
    CREATE TABLE IF NOT EXISTS analysis_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      analysis_type TEXT NOT NULL,
      model_used TEXT NOT NULL,
      prompt_version TEXT DEFAULT 'v1',
      input_tokens INTEGER,
      output_tokens INTEGER,
      latency_ms INTEGER,
      finish_reason TEXT,
      error_code TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_feedback_note ON feedback(note_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
    CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
    CREATE INDEX IF NOT EXISTS idx_metrics_note ON analysis_metrics(note_id);
    CREATE INDEX IF NOT EXISTS idx_metrics_model ON analysis_metrics(model_used);
    CREATE INDEX IF NOT EXISTS idx_metrics_type ON analysis_metrics(analysis_type);

    -- Patient tasks/checklist
    CREATE TABLE IF NOT EXISTS patient_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      task TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('workup', 'consult', 'medication', 'discharge', 'follow_up', 'other')),
      priority TEXT NOT NULL CHECK(priority IN ('stat', 'urgent', 'routine')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      source TEXT NOT NULL CHECK(source IN ('ai_analysis', 'manual')),
      notes TEXT,
      due_date TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_patient ON patient_tasks(patient_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON patient_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON patient_tasks(priority);
  `);
}

export function saveNote(
  type: 'progress' | 'discharge' | 'analysis',
  patientInitials: string,
  input: object,
  output: object
): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO notes (type, patient_initials, input_json, output_json)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    type,
    patientInitials,
    JSON.stringify(input),
    JSON.stringify(output)
  );

  return result.lastInsertRowid as number;
}

export function getNoteById(id: number): DBNote | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM notes WHERE id = ?');
  return stmt.get(id) as DBNote | null;
}

export function getNoteHistory(
  limit: number = 50,
  offset: number = 0,
  type?: 'progress' | 'discharge' | 'analysis'
): NoteHistoryItem[] {
  const database = getDb();

  let query = 'SELECT id, type, patient_initials, output_json, created_at FROM notes';
  const params: (string | number)[] = [];

  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = database.prepare(query);
  const rows = stmt.all(...params) as DBNote[];

  return rows.map((row) => {
    const output = JSON.parse(row.output_json);
    let summary = '';

    if (row.type === 'progress' || row.type === 'discharge') {
      // Extract first 100 chars of content
      summary = output.content?.substring(0, 100) + '...' || 'No content';
    } else if (row.type === 'analysis') {
      // Show top differential
      const topDx = output.differentialDiagnosis?.[0];
      summary = topDx ? `Top Dx: ${topDx.diagnosis}` : 'No diagnosis';
    }

    return {
      id: row.id,
      type: row.type,
      patientInitials: row.patient_initials,
      summary,
      createdAt: row.created_at,
    };
  });
}

export function searchNotes(
  searchTerm: string,
  limit: number = 50
): NoteHistoryItem[] {
  const database = getDb();

  const stmt = database.prepare(`
    SELECT id, type, patient_initials, output_json, created_at
    FROM notes
    WHERE patient_initials LIKE ? OR output_json LIKE ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const pattern = `%${searchTerm}%`;
  const rows = stmt.all(pattern, pattern, limit) as DBNote[];

  return rows.map((row) => {
    const output = JSON.parse(row.output_json);
    let summary = '';

    if (row.type === 'progress' || row.type === 'discharge') {
      summary = output.content?.substring(0, 100) + '...' || 'No content';
    } else if (row.type === 'analysis') {
      const topDx = output.differentialDiagnosis?.[0];
      summary = topDx ? `Top Dx: ${topDx.diagnosis}` : 'No diagnosis';
    }

    return {
      id: row.id,
      type: row.type,
      patientInitials: row.patient_initials,
      summary,
      createdAt: row.created_at,
    };
  });
}

export function deleteNote(id: number): boolean {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM notes WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function updateNoteContent(id: number, content: string): boolean {
  const database = getDb();
  const note = getNoteById(id);
  if (!note) return false;

  // Parse existing output and update content field
  const output = JSON.parse(note.output_json);
  output.content = content;
  output.editedAt = new Date().toISOString();

  const stmt = database.prepare('UPDATE notes SET output_json = ? WHERE id = ?');
  const result = stmt.run(JSON.stringify(output), id);
  return result.changes > 0;
}

// Patient CRUD operations

function dbPatientToPatient(row: DBPatient): Patient {
  return {
    id: row.id,
    initials: row.initials,
    roomNumber: row.room_number || undefined,
    admissionDate: row.admission_date || undefined,
    primaryDiagnoses: JSON.parse(row.primary_diagnoses || '[]'),
    activeMedications: JSON.parse(row.active_medications || '[]'),
    allergies: JSON.parse(row.allergies || '[]'),
    codeStatus: row.code_status || undefined,
    recentVitals: row.recent_vitals ? JSON.parse(row.recent_vitals) : undefined,
    recentLabs: JSON.parse(row.recent_labs || '[]'),
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createPatient(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO patients (initials, room_number, admission_date, primary_diagnoses,
      active_medications, allergies, code_status, recent_vitals, recent_labs, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    patient.initials,
    patient.roomNumber || null,
    patient.admissionDate || null,
    JSON.stringify(patient.primaryDiagnoses || []),
    JSON.stringify(patient.activeMedications || []),
    JSON.stringify(patient.allergies || []),
    patient.codeStatus || null,
    patient.recentVitals ? JSON.stringify(patient.recentVitals) : null,
    JSON.stringify(patient.recentLabs || []),
    patient.notes || null
  );

  return result.lastInsertRowid as number;
}

export function getPatientById(id: number): Patient | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM patients WHERE id = ?');
  const row = stmt.get(id) as DBPatient | undefined;
  return row ? dbPatientToPatient(row) : null;
}

export function getPatientByInitials(initials: string): Patient | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM patients WHERE initials = ?');
  const row = stmt.get(initials) as DBPatient | undefined;
  return row ? dbPatientToPatient(row) : null;
}

export function getAllPatients(): Patient[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM patients ORDER BY updated_at DESC');
  const rows = stmt.all() as DBPatient[];
  return rows.map(dbPatientToPatient);
}

export function updatePatient(id: number, patient: Partial<Patient>): boolean {
  const database = getDb();

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (patient.initials !== undefined) {
    updates.push('initials = ?');
    values.push(patient.initials);
  }
  if (patient.roomNumber !== undefined) {
    updates.push('room_number = ?');
    values.push(patient.roomNumber || null);
  }
  if (patient.admissionDate !== undefined) {
    updates.push('admission_date = ?');
    values.push(patient.admissionDate || null);
  }
  if (patient.primaryDiagnoses !== undefined) {
    updates.push('primary_diagnoses = ?');
    values.push(JSON.stringify(patient.primaryDiagnoses));
  }
  if (patient.activeMedications !== undefined) {
    updates.push('active_medications = ?');
    values.push(JSON.stringify(patient.activeMedications));
  }
  if (patient.allergies !== undefined) {
    updates.push('allergies = ?');
    values.push(JSON.stringify(patient.allergies));
  }
  if (patient.codeStatus !== undefined) {
    updates.push('code_status = ?');
    values.push(patient.codeStatus || null);
  }
  if (patient.recentVitals !== undefined) {
    updates.push('recent_vitals = ?');
    values.push(patient.recentVitals ? JSON.stringify(patient.recentVitals) : null);
  }
  if (patient.recentLabs !== undefined) {
    updates.push('recent_labs = ?');
    values.push(JSON.stringify(patient.recentLabs));
  }
  if (patient.notes !== undefined) {
    updates.push('notes = ?');
    values.push(patient.notes || null);
  }

  if (updates.length === 0) return false;

  updates.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = database.prepare(`UPDATE patients SET ${updates.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function deletePatient(id: number): boolean {
  const database = getDb();

  // Delete related records first (cascade manually since ALTER TABLE can't add ON DELETE CASCADE)
  database.prepare('DELETE FROM patient_tasks WHERE patient_id = ?').run(id);
  database.prepare('DELETE FROM feedback WHERE note_id IN (SELECT id FROM notes WHERE patient_id = ?)').run(id);
  database.prepare('DELETE FROM analysis_metrics WHERE note_id IN (SELECT id FROM notes WHERE patient_id = ?)').run(id);
  database.prepare('DELETE FROM notes WHERE patient_id = ?').run(id);

  // Now delete the patient
  const stmt = database.prepare('DELETE FROM patients WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function searchPatients(searchTerm: string): Patient[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM patients
    WHERE initials LIKE ? OR room_number LIKE ? OR primary_diagnoses LIKE ?
    ORDER BY updated_at DESC
  `);
  const pattern = `%${searchTerm}%`;
  const rows = stmt.all(pattern, pattern, pattern) as DBPatient[];
  return rows.map(dbPatientToPatient);
}

// Update saveNote to optionally include patient_id
export function saveNoteWithPatient(
  type: 'progress' | 'discharge' | 'analysis' | 'hp',
  patientInitials: string,
  input: object,
  output: object,
  patientId?: number
): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO notes (type, patient_id, patient_initials, input_json, output_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    type,
    patientId || null,
    patientInitials,
    JSON.stringify(input),
    JSON.stringify(output)
  );

  return result.lastInsertRowid as number;
}

// ============ Feedback CRUD Operations ============

function dbFeedbackToFeedback(row: DBFeedback): Feedback {
  return {
    id: row.id,
    noteId: row.note_id,
    rating: row.rating ?? undefined,
    wasHelpful: row.was_helpful === 1,
    wasAccurate: row.was_accurate === 1,
    wasUsed: row.was_used === 1,
    modifications: row.modifications ?? undefined,
    feedbackText: row.feedback_text ?? undefined,
    createdAt: row.created_at,
  };
}

export function saveFeedback(feedback: Omit<Feedback, 'id' | 'createdAt'>): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO feedback (note_id, rating, was_helpful, was_accurate, was_used, modifications, feedback_text)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    feedback.noteId,
    feedback.rating ?? null,
    feedback.wasHelpful !== undefined ? (feedback.wasHelpful ? 1 : 0) : null,
    feedback.wasAccurate !== undefined ? (feedback.wasAccurate ? 1 : 0) : null,
    feedback.wasUsed !== undefined ? (feedback.wasUsed ? 1 : 0) : null,
    feedback.modifications ?? null,
    feedback.feedbackText ?? null
  );

  return result.lastInsertRowid as number;
}

export function getFeedbackByNoteId(noteId: number): Feedback | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM feedback WHERE note_id = ? ORDER BY created_at DESC LIMIT 1');
  const row = stmt.get(noteId) as DBFeedback | undefined;
  return row ? dbFeedbackToFeedback(row) : null;
}

export function getAllFeedback(limit: number = 100, offset: number = 0): Feedback[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT ? OFFSET ?');
  const rows = stmt.all(limit, offset) as DBFeedback[];
  return rows.map(dbFeedbackToFeedback);
}

export function updateFeedback(id: number, feedback: Partial<Feedback>): boolean {
  const database = getDb();
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (feedback.rating !== undefined) {
    updates.push('rating = ?');
    values.push(feedback.rating);
  }
  if (feedback.wasHelpful !== undefined) {
    updates.push('was_helpful = ?');
    values.push(feedback.wasHelpful ? 1 : 0);
  }
  if (feedback.wasAccurate !== undefined) {
    updates.push('was_accurate = ?');
    values.push(feedback.wasAccurate ? 1 : 0);
  }
  if (feedback.wasUsed !== undefined) {
    updates.push('was_used = ?');
    values.push(feedback.wasUsed ? 1 : 0);
  }
  if (feedback.modifications !== undefined) {
    updates.push('modifications = ?');
    values.push(feedback.modifications);
  }
  if (feedback.feedbackText !== undefined) {
    updates.push('feedback_text = ?');
    values.push(feedback.feedbackText);
  }

  if (updates.length === 0) return false;

  values.push(id);
  const stmt = database.prepare(`UPDATE feedback SET ${updates.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

// ============ Analysis Metrics CRUD Operations ============

function dbMetricsToMetrics(row: DBAnalysisMetrics): AnalysisMetrics {
  return {
    id: row.id,
    noteId: row.note_id,
    analysisType: row.analysis_type,
    modelUsed: row.model_used,
    promptVersion: row.prompt_version,
    inputTokens: row.input_tokens ?? undefined,
    outputTokens: row.output_tokens ?? undefined,
    latencyMs: row.latency_ms ?? undefined,
    finishReason: row.finish_reason ?? undefined,
    errorCode: row.error_code ?? undefined,
    createdAt: row.created_at,
  };
}

export function saveAnalysisMetrics(metrics: Omit<AnalysisMetrics, 'id' | 'createdAt'>): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO analysis_metrics (note_id, analysis_type, model_used, prompt_version, input_tokens, output_tokens, latency_ms, finish_reason, error_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    metrics.noteId,
    metrics.analysisType,
    metrics.modelUsed,
    metrics.promptVersion || 'v1',
    metrics.inputTokens ?? null,
    metrics.outputTokens ?? null,
    metrics.latencyMs ?? null,
    metrics.finishReason ?? null,
    metrics.errorCode ?? null
  );

  return result.lastInsertRowid as number;
}

export function getMetricsByNoteId(noteId: number): AnalysisMetrics | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM analysis_metrics WHERE note_id = ?');
  const row = stmt.get(noteId) as DBAnalysisMetrics | undefined;
  return row ? dbMetricsToMetrics(row) : null;
}

export function getMetricsAggregates(): {
  totalAnalyses: number;
  byType: { type: string; count: number; avgLatency: number; avgTokens: number }[];
  byModel: { model: string; count: number; avgLatency: number; avgTokens: number }[];
} {
  const database = getDb();

  const totalStmt = database.prepare('SELECT COUNT(*) as count FROM analysis_metrics');
  const totalResult = totalStmt.get() as { count: number };

  const byTypeStmt = database.prepare(`
    SELECT
      analysis_type as type,
      COUNT(*) as count,
      AVG(latency_ms) as avgLatency,
      AVG(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) as avgTokens
    FROM analysis_metrics
    GROUP BY analysis_type
  `);
  const byType = byTypeStmt.all() as { type: string; count: number; avgLatency: number; avgTokens: number }[];

  const byModelStmt = database.prepare(`
    SELECT
      model_used as model,
      COUNT(*) as count,
      AVG(latency_ms) as avgLatency,
      AVG(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) as avgTokens
    FROM analysis_metrics
    GROUP BY model_used
  `);
  const byModel = byModelStmt.all() as { model: string; count: number; avgLatency: number; avgTokens: number }[];

  return {
    totalAnalyses: totalResult.count,
    byType,
    byModel,
  };
}

export function getFeedbackAggregates(): {
  totalFeedback: number;
  averageRating: number;
  helpfulRate: number;
  accuracyRate: number;
  usageRate: number;
  byType: {
    type: string;
    count: number;
    avgRating: number;
    helpfulRate: number;
    accuracyRate: number;
    usageRate: number;
  }[];
  recentTrend: { date: string; avgRating: number; count: number }[];
} {
  const database = getDb();

  const totalStmt = database.prepare('SELECT COUNT(*) as count FROM feedback');
  const totalResult = totalStmt.get() as { count: number };

  const avgStmt = database.prepare(`
    SELECT
      AVG(rating) as avgRating,
      AVG(CASE WHEN was_helpful = 1 THEN 1.0 ELSE 0.0 END) as helpfulRate,
      AVG(CASE WHEN was_accurate = 1 THEN 1.0 ELSE 0.0 END) as accuracyRate,
      AVG(CASE WHEN was_used = 1 THEN 1.0 ELSE 0.0 END) as usageRate
    FROM feedback
    WHERE rating IS NOT NULL
  `);
  const avgResult = avgStmt.get() as {
    avgRating: number | null;
    helpfulRate: number | null;
    accuracyRate: number | null;
    usageRate: number | null;
  };

  const byTypeStmt = database.prepare(`
    SELECT
      n.type as type,
      COUNT(*) as count,
      AVG(f.rating) as avgRating,
      AVG(CASE WHEN f.was_helpful = 1 THEN 1.0 ELSE 0.0 END) as helpfulRate,
      AVG(CASE WHEN f.was_accurate = 1 THEN 1.0 ELSE 0.0 END) as accuracyRate,
      AVG(CASE WHEN f.was_used = 1 THEN 1.0 ELSE 0.0 END) as usageRate
    FROM feedback f
    JOIN notes n ON f.note_id = n.id
    GROUP BY n.type
  `);
  const byType = byTypeStmt.all() as {
    type: string;
    count: number;
    avgRating: number;
    helpfulRate: number;
    accuracyRate: number;
    usageRate: number;
  }[];

  const trendStmt = database.prepare(`
    SELECT
      date(created_at) as date,
      AVG(rating) as avgRating,
      COUNT(*) as count
    FROM feedback
    WHERE rating IS NOT NULL
    GROUP BY date(created_at)
    ORDER BY date DESC
    LIMIT 30
  `);
  const recentTrend = trendStmt.all() as { date: string; avgRating: number; count: number }[];

  return {
    totalFeedback: totalResult.count,
    averageRating: avgResult.avgRating ?? 0,
    helpfulRate: avgResult.helpfulRate ?? 0,
    accuracyRate: avgResult.accuracyRate ?? 0,
    usageRate: avgResult.usageRate ?? 0,
    byType,
    recentTrend,
  };
}

// ============ Patient Tasks CRUD Operations ============

function dbTaskToTask(row: DBPatientTask): PatientTask {
  return {
    id: row.id,
    patientId: row.patient_id,
    task: row.task,
    category: row.category as PatientTask['category'],
    priority: row.priority as PatientTask['priority'],
    status: row.status as PatientTask['status'],
    source: row.source as PatientTask['source'],
    notes: row.notes ?? undefined,
    dueDate: row.due_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createTask(task: Omit<PatientTask, 'id' | 'createdAt' | 'updatedAt'>): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO patient_tasks (patient_id, task, category, priority, status, source, notes, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    task.patientId,
    task.task,
    task.category,
    task.priority,
    task.status,
    task.source,
    task.notes ?? null,
    task.dueDate ?? null
  );

  return result.lastInsertRowid as number;
}

export function createTasksFromAnalysis(
  patientId: number,
  workup: { test: string; priority: string; rationale: string }[],
  consults: { specialty: string; urgency: string; reason: string }[]
): number[] {
  const taskIds: number[] = [];

  // Create workup tasks
  for (const item of workup) {
    const priority = item.priority === 'stat' ? 'stat' : item.priority === 'routine' ? 'routine' : 'urgent';
    const id = createTask({
      patientId,
      task: item.test,
      category: 'workup',
      priority,
      status: 'pending',
      source: 'ai_analysis',
      notes: item.rationale,
    });
    taskIds.push(id);
  }

  // Create consult tasks
  for (const item of consults) {
    const priority = item.urgency === 'emergent' ? 'stat' : item.urgency === 'urgent' ? 'urgent' : 'routine';
    const id = createTask({
      patientId,
      task: `Consult: ${item.specialty}`,
      category: 'consult',
      priority,
      status: 'pending',
      source: 'ai_analysis',
      notes: item.reason,
    });
    taskIds.push(id);
  }

  return taskIds;
}

export function getTasksByPatientId(patientId: number): PatientTask[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM patient_tasks
    WHERE patient_id = ?
    ORDER BY
      CASE priority WHEN 'stat' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
      CASE status WHEN 'pending' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
      created_at DESC
  `);
  const rows = stmt.all(patientId) as DBPatientTask[];
  return rows.map(dbTaskToTask);
}

export function updateTaskStatus(
  taskId: number,
  status: PatientTask['status']
): boolean {
  const database = getDb();
  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  const stmt = database.prepare(`
    UPDATE patient_tasks
    SET status = ?, completed_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  const result = stmt.run(status, completedAt, taskId);
  return result.changes > 0;
}

export function deleteTask(taskId: number): boolean {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM patient_tasks WHERE id = ?');
  const result = stmt.run(taskId);
  return result.changes > 0;
}

// ============ Patient Notes Operations ============

export function getNotesByPatientId(patientId: number): PatientNoteSummary[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, type, output_json, created_at
    FROM notes
    WHERE patient_id = ?
    ORDER BY created_at DESC
  `);
  const rows = stmt.all(patientId) as { id: number; type: string; output_json: string; created_at: string }[];

  return rows.map((row) => {
    const output = JSON.parse(row.output_json);
    let summary = '';

    if (row.type === 'hp') {
      summary = 'H&P Document';
    } else if (row.type === 'progress') {
      summary = 'Progress Note';
    } else if (row.type === 'discharge') {
      summary = 'Discharge Summary';
    } else if (row.type === 'analysis') {
      summary = 'Clinical Analysis';
    }

    return {
      id: row.id,
      type: row.type as PatientNoteSummary['type'],
      summary,
      createdAt: row.created_at,
    };
  });
}

// ============ Rounding Dashboard Operations ============

export interface PatientWithTaskCounts extends Patient {
  pendingTaskCount: number;
  statTaskCount: number;
  urgentTaskCount: number;
  lastNoteDate: string | null;
  lastNoteType: string | null;
}

export function getAllPatientsWithTaskCounts(): PatientWithTaskCounts[] {
  const database = getDb();

  const stmt = database.prepare(`
    SELECT
      p.*,
      COALESCE(t.pending_count, 0) as pending_task_count,
      COALESCE(t.stat_count, 0) as stat_task_count,
      COALESCE(t.urgent_count, 0) as urgent_task_count,
      n.last_note_date,
      n.last_note_type
    FROM patients p
    LEFT JOIN (
      SELECT
        patient_id,
        SUM(CASE WHEN status IN ('pending', 'in_progress') THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status IN ('pending', 'in_progress') AND priority = 'stat' THEN 1 ELSE 0 END) as stat_count,
        SUM(CASE WHEN status IN ('pending', 'in_progress') AND priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count
      FROM patient_tasks
      GROUP BY patient_id
    ) t ON p.id = t.patient_id
    LEFT JOIN (
      SELECT
        patient_id,
        MAX(created_at) as last_note_date,
        (SELECT type FROM notes n2 WHERE n2.patient_id = notes.patient_id ORDER BY created_at DESC LIMIT 1) as last_note_type
      FROM notes
      WHERE patient_id IS NOT NULL
      GROUP BY patient_id
    ) n ON p.id = n.patient_id
    ORDER BY
      COALESCE(t.stat_count, 0) DESC,
      COALESCE(t.urgent_count, 0) DESC,
      p.updated_at DESC
  `);

  const rows = stmt.all() as (DBPatient & {
    pending_task_count: number;
    stat_task_count: number;
    urgent_task_count: number;
    last_note_date: string | null;
    last_note_type: string | null;
  })[];

  return rows.map((row) => ({
    ...dbPatientToPatient(row),
    pendingTaskCount: row.pending_task_count,
    statTaskCount: row.stat_task_count,
    urgentTaskCount: row.urgent_task_count,
    lastNoteDate: row.last_note_date,
    lastNoteType: row.last_note_type,
  }));
}

// Get all tasks across all patients with optional filters
export interface TaskWithPatient extends PatientTask {
  patientInitials: string;
  patientRoom: string | null;
}

export function getAllTasks(filters?: {
  status?: PatientTask['status'][];
  priority?: PatientTask['priority'][];
  category?: PatientTask['category'][];
}): TaskWithPatient[] {
  const database = getDb();

  let query = `
    SELECT
      t.*,
      p.initials as patient_initials,
      p.room_number as patient_room
    FROM patient_tasks t
    JOIN patients p ON t.patient_id = p.id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (filters?.status && filters.status.length > 0) {
    query += ` AND t.status IN (${filters.status.map(() => '?').join(',')})`;
    params.push(...filters.status);
  }

  if (filters?.priority && filters.priority.length > 0) {
    query += ` AND t.priority IN (${filters.priority.map(() => '?').join(',')})`;
    params.push(...filters.priority);
  }

  if (filters?.category && filters.category.length > 0) {
    query += ` AND t.category IN (${filters.category.map(() => '?').join(',')})`;
    params.push(...filters.category);
  }

  query += `
    ORDER BY
      CASE t.priority WHEN 'stat' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
      CASE t.status WHEN 'pending' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
      t.created_at DESC
  `;

  const stmt = database.prepare(query);
  const rows = stmt.all(...params) as (DBPatientTask & {
    patient_initials: string;
    patient_room: string | null;
  })[];

  return rows.map((row) => ({
    ...dbTaskToTask(row),
    patientInitials: row.patient_initials,
    patientRoom: row.patient_room,
  }));
}

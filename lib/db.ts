import Database from 'better-sqlite3';
import path from 'path';
import type { DBNote, NoteHistoryItem, Patient, DBPatient, Medication, LabResult, Vitals } from './types';

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
      type TEXT NOT NULL CHECK(type IN ('progress', 'discharge', 'analysis')),
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
  type: 'progress' | 'discharge' | 'analysis',
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

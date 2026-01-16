import Database from 'better-sqlite3';
import path from 'path';
import type { DBNote, NoteHistoryItem } from './types';

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

  database.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('progress', 'discharge', 'analysis')),
      patient_initials TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_patient ON notes(patient_initials);
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

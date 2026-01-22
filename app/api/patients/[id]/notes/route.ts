import { NextResponse } from 'next/server';
import { getNotesByPatientId, getPatientById, getNoteById } from '@/lib/db';

// GET /api/patients/[id]/notes - Get all notes for a patient
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patientId = parseInt(id, 10);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const patient = getPatientById(patientId);
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Check if full note content is requested
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (noteId) {
      // Return full note content
      const note = getNoteById(parseInt(noteId, 10));
      if (!note) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        id: note.id,
        type: note.type,
        input: JSON.parse(note.input_json),
        output: JSON.parse(note.output_json),
        createdAt: note.created_at,
      });
    }

    // Return note summaries
    const notes = getNotesByPatientId(patientId);
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

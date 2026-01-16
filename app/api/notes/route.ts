import { NextResponse } from 'next/server';
import { getNoteHistory, getNoteById, searchNotes, deleteNote } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const type = searchParams.get('type') as 'progress' | 'discharge' | 'analysis' | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get single note by ID
    if (id) {
      const note = getNoteById(parseInt(id, 10));
      if (!note) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }
      return NextResponse.json({
        ...note,
        input: JSON.parse(note.input_json),
        output: JSON.parse(note.output_json),
      });
    }

    // Search notes
    if (search) {
      const results = searchNotes(search, limit);
      return NextResponse.json(results);
    }

    // Get note history
    const notes = getNoteHistory(limit, offset, type || undefined);
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    const deleted = deleteNote(parseInt(id, 10));
    if (!deleted) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}

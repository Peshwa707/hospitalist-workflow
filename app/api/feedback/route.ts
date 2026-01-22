import { NextResponse } from 'next/server';
import { saveFeedback, getFeedbackByNoteId, updateFeedback, getNoteById } from '@/lib/db';
import type { Feedback } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body: Partial<Feedback> = await request.json();

    // Validate required field
    if (!body.noteId) {
      return NextResponse.json(
        { error: 'noteId is required' },
        { status: 400 }
      );
    }

    // Verify the note exists
    const note = getNoteById(body.noteId);
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Validate rating if provided
    if (body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if feedback already exists for this note
    const existingFeedback = getFeedbackByNoteId(body.noteId);

    if (existingFeedback) {
      // Update existing feedback
      const updated = updateFeedback(existingFeedback.id!, {
        rating: body.rating,
        wasHelpful: body.wasHelpful,
        wasAccurate: body.wasAccurate,
        wasUsed: body.wasUsed,
        modifications: body.modifications,
        feedbackText: body.feedbackText,
      });

      if (!updated) {
        return NextResponse.json(
          { error: 'Failed to update feedback' },
          { status: 500 }
        );
      }

      const updatedFeedback = getFeedbackByNoteId(body.noteId);
      return NextResponse.json(updatedFeedback);
    }

    // Create new feedback
    const feedbackId = saveFeedback({
      noteId: body.noteId,
      rating: body.rating,
      wasHelpful: body.wasHelpful,
      wasAccurate: body.wasAccurate,
      wasUsed: body.wasUsed,
      modifications: body.modifications,
      feedbackText: body.feedbackText,
    });

    const newFeedback = getFeedbackByNoteId(body.noteId);
    return NextResponse.json(newFeedback, { status: 201 });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { error: 'noteId query parameter is required' },
        { status: 400 }
      );
    }

    const feedback = getFeedbackByNoteId(parseInt(noteId, 10));

    if (!feedback) {
      return NextResponse.json(
        { exists: false },
        { status: 200 }
      );
    }

    return NextResponse.json({ exists: true, feedback });
  } catch (error) {
    console.error('Feedback retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback' },
      { status: 500 }
    );
  }
}

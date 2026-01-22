import { NextResponse } from 'next/server';
import { getPatientById, updatePatient, deletePatient } from '@/lib/db';
import type { Patient } from '@/lib/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    return NextResponse.json(patient);
  } catch (error) {
    console.error('Get patient error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const patientId = parseInt(id, 10);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const updates: Partial<Patient> = await request.json();

    // Normalize initials if provided
    if (updates.initials) {
      updates.initials = updates.initials.toUpperCase();
    }

    const success = updatePatient(patientId, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Patient not found or no changes made' },
        { status: 404 }
      );
    }

    const updatedPatient = getPatientById(patientId);
    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error('Update patient error:', error);

    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'A patient with these initials already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update patient' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const patientId = parseInt(id, 10);

    if (isNaN(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    const success = deletePatient(patientId);

    if (!success) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete patient error:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient' },
      { status: 500 }
    );
  }
}

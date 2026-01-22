import { NextResponse } from 'next/server';
import { createPatient, getAllPatients, searchPatients } from '@/lib/db';
import type { Patient } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const patients = search ? searchPatients(search) : getAllPatients();

    return NextResponse.json(patients);
  } catch (error) {
    console.error('Get patients error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'> = await request.json();

    // Validate required fields
    if (!patient.initials) {
      return NextResponse.json(
        { error: 'Patient initials are required' },
        { status: 400 }
      );
    }

    // Normalize initials to uppercase
    patient.initials = patient.initials.toUpperCase();

    const patientId = createPatient(patient);

    return NextResponse.json({
      id: patientId,
      ...patient,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create patient error:', error);

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'A patient with these initials already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    );
  }
}

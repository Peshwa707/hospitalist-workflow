import { NextResponse } from 'next/server';
import { updatePatient, getPatientById } from '@/lib/db';
import type { Vitals, LabResult, Medication } from '@/lib/types';

interface ImportRequest {
  patientId: number;
  vitals?: Vitals | null;
  labs?: LabResult[];
  medications?: Medication[];
  mergeMode?: 'replace' | 'append';
}

export async function POST(request: Request) {
  try {
    const body: ImportRequest = await request.json();

    if (!body.patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const existingPatient = getPatientById(body.patientId);
    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const mergeMode = body.mergeMode || 'replace';
    const updates: {
      recentVitals?: Vitals;
      recentLabs?: LabResult[];
      activeMedications?: Medication[];
    } = {};

    // Handle vitals - always replace with most recent
    if (body.vitals) {
      updates.recentVitals = body.vitals;
    }

    // Handle labs
    if (body.labs && body.labs.length > 0) {
      if (mergeMode === 'append' && existingPatient.recentLabs.length > 0) {
        // Merge labs, preferring new values for same test names
        const existingLabMap = new Map(
          existingPatient.recentLabs.map((lab) => [lab.name.toLowerCase(), lab])
        );
        for (const newLab of body.labs) {
          existingLabMap.set(newLab.name.toLowerCase(), newLab);
        }
        updates.recentLabs = Array.from(existingLabMap.values());
      } else {
        updates.recentLabs = body.labs;
      }
    }

    // Handle medications
    if (body.medications && body.medications.length > 0) {
      if (mergeMode === 'append' && existingPatient.activeMedications.length > 0) {
        // Merge medications, preferring new values for same drug names
        const existingMedMap = new Map(
          existingPatient.activeMedications.map((med) => [med.name.toLowerCase(), med])
        );
        for (const newMed of body.medications) {
          existingMedMap.set(newMed.name.toLowerCase(), newMed);
        }
        updates.activeMedications = Array.from(existingMedMap.values());
      } else {
        updates.activeMedications = body.medications;
      }
    }

    // Update the patient if there are changes
    if (Object.keys(updates).length > 0) {
      const success = updatePatient(body.patientId, updates);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update patient' },
          { status: 500 }
        );
      }
    }

    // Return the updated patient
    const updatedPatient = getPatientById(body.patientId);

    return NextResponse.json({
      success: true,
      patient: updatedPatient,
      imported: {
        vitals: !!body.vitals,
        labsCount: body.labs?.length || 0,
        medicationsCount: body.medications?.length || 0,
      },
    });
  } catch (error) {
    console.error('EMR import error:', error);
    return NextResponse.json(
      { error: 'Failed to import EMR data' },
      { status: 500 }
    );
  }
}

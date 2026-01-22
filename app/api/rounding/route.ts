import { NextResponse } from 'next/server';
import { getAllPatientsWithTaskCounts } from '@/lib/db';

export async function GET() {
  try {
    const patients = getAllPatientsWithTaskCounts();
    return NextResponse.json(patients);
  } catch (error) {
    console.error('Error fetching rounding data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rounding data' },
      { status: 500 }
    );
  }
}

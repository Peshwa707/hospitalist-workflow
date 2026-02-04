'use server';

import { NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/api-client';
import { getNotesByPatientId, getNoteById, getPatientById, createTask, getTasksByPatientId } from '@/lib/db';

interface DischargeItem {
  text: string;
  category: 'medication' | 'follow_up' | 'workup' | 'consult' | 'discharge' | 'other';
  priority: 'stat' | 'urgent' | 'routine';
}

interface ExtractionResult {
  items: DischargeItem[];
  summary: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patientId = parseInt(id);

    if (isNaN(patientId)) {
      return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 });
    }

    // Get patient and their notes
    const patient = getPatientById(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const notes = getNotesByPatientId(patientId);
    if (notes.length === 0) {
      return NextResponse.json({
        items: [],
        summary: 'No notes found for this patient.',
        created: 0
      });
    }

    // Combine all note content for analysis
    const noteContents: string[] = [];
    for (const noteSummary of notes) {
      const fullNote = getNoteById(noteSummary.id);
      if (fullNote && fullNote.output_json) {
        try {
          const output = JSON.parse(fullNote.output_json);
          const content = output.content || JSON.stringify(output);
          noteContents.push(`--- ${noteSummary.type.toUpperCase()} NOTE (${noteSummary.createdAt}) ---\n${content}`);
        } catch {
          // Skip notes with invalid JSON
        }
      }
    }

    if (noteContents.length === 0) {
      return NextResponse.json({
        items: [],
        summary: 'No valid note content found to extract from.',
        created: 0
      });
    }

    const noteContent = noteContents.join('\n\n');

    // Get existing tasks to avoid duplicates
    const existingTasks = getTasksByPatientId(patientId);
    const existingTaskTexts = existingTasks.map(t => t.task.toLowerCase());

    // Use AI to extract discharge items
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are a clinical documentation specialist. Extract all actionable discharge-related items from these clinical notes.

Patient: MRN ${patient.mrn}
Primary Diagnoses: ${patient.primaryDiagnoses.join(', ') || 'Not specified'}

CLINICAL NOTES:
${noteContent}

Extract ALL items that need to be completed before or at discharge. Categorize each item:
- medication: Medication changes, new prescriptions, dose adjustments, reconciliation
- follow_up: Outpatient appointments, specialist referrals, PCP follow-up
- workup: Pending labs, imaging, procedures to complete
- consult: Consultations to complete before discharge
- discharge: Discharge-specific tasks (DME, home health, transportation, patient education)
- other: Any other actionable items

For priority:
- stat: Must be done today/immediately
- urgent: Should be done within 24-48 hours
- routine: Can be done before discharge at a normal pace

Return JSON only:
{
  "items": [
    {"text": "specific actionable item", "category": "category", "priority": "priority"},
    ...
  ],
  "summary": "Brief 1-2 sentence summary of discharge readiness"
}

Be thorough - extract ALL mentioned tasks, follow-ups, medications to reconcile, pending tests, etc.`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse AI response
    let result: ExtractionResult;
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({
        error: 'Failed to parse AI response',
        raw: content.text
      }, { status: 500 });
    }

    // Filter out duplicates and create tasks
    const newItems = result.items.filter(item =>
      !existingTaskTexts.includes(item.text.toLowerCase())
    );

    let created = 0;
    for (const item of newItems) {
      try {
        createTask({
          patientId,
          task: item.text,
          category: item.category,
          priority: item.priority,
          status: 'pending',
          source: 'ai_analysis',
          notes: 'Auto-extracted for discharge checklist'
        });
        created++;
      } catch (e) {
        console.error('Failed to create task:', e);
      }
    }

    return NextResponse.json({
      items: result.items,
      summary: result.summary,
      created,
      skipped: result.items.length - created
    });

  } catch (error) {
    console.error('Discharge items extraction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Extraction failed' },
      { status: 500 }
    );
  }
}

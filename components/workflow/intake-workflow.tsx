'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MagicPasteInput } from './magic-paste-input';
import { ClinicalInput } from './clinical-input';
import { NoteType } from './note-type-selector';
import { RichNoteEditor } from '@/components/editor/rich-note-editor';
import { PatientContextSidebar } from '@/components/editor/patient-context-sidebar';
import {
  Loader2,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import type { Patient } from '@/lib/types';

type WorkflowStep = 'paste' | 'input' | 'generating' | 'editing';

interface GeneratedNote {
  id: number;
  content: string;
  type: NoteType;
}

export function IntakeWorkflow() {
  const [step, setStep] = useState<WorkflowStep>('paste');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [noteType, setNoteType] = useState<NoteType>('progress');
  const [clinicalText, setClinicalText] = useState('');
  const [generatedNote, setGeneratedNote] = useState<GeneratedNote | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handlePatientReady = (selectedPatient: Patient, rawText: string, selectedNoteType: NoteType) => {
    setPatient(selectedPatient);
    setClinicalText(rawText);
    setNoteType(selectedNoteType);

    if (selectedNoteType === 'progress') {
      // For progress notes, go to clinical input to add/review data
      setStep('input');
    } else {
      // For H&P, generate directly
      handleGenerateNote(selectedPatient, rawText, selectedNoteType);
    }
  };

  const handleGenerateNote = async (
    targetPatient: Patient = patient!,
    text: string = clinicalText,
    type: NoteType = noteType
  ) => {
    if (!targetPatient) return;

    setIsGenerating(true);
    setGenerateError(null);
    setStep('generating');

    try {
      let endpoint: string;
      let requestBody: object;

      if (type === 'hp') {
        endpoint = '/api/notes/hp';
        requestBody = {
          patientId: targetPatient.id,
          chiefComplaint: targetPatient.primaryDiagnoses[0] || 'Admission',
          additionalHistory: text || undefined,
        };
      } else {
        endpoint = '/api/notes/progress/simple';
        requestBody = {
          patientId: targetPatient.id,
          rawInput: text,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate note');
      }

      const result = await response.json();
      setGeneratedNote({
        id: result.id,
        content: result.content,
        type,
      });
      setStep('editing');
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : 'Generation failed');
      setStep(type === 'progress' ? 'input' : 'paste');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFromInput = () => {
    handleGenerateNote(patient!, clinicalText, noteType);
  };

  const handleRegenerate = async () => {
    await handleGenerateNote();
  };

  const handleContentChange = (newContent: string) => {
    if (generatedNote) {
      setGeneratedNote({ ...generatedNote, content: newContent });
    }
  };

  const handleStartOver = () => {
    setStep('paste');
    setPatient(null);
    setGeneratedNote(null);
    setClinicalText('');
    setGenerateError(null);
  };

  const handleBackToPaste = () => {
    setStep('paste');
    setGenerateError(null);
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-4">
        <StepIndicator
          number={1}
          label="Paste"
          active={step === 'paste'}
          completed={step !== 'paste'}
        />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <StepIndicator
          number={2}
          label="Review"
          active={step === 'input'}
          completed={step === 'generating' || step === 'editing'}
        />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <StepIndicator
          number={3}
          label="Edit"
          active={step === 'editing'}
          completed={false}
        />
      </div>

      {/* Paste step - Magic Paste */}
      {step === 'paste' && (
        <MagicPasteInput
          onPatientReady={handlePatientReady}
          isProcessing={isGenerating}
        />
      )}

      {/* Input step - Review/add clinical data for progress notes */}
      {step === 'input' && patient && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">
                Patient: <strong>{patient.mrn}</strong>
                {patient.roomNumber && ` • Room ${patient.roomNumber}`}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleBackToPaste}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>

          <ClinicalInput
            value={clinicalText}
            onChange={setClinicalText}
            onGenerate={handleGenerateFromInput}
            isGenerating={isGenerating}
            placeholder="Review and add to the clinical data extracted from your paste.

Add any additional information - vitals, labs, exam findings, overnight events, your assessment...

The AI will organize everything into a SOAP-format progress note."
          />

          {generateError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md text-center">
              {generateError}
            </div>
          )}
        </div>
      )}

      {/* Generating step */}
      {step === 'generating' && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">
                  Generating {noteType === 'hp' ? 'H&P Document' : 'Progress Note'}...
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI is analyzing your input and creating the note
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editing step */}
      {step === 'editing' && patient && generatedNote && (
        <div className="flex gap-0 -mx-6">
          <div className="flex-1 px-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-muted-foreground">
                    Note generated for <strong>{patient.mrn}</strong>
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleStartOver}>
                  Start Over
                </Button>
              </div>

              <RichNoteEditor
                noteId={generatedNote.id}
                noteType={generatedNote.type}
                initialContent={generatedNote.content}
                onContentChange={handleContentChange}
                onRegenerate={handleRegenerate}
                isRegenerating={isGenerating}
              />
            </div>
          </div>

          <PatientContextSidebar patient={patient} />
        </div>
      )}
    </div>
  );
}

interface StepIndicatorProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

function StepIndicator({ number, label, active, completed }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
          ${completed
            ? 'bg-green-100 text-green-700 border-2 border-green-500'
            : active
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }
        `}
      >
        {completed ? <CheckCircle2 className="h-4 w-4" /> : number}
      </div>
      <span
        className={`text-sm ${active || completed ? 'font-medium' : 'text-muted-foreground'}`}
      >
        {label}
      </span>
    </div>
  );
}

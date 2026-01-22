'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  FileText,
  Copy,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Settings2,
} from 'lucide-react';
import type { Patient, ProgressNoteOutput } from '@/lib/types';
import { NoteEditor } from './note-editor';

interface ProgressNoteGeneratorProps {
  patient: Patient;
  previousNoteContent: string;
  previousNoteType: 'hp' | 'progress';
  hospitalDay: number;
  onNoteGenerated: (note: ProgressNoteOutput) => void;
  quickMode?: boolean;
}

// Helper to format vitals from patient data
function formatVitalsFromPatient(patient: Patient): string {
  if (!patient.recentVitals) return '';
  const v = patient.recentVitals;
  const parts: string[] = [];
  if (v.temperature) parts.push(`T ${v.temperature}`);
  if (v.heartRate) parts.push(`HR ${v.heartRate}`);
  if (v.bloodPressure) parts.push(`BP ${v.bloodPressure}`);
  if (v.respiratoryRate) parts.push(`RR ${v.respiratoryRate}`);
  if (v.oxygenSaturation) {
    let o2 = `SpO2 ${v.oxygenSaturation}%`;
    if (v.oxygenDevice) o2 += ` on ${v.oxygenDevice}`;
    parts.push(o2);
  }
  return parts.join(', ');
}

// Helper to format labs from patient data
function formatLabsFromPatient(patient: Patient): string {
  if (!patient.recentLabs || patient.recentLabs.length === 0) return '';
  return patient.recentLabs
    .map((lab) => {
      let str = `${lab.name}: ${lab.value}`;
      if (lab.unit) str += ` ${lab.unit}`;
      if (lab.flag) str += ` (${lab.flag})`;
      return str;
    })
    .join(', ');
}

export function ProgressNoteGenerator({
  patient,
  previousNoteContent,
  previousNoteType,
  hospitalDay,
  onNoteGenerated,
  quickMode: initialQuickMode = false,
}: ProgressNoteGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedNote, setGeneratedNote] = useState<ProgressNoteOutput | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPreviousNote, setShowPreviousNote] = useState(false);
  const [isQuickMode, setIsQuickMode] = useState(initialQuickMode);

  // Form state for daily updates
  const [subjective, setSubjective] = useState('');
  const [vitals, setVitals] = useState('');
  const [labs, setLabs] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  // Pre-populate vitals and labs from patient when quick mode is enabled
  useEffect(() => {
    if (isQuickMode) {
      setVitals(formatVitalsFromPatient(patient));
      setLabs(formatLabsFromPatient(patient));
    }
  }, [isQuickMode, patient]);

  const handleGenerate = async () => {
    if (!subjective.trim()) {
      setError('Please enter subjective/overnight events');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notes/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          patientInitials: patient.initials,
          hospitalDay,
          diagnosis: patient.primaryDiagnoses[0] || 'Admission diagnosis',
          subjective,
          vitals: vitals || undefined,
          labs: labs || undefined,
          physicalExam: physicalExam || undefined,
          assessmentNotes: assessmentNotes || undefined,
          planNotes: planNotes || undefined,
          previousNoteContent,
          previousNoteType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate progress note');
      }

      const note: ProgressNoteOutput = await response.json();
      setGeneratedNote(note);
      onNoteGenerated(note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (generatedNote?.content) {
      await navigator.clipboard.writeText(generatedNote.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (generatedNote) {
    return (
      <NoteEditor
        noteId={generatedNote.id!}
        noteType="progress"
        content={generatedNote.content}
        onContentChange={(newContent) => {
          setGeneratedNote({ ...generatedNote, content: newContent });
        }}
        title={`Progress Note - Day ${hospitalDay}`}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Progress Note - Day {hospitalDay}
            </CardTitle>
            <CardDescription>
              Enter today's updates to generate a progress note based on the previous {previousNoteType === 'hp' ? 'H&P' : 'progress note'}
            </CardDescription>
          </div>
          <Button
            variant={isQuickMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsQuickMode(!isQuickMode)}
            className="gap-1"
          >
            {isQuickMode ? <Zap className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
            {isQuickMode ? 'Quick Mode' : 'Full Mode'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Mode Banner */}
        {isQuickMode && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-sm text-primary font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Mode: Vitals and labs pre-populated from patient profile
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Just enter the subjective and click generate. Edit pre-filled data as needed.
            </p>
          </div>
        )}

        {/* Previous Note Preview */}
        <div className="border rounded-lg">
          <button
            onClick={() => setShowPreviousNote(!showPreviousNote)}
            className="w-full flex items-center justify-between p-3 text-sm text-muted-foreground hover:bg-muted/50"
          >
            <span className="flex items-center gap-2">
              <Badge variant="outline">
                {previousNoteType === 'hp' ? 'H&P' : 'Previous Progress Note'}
              </Badge>
              <span>Click to {showPreviousNote ? 'hide' : 'view'}</span>
            </span>
            {showPreviousNote ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showPreviousNote && (
            <div className="p-3 border-t bg-muted/30 max-h-48 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs font-mono">{previousNoteContent}</pre>
            </div>
          )}
        </div>

        {/* Daily Update Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="subjective" className="text-sm font-medium">
              Subjective / Overnight Events *
            </Label>
            <Textarea
              id="subjective"
              value={subjective}
              onChange={(e) => setSubjective(e.target.value)}
              placeholder="Patient reports... Overnight, the patient... No complaints of..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vitals" className="text-sm font-medium">
                Current Vitals
              </Label>
              <Input
                id="vitals"
                value={vitals}
                onChange={(e) => setVitals(e.target.value)}
                placeholder="T 98.6, HR 78, BP 128/76..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="labs" className="text-sm font-medium">
                New Labs
              </Label>
              <Input
                id="labs"
                value={labs}
                onChange={(e) => setLabs(e.target.value)}
                placeholder="WBC 8.2, Hgb 11.4, Cr 1.0..."
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="exam" className="text-sm font-medium">
              Physical Exam Updates
            </Label>
            <Textarea
              id="exam"
              value={physicalExam}
              onChange={(e) => setPhysicalExam(e.target.value)}
              placeholder="General: Alert, comfortable. Lungs: Clear bilaterally..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assessment" className="text-sm font-medium">
                Assessment Notes
              </Label>
              <Textarea
                id="assessment"
                value={assessmentNotes}
                onChange={(e) => setAssessmentNotes(e.target.value)}
                placeholder="Improving, stable, or specific observations..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="plan" className="text-sm font-medium">
                Plan Updates
              </Label>
              <Textarea
                id="plan"
                value={planNotes}
                onChange={(e) => setPlanNotes(e.target.value)}
                placeholder="Continue current management, d/c foley, PT consult..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={loading || !subjective.trim()}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Progress Note...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generate Progress Note
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

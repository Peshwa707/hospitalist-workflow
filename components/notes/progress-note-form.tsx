'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Mic } from 'lucide-react';
import { PatientSelector } from '@/components/patients/patient-selector';
import { DictationPanel } from '@/components/speech/dictation-panel';
import { SpeechInput } from '@/components/speech/speech-input';
import type { ProgressNoteInput, ProgressNoteOutput, Patient, SpeechStructuredData } from '@/lib/types';

interface ProgressNoteFormProps {
  onGenerated: (output: ProgressNoteOutput) => void;
}

export function ProgressNoteForm({ onGenerated }: ProgressNoteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDictation, setShowDictation] = useState(false);

  const [formData, setFormData] = useState<ProgressNoteInput>({
    patientInitials: '',
    hospitalDay: 1,
    diagnosis: '',
    subjective: '',
    vitals: '',
    labs: '',
    physicalExam: '',
    assessmentNotes: '',
    planNotes: '',
  });

  // Pre-fill form when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      // Calculate hospital day from admission date
      let hospitalDay = 1;
      if (selectedPatient.admissionDate) {
        const admission = new Date(selectedPatient.admissionDate);
        const today = new Date();
        const diffTime = today.getTime() - admission.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        hospitalDay = Math.max(1, diffDays + 1);
      }

      // Format vitals from patient
      let vitals = '';
      if (selectedPatient.recentVitals) {
        const v = selectedPatient.recentVitals;
        const parts: string[] = [];
        if (v.temperature) parts.push(`T ${v.temperature}`);
        if (v.heartRate) parts.push(`HR ${v.heartRate}`);
        if (v.bloodPressure) parts.push(`BP ${v.bloodPressure}`);
        if (v.respiratoryRate) parts.push(`RR ${v.respiratoryRate}`);
        if (v.oxygenSaturation) {
          parts.push(`O2 ${v.oxygenSaturation}%${v.oxygenDevice ? ` ${v.oxygenDevice}` : ' RA'}`);
        }
        vitals = parts.join(', ');
      }

      // Format labs from patient
      let labs = '';
      if (selectedPatient.recentLabs.length > 0) {
        labs = selectedPatient.recentLabs
          .map((l) => `${l.name}: ${l.value}${l.unit ? ` ${l.unit}` : ''}`)
          .join(', ');
      }

      setFormData((prev) => ({
        ...prev,
        patientId: selectedPatient.id,
        patientInitials: selectedPatient.initials,
        hospitalDay,
        diagnosis: selectedPatient.primaryDiagnoses[0] || prev.diagnosis,
        vitals: vitals || prev.vitals,
        labs: labs || prev.labs,
      }));
    }
  }, [selectedPatient]);

  const handlePatientSelect = (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (!patient) {
      // Clear patient-related fields when deselected
      setFormData((prev) => ({
        ...prev,
        patientId: undefined,
        patientInitials: '',
        hospitalDay: 1,
      }));
    }
  };

  const handleDictationStructured = (data: SpeechStructuredData) => {
    setFormData((prev) => ({
      ...prev,
      subjective: data.subjective || prev.subjective,
      vitals: data.vitals || prev.vitals,
      labs: data.labs || prev.labs,
      physicalExam: data.physicalExam || prev.physicalExam,
      assessmentNotes: data.assessmentNotes || prev.assessmentNotes,
      planNotes: data.planNotes || prev.planNotes,
    }));
    setShowDictation(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'hospitalDay' ? parseInt(value, 10) || 1 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notes/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate note');
      }

      const output: ProgressNoteOutput = await response.json();
      onGenerated(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Show dictation panel if in dictation mode
  if (showDictation) {
    return (
      <DictationPanel
        onStructured={handleDictationStructured}
        onCancel={() => setShowDictation(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Progress Note Input
            </CardTitle>
            <CardDescription>
              Enter clinical details to generate a SOAP-format progress note.
              Required fields are marked with *.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDictation(true)}
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            Dictate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selector */}
          <PatientSelector
            selectedPatient={selectedPatient}
            onSelectPatient={handlePatientSelect}
          />

          {/* Patient Info Row */}
          <div className="grid grid-cols-3 gap-4">
            <SpeechInput
              id="patientInitials"
              name="patientInitials"
              label="Patient Initials"
              placeholder="JD"
              value={formData.patientInitials}
              onChange={handleChange}
              required
              maxLength={4}
            />
            <div className="space-y-2">
              <Label htmlFor="hospitalDay">Hospital Day *</Label>
              <Input
                id="hospitalDay"
                name="hospitalDay"
                type="number"
                min={1}
                value={formData.hospitalDay}
                onChange={handleChange}
                required
              />
            </div>
            <SpeechInput
              id="diagnosis"
              name="diagnosis"
              label="Primary Diagnosis"
              placeholder="CHF exacerbation"
              value={formData.diagnosis}
              onChange={handleChange}
              required
            />
          </div>

          {/* Subjective */}
          <SpeechInput
            id="subjective"
            name="subjective"
            label="Subjective / Overnight Events"
            placeholder="Day 3, feeling better, no SOB at rest, slept well, no chest pain"
            value={formData.subjective}
            onChange={handleChange}
            required
            multiline
            rows={2}
          />

          {/* Objective Fields */}
          <div className="grid grid-cols-2 gap-4">
            <SpeechInput
              id="vitals"
              name="vitals"
              label="Vitals"
              placeholder="T 98.6, HR 78, BP 124/76, RR 16, O2 96% RA"
              value={formData.vitals}
              onChange={handleChange}
            />
            <SpeechInput
              id="labs"
              name="labs"
              label="Labs / Studies"
              placeholder="BMP wnl, BNP 450 (down from 1200)"
              value={formData.labs}
              onChange={handleChange}
            />
          </div>

          <SpeechInput
            id="physicalExam"
            name="physicalExam"
            label="Physical Exam Findings"
            placeholder="JVP 6cm, clear lungs, no peripheral edema, RRR"
            value={formData.physicalExam}
            onChange={handleChange}
            multiline
            rows={2}
          />

          {/* Assessment & Plan Notes */}
          <div className="grid grid-cols-2 gap-4">
            <SpeechInput
              id="assessmentNotes"
              name="assessmentNotes"
              label="Assessment Notes"
              placeholder="Euvolemic, responding to diuresis"
              value={formData.assessmentNotes}
              onChange={handleChange}
              multiline
              rows={2}
            />
            <SpeechInput
              id="planNotes"
              name="planNotes"
              label="Plan Notes"
              placeholder="Continue IV furosemide, advance diet, PT eval"
              value={formData.planNotes}
              onChange={handleChange}
              multiline
              rows={2}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Note...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Progress Note
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FileInput,
  Loader2,
  Wand2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  User,
  FileText,
  Activity,
  Stethoscope,
  ClipboardList,
} from 'lucide-react';
import { PatientProfilePreview } from './patient-profile-preview';
import type { ParsedPatientProfile, Patient } from '@/lib/types';

interface EmrPatientCreatorProps {
  onPatientCreated: (patient: Patient) => void;
  onGenerateHp?: (patient: Patient) => void;
  onRunAnalysis?: (patient: Patient) => void;
  onCreateProgressNote?: (patient: Patient) => void;
  onCancel: () => void;
}

type Step = 'input' | 'preview' | 'success';

export function EmrPatientCreator({
  onPatientCreated,
  onGenerateHp,
  onRunAnalysis,
  onCreateProgressNote,
  onCancel,
}: EmrPatientCreatorProps) {
  const [step, setStep] = useState<Step>('input');
  const [emrText, setEmrText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedProfile, setParsedProfile] = useState<ParsedPatientProfile | null>(null);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);

  const handleParse = async () => {
    if (!emrText.trim()) {
      setError('Please paste EMR data first');
      return;
    }

    if (emrText.trim().length < 100) {
      setError('Please paste at least 100 characters of EMR data');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const response = await fetch('/api/emr/parse-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emrText: emrText.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to parse EMR data');
      }

      const data: ParsedPatientProfile = await response.json();
      setParsedProfile(data);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSavePatient = async () => {
    if (!parsedProfile) return;

    // Validate required fields
    if (!parsedProfile.initials?.trim()) {
      setError('Patient initials are required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Build the patient object
      const patientData = {
        initials: parsedProfile.initials.trim().toUpperCase(),
        roomNumber: parsedProfile.roomNumber || undefined,
        admissionDate: parsedProfile.admissionDate || undefined,
        primaryDiagnoses: parsedProfile.primaryDiagnoses,
        activeMedications: parsedProfile.medications,
        allergies: parsedProfile.allergies,
        codeStatus: parsedProfile.codeStatus || undefined,
        recentVitals: parsedProfile.vitals || undefined,
        recentLabs: parsedProfile.labs,
      };

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create patient');
      }

      const patient: Patient = await response.json();
      setCreatedPatient(patient);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setStep('input');
    setError(null);
  };

  if (step === 'success' && createdPatient) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800">Patient Created!</h3>
            <p className="text-green-700 mt-2">
              {createdPatient.initials} has been added to your patient list.
            </p>
          </div>

          <div className="space-y-3 mt-4">
            <p className="text-sm font-medium text-center text-green-800">What would you like to do next?</p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                onClick={() => onPatientCreated(createdPatient)}
              >
                <User className="h-5 w-5" />
                <span className="text-xs">View Patient</span>
              </Button>

              {onGenerateHp && (
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => onGenerateHp(createdPatient)}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">Generate H&P</span>
                </Button>
              )}

              {onRunAnalysis && (
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => onRunAnalysis(createdPatient)}
                >
                  <Stethoscope className="h-5 w-5" />
                  <span className="text-xs">Run Analysis</span>
                </Button>
              )}

              {onCreateProgressNote && (
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => onCreateProgressNote(createdPatient)}
                >
                  <ClipboardList className="h-5 w-5" />
                  <span className="text-xs">Progress Note</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileInput className="h-5 w-5" />
              Create Patient from EMR
            </CardTitle>
            <CardDescription>
              {step === 'input'
                ? 'Paste admission notes, H&P, or progress notes to create a patient profile'
                : 'Review and edit the extracted profile before saving'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'input' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="emrText">Paste EMR Data</Label>
              <Textarea
                id="emrText"
                value={emrText}
                onChange={(e) => setEmrText(e.target.value)}
                placeholder={`Paste raw EMR data here...

Supported formats:
• Admission Notes
• H&P (History & Physical)
• Progress Notes
• Discharge Summaries

The system will automatically extract:
• Patient identifiers (initials, room, admission date)
• Diagnoses and allergies
• Code status
• Vitals, labs, and medications`}
                rows={12}
                className="font-mono text-sm"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimum 100 characters required</span>
                <span className={emrText.length < 100 ? 'text-orange-500' : 'text-green-600'}>
                  {emrText.length} characters
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={isParsing || emrText.trim().length < 100}
                className="flex-1"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting Profile...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Extract Patient Profile
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'preview' && parsedProfile && (
          <>
            <PatientProfilePreview
              profile={parsedProfile}
              onProfileChange={setParsedProfile}
            />

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSavePatient}
                disabled={isSaving || !parsedProfile.initials?.trim()}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Patient...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Patient
                  </>
                )}
              </Button>
            </div>

            {!parsedProfile.initials?.trim() && (
              <p className="text-sm text-orange-600 text-center">
                Patient initials are required before saving
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NoteTypeSelector, NoteType } from './note-type-selector';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  UserPlus,
  ClipboardPaste,
  X,
  Mic,
  MicOff,
} from 'lucide-react';
import { useAudioRecorder } from '@/components/speech/use-audio-recorder';
import type { Patient, ParsedPatientProfile } from '@/lib/types';

interface DetectResult {
  action: 'existing' | 'new' | 'update';
  existingPatient: Patient | null;
  parsedProfile: ParsedPatientProfile;
  rawText: string;
}

interface MagicPasteInputProps {
  onPatientReady: (patient: Patient, clinicalText: string, noteType: NoteType) => void;
  isProcessing?: boolean;
}

export function MagicPasteInput({
  onPatientReady,
  isProcessing = false,
}: MagicPasteInputProps) {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [noteType, setNoteType] = useState<NoteType>('progress');
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  // Dictation
  const [isTranscribing, setIsTranscribing] = useState(false);
  const {
    isRecording,
    isSupported,
    error: recorderError,
    startRecording,
    stopRecording,
  } = useAudioRecorder();

  const analyzeText = useCallback(async (text: string) => {
    if (!text.trim() || text.trim().length < 20) return;

    setIsAnalyzing(true);
    setError(null);
    setDetectResult(null);

    try {
      const response = await fetch('/api/patients/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const result: DetectResult = await response.json();
      setDetectResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.length > 50) {
      // Auto-analyze on paste of substantial content
      setTimeout(() => analyzeText(pastedText), 100);
    }
  }, [analyzeText]);

  const handleAnalyze = () => {
    analyzeText(inputText);
  };

  const handleProceed = async () => {
    if (!detectResult) return;

    if (detectResult.action === 'existing' && detectResult.existingPatient) {
      // Use existing patient
      onPatientReady(detectResult.existingPatient, detectResult.rawText, noteType);
    } else {
      // Create new patient
      setIsCreatingPatient(true);
      setError(null);

      try {
        const profile = detectResult.parsedProfile;
        const response = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mrn: profile.mrn || `MRN-${Date.now()}`,
            roomNumber: profile.roomNumber,
            admissionDate: profile.admissionDate,
            primaryDiagnoses: profile.primaryDiagnoses || [],
            activeMedications: profile.medications || [],
            allergies: profile.allergies || [],
            codeStatus: profile.codeStatus,
            recentVitals: profile.vitals,
            recentLabs: profile.labs || [],
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create patient');
        }

        const newPatient = await response.json();
        onPatientReady(newPatient, detectResult.rawText, noteType);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create patient');
      } finally {
        setIsCreatingPatient(false);
      }
    }
  };

  const handleClear = () => {
    setInputText('');
    setDetectResult(null);
    setError(null);
  };

  // Dictation handlers
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const { transcript } = await response.json();
        if (transcript) {
          const newText = inputText + (inputText ? '\n\n' : '') + transcript;
          setInputText(newText);
        }
      }
    } catch {
      // Ignore transcription errors
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      if (audioBlob) await transcribeAudio(audioBlob);
    } else {
      await startRecording();
    }
  };

  const displayError = error || recorderError;
  const isLoading = isAnalyzing || isCreatingPatient || isProcessing;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Main input area */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardPaste className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Paste Clinical Data</h2>
            </div>
            {inputText && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="relative">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              placeholder="Paste any clinical data here - admission notes, progress notes, EMR dumps, vitals, labs...

We'll automatically detect the patient (or create a new one) and extract all relevant information.

You can also dictate using the microphone button."
              rows={8}
              className="font-mono text-sm resize-none pr-12"
              disabled={isLoading}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {isSupported && (
                <Button
                  variant={isRecording ? 'destructive' : 'ghost'}
                  size="sm"
                  onClick={handleToggleRecording}
                  disabled={isTranscribing || isLoading}
                  className="h-8 w-8 p-0"
                >
                  {isTranscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Recording... speak now
            </div>
          )}

          {/* Error display */}
          {displayError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {displayError}
            </div>
          )}

          {/* Analyze button (if not auto-analyzed) */}
          {!detectResult && inputText.trim().length > 20 && (
            <Button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze & Detect Patient
                </>
              )}
            </Button>
          )}
        </div>

        {/* Detection result */}
        {detectResult && (
          <>
            <Separator />
            <div className="p-6 bg-muted/30 space-y-4">
              {/* Patient detection status */}
              <div className="flex items-start gap-3">
                {detectResult.action === 'existing' ? (
                  <>
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Existing Patient Found</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Matched
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        MRN: <strong>{detectResult.existingPatient?.mrn}</strong>
                        {detectResult.existingPatient?.roomNumber && (
                          <> • Room {detectResult.existingPatient.roomNumber}</>
                        )}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">New Patient</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          Will Create
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {detectResult.parsedProfile.mrn ? (
                          <>MRN: <strong>{detectResult.parsedProfile.mrn}</strong></>
                        ) : (
                          <>MRN will be auto-generated</>
                        )}
                        {detectResult.parsedProfile.roomNumber && (
                          <> • Room {detectResult.parsedProfile.roomNumber}</>
                        )}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Extracted info preview */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {detectResult.parsedProfile.primaryDiagnoses?.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Diagnoses:</span>{' '}
                    <span className="font-medium">
                      {detectResult.parsedProfile.primaryDiagnoses.slice(0, 2).join(', ')}
                      {detectResult.parsedProfile.primaryDiagnoses.length > 2 && '...'}
                    </span>
                  </div>
                )}
                {detectResult.parsedProfile.vitals && (
                  <div>
                    <span className="text-muted-foreground">Vitals:</span>{' '}
                    <span className="font-medium">
                      {detectResult.parsedProfile.vitals.heartRate && `HR ${detectResult.parsedProfile.vitals.heartRate}`}
                      {detectResult.parsedProfile.vitals.bloodPressure && ` BP ${detectResult.parsedProfile.vitals.bloodPressure}`}
                    </span>
                  </div>
                )}
                {detectResult.parsedProfile.allergies?.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Allergies:</span>{' '}
                    <span className="font-medium">{detectResult.parsedProfile.allergies.join(', ')}</span>
                  </div>
                )}
                {detectResult.parsedProfile.admissionDate && (
                  <div>
                    <span className="text-muted-foreground">Admitted:</span>{' '}
                    <span className="font-medium">{detectResult.parsedProfile.admissionDate}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Note type selector */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Select note type to generate:
                </p>
                <NoteTypeSelector
                  selected={noteType}
                  onSelect={setNoteType}
                  disabled={isLoading}
                />
              </div>

              {/* Proceed button */}
              <Button
                size="lg"
                onClick={handleProceed}
                disabled={isLoading}
                className="w-full"
              >
                {isCreatingPatient ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Patient...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Note...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {detectResult.action === 'existing' ? 'Generate Note' : 'Create Patient & Generate Note'}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

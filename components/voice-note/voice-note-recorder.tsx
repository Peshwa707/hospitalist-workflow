'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Square, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '@/components/speech/use-audio-recorder';

type RecordingState = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

interface Patient {
  id: number;
  mrn: string;
  roomNumber?: string;
}

interface VoiceNoteRecorderProps {
  patients: Patient[];
  onNoteGenerated: (note: string, transcription: string, patientId: number | null) => void;
}

export function VoiceNoteRecorder({ patients, onNoteGenerated }: VoiceNoteRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isRecording,
    isSupported,
    error: recorderError,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    resetRecording,
  } = useAudioRecorder();

  // Sync recorder error to component error
  useEffect(() => {
    if (recorderError) {
      setError(recorderError);
      setState('error');
    }
  }, [recorderError]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    setDuration(0);

    try {
      await startAudioRecording();
      // Only set recording state and start timer AFTER successful start
      setState('recording');
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      // Handle any errors from startAudioRecording
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setState('error');
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState('processing');

    const audioBlob = await stopAudioRecording();

    if (!audioBlob) {
      setError('No audio recorded');
      setState('error');
      return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    if (selectedPatient) {
      formData.append('patientId', selectedPatient);
      const patient = patients.find(p => p.id.toString() === selectedPatient);
      if (patient) {
        const context = patient.roomNumber
          ? `Patient MRN: ${patient.mrn}, Room: ${patient.roomNumber}`
          : `Patient MRN: ${patient.mrn}`;
        formData.append('patientContext', context);
      }
    }

    try {
      const response = await fetch('/api/notes/voice', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setState('complete');
        onNoteGenerated(
          result.data.soapNote,
          result.data.transcription,
          selectedPatient ? parseInt(selectedPatient) : null
        );
      } else {
        throw new Error(result.error || 'Failed to process recording');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process recording';
      setError(errorMessage);
      setState('error');
    }
  };

  const handleReset = () => {
    resetRecording();
    setState('idle');
    setError(null);
    setDuration(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Audio recording is not supported in this browser.
            Please use a modern browser like Chrome, Firefox, or Safari.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Voice-to-Note
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Patient (Optional)</label>
          <Select
            value={selectedPatient}
            onValueChange={setSelectedPatient}
            disabled={state === 'recording' || state === 'processing'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select patient for context..." />
            </SelectTrigger>
            <SelectContent>
              {patients.map(patient => (
                <SelectItem key={patient.id} value={patient.id.toString()}>
                  {patient.mrn}{patient.roomNumber ? ` (Room ${patient.roomNumber})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Selecting a patient provides context for the AI to generate a more accurate note.
          </p>
        </div>

        {/* Recording Area */}
        <div className="flex flex-col items-center gap-4 py-8">
          {state === 'idle' && (
            <>
              <Button
                size="lg"
                onClick={startRecording}
                className="w-32 h-32 rounded-full bg-primary hover:bg-primary/90"
              >
                <Mic className="w-12 h-12" />
              </Button>
              <p className="text-muted-foreground text-center">
                Press to start recording.<br />
                Speak naturally about the patient.
              </p>
            </>
          )}

          {state === 'recording' && (
            <>
              <div className="text-4xl font-mono text-red-500 animate-pulse">
                {formatTime(duration)}
              </div>
              <Button
                size="lg"
                variant="destructive"
                onClick={stopRecording}
                className="w-32 h-32 rounded-full"
              >
                <Square className="w-12 h-12" />
              </Button>
              <p className="text-muted-foreground text-center">
                Recording... Press to stop when done.<br />
                Include subjective, objective, assessment, and plan.
              </p>
            </>
          )}

          {state === 'processing' && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="font-medium">Processing...</p>
                <p className="text-sm text-muted-foreground">
                  Transcribing audio and generating SOAP note
                </p>
              </div>
            </>
          )}

          {state === 'complete' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500" />
              <p className="text-green-600 font-medium">Note generated successfully!</p>
              <Button onClick={handleReset} variant="outline">
                Record Another
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <AlertCircle className="w-16 h-16 text-red-500" />
              <p className="text-red-500 text-center">{error}</p>
              <Button onClick={handleReset} variant="outline">
                Try Again
              </Button>
            </>
          )}
        </div>

        {/* Recording Tips */}
        {(state === 'idle' || state === 'recording') && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Tips for best results:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- State the chief complaint and history</li>
              <li>- Mention vitals and physical exam findings</li>
              <li>- Include relevant lab results</li>
              <li>- Describe your assessment and plan</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Square, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useSpeechRecognition } from '@/components/speech/use-speech-recognition';

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
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: 'en-US',
  });

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync speech error to component error
  useEffect(() => {
    if (speechError && state === 'recording') {
      setError(speechError);
      setState('error');
    }
  }, [speechError, state]);

  const handleStartRecording = () => {
    setError(null);
    resetTranscript();
    setState('recording');
    startListening();
  };

  const handleStopRecording = async () => {
    stopListening();

    const finalTranscript = transcript.trim();

    if (!finalTranscript) {
      setError('No speech detected. Please try again.');
      setState('error');
      return;
    }

    setState('processing');

    // Prepare request body
    const requestBody: Record<string, string> = {
      transcription: finalTranscript,
    };

    if (selectedPatient) {
      requestBody.patientId = selectedPatient;
      const patient = patients.find(p => p.id.toString() === selectedPatient);
      if (patient) {
        requestBody.patientContext = patient.roomNumber
          ? `Patient MRN: ${patient.mrn}, Room: ${patient.roomNumber}`
          : `Patient MRN: ${patient.mrn}`;
      }
    }

    try {
      const response = await fetch('/api/notes/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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
        throw new Error(result.error || 'Failed to generate note');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process recording';
      setError(errorMessage);
      setState('error');
    }
  };

  const handleReset = () => {
    resetTranscript();
    setState('idle');
    setError(null);
  };

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice-to-Note
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice-to-Note
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Speech recognition is not supported in this browser.
            Please use Chrome, Edge, or Safari.
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
                onClick={handleStartRecording}
                className="w-32 h-32 rounded-full bg-primary hover:bg-primary/90"
              >
                <Mic className="w-12 h-12" />
              </Button>
              <p className="text-muted-foreground text-center">
                Press to start dictating.<br />
                Speak naturally about the patient.
              </p>
            </>
          )}

          {state === 'recording' && (
            <>
              <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStopRecording}
                className="w-32 h-32 rounded-full"
              >
                <Square className="w-12 h-12" />
              </Button>
              <p className="text-muted-foreground text-center">
                Listening... Press to stop when done.
              </p>

              {/* Live transcript preview */}
              {(transcript || interimTranscript) && (
                <div className="w-full mt-4 p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
                  <p className="text-sm">
                    {transcript}
                    <span className="text-muted-foreground italic">{interimTranscript}</span>
                  </p>
                </div>
              )}
            </>
          )}

          {state === 'processing' && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="font-medium">Generating SOAP note...</p>
                <p className="text-sm text-muted-foreground">
                  Processing your dictation with AI
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
              <li>• State the chief complaint and history</li>
              <li>• Mention vitals and physical exam findings</li>
              <li>• Include relevant lab results</li>
              <li>• Describe your assessment and plan</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

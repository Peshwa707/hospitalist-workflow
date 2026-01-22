'use client';

import { useState } from 'react';
import { useAudioRecorder } from './use-audio-recorder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Mic,
  MicOff,
  Loader2,
  Wand2,
  X,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import type { SpeechStructuredData } from '@/lib/types';

interface DictationPanelProps {
  onStructured: (data: SpeechStructuredData) => void;
  onCancel: () => void;
}

export function DictationPanel({ onStructured, onCancel }: DictationPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');

  const {
    isRecording,
    isSupported,
    error: recorderError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setProcessError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Transcription failed');
      }

      const { transcript: newTranscript } = await response.json();
      if (newTranscript) {
        setTranscript((prev) => prev + (prev ? ' ' : '') + newTranscript);
      }
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        await transcribeAudio(audioBlob);
      }
    } else {
      setProcessError(null);
      await startRecording();
    }
  };

  const handleProcess = async () => {
    if (!transcript.trim()) {
      setProcessError('No dictation to process. Please record first.');
      return;
    }

    setIsProcessing(true);
    setProcessError(null);

    try {
      const response = await fetch('/api/speech/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcript.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process dictation');
      }

      const structured: SpeechStructuredData = await response.json();
      onStructured(structured);
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    resetRecording();
    setTranscript('');
    setProcessError(null);
  };

  if (!isSupported) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-orange-800">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Audio Recording Not Supported</p>
              <p className="text-sm">
                Your browser doesn&apos;t support audio recording. Try Chrome, Firefox, or Edge.
              </p>
            </div>
          </div>
          <Button variant="outline" className="mt-4" onClick={onCancel}>
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  const displayError = processError || recorderError;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Dictation Mode
            </CardTitle>
            <CardDescription>
              Speak naturally and AI will transcribe and structure your note
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            variant={isRecording ? 'destructive' : 'default'}
            onClick={handleToggleRecording}
            disabled={isTranscribing}
            className="gap-2"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Transcribing...
              </>
            ) : isRecording ? (
              <>
                <MicOff className="h-5 w-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                Start Recording
              </>
            )}
          </Button>

          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Recording...
            </div>
          )}

          {transcript && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Error display */}
        {displayError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            {displayError}
          </div>
        )}

        {/* Transcript display/edit */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Transcript
          </label>
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your dictation will appear here after recording. You can also type or edit..."
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Tip: Record multiple segments to build your note. Say things like &quot;Day 3 of CHF exacerbation, patient
            feeling better, vitals stable with temp 98.6, heart rate 72...&quot;
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleProcess}
            disabled={isProcessing || isTranscribing || !transcript.trim()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Process & Fill Form
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

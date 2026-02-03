'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAudioRecorder } from '@/components/speech/use-audio-recorder';
import {
  Mic,
  MicOff,
  Loader2,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ClinicalInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ClinicalInput({
  value,
  onChange,
  onGenerate,
  isGenerating = false,
  disabled = false,
  placeholder = 'Dump all clinical data here - vitals, labs, exam findings, patient updates, dictation...\n\nExample:\n"Day 3 CHF exacerbation, patient feeling better, less SOB. Vitals stable T 98.6 HR 72 BP 128/78. BNP down to 400 from 800. Creatinine stable 1.2. Lungs with decreased crackles. Continue IV lasix, trend weights, may transition to PO tomorrow if doing well."',
}: ClinicalInputProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const {
    isRecording,
    isSupported,
    error: recorderError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  // Clear errors when value changes
  useEffect(() => {
    if (value) {
      setTranscribeError(null);
    }
  }, [value]);

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setTranscribeError(null);

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

      const { transcript } = await response.json();
      if (transcript) {
        // Append transcription to existing text
        onChange(value + (value ? '\n\n' : '') + transcript);
      }
    } catch (err) {
      setTranscribeError(err instanceof Error ? err.message : 'Transcription failed');
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
      setTranscribeError(null);
      await startRecording();
    }
  };

  const handleClear = () => {
    onChange('');
    resetRecording();
    setTranscribeError(null);
  };

  const displayError = transcribeError || recorderError;
  const canGenerate = value.trim().length > 0 && !isGenerating && !disabled;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Clinical Data Input</CardTitle>
            <CardDescription>
              Paste, type, or dictate all clinical information in one place
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={disabled || isGenerating}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main textarea */}
        <div className="relative">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={10}
            className="font-mono text-sm pr-4 resize-none"
            disabled={disabled || isGenerating}
          />
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {value.length.toLocaleString()} chars
          </div>
        </div>

        {/* Error display */}
        {displayError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {displayError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Dictation button */}
          {isSupported ? (
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              onClick={handleToggleRecording}
              disabled={isTranscribing || disabled || isGenerating}
              className="gap-2"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transcribing...
                </>
              ) : isRecording ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Stop
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Dictate
                </>
              )}
            </Button>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <AlertCircle className="h-3 w-3 mr-1" />
              Mic not supported
            </Badge>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <span className="text-sm text-red-600 animate-pulse">
              Recording... speak now
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Generate button */}
          <Button
            size="lg"
            onClick={onGenerate}
            disabled={!canGenerate}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Progress Note
              </>
            )}
          </Button>
        </div>

        {/* Tips */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
          <strong>Tips:</strong> Include subjective (symptoms, overnight events), vitals, labs,
          exam findings, and your assessment/plan thoughts. AI will organize into SOAP format.
          You can dictate multiple times to build your note.
        </div>
      </CardContent>
    </Card>
  );
}

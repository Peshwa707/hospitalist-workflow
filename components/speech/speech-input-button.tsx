'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAudioRecorder } from './use-audio-recorder';

interface SpeechInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SpeechInputButton({
  onTranscript,
  disabled = false,
  className = '',
}: SpeechInputButtonProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  // Keep callback ref updated
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const {
    isRecording,
    isSupported,
    error: recorderError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setError(null);

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
        onTranscriptRef.current(transcript);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setIsTranscribing(false);
      resetRecording();
    }
  }, [resetRecording]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        await transcribeAudio(audioBlob);
      }
    } else {
      setError(null);
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording, transcribeAudio]);

  if (!isSupported) {
    return null;
  }

  const displayError = error || recorderError;
  const isProcessing = isRecording || isTranscribing;

  return (
    <div className="relative inline-flex">
      <Button
        type="button"
        variant={isRecording ? 'destructive' : 'ghost'}
        size="icon"
        className={`h-8 w-8 ${className}`}
        onClick={toggleRecording}
        disabled={disabled || isTranscribing}
        title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Start voice input'}
      >
        {isTranscribing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <>
            <MicOff className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      {displayError && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-red-50 text-red-600 text-xs p-2 rounded shadow-lg whitespace-nowrap">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          {displayError}
        </div>
      )}
    </div>
  );
}

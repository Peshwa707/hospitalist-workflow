'use client';

import { useState, useEffect } from 'react';
import { VoiceNoteRecorder } from '@/components/voice-note/voice-note-recorder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Copy,
  Check,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Patient {
  id: number;
  mrn: string;
  roomNumber?: string;
}

export default function VoiceNotePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [generatedNote, setGeneratedNote] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [currentPatientId, setCurrentPatientId] = useState<number | null>(null);
  const [editedNote, setEditedNote] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);

  // Fetch patients on mount
  useEffect(() => {
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setPatients(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingPatients(false));
  }, []);

  const handleNoteGenerated = (note: string, transcript: string, patientId: number | null) => {
    setGeneratedNote(note);
    setEditedNote(note);
    setTranscription(transcript);
    setCurrentPatientId(patientId);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedNote);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers without clipboard API or permission denied
      console.error('Clipboard copy failed:', err);
      alert('Failed to copy to clipboard. Please select and copy manually.');
    }
  };

  const handleSaveNote = async () => {
    if (!currentPatientId) {
      alert('Please select a patient before saving.');
      return;
    }

    setIsSaving(true);
    try {
      // Save the note using directContent to bypass AI regeneration
      const response = await fetch('/api/notes/progress/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: currentPatientId,
          rawInput: transcription || 'Voice dictation',
          directContent: editedNote, // Bypass AI, save directly
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Note saved successfully!');
      } else {
        throw new Error(result.error || 'Failed to save note');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save note';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartNew = () => {
    setGeneratedNote(null);
    setTranscription(null);
    setEditedNote('');
    setCurrentPatientId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Voice-to-Note</h1>
          <p className="text-sm text-muted-foreground">
            Dictate freely, AI generates your SOAP progress note
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Recorder */}
        <div className="space-y-4">
          <VoiceNoteRecorder
            patients={isLoadingPatients ? [] : patients}
            onNoteGenerated={handleNoteGenerated}
          />

          {/* Transcription (collapsible) */}
          {transcription && (
            <Card>
              <CardHeader className="py-3">
                <button
                  onClick={() => setShowTranscription(!showTranscription)}
                  className="flex items-center justify-between w-full"
                >
                  <CardTitle className="text-sm font-medium">
                    Original Transcription
                  </CardTitle>
                  {showTranscription ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </CardHeader>
              {showTranscription && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                    {transcription}
                  </p>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* Right Column: Note Editor */}
        {generatedNote && (
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Generated SOAP Note
                  <Badge variant="outline" className="text-xs">
                    Progress
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNote}
                    disabled={isSaving || !currentPatientId}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        Save Note
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {!currentPatientId && (
                <p className="text-xs text-amber-600 mt-2">
                  Select a patient to enable saving
                </p>
              )}
            </CardHeader>
            <CardContent className="flex-1">
              <Textarea
                value={editedNote}
                onChange={(e) => setEditedNote(e.target.value)}
                className="min-h-[500px] font-mono text-sm resize-none"
                placeholder="Generated note will appear here..."
              />
            </CardContent>
          </Card>
        )}

        {/* Placeholder when no note generated */}
        {!generatedNote && (
          <Card className="flex flex-col items-center justify-center min-h-[400px] border-dashed">
            <CardContent className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No note generated yet</p>
              <p className="text-sm mt-1">
                Record your dictation and the AI will generate<br />
                a structured SOAP progress note
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Start New Button */}
      {generatedNote && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleStartNew}>
            Start New Dictation
          </Button>
        </div>
      )}
    </div>
  );
}

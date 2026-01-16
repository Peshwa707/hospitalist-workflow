'use client';

import { useState } from 'react';
import { ProgressNoteForm } from '@/components/notes/progress-note-form';
import { NoteDisplay } from '@/components/notes/note-display';
import { AIDisclaimer } from '@/components/notes/ai-disclaimer';
import type { ProgressNoteOutput } from '@/lib/types';

export default function ProgressNotePage() {
  const [generatedNote, setGeneratedNote] = useState<ProgressNoteOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerated = (output: ProgressNoteOutput) => {
    setGeneratedNote(output);
  };

  const handleRegenerate = async () => {
    if (!generatedNote?.input) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/notes/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedNote.input),
      });

      if (response.ok) {
        const output: ProgressNoteOutput = await response.json();
        setGeneratedNote(output);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress Note Generator</h1>
        <p className="text-muted-foreground mt-2">
          Enter brief clinical details to generate a complete SOAP-format progress note.
        </p>
      </div>

      <AIDisclaimer />

      <ProgressNoteForm onGenerated={handleGenerated} />

      {generatedNote && (
        <NoteDisplay
          title="Generated Progress Note"
          content={generatedNote.content}
          generatedAt={generatedNote.generatedAt}
          onRegenerate={handleRegenerate}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

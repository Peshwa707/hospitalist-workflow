'use client';

import { useState } from 'react';
import { DischargeSummaryForm } from '@/components/notes/discharge-summary-form';
import { NoteDisplay } from '@/components/notes/note-display';
import { AIDisclaimer } from '@/components/notes/ai-disclaimer';
import type { DischargeSummaryOutput } from '@/lib/types';

export default function DischargeSummaryPage() {
  const [generatedSummary, setGeneratedSummary] = useState<DischargeSummaryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerated = (output: DischargeSummaryOutput) => {
    setGeneratedSummary(output);
  };

  const handleRegenerate = async () => {
    if (!generatedSummary?.input) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/notes/discharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedSummary.input),
      });

      if (response.ok) {
        const output: DischargeSummaryOutput = await response.json();
        setGeneratedSummary(output);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Discharge Summary Generator</h1>
        <p className="text-muted-foreground mt-2">
          Enter key hospitalization details to generate a comprehensive discharge summary.
        </p>
      </div>

      <AIDisclaimer />

      <DischargeSummaryForm onGenerated={handleGenerated} />

      {generatedSummary && (
        <NoteDisplay
          title="Generated Discharge Summary"
          content={generatedSummary.content}
          generatedAt={generatedSummary.generatedAt}
          onRegenerate={handleRegenerate}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

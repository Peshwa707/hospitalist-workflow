'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileStack, ClipboardPaste } from 'lucide-react';
import { SpeechInputButton } from '@/components/speech/speech-input-button';
import type { PriorCareSummaryOutput } from '@/lib/types';

interface PriorCareFormProps {
  onSummaryGenerated: (output: PriorCareSummaryOutput) => void;
}

export function PriorCareForm({ onSummaryGenerated }: PriorCareFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState('');
  const [patientContext, setPatientContext] = useState('');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setDocuments((prev) => (prev ? `${prev}\n\n---\n\n${text}` : text));
    } catch {
      setError('Unable to read clipboard. Please paste manually.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze/prior-care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, patientContext }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate summary');
      }

      const output: PriorCareSummaryOutput = await response.json();
      onSummaryGenerated(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const wordCount = documents.trim().split(/\s+/).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileStack className="h-5 w-5" />
          Prior Care Summary
        </CardTitle>
        <CardDescription>
          Paste multiple office notes, discharge summaries, or consultation notes to generate
          a concise summary of the patient&apos;s prior care.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Optional context */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="patientContext">Current Admission Context (Optional)</Label>
              <SpeechInputButton
                onTranscript={(text) =>
                  setPatientContext((prev) => (prev ? `${prev} ${text}` : text))
                }
              />
            </div>
            <Input
              id="patientContext"
              placeholder="e.g., Admitted for CHF exacerbation, focus on cardiac history"
              value={patientContext}
              onChange={(e) => setPatientContext(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Providing context helps focus the summary on relevant history
            </p>
          </div>

          {/* Documents input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="documents">Clinical Documents</Label>
              <div className="flex gap-2">
                <SpeechInputButton
                  onTranscript={(text) =>
                    setDocuments((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePaste}
                >
                  <ClipboardPaste className="h-4 w-4 mr-1" />
                  Paste
                </Button>
              </div>
            </div>
            <Textarea
              id="documents"
              placeholder="Paste office notes, discharge summaries, consultation notes here...

You can paste multiple documents - they will be analyzed together.

Example:
---
OFFICE VISIT 1/5/2024
Chief Complaint: Follow-up CHF
...

---
DISCHARGE SUMMARY 12/15/2023
Admission Date: 12/10/2023
...
"
              value={documents}
              onChange={(e) => setDocuments(e.target.value)}
              required
              rows={16}
              className="font-mono text-sm"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paste multiple documents separated by --- or just paste them consecutively</span>
              <span>{wordCount} words</span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || wordCount < 20}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Documents (this may take a moment)...
              </>
            ) : (
              <>
                <FileStack className="h-4 w-4 mr-2" />
                Generate Prior Care Summary
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

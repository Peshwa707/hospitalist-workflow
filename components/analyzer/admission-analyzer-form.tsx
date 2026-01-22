'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Brain } from 'lucide-react';
import { SpeechInputButton } from '@/components/speech/speech-input-button';
import type { AdmissionAnalysisOutput } from '@/lib/types';

interface AdmissionAnalyzerFormProps {
  onAnalyzed: (output: AdmissionAnalysisOutput) => void;
}

export function AdmissionAnalyzerForm({ onAnalyzed }: AdmissionAnalyzerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [admissionNote, setAdmissionNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze/admission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionNote }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze note');
      }

      const output: AdmissionAnalysisOutput = await response.json();
      onAnalyzed(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Admission Note Analyzer
        </CardTitle>
        <CardDescription>
          Paste a complete admission note to receive AI-assisted clinical decision support:
          differential diagnosis, recommended workup, consult suggestions, and discharge planning.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="admissionNote">Admission Note</Label>
              <SpeechInputButton
                onTranscript={(text) =>
                  setAdmissionNote((prev) => (prev ? `${prev} ${text}` : text))
                }
              />
            </div>
            <Textarea
              id="admissionNote"
              placeholder="Paste the complete admission note here...

Example:
Chief Complaint: Chest pain
HPI: 65 y/o M with PMHx of HTN, HLD, DM2, presents with 2 hours of substernal chest pressure radiating to left arm, associated with diaphoresis and nausea. Started while at rest watching TV. No prior cardiac history. Takes metformin, lisinopril, atorvastatin.
..."
              value={admissionNote}
              onChange={(e) => setAdmissionNote(e.target.value)}
              required
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Include as much clinical detail as available: HPI, PMHx, medications, exam findings, initial labs/studies.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading || admissionNote.length < 50} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Note (this may take a moment)...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Analyze Admission Note
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

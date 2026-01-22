'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, BrainCog, AlertCircle } from 'lucide-react';
import { SpeechInputButton } from '@/components/speech/speech-input-button';
import type { CognitiveBiasOutput } from '@/lib/types';

interface CognitiveBiasFormProps {
  onAnalyzed: (result: CognitiveBiasOutput) => void;
}

export function CognitiveBiasForm({ onAnalyzed }: CognitiveBiasFormProps) {
  const [clinicalReasoning, setClinicalReasoning] = useState('');
  const [workingDiagnosis, setWorkingDiagnosis] = useState('');
  const [differentialConsidered, setDifferentialConsidered] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze/cognitive-bias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalReasoning,
          workingDiagnosis: workingDiagnosis || undefined,
          differentialConsidered: differentialConsidered || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const result: CognitiveBiasOutput = await response.json();
      onAnalyzed(result);
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
          <BrainCog className="h-5 w-5" />
          Cognitive Bias Checker
        </CardTitle>
        <CardDescription>
          Analyze clinical reasoning for potential cognitive biases and suggest alternative diagnoses to consider
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="clinicalReasoning">Clinical Reasoning / Case Presentation *</Label>
              <SpeechInputButton
                onTranscript={(text) => setClinicalReasoning((prev) => prev + ' ' + text)}
              />
            </div>
            <Textarea
              id="clinicalReasoning"
              value={clinicalReasoning}
              onChange={(e) => setClinicalReasoning(e.target.value)}
              placeholder="Present the case as you understand it: patient history, presentation, findings, and your reasoning process. Include what led you to your current thinking..."
              rows={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              Include your thought process - this helps identify potential biases
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="workingDiagnosis">Working Diagnosis (optional)</Label>
              <SpeechInputButton
                onTranscript={(text) => setWorkingDiagnosis((prev) => prev + ' ' + text)}
              />
            </div>
            <Textarea
              id="workingDiagnosis"
              value={workingDiagnosis}
              onChange={(e) => setWorkingDiagnosis(e.target.value)}
              placeholder="What is your current leading diagnosis and why?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="differentialConsidered">Differential Diagnosis Considered (optional)</Label>
              <SpeechInputButton
                onTranscript={(text) => setDifferentialConsidered((prev) => prev + ' ' + text)}
              />
            </div>
            <Textarea
              id="differentialConsidered"
              value={differentialConsidered}
              onChange={(e) => setDifferentialConsidered(e.target.value)}
              placeholder="What other diagnoses have you considered and ruled out (or in)?"
              rows={3}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading || !clinicalReasoning.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing for Cognitive Biases...
              </>
            ) : (
              <>
                <BrainCog className="h-4 w-4 mr-2" />
                Check for Cognitive Biases
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import { SpeechInputButton } from '@/components/speech/speech-input-button';
import type { CareCoordinationOutput } from '@/lib/types';

interface CareCoordinationFormProps {
  onAnalyzed: (result: CareCoordinationOutput) => void;
}

export function CareCoordinationForm({ onAnalyzed }: CareCoordinationFormProps) {
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [currentCareTeam, setCurrentCareTeam] = useState('');
  const [patientGoals, setPatientGoals] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze/care-coordination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalSummary,
          currentCareTeam: currentCareTeam || undefined,
          patientGoals: patientGoals || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const result: CareCoordinationOutput = await response.json();
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
          <Users className="h-5 w-5" />
          Care Coordination Analysis
        </CardTitle>
        <CardDescription>
          Analyze care team needs, consultations, handoffs, and communication planning
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="clinicalSummary">Clinical Summary *</Label>
              <SpeechInputButton
                onTranscript={(text) => setClinicalSummary((prev) => prev + ' ' + text)}
              />
            </div>
            <Textarea
              id="clinicalSummary"
              value={clinicalSummary}
              onChange={(e) => setClinicalSummary(e.target.value)}
              placeholder="Provide a summary of the patient's clinical status, active problems, and current treatment plan..."
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="currentCareTeam">Current Care Team (optional)</Label>
              <SpeechInputButton
                onTranscript={(text) => setCurrentCareTeam((prev) => prev + ' ' + text)}
              />
            </div>
            <Textarea
              id="currentCareTeam"
              value={currentCareTeam}
              onChange={(e) => setCurrentCareTeam(e.target.value)}
              placeholder="List current consultants, services involved, primary nurse, case manager..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="patientGoals">Patient/Family Goals (optional)</Label>
              <SpeechInputButton
                onTranscript={(text) => setPatientGoals((prev) => prev + ' ' + text)}
              />
            </div>
            <Textarea
              id="patientGoals"
              value={patientGoals}
              onChange={(e) => setPatientGoals(e.target.value)}
              placeholder="Patient and family goals, preferences, concerns..."
              rows={2}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading || !clinicalSummary.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Care Coordination Needs...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Analyze Care Coordination
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

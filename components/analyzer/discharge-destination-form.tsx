'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Home, AlertCircle } from 'lucide-react';
import { SpeechInputButton } from '@/components/speech/speech-input-button';
import type { DischargeDestinationOutput } from '@/lib/types';

interface DischargeDestinationFormProps {
  onAnalyzed: (result: DischargeDestinationOutput) => void;
}

export function DischargeDestinationForm({ onAnalyzed }: DischargeDestinationFormProps) {
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [functionalStatus, setFunctionalStatus] = useState('');
  const [socialSupport, setSocialSupport] = useState('');
  const [insuranceType, setInsuranceType] = useState('');
  const [patientPreferences, setPatientPreferences] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze/discharge-destination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalSummary,
          functionalStatus: functionalStatus || undefined,
          socialSupport: socialSupport || undefined,
          insuranceType: insuranceType || undefined,
          patientPreferences: patientPreferences || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const result: DischargeDestinationOutput = await response.json();
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
          <Home className="h-5 w-5" />
          Discharge Destination Planning
        </CardTitle>
        <CardDescription>
          Analyze appropriate discharge destination based on clinical, functional, and social factors
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
              placeholder="Patient's diagnoses, medical complexity, ongoing care needs, medications, treatments..."
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="functionalStatus">Functional Status (optional)</Label>
              <SpeechInputButton
                onTranscript={(text) => setFunctionalStatus((prev) => prev + ' ' + text)}
              />
            </div>
            <Textarea
              id="functionalStatus"
              value={functionalStatus}
              onChange={(e) => setFunctionalStatus(e.target.value)}
              placeholder="Mobility, ADLs (bathing, dressing, toileting), cognition, PT/OT assessments..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="socialSupport">Social Support (optional)</Label>
              <SpeechInputButton
                onTranscript={(text) => setSocialSupport((prev) => prev + ' ' + text)}
              />
            </div>
            <Textarea
              id="socialSupport"
              value={socialSupport}
              onChange={(e) => setSocialSupport(e.target.value)}
              placeholder="Caregiver availability, home setup, family involvement, transportation..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="insuranceType">Insurance Type (optional)</Label>
              <Input
                id="insuranceType"
                value={insuranceType}
                onChange={(e) => setInsuranceType(e.target.value)}
                placeholder="e.g., Medicare, Medicaid, Private"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="patientPreferences">Patient Preferences</Label>
                <SpeechInputButton
                  onTranscript={(text) => setPatientPreferences((prev) => prev + ' ' + text)}
                />
              </div>
              <Input
                id="patientPreferences"
                value={patientPreferences}
                onChange={(e) => setPatientPreferences(e.target.value)}
                placeholder="Patient/family goals"
              />
            </div>
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
                Analyzing Discharge Options...
              </>
            ) : (
              <>
                <Home className="h-4 w-4 mr-2" />
                Plan Discharge Destination
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

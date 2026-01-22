'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Brain, AlertCircle, ChevronDown } from 'lucide-react';
import { SpeechInputButton } from '@/components/speech/speech-input-button';
import type { ComprehensiveAnalysisOutput } from '@/lib/types';

interface ComprehensiveAnalysisFormProps {
  onAnalyzed: (result: ComprehensiveAnalysisOutput) => void;
}

export function ComprehensiveAnalysisForm({ onAnalyzed }: ComprehensiveAnalysisFormProps) {
  const [admissionNote, setAdmissionNote] = useState('');
  const [functionalStatus, setFunctionalStatus] = useState('');
  const [socialSupport, setSocialSupport] = useState('');
  const [insuranceType, setInsuranceType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admissionNote,
          functionalStatus: functionalStatus || undefined,
          socialSupport: socialSupport || undefined,
          insuranceType: insuranceType || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const result: ComprehensiveAnalysisOutput = await response.json();
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
          <Brain className="h-5 w-5" />
          Comprehensive Clinical Analysis
        </CardTitle>
        <CardDescription>
          Paste an admission note to get differential diagnosis, care coordination plan,
          discharge planning, and cognitive bias check - all at once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="admissionNote">Admission Note / Clinical Summary *</Label>
              <SpeechInputButton
                onTranscript={(text) => setAdmissionNote((prev) => prev + ' ' + text)}
              />
            </div>
            <Textarea
              id="admissionNote"
              value={admissionNote}
              onChange={(e) => setAdmissionNote(e.target.value)}
              placeholder="Paste the full admission note, H&P, or clinical summary here. Include chief complaint, HPI, PMH, medications, vitals, labs, exam findings, and assessment/plan..."
              rows={12}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              The more detail you provide, the better the analysis. Include all available clinical data.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              variant="ghost"
              type="button"
              className="w-full justify-between"
              onClick={() => setShowOptional(!showOptional)}
            >
              Additional Context (Optional)
              <ChevronDown className={`h-4 w-4 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
            </Button>

            {showOptional && (
              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="functionalStatus">Functional Status</Label>
                    <SpeechInputButton
                      onTranscript={(text) => setFunctionalStatus((prev) => prev + ' ' + text)}
                    />
                  </div>
                  <Textarea
                    id="functionalStatus"
                    value={functionalStatus}
                    onChange={(e) => setFunctionalStatus(e.target.value)}
                    placeholder="Mobility, ADLs, cognition, PT/OT assessments..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="socialSupport">Social Support</Label>
                    <SpeechInputButton
                      onTranscript={(text) => setSocialSupport((prev) => prev + ' ' + text)}
                    />
                  </div>
                  <Textarea
                    id="socialSupport"
                    value={socialSupport}
                    onChange={(e) => setSocialSupport(e.target.value)}
                    placeholder="Caregiver availability, home setup, family involvement..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insuranceType">Insurance Type</Label>
                  <Input
                    id="insuranceType"
                    value={insuranceType}
                    onChange={(e) => setInsuranceType(e.target.value)}
                    placeholder="Medicare, Medicaid, Private, etc."
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading || !admissionNote.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running All Analyses (this may take 30-60 seconds)...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Run Comprehensive Analysis
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

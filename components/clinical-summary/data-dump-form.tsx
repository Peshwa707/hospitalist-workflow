'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, FileText, AlertCircle, ChevronDown } from 'lucide-react';
import { SpeechInputButton } from '@/components/speech/speech-input-button';
import type { ClinicalSummaryOutput } from '@/lib/types';

interface DataDumpFormProps {
  onSummarized: (result: ClinicalSummaryOutput) => void;
}

export function DataDumpForm({ onSummarized }: DataDumpFormProps) {
  const [rawData, setRawData] = useState('');
  const [patientContext, setPatientContext] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/clinical-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawData,
          patientContext: patientContext || undefined,
          focusAreas: focusAreas ? focusAreas.split(',').map(s => s.trim()) : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Summary failed');
      }

      const result: ClinicalSummaryOutput = await response.json();
      onSummarized(result);
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
          <FileText className="h-5 w-5" />
          Clinical Data Summary
        </CardTitle>
        <CardDescription>
          Paste any clinical data (labs, notes, vitals, meds, imaging) and get a comprehensive
          summary with actionable next steps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rawData">Clinical Data *</Label>
              <SpeechInputButton
                onTranscript={(text) => setRawData((prev) => prev + ' ' + text)}
              />
            </div>
            <Textarea
              id="rawData"
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              placeholder="Paste any clinical data here:
- Labs (any format)
- Medication lists
- Progress notes
- Vital sign trends
- Imaging reports
- Mixed data from multiple sources

The AI will automatically detect data types and synthesize into a summary..."
              rows={12}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Accepts any clinical data format. The more you provide, the better the analysis.
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
                    <Label htmlFor="patientContext">Patient Context</Label>
                    <SpeechInputButton
                      onTranscript={(text) => setPatientContext((prev) => prev + ' ' + text)}
                    />
                  </div>
                  <Textarea
                    id="patientContext"
                    value={patientContext}
                    onChange={(e) => setPatientContext(e.target.value)}
                    placeholder="Brief context about the patient (e.g., '72M with CHF admitted for dyspnea')..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="focusAreas">Focus Areas (comma-separated)</Label>
                  <Input
                    id="focusAreas"
                    value={focusAreas}
                    onChange={(e) => setFocusAreas(e.target.value)}
                    placeholder="e.g., kidney function, fluid status, infection"
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

          <Button type="submit" className="w-full" size="lg" disabled={isLoading || !rawData.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Clinical Data...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Summary
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

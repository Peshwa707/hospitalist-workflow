'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FileInput,
  Loader2,
  Wand2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { ParsedDataPreview } from './parsed-data-preview';
import type { Patient, Vitals, LabResult, Medication } from '@/lib/types';

interface EmrImportModalProps {
  patient: Patient;
  onImported: (patient: Patient) => void;
  onCancel: () => void;
}

interface ParsedEmrData {
  vitals: Vitals | null;
  labs: LabResult[];
  medications: Medication[];
  parseNotes?: string;
}

type Step = 'input' | 'preview' | 'success';

export function EmrImportModal({ patient, onImported, onCancel }: EmrImportModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [emrText, setEmrText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedEmrData | null>(null);

  const handleParse = async () => {
    if (!emrText.trim()) {
      setError('Please paste EMR data first');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const response = await fetch('/api/emr/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emrText: emrText.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to parse EMR data');
      }

      const data: ParsedEmrData = await response.json();
      setParsedData(data);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setIsImporting(true);
    setError(null);

    try {
      const response = await fetch('/api/emr/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          vitals: parsedData.vitals,
          labs: parsedData.labs,
          medications: parsedData.medications,
          mergeMode: 'replace',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import EMR data');
      }

      const result = await response.json();
      setStep('success');

      // Wait a moment to show success, then close
      setTimeout(() => {
        onImported(result.patient);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsImporting(false);
    }
  };

  const handleBack = () => {
    setStep('input');
    setError(null);
  };

  if (step === 'success') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800">Import Successful!</h3>
            <p className="text-green-700 mt-2">
              Patient data has been updated with the imported EMR data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileInput className="h-5 w-5" />
              Import EMR Data for {patient.initials}
            </CardTitle>
            <CardDescription>
              {step === 'input'
                ? 'Paste data copied from your EMR system (Epic, etc.)'
                : 'Review parsed data before importing'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'input' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="emrText">Paste EMR Data</Label>
              <Textarea
                id="emrText"
                value={emrText}
                onChange={(e) => setEmrText(e.target.value)}
                placeholder={`Paste vitals, labs, or medications from your EMR here...

Example formats:
- Vitals flowsheet (timestamps, values)
- Lab results with reference ranges
- Medication list with doses`}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Supports Epic and similar EMR formats. Paste vitals, labs, or
                medication lists directly.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={isParsing || !emrText.trim()}
                className="flex-1"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Parse Data
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'preview' && parsedData && (
          <>
            <ParsedDataPreview
              vitals={parsedData.vitals}
              labs={parsedData.labs}
              medications={parsedData.medications}
              parseNotes={parsedData.parseNotes}
            />

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  isImporting ||
                  (!parsedData.vitals &&
                    parsedData.labs.length === 0 &&
                    parsedData.medications.length === 0)
                }
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Import to Patient
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

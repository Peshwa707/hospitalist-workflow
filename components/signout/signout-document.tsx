'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRightLeft, RefreshCw, Printer, Download } from 'lucide-react';
import { PatientSignoutCard } from './patient-signout-card';
import { ConsultBriefModal } from './consult-brief-modal';
import type { PatientSignout } from '@/lib/types';

interface SignoutDocumentProps {
  initialPatientIds?: number[];
}

interface BatchResult {
  signouts: PatientSignout[];
  errors?: { patientId: number; error: string }[];
  metadata?: {
    totalPatients: number;
    successCount: number;
    errorCount: number;
    totalLatencyMs: number;
    shiftType: string;
  };
}

export function SignoutDocument({ initialPatientIds }: SignoutDocumentProps) {
  const [signouts, setSignouts] = useState<PatientSignout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [metadata, setMetadata] = useState<BatchResult['metadata'] | null>(null);

  const generateSignouts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/signout/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientIds: initialPatientIds,
          shiftType: 'day',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate signouts');
      }

      const result: BatchResult = await response.json();
      setSignouts(result.signouts);
      setMetadata(result.metadata);
      setLastGenerated(new Date());

      if (result.errors && result.errors.length > 0) {
        setError(`${result.errors.length} signout(s) failed to generate`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Sort signouts by room number
  const sortedSignouts = [...signouts].sort((a, b) => {
    return (a.roomNumber || '').localeCompare(b.roomNumber || '');
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="print:hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Shift Signout
              </CardTitle>
              <CardDescription>
                Generate signout documents for all patients
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {signouts.length > 0 && (
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              )}
              <Button onClick={generateSignouts} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {signouts.length > 0 ? 'Refresh' : 'Generate'} Signouts
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {(metadata || lastGenerated || error) && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-4 text-sm">
              {metadata && (
                <>
                  <Badge variant="outline">
                    {metadata.successCount} / {metadata.totalPatients} patients
                  </Badge>
                  <Badge variant="outline">
                    {(metadata.totalLatencyMs / 1000).toFixed(1)}s total
                  </Badge>
                </>
              )}
              {lastGenerated && (
                <span className="text-muted-foreground">
                  Generated at {lastGenerated.toLocaleTimeString()}
                </span>
              )}
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Signout Cards */}
      {signouts.length === 0 && !loading && (
        <Card className="p-8 text-center text-muted-foreground print:hidden">
          <p>No signouts generated yet.</p>
          <p className="text-sm mt-2">Click "Generate Signouts" to create shift handoff documents.</p>
        </Card>
      )}

      {/* Print Header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">Shift Signout</h1>
        <p className="text-sm text-muted-foreground">
          Generated: {lastGenerated?.toLocaleString()} | {signouts.length} patients
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 print:grid-cols-1">
        {sortedSignouts.map((signout) => (
          <div key={signout.patientId} className="relative">
            <PatientSignoutCard signout={signout} />
            <div className="absolute top-2 right-2 print:hidden">
              <ConsultBriefModal
                patientId={signout.patientId}
                patientMrn={signout.patientMrn}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

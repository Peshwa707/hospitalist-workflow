'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sun, RefreshCw, AlertTriangle } from 'lucide-react';
import { PatientBriefingCard } from './patient-briefing-card';
import type { PatientBriefing } from '@/lib/types';

interface BriefingDashboardProps {
  initialPatientIds?: number[];
}

interface BatchResult {
  briefings: PatientBriefing[];
  errors?: { patientId: number; error: string }[];
  metadata?: {
    totalPatients: number;
    successCount: number;
    errorCount: number;
    totalLatencyMs: number;
  };
}

export function BriefingDashboard({ initialPatientIds }: BriefingDashboardProps) {
  const [briefings, setBriefings] = useState<PatientBriefing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [metadata, setMetadata] = useState<BatchResult['metadata'] | null>(null);

  const generateBriefings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/briefing/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientIds: initialPatientIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate briefings');
      }

      const result: BatchResult = await response.json();
      setBriefings(result.briefings);
      setMetadata(result.metadata);
      setLastGenerated(new Date());

      if (result.errors && result.errors.length > 0) {
        setError(`${result.errors.length} briefing(s) failed to generate`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Sort briefings: critical issues first, then by room number
  const sortedBriefings = [...briefings].sort((a, b) => {
    const aCritical = a.keyIssues.filter(i => i.severity === 'critical').length;
    const bCritical = b.keyIssues.filter(i => i.severity === 'critical').length;

    if (aCritical !== bCritical) {
      return bCritical - aCritical;
    }

    // Sort by room number
    return (a.roomNumber || '').localeCompare(b.roomNumber || '');
  });

  const totalCritical = briefings.reduce(
    (sum, b) => sum + b.keyIssues.filter(i => i.severity === 'critical').length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow-500" />
                Pre-Round Briefings
              </CardTitle>
              <CardDescription>
                Morning briefings for all patients on your list
              </CardDescription>
            </div>
            <Button
              onClick={generateBriefings}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {briefings.length > 0 ? 'Refresh' : 'Generate'} Briefings
                </>
              )}
            </Button>
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
              {totalCritical > 0 && (
                <Badge className="bg-red-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {totalCritical} critical issues
                </Badge>
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

      {/* Briefing Cards */}
      {briefings.length === 0 && !loading && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No briefings generated yet.</p>
          <p className="text-sm mt-2">Click "Generate Briefings" to create morning briefings for all patients.</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {sortedBriefings.map((briefing) => (
          <PatientBriefingCard key={briefing.patientId} briefing={briefing} />
        ))}
      </div>
    </div>
  );
}

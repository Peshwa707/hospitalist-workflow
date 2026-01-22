'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TestTube, Pill, AlertCircle } from 'lucide-react';
import type { Vitals, LabResult, Medication } from '@/lib/types';

interface ParsedDataPreviewProps {
  vitals: Vitals | null;
  labs: LabResult[];
  medications: Medication[];
  parseNotes?: string;
}

export function ParsedDataPreview({
  vitals,
  labs,
  medications,
  parseNotes,
}: ParsedDataPreviewProps) {
  const hasData = vitals || labs.length > 0 || medications.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No data could be extracted from the pasted text.</p>
        {parseNotes && (
          <p className="text-sm mt-2 text-orange-600">{parseNotes}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Parse notes / warnings */}
      {parseNotes && (
        <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{parseNotes}</span>
        </div>
      )}

      {/* Vitals */}
      {vitals && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Vitals
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-3 gap-2 text-sm">
              {vitals.temperature && (
                <div>
                  <span className="text-muted-foreground">Temp:</span>{' '}
                  <span className="font-medium">{vitals.temperature}°F</span>
                </div>
              )}
              {vitals.heartRate && (
                <div>
                  <span className="text-muted-foreground">HR:</span>{' '}
                  <span className="font-medium">{vitals.heartRate}</span>
                </div>
              )}
              {vitals.bloodPressure && (
                <div>
                  <span className="text-muted-foreground">BP:</span>{' '}
                  <span className="font-medium">{vitals.bloodPressure}</span>
                </div>
              )}
              {vitals.respiratoryRate && (
                <div>
                  <span className="text-muted-foreground">RR:</span>{' '}
                  <span className="font-medium">{vitals.respiratoryRate}</span>
                </div>
              )}
              {vitals.oxygenSaturation && (
                <div>
                  <span className="text-muted-foreground">O2:</span>{' '}
                  <span className="font-medium">
                    {vitals.oxygenSaturation}%
                    {vitals.oxygenDevice && ` (${vitals.oxygenDevice})`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Labs */}
      {labs.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Labs ({labs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {labs.map((lab, i) => (
                <div
                  key={i}
                  className="text-sm border rounded p-2 bg-muted/30"
                >
                  <div className="font-medium">{lab.name}</div>
                  <div className="flex items-center gap-1">
                    <span
                      className={
                        lab.flag === 'critical'
                          ? 'text-red-600 font-bold'
                          : lab.flag
                          ? 'text-orange-600'
                          : ''
                      }
                    >
                      {lab.value}
                      {lab.unit && ` ${lab.unit}`}
                    </span>
                    {lab.flag && (
                      <Badge
                        variant={lab.flag === 'critical' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {lab.flag.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  {lab.referenceRange && (
                    <div className="text-xs text-muted-foreground">
                      Ref: {lab.referenceRange}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medications */}
      {medications.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Medications ({medications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {medications.map((med, i) => (
                <div
                  key={i}
                  className="text-sm border-b pb-2 last:border-0 last:pb-0"
                >
                  <div className="font-medium">{med.name}</div>
                  <div className="text-muted-foreground">
                    {med.dose} {med.route} {med.frequency}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

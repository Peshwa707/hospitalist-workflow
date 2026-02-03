'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Pill,
  AlertTriangle,
  Activity,
  TestTube,
  Calendar,
  MapPin,
} from 'lucide-react';
import type { Patient } from '@/lib/types';

interface PatientContextSidebarProps {
  patient: Patient;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateHospitalDay(admissionDate: string | undefined): number | null {
  if (!admissionDate) return null;
  const admission = new Date(admissionDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - admission.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function PatientContextSidebar({
  patient,
  collapsed = false,
  onToggleCollapse,
}: PatientContextSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
    onToggleCollapse?.();
  };

  const hospitalDay = calculateHospitalDay(patient.admissionDate);

  if (isCollapsed) {
    return (
      <div className="w-10 border-l bg-muted/30 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <User className="h-4 w-4" />
          <Activity className="h-4 w-4" />
          <TestTube className="h-4 w-4" />
          <Pill className="h-4 w-4" />
          <AlertTriangle className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <Card className="w-72 h-full flex flex-col border-l rounded-none">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          Patient Context
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={handleToggle}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="space-y-4 pt-0">
          {/* Patient Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">MRN</span>
              <span className="font-mono font-medium">{patient.mrn}</span>
            </div>
            {patient.roomNumber && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Room
                </span>
                <span className="font-medium">{patient.roomNumber}</span>
              </div>
            )}
            {hospitalDay !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Hospital Day
                </span>
                <Badge variant="outline">{hospitalDay}</Badge>
              </div>
            )}
            {patient.admissionDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Admitted</span>
                <span className="text-xs">{formatDate(patient.admissionDate)}</span>
              </div>
            )}
            {patient.codeStatus && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Code Status</span>
                <Badge variant={patient.codeStatus === 'Full Code' ? 'default' : 'secondary'}>
                  {patient.codeStatus}
                </Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Diagnoses */}
          {patient.primaryDiagnoses.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Diagnoses
              </h4>
              <ul className="space-y-1">
                {patient.primaryDiagnoses.map((dx, i) => (
                  <li key={i} className="text-sm">
                    • {dx}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vitals */}
          {patient.recentVitals && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Recent Vitals
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {patient.recentVitals.temperature && (
                    <div>
                      <span className="text-muted-foreground">Temp:</span>{' '}
                      <span className="font-medium">{patient.recentVitals.temperature}°F</span>
                    </div>
                  )}
                  {patient.recentVitals.heartRate && (
                    <div>
                      <span className="text-muted-foreground">HR:</span>{' '}
                      <span className="font-medium">{patient.recentVitals.heartRate}</span>
                    </div>
                  )}
                  {patient.recentVitals.bloodPressure && (
                    <div>
                      <span className="text-muted-foreground">BP:</span>{' '}
                      <span className="font-medium">{patient.recentVitals.bloodPressure}</span>
                    </div>
                  )}
                  {patient.recentVitals.respiratoryRate && (
                    <div>
                      <span className="text-muted-foreground">RR:</span>{' '}
                      <span className="font-medium">{patient.recentVitals.respiratoryRate}</span>
                    </div>
                  )}
                  {patient.recentVitals.oxygenSaturation && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">SpO2:</span>{' '}
                      <span className="font-medium">
                        {patient.recentVitals.oxygenSaturation}%
                        {patient.recentVitals.oxygenDevice && ` on ${patient.recentVitals.oxygenDevice}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Labs */}
          {patient.recentLabs.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <TestTube className="h-3 w-3" />
                  Recent Labs
                </h4>
                <div className="space-y-1">
                  {patient.recentLabs.slice(0, 6).map((lab, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">{lab.name}</span>
                      <span className={`font-medium ${lab.flag === 'critical' ? 'text-red-600' : lab.flag ? 'text-amber-600' : ''}`}>
                        {lab.value}
                        {lab.unit && ` ${lab.unit}`}
                      </span>
                    </div>
                  ))}
                  {patient.recentLabs.length > 6 && (
                    <p className="text-xs text-muted-foreground">
                      +{patient.recentLabs.length - 6} more
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Medications */}
          {patient.activeMedications.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Pill className="h-3 w-3" />
                  Medications
                </h4>
                <div className="space-y-1">
                  {patient.activeMedications.slice(0, 5).map((med, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-medium">{med.name}</span>{' '}
                      <span className="text-muted-foreground">
                        {med.dose} {med.route} {med.frequency}
                      </span>
                    </div>
                  ))}
                  {patient.activeMedications.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{patient.activeMedications.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Allergies */}
          {patient.allergies.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  Allergies
                </h4>
                <div className="flex flex-wrap gap-1">
                  {patient.allergies.map((allergy, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

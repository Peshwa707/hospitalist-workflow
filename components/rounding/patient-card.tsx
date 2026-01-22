'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Clock,
  FileText,
  ChevronRight,
} from 'lucide-react';
import type { PatientWithTaskCounts } from '@/lib/db';

interface PatientCardProps {
  patient: PatientWithTaskCounts;
  isSelected: boolean;
  onClick: () => void;
}

export function PatientCard({ patient, isSelected, onClick }: PatientCardProps) {
  const hasStatTasks = patient.statTaskCount > 0;
  const hasUrgentTasks = patient.urgentTaskCount > 0;
  const hasPendingTasks = patient.pendingTaskCount > 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getHospitalDay = () => {
    if (!patient.admissionDate) return null;
    const admission = new Date(patient.admissionDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const hospitalDay = getHospitalDay();

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary shadow-md',
        hasStatTasks && 'border-red-300 bg-red-50/50',
        !hasStatTasks && hasUrgentTasks && 'border-orange-300 bg-orange-50/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Patient Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Avatar with MRN */}
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0',
                hasStatTasks
                  ? 'bg-red-100 text-red-700'
                  : hasUrgentTasks
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-primary/10 text-primary'
              )}
            >
              {patient.mrn}
            </div>

            {/* Patient details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-lg">{patient.mrn}</span>
                {patient.roomNumber && (
                  <Badge variant="outline" className="text-xs">
                    Rm {patient.roomNumber}
                  </Badge>
                )}
                {hospitalDay && (
                  <Badge variant="secondary" className="text-xs">
                    Day {hospitalDay}
                  </Badge>
                )}
              </div>

              {/* Primary diagnosis */}
              <p className="text-sm text-muted-foreground truncate mt-1">
                {patient.primaryDiagnoses[0] || 'No diagnosis'}
              </p>

              {/* Task indicators */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {hasStatTasks && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {patient.statTaskCount} STAT
                  </Badge>
                )}
                {hasUrgentTasks && (
                  <Badge className="text-xs gap-1 bg-orange-500">
                    <Clock className="h-3 w-3" />
                    {patient.urgentTaskCount} Urgent
                  </Badge>
                )}
                {hasPendingTasks && !hasStatTasks && !hasUrgentTasks && (
                  <Badge variant="secondary" className="text-xs">
                    {patient.pendingTaskCount} tasks
                  </Badge>
                )}
                {patient.lastNoteDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {patient.lastNoteType === 'hp' ? 'H&P' : 'Note'}: {formatDate(patient.lastNoteDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Chevron */}
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
        </div>

        {/* Code status if present */}
        {patient.codeStatus && (
          <div className="mt-2 pt-2 border-t">
            <Badge variant="outline" className="text-xs">
              {patient.codeStatus}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

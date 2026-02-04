'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Shield,
} from 'lucide-react';
import type { PatientSignout } from '@/lib/types';

interface PatientSignoutCardProps {
  signout: PatientSignout;
}

const likelihoodColors = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-700',
};

export function PatientSignoutCard({ signout }: PatientSignoutCardProps) {
  return (
    <Card className="break-inside-avoid">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {signout.roomNumber && (
              <Badge variant="outline" className="text-base">
                {signout.roomNumber}
              </Badge>
            )}
            <span className="font-mono">{signout.patientMrn}</span>
          </CardTitle>
          <Badge variant="outline" className={
            signout.codeStatus.toLowerCase().includes('full') ? 'bg-green-50' :
            signout.codeStatus.toLowerCase().includes('dnr') ? 'bg-yellow-50' :
            'bg-gray-50'
          }>
            {signout.codeStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* One-Liner */}
        <p className="text-sm font-medium">{signout.oneLiner}</p>

        {/* Active Issues */}
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Active Issues</span>
          {signout.activeIssues.map((issue, idx) => (
            <div key={idx} className="text-sm p-2 bg-muted/50 rounded">
              <div className="font-medium">{issue.problem}</div>
              <div className="text-muted-foreground text-xs">
                <span className="font-medium">Status:</span> {issue.status}
              </div>
              <div className="text-xs mt-1">
                <span className="font-medium">Plan:</span> {issue.plan}
              </div>
            </div>
          ))}
        </div>

        {/* If-Then Scenarios */}
        {signout.ifThenScenarios.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> If-Then
            </span>
            {signout.ifThenScenarios.map((scenario, idx) => (
              <div key={idx} className="text-sm p-2 bg-blue-50 rounded border border-blue-100">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 text-xs">IF</Badge>
                  <span>{scenario.condition}</span>
                </div>
                <div className="flex items-start gap-2 mt-1">
                  <Badge className="shrink-0 text-xs bg-blue-600">THEN</Badge>
                  <span>{scenario.action}</span>
                </div>
                {scenario.escalation && (
                  <div className="flex items-start gap-2 mt-1 text-red-700">
                    <Badge variant="destructive" className="shrink-0 text-xs">CALL IF</Badge>
                    <span>{scenario.escalation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Overnight Concerns */}
        {signout.overnightConcerns.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Overnight Concerns
            </span>
            {signout.overnightConcerns.map((concern, idx) => (
              <div key={idx} className={`text-sm p-2 rounded border ${likelihoodColors[concern.likelihood as keyof typeof likelihoodColors]}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{concern.concern}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {concern.likelihood}
                  </Badge>
                </div>
                <div className="text-xs mt-1">
                  <span className="font-medium">If occurs:</span> {concern.preparation}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending Items */}
        {signout.pendingItems.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <Clock className="h-3 w-3" /> Pending
            </span>
            {signout.pendingItems.map((item, idx) => (
              <div key={idx} className="text-sm flex items-center gap-2">
                <span>• {item.item}</span>
                {item.expectedTime && (
                  <Badge variant="outline" className="text-xs">
                    {item.expectedTime}
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">→ {item.action}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

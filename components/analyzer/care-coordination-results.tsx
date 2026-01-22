'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Stethoscope,
  ArrowRightLeft,
  MessageSquare,
  Package,
  AlertTriangle,
} from 'lucide-react';
import type { CareCoordinationOutput } from '@/lib/types';

interface CareCoordinationResultsProps {
  result: CareCoordinationOutput;
}

export function CareCoordinationResults({ result }: CareCoordinationResultsProps) {
  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
    critical: 'bg-red-100 text-red-800',
    important: 'bg-yellow-100 text-yellow-800',
    routine: 'bg-gray-100 text-gray-800',
  };

  const urgencyColors = {
    emergent: 'bg-red-100 text-red-800',
    urgent: 'bg-orange-100 text-orange-800',
    routine: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Care Team Needs */}
      {result.careTeamNeeds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Care Team Needs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.careTeamNeeds.map((member, idx) => (
                <div key={idx} className="border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{member.role}</span>
                    {member.specialty && (
                      <span className="text-sm text-muted-foreground">({member.specialty})</span>
                    )}
                    <Badge className={priorityColors[member.communicationPriority]}>
                      {member.communicationPriority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{member.responsibility}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consultations */}
      {result.consultations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Recommended Consultations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.consultations.map((consult, idx) => (
                <div key={idx} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{consult.specialty}</span>
                    <Badge className={urgencyColors[consult.urgency]}>{consult.urgency}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{consult.reason}</p>
                  {consult.keyQuestions.length > 0 && (
                    <div className="bg-muted/50 p-2 rounded text-sm">
                      <p className="font-medium mb-1">Key Questions:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {consult.keyQuestions.map((q, qIdx) => (
                          <li key={qIdx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Handoff Items */}
      {result.handoffItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Handoff Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.handoffItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2 rounded border bg-card"
                >
                  <Badge className={priorityColors[item.priority]}>{item.priority}</Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.item}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category}
                      {item.actionRequired && ` • ${item.actionRequired}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Communication Plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.communicationPlan.familyUpdates && (
            <div>
              <p className="font-medium text-sm">Family Updates</p>
              <p className="text-sm text-muted-foreground">{result.communicationPlan.familyUpdates}</p>
            </div>
          )}
          {result.communicationPlan.teamHuddles && (
            <div>
              <p className="font-medium text-sm">Team Huddles</p>
              <p className="text-sm text-muted-foreground">{result.communicationPlan.teamHuddles}</p>
            </div>
          )}
          {result.communicationPlan.criticalAlerts.length > 0 && (
            <div>
              <p className="font-medium text-sm text-red-600">Critical Alerts</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {result.communicationPlan.criticalAlerts.map((alert, idx) => (
                  <li key={idx}>{alert}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource Needs & Barriers */}
      <div className="grid md:grid-cols-2 gap-4">
        {result.resourceNeeds.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Resource Needs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.resourceNeeds.map((resource, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="font-medium">{resource.resource}</p>
                    <p className="text-muted-foreground">{resource.reason}</p>
                    <p className="text-xs text-muted-foreground">Timeline: {resource.timeline}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result.barriers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Barriers & Mitigations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.barriers.map((b, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="font-medium text-red-600">{b.barrier}</p>
                    <p className="text-muted-foreground">→ {b.mitigation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

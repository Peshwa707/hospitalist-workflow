'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Clock,
  FlaskConical,
  Target,
  BrainCog,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import type { PatientBriefing, BlindSpotChallengeOutput } from '@/lib/types';
import { ChallengeResults } from './challenge-results';

interface PatientBriefingCardProps {
  briefing: PatientBriefing;
}

const severityColors = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  important: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  routine: 'bg-gray-100 text-gray-700 border-gray-200',
};

const priorityColors = {
  stat: 'bg-red-600 text-white',
  urgent: 'bg-orange-500 text-white',
  routine: 'bg-gray-200 text-gray-800',
};

export function PatientBriefingCard({ briefing }: PatientBriefingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [challenge, setChallenge] = useState<BlindSpotChallengeOutput | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(false);

  const criticalIssues = briefing.keyIssues.filter(i => i.severity === 'critical');

  const handleChallenge = async () => {
    setLoadingChallenge(true);
    try {
      const response = await fetch('/api/briefing/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: briefing.patientId,
          briefing,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setChallenge(result);
      }
    } catch (error) {
      console.error('Challenge error:', error);
    } finally {
      setLoadingChallenge(false);
    }
  };

  return (
    <Card className={criticalIssues.length > 0 ? 'border-red-200' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {briefing.roomNumber && (
              <Badge variant="outline" className="text-base">
                {briefing.roomNumber}
              </Badge>
            )}
            <span className="font-mono">{briefing.patientMrn}</span>
            <Badge variant="outline">HD {briefing.hospitalDay}</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Focus for Today */}
        <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
          <Target className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm">{briefing.suggestedFocus}</p>
        </div>

        {/* Critical Issues */}
        {criticalIssues.length > 0 && (
          <div className="space-y-1">
            {criticalIssues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border ${severityColors.critical}`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-sm">{issue.issue}</span>
                </div>
                <p className="text-xs text-red-700 ml-6">{issue.context}</p>
              </div>
            ))}
          </div>
        )}

        {/* Overnight Events */}
        {briefing.overnightEvents.length > 0 && (
          <div className="text-sm">
            <span className="font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" /> Overnight:
            </span>
            <ul className="ml-4 text-muted-foreground">
              {briefing.overnightEvents.slice(0, expanded ? undefined : 2).map((event, idx) => (
                <li key={idx}>• {event}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Labs to Review */}
        {briefing.labsToReview.length > 0 && (
          <div className="text-sm">
            <span className="font-medium flex items-center gap-1">
              <FlaskConical className="h-3 w-3" /> Labs:
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {briefing.labsToReview.slice(0, expanded ? undefined : 4).map((lab, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={lab.flag ? 'border-red-300 bg-red-50' : ''}
                >
                  {lab.test}: {lab.value}
                  {lab.flag && <span className="ml-1 text-red-600">[{lab.flag}]</span>}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Expanded Content */}
        {expanded && (
          <>
            {/* Important Issues */}
            {briefing.keyIssues.filter(i => i.severity !== 'critical').length > 0 && (
              <div className="space-y-1">
                <span className="font-medium text-sm">Key Issues:</span>
                {briefing.keyIssues
                  .filter(i => i.severity !== 'critical')
                  .map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border ${severityColors[issue.severity]}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {issue.severity}
                        </Badge>
                        <span className="text-sm">{issue.issue}</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-12">{issue.context}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* Pending Tasks */}
            {briefing.pendingTasks.length > 0 && (
              <div className="space-y-1">
                <span className="font-medium text-sm">Tasks:</span>
                <div className="space-y-1">
                  {briefing.pendingTasks.map((task, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority.toUpperCase()}
                      </Badge>
                      <span>{task.task}</span>
                      <Badge variant="outline" className="text-xs">
                        {task.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anticipated Issues */}
            {briefing.anticipatedIssues.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Anticipate:</span>
                <ul className="ml-4 text-muted-foreground">
                  {briefing.anticipatedIssues.map((issue, idx) => (
                    <li key={idx}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Challenge Button */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleChallenge}
                disabled={loadingChallenge}
                className="w-full"
              >
                {loadingChallenge ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Challenge...
                  </>
                ) : (
                  <>
                    <BrainCog className="h-4 w-4 mr-2" />
                    What Would I Miss?
                  </>
                )}
              </Button>
            </div>

            {/* Challenge Results */}
            {challenge && <ChallengeResults challenge={challenge} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}

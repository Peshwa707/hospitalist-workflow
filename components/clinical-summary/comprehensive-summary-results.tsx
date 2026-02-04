'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { ClinicalSummaryOutput } from '@/lib/types';

interface ComprehensiveSummaryResultsProps {
  result: ClinicalSummaryOutput;
}

const trajectoryIcons = {
  improving: <TrendingUp className="h-4 w-4 text-green-600" />,
  stable: <Minus className="h-4 w-4 text-blue-600" />,
  worsening: <TrendingDown className="h-4 w-4 text-red-600" />,
  unclear: <HelpCircle className="h-4 w-4 text-gray-600" />,
};

const trajectoryColors = {
  improving: 'bg-green-100 text-green-800',
  stable: 'bg-blue-100 text-blue-800',
  worsening: 'bg-red-100 text-red-800',
  unclear: 'bg-gray-100 text-gray-800',
};

const priorityColors = {
  stat: 'bg-red-600 text-white',
  urgent: 'bg-orange-500 text-white',
  routine: 'bg-gray-200 text-gray-800',
};

const significanceColors = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  important: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  routine: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function ComprehensiveSummaryResults({ result }: ComprehensiveSummaryResultsProps) {
  const criticalFindings = result.summary.keyFindings.filter(f => f.significance === 'critical');
  const statActions = result.nextSteps.filter(s => s.priority === 'stat');

  return (
    <div className="space-y-4">
      {/* Critical Alerts */}
      {(criticalFindings.length > 0 || statActions.length > 0 || result.safetyConsiderations.length > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalFindings.map((finding, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Badge variant="destructive">Critical Finding</Badge>
                <span>{finding.finding}</span>
              </div>
            ))}
            {statActions.map((action, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Badge className="bg-red-600">STAT</Badge>
                <span>{action.action}</span>
              </div>
            ))}
            {result.safetyConsiderations.map((safety, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span>{safety}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Clinical Summary
            </CardTitle>
            <Badge className={trajectoryColors[result.clinicalTrajectory]}>
              {trajectoryIcons[result.clinicalTrajectory]}
              <span className="ml-1 capitalize">{result.clinicalTrajectory}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">{result.summary.oneLiner}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">
              Data types: {result.parsedDataTypes.types.join(', ')}
            </Badge>
            <Badge variant="outline" className={
              result.parsedDataTypes.confidence === 'high' ? 'bg-green-50' :
              result.parsedDataTypes.confidence === 'medium' ? 'bg-yellow-50' : 'bg-red-50'
            }>
              Parse confidence: {result.parsedDataTypes.confidence}
            </Badge>
          </div>
          {result.parsedDataTypes.parseNotes && (
            <p className="text-sm text-muted-foreground mt-2">{result.parsedDataTypes.parseNotes}</p>
          )}
        </CardContent>
      </Card>

      {/* Active Problems */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Active Problems</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.summary.activeProblems.map((problem, idx) => (
              <div key={idx} className="border-l-4 pl-3 py-1" style={{
                borderColor: problem.status === 'worsening' ? '#ef4444' :
                  problem.status === 'improving' ? '#22c55e' :
                  problem.status === 'new' ? '#3b82f6' : '#6b7280'
              }}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{problem.problem}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {problem.status}
                  </Badge>
                </div>
                <ul className="mt-1 text-sm text-muted-foreground">
                  {problem.supportingData.map((data, i) => (
                    <li key={i}>• {data}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Findings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Key Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-2">
            {result.summary.keyFindings.map((finding, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border ${significanceColors[finding.significance]}`}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {finding.category}
                  </Badge>
                  {finding.significance === 'critical' && (
                    <AlertTriangle className="h-3 w-3 text-red-600" />
                  )}
                </div>
                <p className="text-sm mt-1">{finding.finding}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Recommended Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {result.nextSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                <Badge className={`${priorityColors[step.priority]} shrink-0`}>
                  {step.priority.toUpperCase()}
                </Badge>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {step.category}
                    </Badge>
                    <span className="font-medium">{step.action}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{step.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gaps Identified */}
      {result.gapsIdentified.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
              <HelpCircle className="h-4 w-4" />
              Information Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.gapsIdentified.map((gap, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Badge variant="outline" className={
                    gap.importance === 'critical' ? 'bg-red-50 text-red-700' :
                    gap.importance === 'important' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-gray-50 text-gray-700'
                  }>
                    {gap.importance}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{gap.gap}</p>
                    <p className="text-xs text-muted-foreground">{gap.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <p className="text-xs text-muted-foreground text-right">
        Generated at {new Date(result.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

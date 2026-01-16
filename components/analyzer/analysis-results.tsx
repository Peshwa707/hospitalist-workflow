'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AIDisclaimer } from '@/components/notes/ai-disclaimer';
import {
  Stethoscope,
  FlaskConical,
  Users,
  Home,
  AlertCircle,
} from 'lucide-react';
import type { AdmissionAnalysisOutput } from '@/lib/types';

interface AnalysisResultsProps {
  analysis: AdmissionAnalysisOutput;
}

function getLikelihoodColor(likelihood: string) {
  switch (likelihood) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'moderate':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'stat':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'routine':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'consider':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getUrgencyColor(urgency: string) {
  switch (urgency) {
    case 'emergent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'urgent':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'routine':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
  return (
    <div className="space-y-6">
      <AIDisclaimer />

      {/* Differential Diagnosis */}
      <Card className="border-dashed border-2 border-amber-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Stethoscope className="h-5 w-5" />
            Differential Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.differentialDiagnosis.map((dx, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <span className="text-lg font-bold text-muted-foreground">
                  {index + 1}.
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{dx.diagnosis}</span>
                    <Badge className={getLikelihoodColor(dx.likelihood)}>
                      {dx.likelihood}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{dx.reasoning}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Workup */}
      <Card className="border-dashed border-2 border-amber-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5" />
            Recommended Workup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.recommendedWorkup.map((test, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <Badge className={`${getPriorityColor(test.priority)} shrink-0`}>
                  {test.priority.toUpperCase()}
                </Badge>
                <div className="flex-1">
                  <span className="font-medium">{test.test}</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {test.rationale}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suggested Consults */}
      <Card className="border-dashed border-2 border-amber-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Suggested Consults
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.suggestedConsults.length > 0 ? (
            <div className="space-y-3">
              {analysis.suggestedConsults.map((consult, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <Badge className={`${getUrgencyColor(consult.urgency)} shrink-0`}>
                    {consult.urgency}
                  </Badge>
                  <div className="flex-1">
                    <span className="font-medium">{consult.specialty}</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {consult.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No consults recommended at this time.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Discharge Readiness */}
      <Card className="border-dashed border-2 border-amber-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Home className="h-5 w-5" />
            Discharge Readiness Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Assessment</h4>
            <p className="text-sm bg-muted/50 p-3 rounded-lg">
              {analysis.dischargeReadiness.assessment}
            </p>
          </div>

          {analysis.dischargeReadiness.barriers.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Barriers to Discharge</h4>
              <ul className="space-y-1">
                {analysis.dischargeReadiness.barriers.map((barrier, index) => (
                  <li
                    key={index}
                    className="text-sm flex items-start gap-2 text-muted-foreground"
                  >
                    <span className="text-amber-500">•</span>
                    {barrier}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="font-medium mb-2">Estimated Length of Stay</h4>
            <Badge variant="outline" className="text-base">
              {analysis.dischargeReadiness.estimatedLOS}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Limitations */}
      {analysis.limitations && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-amber-800">
              <AlertCircle className="h-5 w-5" />
              Limitations & Missing Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700">{analysis.limitations}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Generated: {new Date(analysis.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

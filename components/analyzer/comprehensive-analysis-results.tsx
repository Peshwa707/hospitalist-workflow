'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnalysisResults } from './analysis-results';
import { CareCoordinationResults } from './care-coordination-results';
import { DischargeDestinationResults } from './discharge-destination-results';
import { CognitiveBiasResults } from './cognitive-bias-results';
import { FeedbackForm } from '@/components/feedback/feedback-form';
import {
  Brain,
  Users,
  Home,
  BrainCog,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { ComprehensiveAnalysisOutput } from '@/lib/types';

interface ComprehensiveAnalysisResultsProps {
  result: ComprehensiveAnalysisOutput;
}

export function ComprehensiveAnalysisResults({ result }: ComprehensiveAnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate key metrics for overview
  const topDiagnosis = result.admission.differentialDiagnosis[0];
  const highPriorityBiases = result.cognitiveBias.identifiedBiases.filter(b => b.impact === 'high');
  const mustNotMissDx = result.cognitiveBias.alternativeDiagnoses.filter(d => d.mustNotMiss);
  const criticalHandoffs = result.careCoordination.handoffItems.filter(h => h.priority === 'critical');
  const emergentConsults = result.careCoordination.consultations.filter(c => c.urgency === 'emergent');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="diagnosis" className="flex items-center gap-1 text-xs sm:text-sm">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Diagnosis</span>
          </TabsTrigger>
          <TabsTrigger value="coordination" className="flex items-center gap-1 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Coordination</span>
          </TabsTrigger>
          <TabsTrigger value="discharge" className="flex items-center gap-1 text-xs sm:text-sm">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Discharge</span>
          </TabsTrigger>
          <TabsTrigger value="bias" className="flex items-center gap-1 text-xs sm:text-sm">
            <BrainCog className="h-4 w-4" />
            <span className="hidden sm:inline">Bias Check</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Critical Alerts */}
          {(mustNotMissDx.length > 0 || highPriorityBiases.length > 0 || emergentConsults.length > 0) && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mustNotMissDx.map((dx, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Badge variant="destructive">Must Not Miss</Badge>
                    <span>{dx.diagnosis}</span>
                  </div>
                ))}
                {emergentConsults.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Badge variant="destructive">Emergent Consult</Badge>
                    <span>{c.specialty}: {c.reason}</span>
                  </div>
                ))}
                {highPriorityBiases.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Badge className="bg-orange-500">High Impact Bias</Badge>
                    <span>{b.biasType}: {b.evidence}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Key Findings Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Top Diagnosis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Leading Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topDiagnosis ? (
                  <div>
                    <p className="font-semibold">{topDiagnosis.diagnosis}</p>
                    <Badge className={
                      topDiagnosis.likelihood === 'high' ? 'bg-green-100 text-green-800' :
                      topDiagnosis.likelihood === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {topDiagnosis.likelihood} likelihood
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">{topDiagnosis.reasoning}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No diagnosis determined</p>
                )}
              </CardContent>
            </Card>

            {/* Discharge Destination */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Recommended Discharge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{result.dischargeDestination.recommendedDestination.label}</p>
                <Badge className="bg-blue-100 text-blue-800">
                  {result.dischargeDestination.recommendedDestination.likelihood.replace('_', ' ')}
                </Badge>
                {result.dischargeDestination.estimatedDischargeDate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Est: {result.dischargeDestination.estimatedDischargeDate}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Care Coordination Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Care Coordination
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p><strong>{result.careCoordination.consultations.length}</strong> consultations needed</p>
                  <p><strong>{criticalHandoffs.length}</strong> critical handoff items</p>
                  <p><strong>{result.careCoordination.barriers.length}</strong> barriers identified</p>
                </div>
              </CardContent>
            </Card>

            {/* Cognitive Bias Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BrainCog className="h-4 w-4" />
                  Diagnostic Safety
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p><strong>{result.cognitiveBias.identifiedBiases.length}</strong> potential biases found</p>
                  <p><strong>{result.cognitiveBias.alternativeDiagnoses.length}</strong> alternative diagnoses to consider</p>
                  <p><strong>{mustNotMissDx.length}</strong> must-not-miss diagnoses</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workup & Key Questions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Priority Workup</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {result.admission.recommendedWorkup
                    .filter(w => w.priority === 'stat')
                    .slice(0, 5)
                    .map((w, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">STAT</Badge>
                        {w.test}
                      </li>
                    ))}
                  {result.admission.recommendedWorkup
                    .filter(w => w.priority === 'routine')
                    .slice(0, 3)
                    .map((w, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Routine</Badge>
                        {w.test}
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Key Questions to Ask</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {result.cognitiveBias.keyQuestionsToAsk.slice(0, 5).map((q, idx) => (
                    <li key={idx} className="text-muted-foreground">• {q}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Red Flags */}
          {result.dischargeDestination.redFlags.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="h-4 w-4" />
                  Red Flags to Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid md:grid-cols-2 gap-1 text-sm">
                  {result.dischargeDestination.redFlags.map((flag, idx) => (
                    <li key={idx} className="text-orange-700">• {flag}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Diagnosis Tab */}
        <TabsContent value="diagnosis">
          <AnalysisResults analysis={result.admission} showFeedback={false} />
        </TabsContent>

        {/* Care Coordination Tab */}
        <TabsContent value="coordination">
          <CareCoordinationResults result={result.careCoordination} />
        </TabsContent>

        {/* Discharge Tab */}
        <TabsContent value="discharge">
          <DischargeDestinationResults result={result.dischargeDestination} />
        </TabsContent>

        {/* Bias Check Tab */}
        <TabsContent value="bias">
          <CognitiveBiasResults result={result.cognitiveBias} />
        </TabsContent>
      </Tabs>

      {/* Feedback Section */}
      {result.admission.id && (
        <FeedbackForm noteId={result.admission.id} compact />
      )}
    </div>
  );
}

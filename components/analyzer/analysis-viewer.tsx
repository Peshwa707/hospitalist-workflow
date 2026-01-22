'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  AlertTriangle,
  ClipboardList,
  UserCheck,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';
import type { ComprehensiveAnalysisOutput } from '@/lib/types';

interface AnalysisViewerProps {
  analysis: ComprehensiveAnalysisOutput;
  compact?: boolean;
}

export function AnalysisViewer({ analysis, compact = false }: AnalysisViewerProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(compact ? null : 'differential');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Differential Diagnoses - Compact */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('differential')}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Differential ({analysis.admission.differentialDiagnosis.length})</span>
            </div>
            {expandedSection === 'differential' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSection === 'differential' && (
            <div className="p-3 border-t space-y-2">
              {analysis.admission.differentialDiagnosis.map((dx, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge
                    variant={dx.likelihood === 'high' ? 'default' : dx.likelihood === 'moderate' ? 'secondary' : 'outline'}
                    className="text-xs mt-0.5"
                  >
                    {dx.likelihood}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium">{dx.diagnosis}</div>
                    <div className="text-xs text-muted-foreground">{dx.reasoning}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cognitive Biases - Compact */}
        {analysis.cognitiveBias.identifiedBiases.length > 0 && (
          <div className="border border-orange-200 rounded-lg bg-orange-50/50">
            <button
              onClick={() => toggleSection('bias')}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-orange-100/50"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800">
                  Bias Alerts ({analysis.cognitiveBias.identifiedBiases.length})
                </span>
              </div>
              {expandedSection === 'bias' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSection === 'bias' && (
              <div className="p-3 border-t border-orange-200 space-y-2">
                {analysis.cognitiveBias.identifiedBiases.map((bias, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium text-orange-800">{bias.biasType}</div>
                    <div className="text-orange-700">{bias.mitigation}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workup - Compact */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('workup')}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Workup ({analysis.admission.recommendedWorkup.length})</span>
            </div>
            {expandedSection === 'workup' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSection === 'workup' && (
            <div className="p-3 border-t space-y-2">
              {analysis.admission.recommendedWorkup.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge
                    variant={item.priority === 'stat' ? 'destructive' : item.priority === 'routine' ? 'secondary' : 'outline'}
                    className="text-xs mt-0.5"
                  >
                    {item.priority}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium">{item.test}</div>
                    <div className="text-xs text-muted-foreground">{item.rationale}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discharge - Compact */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('discharge')}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="font-medium">
                Discharge: {analysis.dischargeDestination.recommendedDestination.label}
              </span>
            </div>
            {expandedSection === 'discharge' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSection === 'discharge' && (
            <div className="p-3 border-t space-y-2 text-sm">
              <div>
                <span className="font-medium">Est. LOS: </span>
                {analysis.admission.dischargeReadiness.estimatedLOS}
              </div>
              {analysis.admission.dischargeReadiness.barriers.length > 0 && (
                <div>
                  <span className="font-medium">Barriers: </span>
                  {analysis.admission.dischargeReadiness.barriers.join(', ')}
                </div>
              )}
              <div className="text-muted-foreground">
                {analysis.dischargeDestination.recommendedDestination.reasoning}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full view with tabs
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Clinical Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="differential">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="differential" className="text-xs">Differential</TabsTrigger>
            <TabsTrigger value="workup" className="text-xs">Workup</TabsTrigger>
            <TabsTrigger value="bias" className="text-xs">Bias Check</TabsTrigger>
            <TabsTrigger value="discharge" className="text-xs">Discharge</TabsTrigger>
          </TabsList>

          {/* Differential Tab */}
          <TabsContent value="differential" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {analysis.admission.differentialDiagnosis.map((dx, i) => (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={dx.likelihood === 'high' ? 'default' : dx.likelihood === 'moderate' ? 'secondary' : 'outline'}
                      >
                        {dx.likelihood}
                      </Badge>
                      <span className="font-medium">{dx.diagnosis}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{dx.reasoning}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Workup Tab */}
          <TabsContent value="workup" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Recommended Tests
                  </h4>
                  {analysis.admission.recommendedWorkup.map((item, i) => (
                    <div key={i} className="p-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={item.priority === 'stat' ? 'destructive' : item.priority === 'routine' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {item.priority}
                        </Badge>
                        <span className="font-medium text-sm">{item.test}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.rationale}</p>
                    </div>
                  ))}
                </div>
                {analysis.admission.suggestedConsults.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Suggested Consults
                    </h4>
                    {analysis.admission.suggestedConsults.map((consult, i) => (
                      <div key={i} className="p-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={consult.urgency === 'emergent' ? 'destructive' : consult.urgency === 'urgent' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {consult.urgency}
                          </Badge>
                          <span className="font-medium text-sm">{consult.specialty}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{consult.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Cognitive Bias Tab */}
          <TabsContent value="bias" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {analysis.cognitiveBias.identifiedBiases.length > 0 ? (
                  <>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-orange-700">
                        <AlertTriangle className="h-4 w-4" />
                        Identified Biases
                      </h4>
                      {analysis.cognitiveBias.identifiedBiases.map((bias, i) => (
                        <div key={i} className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                              {bias.impact} impact
                            </Badge>
                            <span className="font-medium text-orange-800">{bias.biasType}</span>
                          </div>
                          <p className="text-sm text-orange-700">{bias.evidence}</p>
                          <p className="text-sm text-orange-800 mt-2 font-medium">
                            Mitigation: {bias.mitigation}
                          </p>
                        </div>
                      ))}
                    </div>
                    {analysis.cognitiveBias.alternativeDiagnoses.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Consider These Alternatives
                        </h4>
                        {analysis.cognitiveBias.alternativeDiagnoses.filter(a => a.mustNotMiss).map((alt, i) => (
                          <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-xs">Must Not Miss</Badge>
                              <span className="font-medium">{alt.diagnosis}</span>
                            </div>
                            <div className="mt-2 text-sm">
                              <p><span className="font-medium">Supporting:</span> {alt.supportingEvidence.join(', ')}</p>
                              <p><span className="font-medium">Workup:</span> {alt.suggestedWorkup.join(', ')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No significant cognitive biases identified</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Discharge Tab */}
          <TabsContent value="discharge" className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">{analysis.dischargeDestination.recommendedDestination.label}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Est. LOS: {analysis.admission.dischargeReadiness.estimatedLOS}
                    </span>
                  </div>
                  <p className="text-sm">{analysis.dischargeDestination.recommendedDestination.reasoning}</p>
                </div>

                {analysis.admission.dischargeReadiness.barriers.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Discharge Barriers</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {analysis.admission.dischargeReadiness.barriers.map((barrier, i) => (
                        <li key={i}>{barrier}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.dischargeDestination.dischargeCriteria.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Discharge Criteria</h4>
                    <div className="space-y-1">
                      {analysis.dischargeDestination.dischargeCriteria.map((criterion, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant={criterion.met ? 'default' : 'outline'} className="text-xs">
                            {criterion.met ? '✓' : '○'}
                          </Badge>
                          <span>{criterion.criterion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.dischargeDestination.redFlags.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium mb-2 text-red-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Red Flags
                    </h4>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {analysis.dischargeDestination.redFlags.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          Analysis generated: {new Date(analysis.generatedAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

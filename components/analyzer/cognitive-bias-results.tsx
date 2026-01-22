'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BrainCog,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Shield,
  Target,
  Clock,
} from 'lucide-react';
import type { CognitiveBiasOutput, IdentifiedBias, AlternativeDiagnosis } from '@/lib/types';

interface CognitiveBiasResultsProps {
  result: CognitiveBiasOutput;
}

const impactColors = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-green-100 text-green-800 border-green-300',
};

function BiasCard({ bias }: { bias: IdentifiedBias }) {
  return (
    <div className={`border rounded-lg p-4 ${impactColors[bias.impact].replace('bg-', 'border-')}`}>
      <div className="flex items-center gap-2 mb-2">
        <BrainCog className="h-4 w-4" />
        <span className="font-semibold">{bias.biasType}</span>
        <Badge className={impactColors[bias.impact]}>{bias.impact} impact</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{bias.description}</p>
      <div className="bg-muted/50 p-2 rounded text-sm mb-2">
        <span className="font-medium">Evidence: </span>
        {bias.evidence}
      </div>
      <div className="text-sm">
        <span className="font-medium text-green-700">Mitigation: </span>
        {bias.mitigation}
      </div>
    </div>
  );
}

function AlternativeDiagnosisCard({ diagnosis }: { diagnosis: AlternativeDiagnosis }) {
  return (
    <Card className={diagnosis.mustNotMiss ? 'border-red-300 border-2' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          {diagnosis.diagnosis}
          {diagnosis.mustNotMiss && (
            <Badge variant="destructive">Must Not Miss</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {diagnosis.supportingEvidence.length > 0 && (
          <div>
            <p className="text-sm font-medium text-green-700">Supporting Evidence:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {diagnosis.supportingEvidence.map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {diagnosis.contradictingEvidence.length > 0 && (
          <div>
            <p className="text-sm font-medium text-red-700">Contradicting Evidence:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {diagnosis.contradictingEvidence.map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {diagnosis.suggestedWorkup.length > 0 && (
          <div>
            <p className="text-sm font-medium text-blue-700">Suggested Workup:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {diagnosis.suggestedWorkup.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CognitiveBiasResults({ result }: CognitiveBiasResultsProps) {
  const mustNotMissDiagnoses = result.alternativeDiagnoses.filter(d => d.mustNotMiss);
  const otherDiagnoses = result.alternativeDiagnoses.filter(d => !d.mustNotMiss);

  return (
    <div className="space-y-4">
      {/* Overall Assessment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BrainCog className="h-5 w-5" />
            Overall Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{result.overallAssessment}</p>
        </CardContent>
      </Card>

      {/* Identified Biases */}
      {result.identifiedBiases.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Identified Cognitive Biases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.identifiedBiases.map((bias, idx) => (
                <BiasCard key={idx} bias={bias} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Must Not Miss Diagnoses */}
      {mustNotMissDiagnoses.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Must Not Miss Diagnoses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mustNotMissDiagnoses.map((diag, idx) => (
                <AlternativeDiagnosisCard key={idx} diagnosis={diag} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Alternative Diagnoses */}
      {otherDiagnoses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Alternative Diagnoses to Consider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {otherDiagnoses.map((diag, idx) => (
                <AlternativeDiagnosisCard key={idx} diagnosis={diag} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blind Spots */}
      {result.blindSpots.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Potential Blind Spots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.blindSpots.map((spot, idx) => (
                <div key={idx} className="border-l-4 border-yellow-400 pl-4 py-2">
                  <p className="font-medium">{spot.area}</p>
                  <p className="text-sm text-muted-foreground">{spot.consideration}</p>
                  <p className="text-sm italic text-blue-600">Ask: {spot.question}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostic Timeout */}
      {result.diagnosticTimeoutRecommendation && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
              <Clock className="h-5 w-5" />
              Diagnostic Timeout Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-800">{result.diagnosticTimeoutRecommendation}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Questions & Debiasing */}
      <div className="grid md:grid-cols-2 gap-4">
        {result.keyQuestionsToAsk.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Key Questions to Ask
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.keyQuestionsToAsk.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 font-bold">{idx + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.debiasingSuggestions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Debiasing Strategies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.debiasingSuggestions.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Safety Net */}
      {result.safetyNet.length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-green-700">
              <Shield className="h-5 w-5" />
              Safety Net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.safetyNet.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm p-2 bg-green-50 rounded">
                  <span className="font-medium text-green-800 whitespace-nowrap">
                    If {item.condition}:
                  </span>
                  <span className="text-green-700">{item.action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

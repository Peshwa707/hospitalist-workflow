'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, HelpCircle, Shield } from 'lucide-react';
import type { BlindSpotChallengeOutput } from '@/lib/types';

interface ChallengeResultsProps {
  challenge: BlindSpotChallengeOutput;
}

const urgencyColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
};

const categoryLabels: Record<string, string> = {
  cognitive_bias: 'Cognitive Bias',
  atypical_presentation: 'Atypical Presentation',
  mimic: 'Diagnostic Mimic',
  complication: 'Complication',
  second_diagnosis: 'Second Diagnosis',
  medication: 'Medication Issue',
  disposition: 'Disposition',
};

export function ChallengeResults({ challenge }: ChallengeResultsProps) {
  const highUrgency = challenge.potentialMisses.filter(m => m.urgency === 'high');

  return (
    <div className="space-y-3 mt-3 pt-3 border-t border-dashed">
      <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
        <AlertTriangle className="h-4 w-4" />
        What Would I Miss? Challenge Results
      </div>

      {/* High Urgency Items */}
      {highUrgency.length > 0 && (
        <div className="space-y-2">
          {highUrgency.map((miss, idx) => (
            <Card key={idx} className="border-red-200 bg-red-50">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Badge className="bg-red-600 text-white shrink-0">HIGH</Badge>
                  <div>
                    <p className="font-medium text-sm">{miss.item}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {categoryLabels[miss.category] || miss.category}
                    </Badge>
                    <p className="text-xs text-red-700 mt-1">{miss.reasoning}</p>
                    <p className="text-xs font-medium mt-1">
                      → {miss.suggestedAction}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Other Items */}
      {challenge.potentialMisses.filter(m => m.urgency !== 'high').length > 0 && (
        <div className="space-y-2">
          {challenge.potentialMisses
            .filter(m => m.urgency !== 'high')
            .map((miss, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border ${urgencyColors[miss.urgency as keyof typeof urgencyColors]}`}
              >
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs capitalize shrink-0">
                    {miss.urgency}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{miss.item}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {categoryLabels[miss.category] || miss.category}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{miss.reasoning}</p>
                    <p className="text-xs mt-1">→ {miss.suggestedAction}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Questions to Consider */}
      {challenge.questionsToConsider.length > 0 && (
        <div className="text-sm">
          <div className="flex items-center gap-1 font-medium">
            <HelpCircle className="h-3 w-3" /> Questions to Consider:
          </div>
          <ul className="ml-4 text-muted-foreground">
            {challenge.questionsToConsider.map((q, idx) => (
              <li key={idx}>• {q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Safety Net */}
      {challenge.safetyNet.length > 0 && (
        <div className="text-sm">
          <div className="flex items-center gap-1 font-medium text-green-700">
            <Shield className="h-3 w-3" /> Safety Net:
          </div>
          <div className="space-y-1 mt-1">
            {challenge.safetyNet.map((item, idx) => (
              <div key={idx} className="p-2 bg-green-50 rounded border border-green-200 text-xs">
                <p className="font-medium text-green-800">{item.condition}</p>
                <p className="text-green-700">Return precaution: {item.returnPrecaution}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

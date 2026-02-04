'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Lightbulb, FlaskConical } from 'lucide-react';
import type { SimilarCaseSummary } from '@/lib/types';

interface CaseComparisonCardProps {
  caseSummary: SimilarCaseSummary;
}

export function CaseComparisonCard({ caseSummary }: CaseComparisonCardProps) {
  const similarityPercent = Math.round(caseSummary.similarity * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="font-mono text-sm">{caseSummary.patientMrn}</span>
            <Badge variant="outline" className="capitalize">
              {caseSummary.noteType}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{similarityPercent}% similar</span>
            <div className="w-16">
              <Progress value={similarityPercent} className="h-2" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Presentation */}
        <div>
          <p className="text-sm">{caseSummary.presentation}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(caseSummary.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Key Findings */}
        {caseSummary.keyFindings.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">Key Findings</span>
            <ul className="text-sm mt-1">
              {caseSummary.keyFindings.slice(0, 3).map((finding, idx) => (
                <li key={idx}>• {finding}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Workup */}
        {caseSummary.workupPerformed.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <FlaskConical className="h-3 w-3" /> Workup
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {caseSummary.workupPerformed.slice(0, 5).map((item, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Outcome */}
        {caseSummary.outcome && (
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">Outcome</span>
            <p className="text-sm">{caseSummary.outcome}</p>
          </div>
        )}

        {/* Lessons Learned */}
        {caseSummary.lessonsLearned && caseSummary.lessonsLearned.length > 0 && (
          <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
            <span className="text-xs font-semibold text-yellow-800 uppercase flex items-center gap-1">
              <Lightbulb className="h-3 w-3" /> Lessons Learned
            </span>
            <ul className="text-sm text-yellow-900 mt-1">
              {caseSummary.lessonsLearned.map((lesson, idx) => (
                <li key={idx}>• {lesson}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

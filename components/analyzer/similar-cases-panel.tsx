'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Lightbulb, AlertTriangle, FlaskConical } from 'lucide-react';
import { CaseComparisonCard } from './case-comparison-card';
import type { SimilarCasesOutput } from '@/lib/types';

interface SimilarCasesPanelProps {
  noteId?: number;
  query?: string;
  autoLoad?: boolean;
}

export function SimilarCasesPanel({ noteId, query, autoLoad = false }: SimilarCasesPanelProps) {
  const [result, setResult] = useState<SimilarCasesOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findSimilarCases = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/similar-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId,
          query,
          topK: 5,
          minSimilarity: 0.4,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to find similar cases');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Patients Like This
          </CardTitle>
          <CardDescription>
            Find similar historical cases to learn from past workups and outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}
          <Button onClick={findSimilarCases} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching Cases...
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" />
                Find Similar Cases
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Patients Like This
            </CardTitle>
            <Badge variant="outline">
              {result.cases.length} similar cases found
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Synthesized Insights */}
      {result.synthesizedInsights && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-blue-800">
              <Lightbulb className="h-4 w-4" />
              Cross-Case Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.synthesizedInsights.commonPatterns.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-blue-800 uppercase">Common Patterns</span>
                <ul className="text-sm text-blue-900 mt-1">
                  {result.synthesizedInsights.commonPatterns.map((pattern, idx) => (
                    <li key={idx}>• {pattern}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.synthesizedInsights.typicalWorkup.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-blue-800 uppercase flex items-center gap-1">
                  <FlaskConical className="h-3 w-3" /> Typical Workup
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.synthesizedInsights.typicalWorkup.map((item, idx) => (
                    <Badge key={idx} variant="outline" className="bg-white text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.synthesizedInsights.pitfalls.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-orange-800 uppercase flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Pitfalls to Avoid
                </span>
                <ul className="text-sm text-orange-900 mt-1">
                  {result.synthesizedInsights.pitfalls.map((pitfall, idx) => (
                    <li key={idx}>• {pitfall}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Individual Cases */}
      {result.cases.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No similar cases found in your case database.</p>
          <p className="text-sm mt-2">As you analyze more cases, they'll be available for comparison.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {result.cases.map((caseSummary) => (
            <CaseComparisonCard key={caseSummary.noteId} caseSummary={caseSummary} />
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <Button variant="outline" onClick={findSimilarCases} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Searching...
          </>
        ) : (
          'Search Again'
        )}
      </Button>
    </div>
  );
}

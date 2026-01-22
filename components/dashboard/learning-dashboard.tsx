'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DashboardMetrics, LearningInsight } from '@/lib/types';

interface InsightData {
  bestPerforming: {
    analysisType: string;
    avgRating: number;
    feedbackCount: number;
  }[];
  needsImprovement: {
    analysisType: string;
    avgRating: number;
    commonIssues: string[];
  }[];
  suggestions: string[];
  dataQuality: {
    totalFeedback: number;
    feedbackWithRating: number;
    feedbackWithComments: number;
    sufficientData: boolean;
  };
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <span className="text-yellow-500">
      {'★'.repeat(fullStars)}
      {hasHalfStar && '½'}
      <span className="text-gray-300">{'★'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0))}</span>
    </span>
  );
}

function TrendBadge({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  const colors = {
    improving: 'bg-green-100 text-green-800',
    stable: 'bg-gray-100 text-gray-800',
    declining: 'bg-red-100 text-red-800',
  };
  const icons = {
    improving: '↑',
    stable: '→',
    declining: '↓',
  };

  return (
    <Badge variant="outline" className={cn('text-xs', colors[trend])}>
      {icons[trend]} {trend}
    </Badge>
  );
}

export function LearningDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsRes, insightsRes] = await Promise.all([
          fetch('/api/metrics'),
          fetch('/api/learning/insights'),
        ]);

        if (!metricsRes.ok || !insightsRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const [metricsData, insightsData] = await Promise.all([
          metricsRes.json(),
          insightsRes.json(),
        ]);

        setMetrics(metricsData);
        setInsights(insightsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || !insights) {
    return null;
  }

  const hasData = metrics.totalFeedback > 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Analyses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAnalyses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Feedback Received</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalFeedback}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(metrics.feedbackRate)} response rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Rating</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {hasData ? metrics.averageRating.toFixed(1) : '-'}
              {hasData && <RatingStars rating={metrics.averageRating} />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Data Quality</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge
              variant={insights.dataQuality.sufficientData ? 'default' : 'outline'}
              className={cn(
                insights.dataQuality.sufficientData
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              )}
            >
              {insights.dataQuality.sufficientData ? 'Sufficient' : 'Collecting'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {insights.dataQuality.feedbackWithComments} with comments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Type */}
      {Object.keys(metrics.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance by Analysis Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.byType).map(([type, insight]: [string, LearningInsight]) => (
                <div key={type} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <div className="font-medium capitalize">{type.replace(/-/g, ' ')}</div>
                    <div className="text-sm text-muted-foreground">
                      {insight.totalFeedback} feedback items
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <RatingStars rating={insight.averageRating} />
                        <span className="font-medium">{insight.averageRating.toFixed(1)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatPercentage(insight.helpfulRate)} helpful •{' '}
                        {formatPercentage(insight.accuracyRate)} accurate
                      </div>
                    </div>
                    <TrendBadge trend={insight.trend} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Performance */}
      {metrics.modelPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Model</th>
                    <th className="text-right py-2">Calls</th>
                    <th className="text-right py-2">Avg Latency</th>
                    <th className="text-right py-2">Avg Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.modelPerformance.map((model) => (
                    <tr key={model.model} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{model.model}</td>
                      <td className="text-right py-2">{model.count}</td>
                      <td className="text-right py-2">{formatLatency(model.avgLatency)}</td>
                      <td className="text-right py-2">{model.avgTokens.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights & Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Performing */}
        {insights.bestPerforming.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-700">Best Performing</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.bestPerforming.map((item) => (
                  <li key={item.analysisType} className="flex justify-between">
                    <span className="capitalize">{item.analysisType.replace(/-/g, ' ')}</span>
                    <span className="font-medium">
                      <RatingStars rating={item.avgRating} /> {item.avgRating.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Needs Improvement */}
        {insights.needsImprovement.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-amber-700">Needs Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {insights.needsImprovement.map((item) => (
                  <li key={item.analysisType}>
                    <div className="flex justify-between">
                      <span className="capitalize">{item.analysisType.replace(/-/g, ' ')}</span>
                      <span className="font-medium">
                        <RatingStars rating={item.avgRating} /> {item.avgRating.toFixed(1)}
                      </span>
                    </div>
                    {item.commonIssues.length > 0 && (
                      <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                        {item.commonIssues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Suggestions */}
      {insights.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.suggestions.map((suggestion, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-500">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium">No feedback data yet</p>
              <p className="text-sm mt-2">
                Submit feedback on AI analyses to start tracking quality metrics.
                The dashboard will populate as you provide ratings and comments.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

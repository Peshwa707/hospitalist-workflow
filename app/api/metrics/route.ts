import { NextResponse } from 'next/server';
import { getMetricsAggregates, getFeedbackAggregates } from '@/lib/db';
import type { DashboardMetrics, LearningInsight } from '@/lib/types';

export async function GET() {
  try {
    const metricsAggregates = getMetricsAggregates();
    const feedbackAggregates = getFeedbackAggregates();

    // Build insights by type
    const byType: Record<string, LearningInsight> = {};

    // Combine metrics and feedback data by type
    for (const typeData of feedbackAggregates.byType) {
      const metricsForType = metricsAggregates.byType.find(m => m.type === typeData.type);

      // Calculate trend based on recent ratings
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (feedbackAggregates.recentTrend.length >= 7) {
        const recent = feedbackAggregates.recentTrend.slice(0, 3);
        const older = feedbackAggregates.recentTrend.slice(4, 7);
        const recentAvg = recent.reduce((sum, r) => sum + r.avgRating, 0) / recent.length;
        const olderAvg = older.reduce((sum, r) => sum + r.avgRating, 0) / older.length;

        if (recentAvg - olderAvg > 0.3) {
          trend = 'improving';
        } else if (olderAvg - recentAvg > 0.3) {
          trend = 'declining';
        }
      }

      byType[typeData.type] = {
        analysisType: typeData.type,
        averageRating: typeData.avgRating ?? 0,
        totalFeedback: typeData.count,
        helpfulRate: typeData.helpfulRate ?? 0,
        accuracyRate: typeData.accuracyRate ?? 0,
        usageRate: typeData.usageRate ?? 0,
        trend,
      };
    }

    // Calculate feedback rate
    const feedbackRate = metricsAggregates.totalAnalyses > 0
      ? feedbackAggregates.totalFeedback / metricsAggregates.totalAnalyses
      : 0;

    const dashboard: DashboardMetrics = {
      totalAnalyses: metricsAggregates.totalAnalyses,
      totalFeedback: feedbackAggregates.totalFeedback,
      averageRating: feedbackAggregates.averageRating,
      feedbackRate,
      byType,
      recentTrend: feedbackAggregates.recentTrend.map(t => ({
        date: t.date,
        rating: t.avgRating,
        count: t.count,
      })),
      modelPerformance: metricsAggregates.byModel.map(m => ({
        model: m.model,
        avgLatency: Math.round(m.avgLatency ?? 0),
        avgTokens: Math.round(m.avgTokens ?? 0),
        count: m.count,
      })),
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Metrics retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

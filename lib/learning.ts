import { saveAnalysisMetrics } from './db';
import type { AnalysisMetrics } from './types';

/**
 * Analysis types for metrics tracking
 */
export type AnalysisType =
  | 'admission'
  | 'comprehensive'
  | 'care-coordination'
  | 'cognitive-bias'
  | 'discharge-destination'
  | 'prior-care'
  | 'progress-note'
  | 'discharge-summary'
  | 'hp';

/**
 * Helper to create a metrics tracker for an analysis call.
 * Call start() before the API call and finish() after.
 */
export function createMetricsTracker(
  analysisType: AnalysisType,
  modelUsed: string,
  promptVersion: string = 'v1'
) {
  const startTime = Date.now();

  return {
    /**
     * Record the metrics after the API call completes
     */
    finish(
      noteId: number,
      response: {
        usage?: {
          input_tokens?: number;
          output_tokens?: number;
        };
        stop_reason?: string;
      },
      errorCode?: string
    ): number {
      const latencyMs = Date.now() - startTime;

      const metrics: Omit<AnalysisMetrics, 'id' | 'createdAt'> = {
        noteId,
        analysisType,
        modelUsed,
        promptVersion,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        latencyMs,
        finishReason: response.stop_reason,
        errorCode,
      };

      return saveAnalysisMetrics(metrics);
    },

    /**
     * Record an error without completing the API call
     */
    recordError(noteId: number, errorCode: string): number {
      const latencyMs = Date.now() - startTime;

      const metrics: Omit<AnalysisMetrics, 'id' | 'createdAt'> = {
        noteId,
        analysisType,
        modelUsed,
        promptVersion,
        latencyMs,
        errorCode,
      };

      return saveAnalysisMetrics(metrics);
    },
  };
}

/**
 * Prompt version registry - helps track which prompts are being used
 */
export const PROMPT_VERSIONS: Record<AnalysisType, string> = {
  admission: 'v1',
  comprehensive: 'v1',
  'care-coordination': 'v1',
  'cognitive-bias': 'v1',
  'discharge-destination': 'v1',
  'prior-care': 'v1',
  'progress-note': 'v1',
  'discharge-summary': 'v1',
  hp: 'v1',
};

/**
 * Get the current prompt version for an analysis type
 */
export function getPromptVersion(analysisType: AnalysisType): string {
  return PROMPT_VERSIONS[analysisType];
}

/**
 * Calculate quality score from feedback data
 * Returns a score between 0 and 100
 */
export function calculateQualityScore(feedback: {
  averageRating: number;
  helpfulRate: number;
  accuracyRate: number;
  usageRate: number;
}): number {
  // Weight ratings and feedback attributes
  const ratingScore = (feedback.averageRating / 5) * 40; // 40% weight
  const helpfulScore = feedback.helpfulRate * 25; // 25% weight
  const accuracyScore = feedback.accuracyRate * 25; // 25% weight
  const usageScore = feedback.usageRate * 10; // 10% weight

  return Math.round(ratingScore + helpfulScore + accuracyScore + usageScore);
}

/**
 * Determine if feedback data is sufficient for meaningful insights
 */
export function hasSufficientData(totalFeedback: number, minSamples: number = 10): boolean {
  return totalFeedback >= minSamples;
}

/**
 * Format latency for display
 */
export function formatLatency(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens}`;
  }
  return `${(tokens / 1000).toFixed(1)}k`;
}

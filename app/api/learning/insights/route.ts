import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface InsightResult {
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

export async function GET() {
  try {
    const db = getDb();

    // Get best performing analysis types
    const bestPerformingStmt = db.prepare(`
      SELECT
        n.type as analysisType,
        AVG(f.rating) as avgRating,
        COUNT(*) as feedbackCount
      FROM feedback f
      JOIN notes n ON f.note_id = n.id
      WHERE f.rating IS NOT NULL
      GROUP BY n.type
      HAVING COUNT(*) >= 3
      ORDER BY AVG(f.rating) DESC
      LIMIT 5
    `);
    const bestPerforming = bestPerformingStmt.all() as {
      analysisType: string;
      avgRating: number;
      feedbackCount: number;
    }[];

    // Get types needing improvement (low ratings or low accuracy)
    const needsImprovementStmt = db.prepare(`
      SELECT
        n.type as analysisType,
        AVG(f.rating) as avgRating,
        AVG(CASE WHEN f.was_accurate = 0 THEN 1.0 ELSE 0.0 END) as inaccuracyRate
      FROM feedback f
      JOIN notes n ON f.note_id = n.id
      WHERE f.rating IS NOT NULL
      GROUP BY n.type
      HAVING AVG(f.rating) < 3.5 OR AVG(CASE WHEN f.was_accurate = 0 THEN 1.0 ELSE 0.0 END) > 0.3
    `);
    const needsImprovementRaw = needsImprovementStmt.all() as {
      analysisType: string;
      avgRating: number;
      inaccuracyRate: number;
    }[];

    // Get common issues from feedback text for types needing improvement
    const needsImprovement = needsImprovementRaw.map(item => {
      const commonIssues: string[] = [];

      if (item.avgRating < 3) {
        commonIssues.push('Low overall satisfaction');
      }
      if (item.inaccuracyRate > 0.3) {
        commonIssues.push('Accuracy concerns reported');
      }

      // Check for common keywords in feedback text
      const feedbackTextStmt = db.prepare(`
        SELECT f.feedback_text
        FROM feedback f
        JOIN notes n ON f.note_id = n.id
        WHERE n.type = ? AND f.feedback_text IS NOT NULL
        LIMIT 10
      `);
      const feedbackTexts = feedbackTextStmt.all(item.analysisType) as { feedback_text: string }[];

      const keywordPatterns = [
        { pattern: /missing|missed|forgot/i, issue: 'Missing information' },
        { pattern: /wrong|incorrect|error/i, issue: 'Factual errors' },
        { pattern: /unclear|confus/i, issue: 'Clarity issues' },
        { pattern: /too long|verbose/i, issue: 'Too verbose' },
        { pattern: /irrelevant|unnecessary/i, issue: 'Irrelevant content' },
      ];

      for (const text of feedbackTexts) {
        if (text.feedback_text) {
          for (const { pattern, issue } of keywordPatterns) {
            if (pattern.test(text.feedback_text) && !commonIssues.includes(issue)) {
              commonIssues.push(issue);
            }
          }
        }
      }

      return {
        analysisType: item.analysisType,
        avgRating: item.avgRating,
        commonIssues: commonIssues.slice(0, 3),
      };
    });

    // Generate improvement suggestions
    const suggestions: string[] = [];

    // Data quality metrics
    const dataQualityStmt = db.prepare(`
      SELECT
        COUNT(*) as totalFeedback,
        SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END) as feedbackWithRating,
        SUM(CASE WHEN feedback_text IS NOT NULL AND feedback_text != '' THEN 1 ELSE 0 END) as feedbackWithComments
      FROM feedback
    `);
    const dataQuality = dataQualityStmt.get() as {
      totalFeedback: number;
      feedbackWithRating: number;
      feedbackWithComments: number;
    };

    const sufficientData = dataQuality.totalFeedback >= 20;

    if (dataQuality.totalFeedback < 10) {
      suggestions.push('Collect more feedback to enable meaningful insights (minimum 10-20 samples per analysis type)');
    }

    if (dataQuality.feedbackWithComments < dataQuality.totalFeedback * 0.3) {
      suggestions.push('Encourage users to provide written feedback for more actionable insights');
    }

    if (needsImprovement.length > 0) {
      for (const item of needsImprovement) {
        if (item.avgRating < 3) {
          suggestions.push(`Review and improve prompts for ${item.analysisType} analysis (avg rating: ${item.avgRating.toFixed(1)})`);
        }
      }
    }

    if (bestPerforming.length > 0 && needsImprovement.length > 0) {
      suggestions.push('Consider applying patterns from high-performing analyses to improve lower-rated ones');
    }

    const result: InsightResult = {
      bestPerforming,
      needsImprovement,
      suggestions: suggestions.length > 0 ? suggestions : ['System is performing well. Continue collecting feedback for ongoing monitoring.'],
      dataQuality: {
        ...dataQuality,
        sufficientData,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Learning insights error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve learning insights' },
      { status: 500 }
    );
  }
}

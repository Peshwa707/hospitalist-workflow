'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Feedback } from '@/lib/types';

interface FeedbackBadgeProps {
  noteId: number;
  className?: string;
}

export function FeedbackBadge({ noteId, className }: FeedbackBadgeProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeedback() {
      try {
        const res = await fetch(`/api/feedback?noteId=${noteId}`);
        const data = await res.json();
        if (data.exists && data.feedback) {
          setFeedback(data.feedback);
        }
      } catch (error) {
        console.error('Error fetching feedback:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchFeedback();
  }, [noteId]);

  if (loading) {
    return null;
  }

  if (!feedback) {
    return (
      <Badge variant="outline" className={cn('text-xs', className)}>
        No feedback
      </Badge>
    );
  }

  const ratingColor = feedback.rating
    ? feedback.rating >= 4
      ? 'bg-green-100 text-green-800 border-green-200'
      : feedback.rating >= 3
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-red-100 text-red-800 border-red-200'
    : '';

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs gap-1',
        ratingColor,
        className
      )}
    >
      {feedback.rating && (
        <>
          <span className="text-yellow-600">★</span>
          {feedback.rating}
        </>
      )}
      {feedback.wasHelpful && <span title="Marked as helpful">✓</span>}
    </Badge>
  );
}

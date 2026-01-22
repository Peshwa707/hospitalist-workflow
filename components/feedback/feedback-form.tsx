'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Feedback } from '@/lib/types';

interface FeedbackFormProps {
  noteId: number;
  onFeedbackSubmitted?: (feedback: Feedback) => void;
  compact?: boolean;
}

export function FeedbackForm({ noteId, onFeedbackSubmitted, compact = false }: FeedbackFormProps) {
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [wasHelpful, setWasHelpful] = useState<boolean | undefined>(undefined);
  const [wasAccurate, setWasAccurate] = useState<boolean | undefined>(undefined);
  const [wasUsed, setWasUsed] = useState<boolean | undefined>(undefined);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<Feedback | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check for existing feedback
    async function checkExisting() {
      try {
        const res = await fetch(`/api/feedback?noteId=${noteId}`);
        const data = await res.json();
        if (data.exists && data.feedback) {
          setExistingFeedback(data.feedback);
          setRating(data.feedback.rating);
          setWasHelpful(data.feedback.wasHelpful);
          setWasAccurate(data.feedback.wasAccurate);
          setWasUsed(data.feedback.wasUsed);
          setFeedbackText(data.feedback.feedbackText || '');
          setIsSubmitted(true);
        }
      } catch (error) {
        console.error('Error checking existing feedback:', error);
      }
    }
    checkExisting();
  }, [noteId]);

  const handleSubmit = async () => {
    if (!rating) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId,
          rating,
          wasHelpful,
          wasAccurate,
          wasUsed,
          feedbackText: feedbackText.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit feedback');

      const feedback = await res.json();
      setIsSubmitted(true);
      setExistingFeedback(feedback);
      onFeedbackSubmitted?.(feedback);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = () => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          className={cn(
            'text-2xl transition-colors focus:outline-none',
            rating && star <= rating
              ? 'text-yellow-500'
              : 'text-gray-300 hover:text-yellow-400'
          )}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );

  const QuickButton = ({
    label,
    value,
    selected,
    onToggle,
  }: {
    label: string;
    value: boolean | undefined;
    selected: boolean;
    onToggle: (val: boolean) => void;
  }) => (
    <Button
      type="button"
      variant={selected ? 'default' : 'outline'}
      size="sm"
      onClick={() => onToggle(!value)}
      className={cn('transition-all', selected && 'ring-2 ring-offset-1')}
    >
      {label}
    </Button>
  );

  if (compact && isSubmitted && !showDetails) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-yellow-500">{'★'.repeat(rating || 0)}</span>
        <span className="text-gray-300">{'★'.repeat(5 - (rating || 0))}</span>
        <button
          onClick={() => setShowDetails(true)}
          className="text-xs underline hover:text-foreground"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <Card className={cn(compact ? 'py-3' : '')}>
      <CardHeader className={cn(compact ? 'pb-2' : '')}>
        <CardTitle className="text-sm font-medium">
          {isSubmitted ? 'Update Feedback' : 'How was this analysis?'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Rating</label>
          <StarRating />
        </div>

        {/* Quick Feedback Buttons */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Quick Feedback</label>
          <div className="flex flex-wrap gap-2">
            <QuickButton
              label="Helpful"
              value={wasHelpful}
              selected={wasHelpful === true}
              onToggle={setWasHelpful}
            />
            <QuickButton
              label="Accurate"
              value={wasAccurate}
              selected={wasAccurate === true}
              onToggle={setWasAccurate}
            />
            <QuickButton
              label="Used Recommendation"
              value={wasUsed}
              selected={wasUsed === true}
              onToggle={setWasUsed}
            />
          </div>
        </div>

        {/* Optional Text Feedback */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            Comments (optional)
          </label>
          <Textarea
            placeholder="What could be improved? What was missing?"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-2">
          {compact && showDetails && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(false)}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!rating || isSubmitting}
            size="sm"
          >
            {isSubmitting ? 'Saving...' : isSubmitted ? 'Update' : 'Submit Feedback'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

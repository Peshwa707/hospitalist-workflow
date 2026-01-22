'use client';

import { LearningDashboard } from '@/components/dashboard/learning-dashboard';

export default function LearningPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learning Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track AI analysis quality, user feedback, and performance metrics to continuously improve recommendations.
        </p>
      </div>

      <LearningDashboard />
    </div>
  );
}

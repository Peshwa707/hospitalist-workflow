'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComprehensiveAnalysisForm } from '@/components/analyzer/comprehensive-analysis-form';
import { ComprehensiveAnalysisResults } from '@/components/analyzer/comprehensive-analysis-results';
import { PriorCareForm } from '@/components/analyzer/prior-care-form';
import { PriorCareResults } from '@/components/analyzer/prior-care-results';
import { AIDisclaimer } from '@/components/notes/ai-disclaimer';
import { Brain, FileStack } from 'lucide-react';
import type { ComprehensiveAnalysisOutput, PriorCareSummaryOutput } from '@/lib/types';

export default function AnalyzePage() {
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<ComprehensiveAnalysisOutput | null>(null);
  const [priorCareSummary, setPriorCareSummary] = useState<PriorCareSummaryOutput | null>(null);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clinical Analyzer</h1>
        <p className="text-muted-foreground mt-2">
          AI-assisted analysis tools for clinical decision support.
        </p>
      </div>

      <AIDisclaimer />

      <Tabs defaultValue="comprehensive" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comprehensive" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Admission Analysis
          </TabsTrigger>
          <TabsTrigger value="prior-care" className="flex items-center gap-2">
            <FileStack className="h-4 w-4" />
            Prior Care Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comprehensive" className="space-y-6">
          <ComprehensiveAnalysisForm onAnalyzed={setComprehensiveAnalysis} />
          {comprehensiveAnalysis && (
            <ComprehensiveAnalysisResults result={comprehensiveAnalysis} />
          )}
        </TabsContent>

        <TabsContent value="prior-care" className="space-y-6">
          <PriorCareForm onSummaryGenerated={setPriorCareSummary} />
          {priorCareSummary && <PriorCareResults summary={priorCareSummary} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { AdmissionAnalyzerForm } from '@/components/analyzer/admission-analyzer-form';
import { AnalysisResults } from '@/components/analyzer/analysis-results';
import { AIDisclaimer } from '@/components/notes/ai-disclaimer';
import type { AdmissionAnalysisOutput } from '@/lib/types';

export default function AnalyzePage() {
  const [analysis, setAnalysis] = useState<AdmissionAnalysisOutput | null>(null);

  const handleAnalyzed = (output: AdmissionAnalysisOutput) => {
    setAnalysis(output);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admission Note Analyzer</h1>
        <p className="text-muted-foreground mt-2">
          Paste a complete admission note to receive AI-assisted clinical decision support.
        </p>
      </div>

      <AIDisclaimer />

      <AdmissionAnalyzerForm onAnalyzed={handleAnalyzed} />

      {analysis && <AnalysisResults analysis={analysis} />}
    </div>
  );
}

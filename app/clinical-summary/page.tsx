'use client';

import { useState } from 'react';
import { DataDumpForm } from '@/components/clinical-summary/data-dump-form';
import { ComprehensiveSummaryResults } from '@/components/clinical-summary/comprehensive-summary-results';
import type { ClinicalSummaryOutput } from '@/lib/types';

export default function ClinicalSummaryPage() {
  const [result, setResult] = useState<ClinicalSummaryOutput | null>(null);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clinical Data Summary</h1>
        <p className="text-muted-foreground">
          Paste any clinical data and get a comprehensive summary with next steps
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <DataDumpForm onSummarized={setResult} />
        </div>
        <div>
          {result ? (
            <ComprehensiveSummaryResults result={result} />
          ) : (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
              <p>Paste clinical data and click "Generate Summary" to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

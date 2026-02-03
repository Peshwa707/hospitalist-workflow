import { IntakeWorkflow } from '@/components/workflow/intake-workflow';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Patient Intake</h1>
        <p className="text-muted-foreground">
          Enter patient data → Select note type → Generate & edit
        </p>
      </div>

      {/* Safety Warning */}
      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
        <CardContent className="flex items-start gap-4 pt-6">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            AI-generated content must be reviewed and verified by a physician before use.
            Only MRN is stored—no PHI (names, DOB, addresses) is extracted or retained.
          </p>
        </CardContent>
      </Card>

      {/* Main Workflow */}
      <IntakeWorkflow />
    </div>
  );
}

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, FileOutput, Brain, History, ArrowRight, AlertTriangle } from 'lucide-react';

const features = [
  {
    title: 'Progress Note Generator',
    description: 'Enter brief clinical details and generate a complete SOAP-format progress note.',
    icon: FileText,
    href: '/progress',
    badge: 'Daily Use',
    color: 'text-blue-600',
  },
  {
    title: 'Discharge Summary',
    description: 'Create comprehensive discharge summaries from key hospitalization information.',
    icon: FileOutput,
    href: '/discharge',
    badge: 'Time Saver',
    color: 'text-green-600',
  },
  {
    title: 'Admission Analyzer',
    description: 'Paste admission notes to get differential diagnosis, workup recommendations, and consult suggestions.',
    icon: Brain,
    href: '/analyze',
    badge: 'Clinical Support',
    color: 'text-purple-600',
  },
  {
    title: 'Note History',
    description: 'Access previously generated notes and analyses with search functionality.',
    icon: History,
    href: '/history',
    badge: 'Archive',
    color: 'text-gray-600',
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Hospitalist Workflow</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Reduce documentation burden with AI-assisted note generation and clinical analysis.
        </p>
      </div>

      {/* Safety Warning */}
      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
        <CardContent className="flex items-start gap-4 pt-6">
          <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Important Safety Notice</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              All AI-generated content is for assistance only and must be reviewed and verified by a physician before use.
              This tool does not replace clinical judgment. Never copy content directly to the EMR without verification.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <Card key={feature.href} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <feature.icon className={`h-8 w-8 ${feature.color}`} />
                <Badge variant="secondary">{feature.badge}</Badge>
              </div>
              <CardTitle className="text-xl">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={feature.href}>
                <Button className="w-full">
                  Open
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Progress Notes:</strong> Include overnight events, current vitals, and your assessment for best results.</p>
          <p>• <strong>Discharge Summaries:</strong> The more detail you provide about the hospital course, the better the output.</p>
          <p>• <strong>Analyzer:</strong> Paste complete admission notes including HPI, PMHx, and exam findings for comprehensive analysis.</p>
          <p>• <strong>Privacy:</strong> Use patient initials only. Never include MRNs or other PHI identifiers.</p>
        </CardContent>
      </Card>
    </div>
  );
}

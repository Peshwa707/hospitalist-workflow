'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Activity,
  CheckCircle,
  Pill,
  Building2,
  TestTube,
  Shield,
  Users,
  Lightbulb,
  Scissors,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import type { PriorCareSummaryOutput, MedicalProblem } from '@/lib/types';

interface PriorCareResultsProps {
  summary: PriorCareSummaryOutput;
}

export function PriorCareResults({ summary }: PriorCareResultsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = formatSummaryAsText(summary);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = (status: MedicalProblem['status']) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'chronic':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Prior Care Summary
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {/* Patient Overview */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="font-medium text-blue-900">{summary.patientOverview}</p>
            </div>

            {/* Clinical Pearls - highlighted at top */}
            {summary.clinicalPearls && summary.clinicalPearls.length > 0 && (
              <Section icon={Lightbulb} title="Clinical Pearls" highlight>
                <ul className="space-y-2">
                  {summary.clinicalPearls.map((pearl, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">⚡</span>
                      <span className="text-sm">{pearl}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Active Problems */}
            {summary.activeProblems && summary.activeProblems.length > 0 && (
              <Section icon={Activity} title="Active Problems">
                <div className="space-y-2">
                  {summary.activeProblems.map((problem, i) => (
                    <div key={i} className="flex items-start justify-between border-b pb-2 last:border-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{problem.problem}</span>
                          <Badge className={statusColor(problem.status)} variant="secondary">
                            {problem.status}
                          </Badge>
                        </div>
                        {problem.keyDetails && (
                          <p className="text-sm text-muted-foreground mt-1">{problem.keyDetails}</p>
                        )}
                      </div>
                      {problem.lastMentioned && (
                        <span className="text-xs text-muted-foreground">{problem.lastMentioned}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Resolved Problems */}
            {summary.resolvedProblems && summary.resolvedProblems.length > 0 && (
              <Section icon={CheckCircle} title="Resolved Problems" collapsed>
                <div className="space-y-1">
                  {summary.resolvedProblems.map((problem, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">{problem.problem}</span>
                      {problem.keyDetails && (
                        <span className="text-muted-foreground"> - {problem.keyDetails}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Recent Hospitalizations */}
            {summary.recentHospitalizations && summary.recentHospitalizations.length > 0 && (
              <Section icon={Building2} title="Recent Hospitalizations">
                <div className="space-y-3">
                  {summary.recentHospitalizations.map((hosp, i) => (
                    <div key={i} className="border-l-2 border-gray-300 pl-3">
                      <div className="flex items-center gap-2">
                        {hosp.date && <Badge variant="outline">{hosp.date}</Badge>}
                        <span className="font-medium">{hosp.reason}</span>
                      </div>
                      {hosp.keyFindings && (
                        <p className="text-sm text-muted-foreground mt-1">{hosp.keyFindings}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Medications */}
            {summary.relevantMedications && summary.relevantMedications.length > 0 && (
              <Section icon={Pill} title="Relevant Medications">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {summary.relevantMedications.map((med, i) => (
                    <div key={i} className="text-sm border rounded p-2">
                      <div className="font-medium">{med.medication}</div>
                      {med.indication && (
                        <div className="text-muted-foreground text-xs">For: {med.indication}</div>
                      )}
                      {med.changes && (
                        <div className="text-orange-600 text-xs">⚠ {med.changes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Surgical History */}
            {summary.surgicalHistory && summary.surgicalHistory.length > 0 && (
              <Section icon={Scissors} title="Surgical History">
                <ul className="space-y-1">
                  {summary.surgicalHistory.map((surgery, i) => (
                    <li key={i} className="text-sm">• {surgery}</li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Important Findings */}
            {summary.importantFindings && summary.importantFindings.length > 0 && (
              <Section icon={TestTube} title="Important Findings">
                <div className="space-y-2">
                  {summary.importantFindings.map((finding, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="shrink-0">{finding.category}</Badge>
                      <span>{finding.finding}</span>
                      {finding.date && (
                        <span className="text-muted-foreground shrink-0">({finding.date})</span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Preventive Care */}
            {summary.preventiveCare && summary.preventiveCare.length > 0 && (
              <Section icon={Shield} title="Preventive Care" collapsed>
                <div className="grid grid-cols-2 gap-2">
                  {summary.preventiveCare.map((item, i) => (
                    <div key={i} className="text-sm flex justify-between">
                      <span>{item.item}</span>
                      <span className={`text-xs ${
                        item.status === 'Overdue' ? 'text-red-600' :
                        item.status === 'Due' ? 'text-yellow-600' :
                        'text-muted-foreground'
                      }`}>
                        {item.lastDate || item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Social and Functional */}
            {summary.socialAndFunctional && (
              <Section icon={User} title="Social & Functional">
                <p className="text-sm">{summary.socialAndFunctional}</p>
              </Section>
            )}

            {/* Key Contacts */}
            {summary.keyContacts && summary.keyContacts.length > 0 && (
              <Section icon={Users} title="Key Contacts">
                <div className="flex flex-wrap gap-2">
                  {summary.keyContacts.map((contact, i) => (
                    <Badge key={i} variant="secondary">
                      {contact.role}: {contact.name || contact.specialty}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            <Separator />
            <p className="text-xs text-muted-foreground text-center">
              Generated {new Date(summary.generatedAt).toLocaleString()}
            </p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  highlight = false,
  collapsed = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
  collapsed?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(!collapsed);

  return (
    <div className={highlight ? 'bg-yellow-50 rounded-lg p-3 border border-yellow-200' : ''}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <Icon className={`h-4 w-4 ${highlight ? 'text-yellow-600' : 'text-muted-foreground'}`} />
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-muted-foreground text-xs">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && children}
    </div>
  );
}

function formatSummaryAsText(summary: PriorCareSummaryOutput): string {
  let text = `PRIOR CARE SUMMARY\n${'='.repeat(50)}\n\n`;
  text += `OVERVIEW: ${summary.patientOverview}\n\n`;

  if (summary.clinicalPearls?.length) {
    text += `CLINICAL PEARLS:\n`;
    summary.clinicalPearls.forEach((p) => (text += `  ⚡ ${p}\n`));
    text += '\n';
  }

  if (summary.activeProblems?.length) {
    text += `ACTIVE PROBLEMS:\n`;
    summary.activeProblems.forEach((p) => {
      text += `  • ${p.problem} [${p.status}]`;
      if (p.keyDetails) text += ` - ${p.keyDetails}`;
      text += '\n';
    });
    text += '\n';
  }

  if (summary.recentHospitalizations?.length) {
    text += `RECENT HOSPITALIZATIONS:\n`;
    summary.recentHospitalizations.forEach((h) => {
      text += `  • ${h.date || 'Date unknown'}: ${h.reason}`;
      if (h.keyFindings) text += ` (${h.keyFindings})`;
      text += '\n';
    });
    text += '\n';
  }

  if (summary.relevantMedications?.length) {
    text += `RELEVANT MEDICATIONS:\n`;
    summary.relevantMedications.forEach((m) => {
      text += `  • ${m.medication}`;
      if (m.indication) text += ` - ${m.indication}`;
      text += '\n';
    });
    text += '\n';
  }

  if (summary.surgicalHistory?.length) {
    text += `SURGICAL HISTORY:\n`;
    summary.surgicalHistory.forEach((s) => (text += `  • ${s}\n`));
    text += '\n';
  }

  if (summary.socialAndFunctional) {
    text += `SOCIAL/FUNCTIONAL: ${summary.socialAndFunctional}\n\n`;
  }

  return text;
}

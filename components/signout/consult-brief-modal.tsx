'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Phone, Copy, Check } from 'lucide-react';
import type { ConsultPreBrief } from '@/lib/types';

interface ConsultBriefModalProps {
  patientId: number;
  patientMrn: string;
  trigger?: React.ReactNode;
}

const specialties = [
  'Cardiology',
  'Nephrology',
  'Pulmonology',
  'Gastroenterology',
  'Infectious Disease',
  'Hematology',
  'Oncology',
  'Neurology',
  'Surgery',
  'Psychiatry',
  'Palliative Care',
  'Other',
];

export function ConsultBriefModal({ patientId, patientMrn, trigger }: ConsultBriefModalProps) {
  const [open, setOpen] = useState(false);
  const [specialty, setSpecialty] = useState('');
  const [consultQuestion, setConsultQuestion] = useState('');
  const [urgency, setUrgency] = useState<'emergent' | 'urgent' | 'routine'>('routine');
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<ConsultPreBrief | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!specialty || !consultQuestion) return;

    setLoading(true);
    try {
      const response = await fetch('/api/signout/consult-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          specialty,
          consultQuestion,
          urgency,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setBrief(result);
      }
    } catch (error) {
      console.error('Consult brief error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBriefForCopy = () => {
    if (!brief) return '';

    return `${brief.specialty} Consult - ${patientMrn}

ONE-LINER: ${brief.oneLineSummary}

RELEVANT HISTORY:
${brief.relevantHistory.map(h => `• ${h}`).join('\n')}

PERTINENT FINDINGS:
${brief.pertinentFindings.map(f => `• [${f.category.toUpperCase()}] ${f.finding} - ${f.significance}`).join('\n')}

RELEVANT DATA:
${brief.relevantData.labs?.length ? `Labs: ${brief.relevantData.labs.join(', ')}` : ''}
${brief.relevantData.imaging?.length ? `Imaging: ${brief.relevantData.imaging.join(', ')}` : ''}
${brief.relevantData.vitals ? `Vitals: ${brief.relevantData.vitals}` : ''}

QUESTION: ${brief.specificQuestion}

URGENCY: ${urgency.toUpperCase()} - ${brief.urgencyJustification}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatBriefForCopy());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Phone className="h-4 w-4 mr-2" />
            Consult Brief
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consult Pre-Brief Generator</DialogTitle>
          <DialogDescription>
            Generate a specialty-optimized brief for your consult call
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!brief ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty</Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map(s => (
                        <SelectItem key={s} value={s.toLowerCase().replace(/\s+/g, '_')}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select value={urgency} onValueChange={(v) => setUrgency(v as typeof urgency)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergent">Emergent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question">Consult Question</Label>
                <Textarea
                  id="question"
                  value={consultQuestion}
                  onChange={(e) => setConsultQuestion(e.target.value)}
                  placeholder="What specific question do you want the consultant to answer?"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading || !specialty || !consultQuestion}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Brief...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Generate Brief
                  </>
                )}
              </Button>
            </>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {brief.specialty} Consult
                    <Badge className={
                      urgency === 'emergent' ? 'bg-red-600' :
                      urgency === 'urgent' ? 'bg-orange-500' : ''
                    }>
                      {urgency.toUpperCase()}
                    </Badge>
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">One-Liner</span>
                  <p className="text-sm font-medium">{brief.oneLineSummary}</p>
                </div>

                {brief.relevantHistory.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Relevant History</span>
                    <ul className="text-sm">
                      {brief.relevantHistory.map((h, idx) => (
                        <li key={idx}>• {h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {brief.pertinentFindings.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Pertinent Findings</span>
                    <div className="space-y-1">
                      {brief.pertinentFindings.map((f, idx) => (
                        <div key={idx} className="text-sm p-2 bg-muted/50 rounded">
                          <Badge variant="outline" className="text-xs capitalize">{f.category}</Badge>
                          <span className="ml-2">{f.finding}</span>
                          <p className="text-xs text-muted-foreground mt-1">{f.significance}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(brief.relevantData.labs?.length || brief.relevantData.imaging?.length || brief.relevantData.vitals) && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Relevant Data</span>
                    <div className="text-sm space-y-1">
                      {brief.relevantData.labs?.length && (
                        <div><strong>Labs:</strong> {brief.relevantData.labs.join(', ')}</div>
                      )}
                      {brief.relevantData.imaging?.length && (
                        <div><strong>Imaging:</strong> {brief.relevantData.imaging.join(', ')}</div>
                      )}
                      {brief.relevantData.vitals && (
                        <div><strong>Vitals:</strong> {brief.relevantData.vitals}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <span className="text-xs font-semibold text-blue-800 uppercase">Question for Consultant</span>
                  <p className="text-sm font-medium text-blue-900">{brief.specificQuestion}</p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Urgency Justification</span>
                  <p className="text-sm">{brief.urgencyJustification}</p>
                </div>

                <Button variant="outline" onClick={() => setBrief(null)} className="w-full">
                  Generate Another Brief
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

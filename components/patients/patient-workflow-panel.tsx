'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Stethoscope,
  ClipboardList,
  Loader2,
  Activity,
  Plus,
  Wand2,
  CheckCircle,
} from 'lucide-react';
import { NoteDisplay } from '@/components/notes/note-display';
import type { Patient, HpOutput, ProgressNoteOutput } from '@/lib/types';

interface PatientWorkflowPanelProps {
  patient: Patient;
  onPatientUpdated?: (patient: Patient) => void;
}

interface DailyUpdateData {
  subjective: string;
  vitals: string;
  labs: string;
  physicalExam: string;
  assessmentNotes: string;
  planNotes: string;
}

export function PatientWorkflowPanel({ patient, onPatientUpdated }: PatientWorkflowPanelProps) {
  const [activeTab, setActiveTab] = useState('daily');
  const [isGeneratingHp, setIsGeneratingHp] = useState(false);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [generatedHp, setGeneratedHp] = useState<HpOutput | null>(null);
  const [generatedNote, setGeneratedNote] = useState<ProgressNoteOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Daily update form state
  const [dailyData, setDailyData] = useState<DailyUpdateData>({
    subjective: '',
    vitals: formatPatientVitals(patient),
    labs: formatPatientLabs(patient),
    physicalExam: '',
    assessmentNotes: '',
    planNotes: '',
  });

  // H&P input state
  const [hpChiefComplaint, setHpChiefComplaint] = useState(
    patient.primaryDiagnoses[0] || ''
  );
  const [hpAdditionalHistory, setHpAdditionalHistory] = useState('');

  function formatPatientVitals(p: Patient): string {
    if (!p.recentVitals) return '';
    const v = p.recentVitals;
    const parts: string[] = [];
    if (v.temperature) parts.push(`T ${v.temperature}`);
    if (v.heartRate) parts.push(`HR ${v.heartRate}`);
    if (v.bloodPressure) parts.push(`BP ${v.bloodPressure}`);
    if (v.respiratoryRate) parts.push(`RR ${v.respiratoryRate}`);
    if (v.oxygenSaturation) {
      parts.push(`O2 ${v.oxygenSaturation}%${v.oxygenDevice ? ` ${v.oxygenDevice}` : ' RA'}`);
    }
    return parts.join(', ');
  }

  function formatPatientLabs(p: Patient): string {
    if (p.recentLabs.length === 0) return '';
    return p.recentLabs
      .map((l) => `${l.name}: ${l.value}${l.unit ? ` ${l.unit}` : ''}`)
      .join(', ');
  }

  function calculateHospitalDay(): number {
    if (!patient.admissionDate) return 1;
    const admission = new Date(patient.admissionDate);
    const today = new Date();
    const diffTime = today.getTime() - admission.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  }

  const handleGenerateHp = async () => {
    setIsGeneratingHp(true);
    setError(null);
    setGeneratedHp(null);

    try {
      const response = await fetch('/api/notes/hp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          chiefComplaint: hpChiefComplaint,
          additionalHistory: hpAdditionalHistory,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate H&P');
      }

      const output: HpOutput = await response.json();
      setGeneratedHp(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGeneratingHp(false);
    }
  };

  const handleGenerateProgressNote = async () => {
    if (!dailyData.subjective.trim()) {
      setError('Please enter subjective information for the progress note');
      return;
    }

    setIsGeneratingNote(true);
    setError(null);
    setGeneratedNote(null);

    try {
      const response = await fetch('/api/notes/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          patientInitials: patient.initials,
          hospitalDay: calculateHospitalDay(),
          diagnosis: patient.primaryDiagnoses[0] || 'Admission diagnosis',
          subjective: dailyData.subjective,
          vitals: dailyData.vitals,
          labs: dailyData.labs,
          physicalExam: dailyData.physicalExam,
          assessmentNotes: dailyData.assessmentNotes,
          planNotes: dailyData.planNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate progress note');
      }

      const output: ProgressNoteOutput = await response.json();
      setGeneratedNote(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGeneratingNote(false);
    }
  };

  const handleDailyDataChange = (field: keyof DailyUpdateData, value: string) => {
    setDailyData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Patient Workflow
        </CardTitle>
        <CardDescription>
          Generate documentation and manage daily updates for {patient.initials}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Daily Progress Note
            </TabsTrigger>
            <TabsTrigger value="hp" className="gap-2">
              <FileText className="h-4 w-4" />
              Generate H&P
            </TabsTrigger>
          </TabsList>

          {/* Daily Progress Note Tab */}
          <TabsContent value="daily" className="space-y-4 mt-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Hospital Day {calculateHospitalDay()} - {patient.initials}
              </div>
              <div className="text-muted-foreground mt-1">
                Primary: {patient.primaryDiagnoses[0] || 'Not specified'}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subjective">
                  Subjective / Overnight Events <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="subjective"
                  value={dailyData.subjective}
                  onChange={(e) => handleDailyDataChange('subjective', e.target.value)}
                  placeholder="Patient reports feeling better, slept well, no chest pain..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vitals">Vitals (auto-filled from profile)</Label>
                  <Input
                    id="vitals"
                    value={dailyData.vitals}
                    onChange={(e) => handleDailyDataChange('vitals', e.target.value)}
                    placeholder="T 98.6, HR 78, BP 124/76..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="labs">Labs (auto-filled from profile)</Label>
                  <Input
                    id="labs"
                    value={dailyData.labs}
                    onChange={(e) => handleDailyDataChange('labs', e.target.value)}
                    placeholder="BMP wnl, BNP 450..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="physicalExam">Physical Exam</Label>
                <Textarea
                  id="physicalExam"
                  value={dailyData.physicalExam}
                  onChange={(e) => handleDailyDataChange('physicalExam', e.target.value)}
                  placeholder="A&Ox3, lungs clear, no edema..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assessmentNotes">Assessment Notes</Label>
                  <Textarea
                    id="assessmentNotes"
                    value={dailyData.assessmentNotes}
                    onChange={(e) => handleDailyDataChange('assessmentNotes', e.target.value)}
                    placeholder="Improving, euvolemic..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planNotes">Plan Notes</Label>
                  <Textarea
                    id="planNotes"
                    value={dailyData.planNotes}
                    onChange={(e) => handleDailyDataChange('planNotes', e.target.value)}
                    placeholder="Continue current management, PT eval..."
                    rows={2}
                  />
                </div>
              </div>

              {error && activeTab === 'daily' && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerateProgressNote}
                disabled={isGeneratingNote || !dailyData.subjective.trim()}
                className="w-full"
              >
                {isGeneratingNote ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Progress Note...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Progress Note
                  </>
                )}
              </Button>
            </div>

            {generatedNote && (
              <NoteDisplay
                title="Generated Progress Note"
                content={generatedNote.content}
                generatedAt={generatedNote.generatedAt}
                onRegenerate={handleGenerateProgressNote}
                isLoading={isGeneratingNote}
              />
            )}
          </TabsContent>

          {/* H&P Generation Tab */}
          <TabsContent value="hp" className="space-y-4 mt-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p>
                Generate a comprehensive H&P document using {patient.initials}&apos;s
                profile data including diagnoses, medications, vitals, and labs.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                <Input
                  id="chiefComplaint"
                  value={hpChiefComplaint}
                  onChange={(e) => setHpChiefComplaint(e.target.value)}
                  placeholder="Primary reason for admission..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalHistory">Additional History (optional)</Label>
                <Textarea
                  id="additionalHistory"
                  value={hpAdditionalHistory}
                  onChange={(e) => setHpAdditionalHistory(e.target.value)}
                  placeholder="Any additional history, social history, family history..."
                  rows={3}
                />
              </div>

              {error && activeTab === 'hp' && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerateHp}
                disabled={isGeneratingHp}
                className="w-full"
              >
                {isGeneratingHp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating H&P...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate H&P Document
                  </>
                )}
              </Button>
            </div>

            {generatedHp && (
              <NoteDisplay
                title="Generated H&P"
                content={generatedHp.content}
                generatedAt={generatedHp.generatedAt}
                onRegenerate={handleGenerateHp}
                isLoading={isGeneratingHp}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

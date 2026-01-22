'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  FileInput,
  Loader2,
  Wand2,
  FileText,
  Brain,
  CheckCircle,
  AlertTriangle,
  Copy,
  RotateCcw,
  ListTodo,
} from 'lucide-react';
import type { Patient, HpOutput, ComprehensiveAnalysisOutput } from '@/lib/types';
import { TaskChecklist } from '@/components/tasks/task-checklist';
import { ProgressNoteGenerator } from '@/components/notes/progress-note-generator';
import { NoteEditor } from '@/components/notes/note-editor';

type WorkflowStep = 'input' | 'processing' | 'complete';

interface ProcessingStatus {
  extracting: boolean;
  creatingPatient: boolean;
  generatingHp: boolean;
  analyzing: boolean;
  creatingTasks: boolean;
}

export function ClinicalWorkflow() {
  const [step, setStep] = useState<WorkflowStep>('input');
  const [emrText, setEmrText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [generatedHp, setGeneratedHp] = useState<HpOutput | null>(null);
  const [analysis, setAnalysis] = useState<ComprehensiveAnalysisOutput | null>(null);
  const [copiedHp, setCopiedHp] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    extracting: false,
    creatingPatient: false,
    generatingHp: false,
    analyzing: false,
    creatingTasks: false,
  });

  const handleProcess = async () => {
    if (emrText.trim().length < 100) {
      setError('Please paste at least 100 characters of EMR data');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      // Step 1: Extract patient profile
      setProcessingStatus((s) => ({ ...s, extracting: true }));
      const parseResponse = await fetch('/api/emr/parse-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emrText: emrText.trim() }),
      });

      if (!parseResponse.ok) {
        const data = await parseResponse.json();
        throw new Error(data.error || 'Failed to parse EMR data');
      }

      const profile = await parseResponse.json();
      setProcessingStatus((s) => ({ ...s, extracting: false, creatingPatient: true }));

      // Step 2: Create patient
      const patientData = {
        mrn: profile.mrn?.trim().toUpperCase() || 'UNKNOWN',
        roomNumber: profile.roomNumber || undefined,
        admissionDate: profile.admissionDate || undefined,
        primaryDiagnoses: profile.primaryDiagnoses,
        activeMedications: profile.medications,
        allergies: profile.allergies,
        codeStatus: profile.codeStatus || undefined,
        recentVitals: profile.vitals || undefined,
        recentLabs: profile.labs,
      };

      const patientResponse = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });

      if (!patientResponse.ok) {
        const data = await patientResponse.json();
        throw new Error(data.error || 'Failed to create patient');
      }

      const createdPatient: Patient = await patientResponse.json();
      setPatient(createdPatient);
      setProcessingStatus((s) => ({ ...s, creatingPatient: false, generatingHp: true }));

      // Step 3: Generate H&P
      const hpResponse = await fetch('/api/notes/hp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: createdPatient.id,
          chiefComplaint: profile.primaryDiagnoses[0] || 'Admission',
        }),
      });

      if (!hpResponse.ok) {
        const data = await hpResponse.json();
        throw new Error(data.error || 'Failed to generate H&P');
      }

      const hp: HpOutput = await hpResponse.json();
      setGeneratedHp(hp);
      setProcessingStatus((s) => ({ ...s, generatingHp: false, analyzing: true }));

      // Step 4: Run comprehensive analysis (auto-creates tasks)
      const analysisResponse = await fetch('/api/analyze/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admissionNote: emrText,
          patientId: createdPatient.id,
        }),
      });

      if (!analysisResponse.ok) {
        const data = await analysisResponse.json();
        throw new Error(data.error || 'Failed to analyze');
      }

      const analysisResult: ComprehensiveAnalysisOutput = await analysisResponse.json();
      setAnalysis(analysisResult);
      setProcessingStatus((s) => ({ ...s, analyzing: false, creatingTasks: true }));

      // Tasks are auto-created by the comprehensive analysis endpoint
      setProcessingStatus((s) => ({ ...s, creatingTasks: false }));
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep('input');
      setProcessingStatus({
        extracting: false,
        creatingPatient: false,
        generatingHp: false,
        analyzing: false,
        creatingTasks: false,
      });
    }
  };

  const handleCopyHp = async () => {
    if (generatedHp?.content) {
      await navigator.clipboard.writeText(generatedHp.content);
      setCopiedHp(true);
      setTimeout(() => setCopiedHp(false), 2000);
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setEmrText('');
    setError(null);
    setPatient(null);
    setGeneratedHp(null);
    setAnalysis(null);
    setShowProgressForm(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Step 1: Input */}
      {step === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileInput className="h-5 w-5" />
              Paste ER / Admission Data
            </CardTitle>
            <CardDescription>
              Paste EMR data to automatically generate H&P, run clinical analysis, and create task checklist
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={emrText}
              onChange={(e) => setEmrText(e.target.value)}
              placeholder="Paste admission note, H&P, or ER documentation here..."
              rows={14}
              className="font-mono text-sm"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Minimum 100 characters</span>
              <span className={emrText.length < 100 ? 'text-orange-500' : 'text-green-600'}>
                {emrText.length} characters
              </span>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button
              onClick={handleProcess}
              disabled={emrText.trim().length < 100}
              className="w-full"
              size="lg"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate H&P + Analysis + Tasks
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Processing */}
      {step === 'processing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { key: 'extracting', label: 'Extracting patient data from EMR' },
                { key: 'creatingPatient', label: 'Creating patient profile' },
                { key: 'generatingHp', label: 'Generating H&P document' },
                { key: 'analyzing', label: 'Running AI clinical analysis' },
                { key: 'creatingTasks', label: 'Creating task checklist' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  {processingStatus[key as keyof ProcessingStatus] ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  ) : processingStatus[key as keyof ProcessingStatus] === false &&
                    Object.entries(processingStatus).findIndex(([k]) => k === key) <
                      Object.entries(processingStatus).findIndex(
                        ([, v]) => v === true
                      ) ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span
                    className={
                      processingStatus[key as keyof ProcessingStatus]
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    }
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Complete */}
      {step === 'complete' && analysis && generatedHp && patient && (
        <div className="space-y-6">
          {/* Patient Header */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{patient.mrn}</h2>
                    {patient.roomNumber && (
                      <Badge variant="outline">Room {patient.roomNumber}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {patient.primaryDiagnoses[0] || 'Admission'}
                    {patient.admissionDate && ` | Admitted ${patient.admissionDate}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Tasks */}
            <div className="space-y-6">
              <TaskChecklist patientId={patient.id!} />

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Differential Diagnoses</span>
                    <Badge variant="secondary">{analysis.admission.differentialDiagnosis.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Recommended Workup</span>
                    <Badge variant="secondary">{analysis.admission.recommendedWorkup.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Suggested Consults</span>
                    <Badge variant="secondary">{analysis.admission.suggestedConsults.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discharge Destination</span>
                    <Badge variant="outline">{analysis.dischargeDestination.recommendedDestination.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - H&P and Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Note Button */}
              {!showProgressForm && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Daily Progress Note</h3>
                        <p className="text-sm text-muted-foreground">
                          Generate progress note based on H&P
                        </p>
                      </div>
                      <Button onClick={() => setShowProgressForm(true)} variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Add Progress Note
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Progress Note Form */}
              {showProgressForm && (
                <ProgressNoteGenerator
                  patient={patient}
                  previousNoteContent={generatedHp.content}
                  previousNoteType="hp"
                  hospitalDay={2}
                  onNoteGenerated={() => setShowProgressForm(false)}
                />
              )}

              {/* H&P Card with Editor */}
              <NoteEditor
                noteId={generatedHp.id!}
                noteType="hp"
                content={generatedHp.content}
                onContentChange={(newContent) => setGeneratedHp({ ...generatedHp, content: newContent })}
                title="H&P Document"
              />

              {/* Analysis Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    Clinical Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Top Differential */}
                  <div>
                    <h4 className="font-semibold mb-3">Top Differential Diagnoses</h4>
                    <div className="space-y-2">
                      {analysis.admission.differentialDiagnosis.slice(0, 3).map((dx, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <Badge
                            variant={
                              dx.likelihood === 'high'
                                ? 'default'
                                : dx.likelihood === 'moderate'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {dx.likelihood}
                          </Badge>
                          <div>
                            <div className="font-medium">{dx.diagnosis}</div>
                            <div className="text-sm text-muted-foreground">{dx.reasoning}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cognitive Bias Alerts */}
                  {analysis.cognitiveBias.identifiedBiases.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        Cognitive Bias Alerts
                      </h4>
                      <div className="space-y-2">
                        {analysis.cognitiveBias.identifiedBiases.slice(0, 2).map((bias, i) => (
                          <div key={i} className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                            <div className="font-medium text-orange-800">{bias.biasType}</div>
                            <div className="text-orange-700">{bias.mitigation}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discharge Planning */}
                  <div>
                    <h4 className="font-semibold mb-3">Discharge Planning</h4>
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{analysis.dischargeDestination.recommendedDestination.label}</Badge>
                        <span className="text-muted-foreground">
                          Est. LOS: {analysis.admission.dischargeReadiness.estimatedLOS}
                        </span>
                      </div>
                      {analysis.admission.dischargeReadiness.barriers.length > 0 && (
                        <div>
                          <span className="font-medium">Barriers: </span>
                          {analysis.admission.dischargeReadiness.barriers.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Start Over */}
          <Button variant="outline" onClick={handleStartOver} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            New Patient
          </Button>
        </div>
      )}
    </div>
  );
}

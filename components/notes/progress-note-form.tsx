'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, FileText } from 'lucide-react';
import type { ProgressNoteInput, ProgressNoteOutput } from '@/lib/types';

interface ProgressNoteFormProps {
  onGenerated: (output: ProgressNoteOutput) => void;
}

export function ProgressNoteForm({ onGenerated }: ProgressNoteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProgressNoteInput>({
    patientInitials: '',
    hospitalDay: 1,
    diagnosis: '',
    subjective: '',
    vitals: '',
    labs: '',
    physicalExam: '',
    assessmentNotes: '',
    planNotes: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'hospitalDay' ? parseInt(value, 10) || 1 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notes/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate note');
      }

      const output: ProgressNoteOutput = await response.json();
      onGenerated(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Progress Note Input
        </CardTitle>
        <CardDescription>
          Enter clinical details to generate a SOAP-format progress note.
          Required fields are marked with *.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Info Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientInitials">Patient Initials *</Label>
              <Input
                id="patientInitials"
                name="patientInitials"
                placeholder="JD"
                value={formData.patientInitials}
                onChange={handleChange}
                required
                maxLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospitalDay">Hospital Day *</Label>
              <Input
                id="hospitalDay"
                name="hospitalDay"
                type="number"
                min={1}
                value={formData.hospitalDay}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Primary Diagnosis *</Label>
              <Input
                id="diagnosis"
                name="diagnosis"
                placeholder="CHF exacerbation"
                value={formData.diagnosis}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Subjective */}
          <div className="space-y-2">
            <Label htmlFor="subjective">Subjective / Overnight Events *</Label>
            <Textarea
              id="subjective"
              name="subjective"
              placeholder="Day 3, feeling better, no SOB at rest, slept well, no chest pain"
              value={formData.subjective}
              onChange={handleChange}
              required
              rows={2}
            />
          </div>

          {/* Objective Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vitals">Vitals</Label>
              <Input
                id="vitals"
                name="vitals"
                placeholder="T 98.6, HR 78, BP 124/76, RR 16, O2 96% RA"
                value={formData.vitals}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="labs">Labs / Studies</Label>
              <Input
                id="labs"
                name="labs"
                placeholder="BMP wnl, BNP 450 (down from 1200)"
                value={formData.labs}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="physicalExam">Physical Exam Findings</Label>
            <Textarea
              id="physicalExam"
              name="physicalExam"
              placeholder="JVP 6cm, clear lungs, no peripheral edema, RRR"
              value={formData.physicalExam}
              onChange={handleChange}
              rows={2}
            />
          </div>

          {/* Assessment & Plan Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assessmentNotes">Assessment Notes</Label>
              <Textarea
                id="assessmentNotes"
                name="assessmentNotes"
                placeholder="Euvolemic, responding to diuresis"
                value={formData.assessmentNotes}
                onChange={handleChange}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planNotes">Plan Notes</Label>
              <Textarea
                id="planNotes"
                name="planNotes"
                placeholder="Continue IV furosemide, advance diet, PT eval"
                value={formData.planNotes}
                onChange={handleChange}
                rows={2}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Note...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Progress Note
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

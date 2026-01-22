'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileOutput } from 'lucide-react';
import { SpeechInput } from '@/components/speech/speech-input';
import type { DischargeSummaryInput, DischargeSummaryOutput } from '@/lib/types';

interface DischargeSummaryFormProps {
  onGenerated: (output: DischargeSummaryOutput) => void;
}

export function DischargeSummaryForm({ onGenerated }: DischargeSummaryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DischargeSummaryInput>({
    patientInitials: '',
    admissionDate: '',
    dischargeDate: '',
    admittingDiagnosis: '',
    dischargeDiagnosis: '',
    hospitalCourse: '',
    procedures: '',
    medications: '',
    followUp: '',
    patientEducation: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notes/discharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate discharge summary');
      }

      const output: DischargeSummaryOutput = await response.json();
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
          <FileOutput className="h-5 w-5" />
          Discharge Summary Input
        </CardTitle>
        <CardDescription>
          Enter key information to generate a comprehensive discharge summary.
          Required fields are marked with *.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Info Row */}
          <div className="grid grid-cols-3 gap-4">
            <SpeechInput
              id="patientInitials"
              name="patientInitials"
              label="Patient Initials"
              placeholder="JD"
              value={formData.patientInitials}
              onChange={handleChange}
              required
              maxLength={4}
            />
            <div className="space-y-2">
              <Label htmlFor="admissionDate">Admission Date *</Label>
              <Input
                id="admissionDate"
                name="admissionDate"
                type="date"
                value={formData.admissionDate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dischargeDate">Discharge Date *</Label>
              <Input
                id="dischargeDate"
                name="dischargeDate"
                type="date"
                value={formData.dischargeDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Diagnoses */}
          <div className="grid grid-cols-2 gap-4">
            <SpeechInput
              id="admittingDiagnosis"
              name="admittingDiagnosis"
              label="Admitting Diagnosis"
              placeholder="Acute CHF exacerbation"
              value={formData.admittingDiagnosis}
              onChange={handleChange}
              required
            />
            <SpeechInput
              id="dischargeDiagnosis"
              name="dischargeDiagnosis"
              label="Discharge Diagnosis"
              placeholder="1. CHF with preserved EF 2. HTN 3. T2DM"
              value={formData.dischargeDiagnosis}
              onChange={handleChange}
              required
            />
          </div>

          {/* Hospital Course */}
          <SpeechInput
            id="hospitalCourse"
            name="hospitalCourse"
            label="Hospital Course Summary"
            placeholder="65M with CHF admitted for volume overload. Treated with IV diuresis, achieved dry weight by day 3. Echo showed EF 55%, no new wall motion abnormalities. Transitioned to oral diuretics, euvolemic at discharge."
            value={formData.hospitalCourse}
            onChange={handleChange}
            required
            multiline
            rows={4}
          />

          {/* Procedures */}
          <SpeechInput
            id="procedures"
            name="procedures"
            label="Procedures Performed"
            placeholder="TTE 1/10: EF 55%, mild MR, no pericardial effusion"
            value={formData.procedures}
            onChange={handleChange}
            multiline
            rows={2}
          />

          {/* Medications */}
          <SpeechInput
            id="medications"
            name="medications"
            label="Discharge Medications"
            placeholder="Furosemide 40mg PO daily, Lisinopril 10mg daily, Metoprolol succinate 50mg daily, Metformin 1000mg BID"
            value={formData.medications}
            onChange={handleChange}
            multiline
            rows={3}
          />

          {/* Follow-up */}
          <div className="grid grid-cols-2 gap-4">
            <SpeechInput
              id="followUp"
              name="followUp"
              label="Follow-up Plans"
              placeholder="PCP in 1 week, Cardiology in 2 weeks, Daily weights"
              value={formData.followUp}
              onChange={handleChange}
              multiline
              rows={2}
            />
            <SpeechInput
              id="patientEducation"
              name="patientEducation"
              label="Patient Education"
              placeholder="Low sodium diet, daily weights, call if weight gain >3 lbs"
              value={formData.patientEducation}
              onChange={handleChange}
              multiline
              rows={2}
            />
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
                Generating Summary...
              </>
            ) : (
              <>
                <FileOutput className="h-4 w-4 mr-2" />
                Generate Discharge Summary
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

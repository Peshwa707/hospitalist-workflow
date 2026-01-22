'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Save, X } from 'lucide-react';
import type { Patient, Medication } from '@/lib/types';

interface PatientFormProps {
  patient?: Patient;
  onSaved: (patient: Patient) => void;
  onCancel?: () => void;
}

export function PatientForm({ patient, onSaved, onCancel }: PatientFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    initials: patient?.initials || '',
    roomNumber: patient?.roomNumber || '',
    admissionDate: patient?.admissionDate || '',
    primaryDiagnoses: patient?.primaryDiagnoses?.join('\n') || '',
    allergies: patient?.allergies?.join(', ') || '',
    codeStatus: patient?.codeStatus || '',
    notes: patient?.notes || '',
  });

  const [medications, setMedications] = useState<Medication[]>(
    patient?.activeMedications || []
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddMedication = () => {
    setMedications((prev) => [
      ...prev,
      { name: '', dose: '', route: '', frequency: '' },
    ]);
  };

  const handleMedicationChange = (
    index: number,
    field: keyof Medication,
    value: string
  ) => {
    setMedications((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'> = {
        initials: formData.initials.toUpperCase(),
        roomNumber: formData.roomNumber || undefined,
        admissionDate: formData.admissionDate || undefined,
        primaryDiagnoses: formData.primaryDiagnoses
          .split('\n')
          .map((d) => d.trim())
          .filter(Boolean),
        activeMedications: medications.filter((m) => m.name.trim()),
        allergies: formData.allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        codeStatus: formData.codeStatus || undefined,
        notes: formData.notes || undefined,
        recentLabs: patient?.recentLabs || [],
        recentVitals: patient?.recentVitals,
      };

      const url = patient?.id
        ? `/api/patients/${patient.id}`
        : '/api/patients';
      const method = patient?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save patient');
      }

      const savedPatient: Patient = await response.json();
      onSaved(savedPatient);
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
          <UserPlus className="h-5 w-5" />
          {patient ? 'Edit Patient' : 'New Patient'}
        </CardTitle>
        <CardDescription>
          {patient
            ? 'Update patient information'
            : 'Add a new patient to track their records'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initials">Patient Initials *</Label>
              <Input
                id="initials"
                name="initials"
                placeholder="JD"
                value={formData.initials}
                onChange={handleChange}
                required
                maxLength={4}
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Room Number</Label>
              <Input
                id="roomNumber"
                name="roomNumber"
                placeholder="4A-101"
                value={formData.roomNumber}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admissionDate">Admission Date</Label>
              <Input
                id="admissionDate"
                name="admissionDate"
                type="date"
                value={formData.admissionDate}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codeStatus">Code Status</Label>
              <Input
                id="codeStatus"
                name="codeStatus"
                placeholder="Full code"
                value={formData.codeStatus}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Diagnoses */}
          <div className="space-y-2">
            <Label htmlFor="primaryDiagnoses">Primary Diagnoses (one per line)</Label>
            <Textarea
              id="primaryDiagnoses"
              name="primaryDiagnoses"
              placeholder="CHF exacerbation&#10;Type 2 DM&#10;HTN"
              value={formData.primaryDiagnoses}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies (comma-separated)</Label>
            <Input
              id="allergies"
              name="allergies"
              placeholder="Penicillin, Sulfa, Iodine"
              value={formData.allergies}
              onChange={handleChange}
            />
          </div>

          {/* Medications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Active Medications</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMedication}
              >
                + Add Medication
              </Button>
            </div>
            {medications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No medications added</p>
            ) : (
              <div className="space-y-2">
                {medications.map((med, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      placeholder="Name"
                      value={med.name}
                      onChange={(e) =>
                        handleMedicationChange(index, 'name', e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      placeholder="Dose"
                      value={med.dose}
                      onChange={(e) =>
                        handleMedicationChange(index, 'dose', e.target.value)
                      }
                      className="w-24"
                    />
                    <Input
                      placeholder="Route"
                      value={med.route}
                      onChange={(e) =>
                        handleMedicationChange(index, 'route', e.target.value)
                      }
                      className="w-20"
                    />
                    <Input
                      placeholder="Frequency"
                      value={med.frequency}
                      onChange={(e) =>
                        handleMedicationChange(index, 'frequency', e.target.value)
                      }
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMedication(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes about this patient..."
              value={formData.notes}
              onChange={handleChange}
              rows={2}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {patient ? 'Update Patient' : 'Create Patient'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

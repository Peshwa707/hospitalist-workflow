'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Activity,
  TestTube,
  Pill,
  AlertCircle,
  User,
  FileText,
  AlertTriangle,
  Plus,
  X,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { ParsedDataPreview } from './parsed-data-preview';
import type { ParsedPatientProfile } from '@/lib/types';

interface PatientProfilePreviewProps {
  profile: ParsedPatientProfile;
  onProfileChange: (profile: ParsedPatientProfile) => void;
}

export function PatientProfilePreview({
  profile,
  onProfileChange,
}: PatientProfilePreviewProps) {
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newAllergy, setNewAllergy] = useState('');

  const updateProfile = (updates: Partial<ParsedPatientProfile>) => {
    onProfileChange({ ...profile, ...updates });
  };

  const addDiagnosis = () => {
    if (newDiagnosis.trim()) {
      updateProfile({
        primaryDiagnoses: [...profile.primaryDiagnoses, newDiagnosis.trim()],
      });
      setNewDiagnosis('');
    }
  };

  const removeDiagnosis = (index: number) => {
    updateProfile({
      primaryDiagnoses: profile.primaryDiagnoses.filter((_, i) => i !== index),
    });
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      updateProfile({
        allergies: [...profile.allergies, newAllergy.trim()],
      });
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    updateProfile({
      allergies: profile.allergies.filter((_, i) => i !== index),
    });
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <CheckCircle className="h-4 w-4" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4" />;
      case 'low':
        return <Circle className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getDocTypeLabel = (docType: string) => {
    switch (docType) {
      case 'admission_note':
        return 'Admission Note';
      case 'progress_note':
        return 'Progress Note';
      case 'hp':
        return 'H&P';
      case 'discharge':
        return 'Discharge Summary';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      {/* Confidence and Document Type */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{getDocTypeLabel(profile.extractedFrom)}</Badge>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm ${getConfidenceColor(
              profile.confidence
            )}`}
          >
            {getConfidenceIcon(profile.confidence)}
            <span className="capitalize">{profile.confidence} confidence</span>
          </div>
        </div>
      </div>

      {/* Parse Notes */}
      {profile.parseNotes && (
        <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{profile.parseNotes}</span>
        </div>
      )}

      {/* Patient Identifiers */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Patient Identifiers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initials">
                Initials <span className="text-red-500">*</span>
              </Label>
              <Input
                id="initials"
                value={profile.initials || ''}
                onChange={(e) =>
                  updateProfile({ initials: e.target.value.toUpperCase() })
                }
                placeholder="AB"
                maxLength={4}
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Room</Label>
              <Input
                id="roomNumber"
                value={profile.roomNumber || ''}
                onChange={(e) => updateProfile({ roomNumber: e.target.value })}
                placeholder="123A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admissionDate">Admission Date</Label>
              <Input
                id="admissionDate"
                type="date"
                value={profile.admissionDate || ''}
                onChange={(e) => updateProfile({ admissionDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="codeStatus">Code Status</Label>
            <Input
              id="codeStatus"
              value={profile.codeStatus || ''}
              onChange={(e) => updateProfile({ codeStatus: e.target.value })}
              placeholder="Full Code, DNR, DNR/DNI, etc."
            />
          </div>
        </CardContent>
      </Card>

      {/* Primary Diagnoses */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Primary Diagnoses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.primaryDiagnoses.length > 0 ? (
            <div className="space-y-2">
              {profile.primaryDiagnoses.map((dx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-muted/30 p-2 rounded-md"
                >
                  <span className="text-sm">{dx}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDiagnosis(i)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No diagnoses extracted</p>
          )}
          <div className="flex gap-2">
            <Input
              value={newDiagnosis}
              onChange={(e) => setNewDiagnosis(e.target.value)}
              placeholder="Add diagnosis..."
              onKeyDown={(e) => e.key === 'Enter' && addDiagnosis()}
            />
            <Button variant="outline" size="sm" onClick={addDiagnosis}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Allergies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.allergies.map((allergy, i) => (
                <Badge
                  key={i}
                  variant="destructive"
                  className="flex items-center gap-1"
                >
                  {allergy}
                  <button
                    onClick={() => removeAllergy(i)}
                    className="ml-1 hover:bg-red-700 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">NKDA (No Known Drug Allergies)</p>
          )}
          <div className="flex gap-2">
            <Input
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              placeholder="Add allergy..."
              onKeyDown={(e) => e.key === 'Enter' && addAllergy()}
            />
            <Button variant="outline" size="sm" onClick={addAllergy}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vitals, Labs, Medications - Reuse existing preview component */}
      <ParsedDataPreview
        vitals={profile.vitals}
        labs={profile.labs}
        medications={profile.medications}
      />
    </div>
  );
}

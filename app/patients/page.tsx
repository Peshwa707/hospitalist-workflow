'use client';

import { useState } from 'react';
import { PatientList } from '@/components/patients/patient-list';
import { PatientForm } from '@/components/patients/patient-form';
import { EmrImportModal } from '@/components/emr/emr-import-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Edit,
  ArrowLeft,
  Pill,
  Activity,
  FileText,
  AlertTriangle,
  FileInput,
} from 'lucide-react';
import type { Patient } from '@/lib/types';

type ViewMode = 'list' | 'detail' | 'form' | 'emr-import';

export default function PatientsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setViewMode('form');
  };

  const handleNewPatient = () => {
    setEditingPatient(undefined);
    setViewMode('form');
  };

  const handleSaved = (patient: Patient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleBack = () => {
    if (viewMode === 'form' && selectedPatient) {
      setViewMode('detail');
    } else if (viewMode === 'emr-import') {
      setViewMode('detail');
    } else {
      setViewMode('list');
      setSelectedPatient(null);
    }
    setEditingPatient(undefined);
  };

  const handleEmrImport = () => {
    setViewMode('emr-import');
  };

  const handleEmrImported = (updatedPatient: Patient) => {
    setSelectedPatient(updatedPatient);
    setViewMode('detail');
    setRefreshTrigger((prev) => prev + 1);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not recorded';
    return new Date(dateStr).toLocaleDateString();
  };

  const renderDetail = () => {
    if (!selectedPatient) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEmrImport}>
              <FileInput className="h-4 w-4 mr-2" />
              Import from EMR
            </Button>
            <Button onClick={() => handleEditPatient(selectedPatient)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Patient
            </Button>
          </div>
        </div>

        {/* Patient Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="bg-primary text-primary-foreground font-bold rounded-full w-16 h-16 flex items-center justify-center text-2xl">
                {selectedPatient.initials}
              </div>
              <div>
                <CardTitle className="text-2xl">{selectedPatient.initials}</CardTitle>
                <div className="flex gap-2 mt-2">
                  {selectedPatient.roomNumber && (
                    <Badge>Room {selectedPatient.roomNumber}</Badge>
                  )}
                  {selectedPatient.codeStatus && (
                    <Badge variant="secondary">{selectedPatient.codeStatus}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Admitted: {formatDate(selectedPatient.admissionDate)}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Diagnoses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Primary Diagnoses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPatient.primaryDiagnoses.length > 0 ? (
                <ul className="space-y-1">
                  {selectedPatient.primaryDiagnoses.map((dx, i) => (
                    <li key={i} className="text-sm">• {dx}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No diagnoses recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Allergies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Allergies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPatient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.allergies.map((allergy, i) => (
                    <Badge key={i} variant="destructive">{allergy}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">NKDA</p>
              )}
            </CardContent>
          </Card>

          {/* Medications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Pill className="h-5 w-5" />
                Active Medications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPatient.activeMedications.length > 0 ? (
                <div className="space-y-2">
                  {selectedPatient.activeMedications.map((med, i) => (
                    <div key={i} className="text-sm border-b pb-2 last:border-0">
                      <div className="font-medium">{med.name}</div>
                      <div className="text-muted-foreground">
                        {med.dose} {med.route} {med.frequency}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No medications recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Vitals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Recent Vitals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPatient.recentVitals ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedPatient.recentVitals.temperature && (
                    <div>
                      <span className="text-muted-foreground">Temp:</span>{' '}
                      {selectedPatient.recentVitals.temperature}°F
                    </div>
                  )}
                  {selectedPatient.recentVitals.heartRate && (
                    <div>
                      <span className="text-muted-foreground">HR:</span>{' '}
                      {selectedPatient.recentVitals.heartRate}
                    </div>
                  )}
                  {selectedPatient.recentVitals.bloodPressure && (
                    <div>
                      <span className="text-muted-foreground">BP:</span>{' '}
                      {selectedPatient.recentVitals.bloodPressure}
                    </div>
                  )}
                  {selectedPatient.recentVitals.respiratoryRate && (
                    <div>
                      <span className="text-muted-foreground">RR:</span>{' '}
                      {selectedPatient.recentVitals.respiratoryRate}
                    </div>
                  )}
                  {selectedPatient.recentVitals.oxygenSaturation && (
                    <div>
                      <span className="text-muted-foreground">O2:</span>{' '}
                      {selectedPatient.recentVitals.oxygenSaturation}%
                      {selectedPatient.recentVitals.oxygenDevice &&
                        ` (${selectedPatient.recentVitals.oxygenDevice})`}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No vitals recorded</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Labs */}
        {selectedPatient.recentLabs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Labs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-2">
                {selectedPatient.recentLabs.map((lab, i) => (
                  <div key={i} className="text-sm border rounded p-2">
                    <div className="font-medium">{lab.name}</div>
                    <div className={`${lab.flag === 'critical' ? 'text-red-600 font-bold' : lab.flag ? 'text-orange-600' : ''}`}>
                      {lab.value} {lab.unit}
                      {lab.flag && <span className="ml-1 uppercase text-xs">({lab.flag})</span>}
                    </div>
                    {lab.referenceRange && (
                      <div className="text-xs text-muted-foreground">Ref: {lab.referenceRange}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {selectedPatient.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{selectedPatient.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8" />
          Patient Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Create and manage patient profiles for persistent record tracking
        </p>
      </div>

      {viewMode === 'list' && (
        <PatientList
          onSelectPatient={handleSelectPatient}
          onEditPatient={handleEditPatient}
          onNewPatient={handleNewPatient}
          selectedPatientId={selectedPatient?.id}
          refreshTrigger={refreshTrigger}
        />
      )}

      {viewMode === 'detail' && renderDetail()}

      {viewMode === 'form' && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <PatientForm
            patient={editingPatient}
            onSaved={handleSaved}
            onCancel={handleBack}
          />
        </div>
      )}

      {viewMode === 'emr-import' && selectedPatient && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patient
          </Button>
          <EmrImportModal
            patient={selectedPatient}
            onImported={handleEmrImported}
            onCancel={handleBack}
          />
        </div>
      )}
    </div>
  );
}

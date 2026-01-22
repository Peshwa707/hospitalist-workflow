'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Search,
  Edit,
  Trash2,
  UserPlus,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileInput,
} from 'lucide-react';
import type { Patient } from '@/lib/types';

interface PatientListProps {
  onSelectPatient: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onNewPatient: () => void;
  onCreateFromEmr: () => void;
  selectedPatientId?: number;
  refreshTrigger?: number;
}

export function PatientList({
  onSelectPatient,
  onEditPatient,
  onNewPatient,
  onCreateFromEmr,
  selectedPatientId,
  refreshTrigger,
}: PatientListProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const url = searchTerm
        ? `/api/patients?search=${encodeURIComponent(searchTerm)}`
        : '/api/patients';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const data = await response.json();
      setPatients(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchTerm, refreshTrigger]);

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete patient');
      }

      setPatients((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Patients
            </CardTitle>
            <CardDescription>
              {patients.length} patient{patients.length !== 1 ? 's' : ''} in system
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCreateFromEmr}>
              <FileInput className="h-4 w-4 mr-2" />
              Import from EMR
            </Button>
            <Button onClick={onNewPatient}>
              <UserPlus className="h-4 w-4 mr-2" />
              New Patient
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by initials, room, or diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No patients match your search' : 'No patients yet. Add your first patient!'}
          </div>
        ) : (
          <div className="space-y-2">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className={`
                  border rounded-lg p-3 cursor-pointer transition-colors
                  hover:bg-muted/50
                  ${selectedPatientId === patient.id ? 'border-primary bg-primary/5' : ''}
                `}
                onClick={() => onSelectPatient(patient)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary font-bold rounded-full w-10 h-10 flex items-center justify-center">
                      {patient.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{patient.initials}</span>
                        {patient.roomNumber && (
                          <Badge variant="outline">Room {patient.roomNumber}</Badge>
                        )}
                        {patient.codeStatus && (
                          <Badge variant="secondary">{patient.codeStatus}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {patient.primaryDiagnoses.length > 0
                          ? patient.primaryDiagnoses.slice(0, 2).join(', ')
                          : 'No diagnoses'}
                        {patient.primaryDiagnoses.length > 2 &&
                          ` +${patient.primaryDiagnoses.length - 2} more`}
                      </div>
                      {patient.admissionDate && (
                        <div className="text-xs text-muted-foreground">
                          Admitted: {formatDate(patient.admissionDate)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {deleteConfirm === patient.id ? (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(patient.id!);
                          }}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPatient(patient);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(patient.id!);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

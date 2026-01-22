'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  User,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import type { Patient } from '@/lib/types';

interface PatientSelectorProps {
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient | null) => void;
  onCreateNew?: () => void;
}

export function PatientSelector({
  selectedPatient,
  onSelectPatient,
  onCreateNew,
}: PatientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
  }, [isOpen]);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/patients');
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      setPatients(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading patients');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) =>
    searchTerm
      ? p.initials.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.primaryDiagnoses.some((d) =>
          d.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : true
  );

  const handleSelect = (patient: Patient) => {
    onSelectPatient(patient);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPatient(null);
  };

  return (
    <div className="space-y-2">
      <Label>Select Patient (Optional)</Label>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedPatient ? (
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs">
                {selectedPatient.initials}
              </div>
              <span>
                {selectedPatient.initials}
                {selectedPatient.roomNumber && ` - Room ${selectedPatient.roomNumber}`}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select a patient to pre-fill...</span>
          )}
          <div className="flex items-center gap-1">
            {selectedPatient && (
              <X
                className="h-4 w-4 hover:text-destructive"
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-4 w-4" />
          </div>
        </Button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b">
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>

            {/* Patients list */}
            <div className="overflow-y-auto max-h-48">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-sm text-red-600 p-3">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {searchTerm ? 'No matches found' : 'No patients yet'}
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                    onClick={() => handleSelect(patient)}
                  >
                    <div className="bg-primary/10 text-primary font-bold rounded-full w-8 h-8 flex items-center justify-center text-xs">
                      {patient.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{patient.initials}</span>
                        {patient.roomNumber && (
                          <span className="text-xs text-muted-foreground">
                            Room {patient.roomNumber}
                          </span>
                        )}
                      </div>
                      {patient.primaryDiagnoses.length > 0 && (
                        <div className="text-xs text-muted-foreground truncate">
                          {patient.primaryDiagnoses[0]}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Create new option */}
            {onCreateNew && (
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setIsOpen(false);
                    onCreateNew();
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create New Patient
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Show selected patient info */}
      {selectedPatient && selectedPatient.primaryDiagnoses.length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          <strong>Diagnoses:</strong>{' '}
          {selectedPatient.primaryDiagnoses.join(', ')}
        </div>
      )}
    </div>
  );
}

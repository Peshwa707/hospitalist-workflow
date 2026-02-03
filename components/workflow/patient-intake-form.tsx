'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserPlus,
  Users,
  Loader2,
  ChevronDown,
  AlertCircle,
  X,
  Search,
} from 'lucide-react';
import type { Patient, ParsedPatientProfile } from '@/lib/types';

interface PatientIntakeFormProps {
  onPatientReady: (patient: Patient, isNew: boolean) => void;
  onParsedProfile?: (profile: ParsedPatientProfile) => void;
  isProcessing?: boolean;
}

export function PatientIntakeForm({
  onPatientReady,
  onParsedProfile,
  isProcessing = false,
}: PatientIntakeFormProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');

  // New patient state
  const [emrText, setEmrText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedProfile, setParsedProfile] = useState<ParsedPatientProfile | null>(null);

  // Existing patient state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load patients when switching to existing tab
  useEffect(() => {
    if (activeTab === 'existing') {
      fetchPatients();
    }
  }, [activeTab]);

  const fetchPatients = async () => {
    setIsLoadingPatients(true);
    try {
      const response = await fetch('/api/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch {
      console.error('Failed to fetch patients');
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const filteredPatients = patients.filter((p) =>
    searchTerm
      ? p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.primaryDiagnoses.some((d) =>
          d.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : true
  );

  const handleParseEmr = async () => {
    if (!emrText.trim()) return;

    setIsParsing(true);
    setParseError(null);
    setParsedProfile(null);

    try {
      const response = await fetch('/api/emr/parse-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emrText }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse EMR data');
      }

      const profile: ParsedPatientProfile = await response.json();
      setParsedProfile(profile);
      onParsedProfile?.(profile);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Parse failed');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCreateFromProfile = async () => {
    if (!parsedProfile) return;

    setParseError(null);

    try {
      // Create new patient from parsed profile
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mrn: parsedProfile.mrn || `MRN-${Date.now()}`,
          roomNumber: parsedProfile.roomNumber,
          admissionDate: parsedProfile.admissionDate,
          primaryDiagnoses: parsedProfile.primaryDiagnoses || [],
          activeMedications: parsedProfile.medications || [],
          allergies: parsedProfile.allergies || [],
          codeStatus: parsedProfile.codeStatus,
          recentVitals: parsedProfile.vitals,
          recentLabs: parsedProfile.labs || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient');
      }

      const newPatient = await response.json();
      onPatientReady(newPatient, true);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to create patient');
    }
  };

  const handleSelectExisting = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDropdownOpen(false);
    onPatientReady(patient, false);
  };

  const handleClearSelection = () => {
    setSelectedPatient(null);
    setSearchTerm('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Patient Intake</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'existing')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              New Patient (Paste EMR)
            </TabsTrigger>
            <TabsTrigger value="existing" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Existing Patient
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emr-text">Paste EMR/Admission Data</Label>
              <Textarea
                id="emr-text"
                value={emrText}
                onChange={(e) => setEmrText(e.target.value)}
                placeholder="Paste admission note, H&P, progress note, or any EMR data here..."
                rows={8}
                className="font-mono text-sm"
                disabled={isProcessing}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{emrText.length.toLocaleString()} characters</span>
                {parsedProfile && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Parsed: {parsedProfile.confidence} confidence
                  </Badge>
                )}
              </div>
            </div>

            {parseError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {parseError}
              </div>
            )}

            {parsedProfile && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Parsed Profile Preview</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">MRN:</span> {parsedProfile.mrn || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Room:</span> {parsedProfile.roomNumber || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Admission:</span> {parsedProfile.admissionDate || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Code Status:</span> {parsedProfile.codeStatus || 'N/A'}</div>
                </div>
                {parsedProfile.primaryDiagnoses.length > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Diagnoses:</span>{' '}
                    {parsedProfile.primaryDiagnoses.join(', ')}
                  </div>
                )}
                {parsedProfile.allergies.length > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Allergies:</span>{' '}
                    {parsedProfile.allergies.join(', ')}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!parsedProfile ? (
                <Button
                  onClick={handleParseEmr}
                  disabled={!emrText.trim() || isParsing || isProcessing}
                  className="flex-1"
                >
                  {isParsing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Parse EMR Data
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleCreateFromProfile}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Create Patient & Continue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setParsedProfile(null);
                      setEmrText('');
                    }}
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Patient</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isProcessing}
                >
                  {selectedPatient ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedPatient.mrn}</span>
                      {selectedPatient.roomNumber && (
                        <span className="text-muted-foreground">
                          Room {selectedPatient.roomNumber}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select a patient...</span>
                  )}
                  <div className="flex items-center gap-1">
                    {selectedPatient && (
                      <X
                        className="h-4 w-4 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearSelection();
                        }}
                      />
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </Button>

                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-hidden">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search patients..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      {isLoadingPatients ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3"
                            onClick={() => handleSelectExisting(patient)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{patient.mrn}</span>
                                {patient.roomNumber && (
                                  <Badge variant="outline" className="text-xs">
                                    Room {patient.roomNumber}
                                  </Badge>
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
                  </div>
                )}
              </div>
            </div>

            {selectedPatient && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Patient Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">MRN:</span> {selectedPatient.mrn}</div>
                  <div><span className="text-muted-foreground">Room:</span> {selectedPatient.roomNumber || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Admission:</span> {selectedPatient.admissionDate || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Code Status:</span> {selectedPatient.codeStatus || 'N/A'}</div>
                </div>
                {selectedPatient.primaryDiagnoses.length > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Diagnoses:</span>{' '}
                    {selectedPatient.primaryDiagnoses.join(', ')}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

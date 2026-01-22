'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Loader2,
  RefreshCw,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Clock,
} from 'lucide-react';
import { PatientCard } from './patient-card';
import type { PatientWithTaskCounts } from '@/lib/db';

interface RoundingDashboardProps {
  onPatientSelect?: (patient: PatientWithTaskCounts) => void;
}

export function RoundingDashboard({ onPatientSelect }: RoundingDashboardProps) {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientWithTaskCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPatientIndex, setCurrentPatientIndex] = useState(0);
  const [isRoundingMode, setIsRoundingMode] = useState(false);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rounding');
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      setPatients(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filteredPatients = patients.filter((p) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.initials.toLowerCase().includes(search) ||
      p.roomNumber?.toLowerCase().includes(search) ||
      p.primaryDiagnoses.some((d) => d.toLowerCase().includes(search))
    );
  });

  const handlePatientClick = (patient: PatientWithTaskCounts) => {
    if (onPatientSelect) {
      onPatientSelect(patient);
    } else {
      router.push(`/patients?id=${patient.id}`);
    }
  };

  const startRounding = () => {
    setIsRoundingMode(true);
    setCurrentPatientIndex(0);
    if (filteredPatients.length > 0) {
      handlePatientClick(filteredPatients[0]);
    }
  };

  const nextPatient = () => {
    if (currentPatientIndex < filteredPatients.length - 1) {
      const newIndex = currentPatientIndex + 1;
      setCurrentPatientIndex(newIndex);
      handlePatientClick(filteredPatients[newIndex]);
    }
  };

  const prevPatient = () => {
    if (currentPatientIndex > 0) {
      const newIndex = currentPatientIndex - 1;
      setCurrentPatientIndex(newIndex);
      handlePatientClick(filteredPatients[newIndex]);
    }
  };

  const exitRounding = () => {
    setIsRoundingMode(false);
    setCurrentPatientIndex(0);
  };

  // Summary stats
  const stats = {
    total: patients.length,
    withStatTasks: patients.filter((p) => p.statTaskCount > 0).length,
    withUrgentTasks: patients.filter((p) => p.urgentTaskCount > 0).length,
    totalPendingTasks: patients.reduce((sum, p) => sum + p.pendingTaskCount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchPatients} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Rounding Dashboard
              </CardTitle>
              <CardDescription>
                {stats.total} patients • {stats.totalPendingTasks} pending tasks
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPatients}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {!isRoundingMode ? (
                <Button onClick={startRounding} disabled={patients.length === 0}>
                  Start Rounding
                </Button>
              ) : (
                <Button variant="outline" onClick={exitRounding}>
                  Exit Rounding
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Quick stats */}
          <div className="flex gap-4 flex-wrap">
            {stats.withStatTasks > 0 && (
              <Badge variant="destructive" className="text-sm">
                {stats.withStatTasks} with STAT tasks
              </Badge>
            )}
            {stats.withUrgentTasks > 0 && (
              <Badge className="text-sm bg-orange-500">
                {stats.withUrgentTasks} with urgent tasks
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rounding navigation bar */}
      {isRoundingMode && filteredPatients.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={prevPatient}
                disabled={currentPatientIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="text-center">
                <p className="font-medium">
                  Patient {currentPatientIndex + 1} of {filteredPatients.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  {filteredPatients[currentPatientIndex]?.initials} - Room {filteredPatients[currentPatientIndex]?.roomNumber || 'N/A'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={nextPatient}
                disabled={currentPatientIndex === filteredPatients.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and view controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by initials, room, or diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Patient grid/list */}
      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchTerm ? 'No patients match your search' : 'No patients yet. Add patients from the Patients page.'}
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
              : 'space-y-3'
          )}
        >
          {filteredPatients.map((patient, index) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              isSelected={isRoundingMode && index === currentPatientIndex}
              onClick={() => {
                if (isRoundingMode) {
                  setCurrentPatientIndex(index);
                }
                handlePatientClick(patient);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

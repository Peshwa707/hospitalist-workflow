'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  Home,
  Building2,
  ClipboardList,
  Pill,
  AlertTriangle,
  Calendar,
  Stethoscope,
  GraduationCap,
} from 'lucide-react';
import type { DischargeDestinationOutput, DischargeDestination } from '@/lib/types';

interface DischargeDestinationResultsProps {
  result: DischargeDestinationOutput;
}

const destinationLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  home: { label: 'Home', icon: <Home className="h-4 w-4" /> },
  home_health: { label: 'Home with Health Services', icon: <Home className="h-4 w-4" /> },
  snf: { label: 'Skilled Nursing Facility', icon: <Building2 className="h-4 w-4" /> },
  ltac: { label: 'Long-Term Acute Care', icon: <Building2 className="h-4 w-4" /> },
  irf: { label: 'Inpatient Rehab Facility', icon: <Building2 className="h-4 w-4" /> },
  hospice: { label: 'Hospice', icon: <Home className="h-4 w-4" /> },
  ama: { label: 'Against Medical Advice', icon: <AlertTriangle className="h-4 w-4" /> },
};

const likelihoodColors = {
  most_likely: 'bg-green-100 text-green-800 border-green-300',
  possible: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  unlikely: 'bg-gray-100 text-gray-800 border-gray-300',
};

const priorityColors = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

function DestinationCard({ destination, isRecommended }: { destination: DischargeDestination; isRecommended?: boolean }) {
  const info = destinationLabels[destination.destination] || { label: destination.label, icon: null };

  return (
    <Card className={isRecommended ? 'border-primary border-2' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {info.icon}
          {destination.label}
          <Badge className={likelihoodColors[destination.likelihood]}>
            {destination.likelihood.replace('_', ' ')}
          </Badge>
          {isRecommended && <Badge variant="default">Recommended</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{destination.reasoning}</p>

        {destination.requirements.length > 0 && (
          <div>
            <p className="text-sm font-medium text-green-700">Requirements:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {destination.requirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>
        )}

        {destination.barriers.length > 0 && (
          <div>
            <p className="text-sm font-medium text-red-700">Barriers:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              {destination.barriers.map((barrier, idx) => (
                <li key={idx}>{barrier}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DischargeDestinationResults({ result }: DischargeDestinationResultsProps) {
  return (
    <div className="space-y-4">
      {/* Estimated Discharge Date */}
      {result.estimatedDischargeDate && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Estimated Discharge:</span>
              <span>{result.estimatedDischargeDate}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Destination */}
      <DestinationCard destination={result.recommendedDestination} isRecommended />

      {/* Alternative Destinations */}
      {result.alternativeDestinations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">Alternative Options</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {result.alternativeDestinations.map((dest, idx) => (
              <DestinationCard key={idx} destination={dest} />
            ))}
          </div>
        </div>
      )}

      {/* Discharge Criteria */}
      {result.dischargeCriteria.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Discharge Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.dischargeCriteria.map((criterion, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  {criterion.met ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={criterion.met ? 'text-muted-foreground' : 'font-medium'}>
                      {criterion.criterion}
                    </p>
                    {criterion.notes && (
                      <p className="text-sm text-muted-foreground">{criterion.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      {result.taskList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Discharge Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.taskList.map((task, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 border rounded">
                  <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{task.task}</p>
                    <p className="text-xs text-muted-foreground">
                      Owner: {task.owner}
                      {task.dueBy && ` • Due: ${task.dueBy}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Follow-up & Medications */}
      <div className="grid md:grid-cols-2 gap-4">
        {result.followUpNeeds.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Follow-up Needs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.followUpNeeds.map((f, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="font-medium">{f.specialty}</p>
                    <p className="text-muted-foreground">
                      {f.timeframe} - {f.reason}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result.medicationReconciliation.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Medication Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.medicationReconciliation.map((med, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Badge variant={med.action === 'discontinue' ? 'destructive' : 'outline'}>
                      {med.action}
                    </Badge>
                    <span>{med.medication}</span>
                    {med.notes && <span className="text-muted-foreground">({med.notes})</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Patient Education & Red Flags */}
      <div className="grid md:grid-cols-2 gap-4">
        {result.patientEducation.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Patient Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm space-y-1">
                {result.patientEducation.map((topic, idx) => (
                  <li key={idx}>{topic}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.redFlags.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Red Flags to Watch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm space-y-1 text-red-700">
                {result.redFlags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Equipment Needs */}
      {result.equipmentNeeds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">DME / Equipment Needs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.equipmentNeeds.map((item, idx) => (
                <Badge key={idx} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

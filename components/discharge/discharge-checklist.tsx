'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Pill,
  Calendar,
  Stethoscope,
  Users,
  ClipboardList,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  FileText,
} from 'lucide-react';
import type { PatientTask } from '@/lib/types';

interface DischargeChecklistProps {
  patientId: number;
  patientMrn: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  medication: { label: 'Medications', icon: <Pill className="h-4 w-4" />, color: 'blue' },
  follow_up: { label: 'Follow-up', icon: <Calendar className="h-4 w-4" />, color: 'green' },
  workup: { label: 'Workup', icon: <Stethoscope className="h-4 w-4" />, color: 'purple' },
  consult: { label: 'Consults', icon: <Users className="h-4 w-4" />, color: 'amber' },
  discharge: { label: 'Discharge Tasks', icon: <ClipboardList className="h-4 w-4" />, color: 'indigo' },
  other: { label: 'Other', icon: <MoreHorizontal className="h-4 w-4" />, color: 'gray' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  stat: { label: 'STAT', color: 'red' },
  urgent: { label: 'Urgent', color: 'orange' },
  routine: { label: 'Routine', color: 'gray' },
};

export function DischargeChecklist({ patientId, patientMrn }: DischargeChecklistProps) {
  const [tasks, setTasks] = useState<PatientTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<{
    summary: string;
    created: number;
    skipped: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    setExtractionResult(null);

    try {
      const res = await fetch(`/api/patients/${patientId}/discharge-items`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Extraction failed');
      }

      const result = await res.json();
      setExtractionResult({
        summary: result.summary,
        created: result.created,
        skipped: result.skipped,
      });

      // Refresh tasks
      await fetchTasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleToggleStatus = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus as PatientTask['status'] } : t
      )
    );

    try {
      const res = await fetch(`/api/patients/${patientId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update task');
    } catch {
      // Revert on error
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      const res = await fetch(`/api/patients/${patientId}/tasks?taskId=${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete task');
    } catch {
      // Revert on error
      fetchTasks();
    }
  };

  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, task) => {
    const cat = task.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {} as Record<string, PatientTask[]>);

  // Calculate completion stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Check if ready for discharge (all tasks complete)
  const isReadyForDischarge = totalTasks > 0 && completedTasks === totalTasks;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading checklist...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Discharge Checklist
              <Badge variant="outline" className="ml-2">
                {completedTasks}/{totalTasks}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTasks}
                disabled={isExtracting}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleExtract}
                disabled={isExtracting}
                size="sm"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract from Notes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Discharge readiness</span>
              <span className={isReadyForDischarge ? 'text-green-600 font-medium' : ''}>
                {completionPercent}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isReadyForDischarge ? 'bg-green-500' : 'bg-primary'
                }`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            {isReadyForDischarge && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Ready for discharge - all items complete!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Extraction result */}
      {extractionResult && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {extractionResult.summary}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {extractionResult.created} new items added
                  {extractionResult.skipped > 0 && `, ${extractionResult.skipped} duplicates skipped`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {totalTasks === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">No discharge items yet</p>
                <p className="text-sm text-muted-foreground">
                  Click "Extract from Notes" to auto-populate the checklist from clinical notes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks by category */}
      {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
        const categoryTasks = tasksByCategory[category] || [];
        if (categoryTasks.length === 0) return null;

        const completedInCategory = categoryTasks.filter(t => t.status === 'completed').length;

        return (
          <Card key={category}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded bg-${config.color}-100 text-${config.color}-600`}>
                    {config.icon}
                  </div>
                  <span className="font-medium">{config.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {completedInCategory}/{categoryTasks.length}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="space-y-2">
                {categoryTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 group ${
                      task.status === 'completed' ? 'opacity-60' : ''
                    }`}
                  >
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => handleToggleStatus(task.id, task.status)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.status === 'completed' ? 'line-through' : ''}`}>
                        {task.task}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            task.priority === 'stat'
                              ? 'border-red-300 text-red-600'
                              : task.priority === 'urgent'
                              ? 'border-orange-300 text-orange-600'
                              : 'border-gray-300 text-gray-600'
                          }`}
                        >
                          {PRIORITY_CONFIG[task.priority].label}
                        </Badge>
                        {task.source === 'ai_analysis' && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                        {task.status === 'completed' && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

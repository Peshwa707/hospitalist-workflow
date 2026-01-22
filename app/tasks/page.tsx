'use client';

import { useState, useEffect, useCallback } from 'react';
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
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  ClipboardList,
  Stethoscope,
  Pill,
  UserCheck,
  Filter,
} from 'lucide-react';
import type { TaskWithPatient } from '@/lib/db';
import type { PatientTask } from '@/lib/types';

const categoryIcons: Record<PatientTask['category'], React.ReactNode> = {
  workup: <ClipboardList className="h-4 w-4" />,
  consult: <Stethoscope className="h-4 w-4" />,
  medication: <Pill className="h-4 w-4" />,
  discharge: <UserCheck className="h-4 w-4" />,
  follow_up: <Clock className="h-4 w-4" />,
  other: <Circle className="h-4 w-4" />,
};

const priorityColors: Record<PatientTask['priority'], string> = {
  stat: 'bg-red-100 text-red-800 border-red-200',
  urgent: 'bg-orange-100 text-orange-800 border-orange-200',
  routine: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusIcons: Record<PatientTask['status'], React.ReactNode> = {
  pending: <Circle className="h-5 w-5 text-gray-400" />,
  in_progress: <Clock className="h-5 w-5 text-blue-500" />,
  completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  cancelled: <AlertCircle className="h-5 w-5 text-gray-300" />,
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [showCompleted, setShowCompleted] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<PatientTask['priority'][]>([]);
  const [categoryFilter, setCategoryFilter] = useState<PatientTask['category'][]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (!showCompleted) {
        params.set('status', 'pending,in_progress');
      }
      if (priorityFilter.length > 0) {
        params.set('priority', priorityFilter.join(','));
      }
      if (categoryFilter.length > 0) {
        params.set('category', categoryFilter.join(','));
      }

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [showCompleted, priorityFilter, categoryFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateTaskStatus = async (taskId: number, status: PatientTask['status']) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status }),
      });
      if (response.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const cycleStatus = (currentStatus: PatientTask['status']): PatientTask['status'] => {
    const statusOrder: PatientTask['status'][] = ['pending', 'in_progress', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    return statusOrder[(currentIndex + 1) % statusOrder.length];
  };

  const filteredTasks = tasks.filter((task) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      task.task.toLowerCase().includes(search) ||
      task.patientMrn.toLowerCase().includes(search) ||
      task.patientRoom?.toLowerCase().includes(search)
    );
  });

  // Group tasks by patient
  const groupedByPatient = filteredTasks.reduce((acc, task) => {
    const key = task.patientMrn;
    if (!acc[key]) {
      acc[key] = {
        patientMrn: task.patientMrn,
        patientRoom: task.patientRoom,
        tasks: [],
      };
    }
    acc[key].tasks.push(task);
    return acc;
  }, {} as Record<string, { patientMrn: string; patientRoom: string | null; tasks: TaskWithPatient[] }>);

  const stats = {
    total: tasks.length,
    stat: tasks.filter((t) => t.priority === 'stat' && t.status !== 'completed').length,
    urgent: tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                All Tasks
              </CardTitle>
              <CardDescription>
                {stats.total} total tasks across all patients
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTasks}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Quick stats */}
          <div className="flex gap-4 flex-wrap">
            {stats.stat > 0 && (
              <Badge variant="destructive" className="text-sm">
                {stats.stat} STAT
              </Badge>
            )}
            {stats.urgent > 0 && (
              <Badge className="text-sm bg-orange-500">
                {stats.urgent} Urgent
              </Badge>
            )}
            <Badge variant="secondary" className="text-sm">
              {stats.pending} Pending
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search and filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks or patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showCompleted ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowCompleted(!showCompleted)}
        >
          {showCompleted ? 'Hide Completed' : 'Show Completed'}
        </Button>
        <div className="flex gap-1">
          {(['stat', 'urgent', 'routine'] as const).map((priority) => (
            <Button
              key={priority}
              variant={priorityFilter.includes(priority) ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setPriorityFilter((prev) =>
                  prev.includes(priority)
                    ? prev.filter((p) => p !== priority)
                    : [...prev, priority]
                );
              }}
              className={cn(
                'capitalize',
                priorityFilter.includes(priority) && priorityColors[priority]
              )}
            >
              {priority}
            </Button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-red-600">{error}</p>
              <Button onClick={fetchTasks} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks grouped by patient */}
      {Object.keys(groupedByPatient).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchTerm ? 'No tasks match your search' : 'No pending tasks. Great job!'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.values(groupedByPatient).map((group) => (
            <Card key={group.patientMrn}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm">
                    {group.patientMrn}
                  </div>
                  <span className="font-medium">{group.patientMrn}</span>
                  {group.patientRoom && (
                    <Badge variant="outline" className="text-xs">
                      Room {group.patientRoom}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {group.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 group',
                        task.status === 'completed' && 'opacity-60'
                      )}
                    >
                      <button
                        onClick={() => task.id && updateTaskStatus(task.id, cycleStatus(task.status))}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {statusIcons[task.status]}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'text-sm font-medium',
                              task.status === 'completed' && 'line-through'
                            )}
                          >
                            {task.task}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn('text-xs', priorityColors[task.priority])}
                          >
                            {task.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {categoryIcons[task.category]}
                          <span className="capitalize">{task.category.replace('_', ' ')}</span>
                          {task.source === 'ai_analysis' && (
                            <Badge variant="secondary" className="text-xs">
                              AI
                            </Badge>
                          )}
                        </div>
                        {task.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {task.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Stethoscope,
  Pill,
  ClipboardList,
  UserCheck,
} from 'lucide-react';
import type { PatientTask } from '@/lib/types';

interface TaskChecklistProps {
  patientId: number;
  onTasksChange?: (tasks: PatientTask[]) => void;
}

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

// Calculate if task is overdue or due soon
const getTaskUrgency = (task: PatientTask): 'overdue' | 'due-soon' | 'normal' => {
  if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return 'normal';
  const now = new Date();
  const due = new Date(task.dueDate);
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDue < 0) return 'overdue';
  if (hoursUntilDue < 4) return 'due-soon';
  return 'normal';
};

const statusIcons: Record<PatientTask['status'], React.ReactNode> = {
  pending: <Circle className="h-5 w-5 text-gray-400" />,
  in_progress: <Clock className="h-5 w-5 text-blue-500" />,
  completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  cancelled: <AlertCircle className="h-5 w-5 text-gray-300" />,
};

export function TaskChecklist({ patientId, onTasksChange }: TaskChecklistProps) {
  const [tasks, setTasks] = useState<PatientTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskCategory, setNewTaskCategory] = useState<PatientTask['category']>('other');
  const [newTaskPriority, setNewTaskPriority] = useState<PatientTask['priority']>('routine');
  const [newTaskDue, setNewTaskDue] = useState<string>('');

  useEffect(() => {
    fetchTasks();
  }, [patientId]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
        onTasksChange?.(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: number, status: PatientTask['status']) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status }),
      });
      if (response.ok) {
        const updatedTasks = await response.json();
        setTasks(updatedTasks);
        onTasksChange?.(updatedTasks);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;

    // Calculate due date from selection
    let dueDate: string | undefined;
    if (newTaskDue) {
      const now = new Date();
      switch (newTaskDue) {
        case '1h':
          dueDate = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
          break;
        case '4h':
          dueDate = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
          break;
        case 'today':
          dueDate = new Date(now.setHours(17, 0, 0, 0)).toISOString();
          break;
        case 'tomorrow':
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          dueDate = tomorrow.toISOString();
          break;
      }
    }

    try {
      const response = await fetch(`/api/patients/${patientId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: newTask,
          category: newTaskCategory,
          priority: newTaskPriority,
          dueDate,
        }),
      });
      if (response.ok) {
        setNewTask('');
        setShowAddForm(false);
        setNewTaskCategory('other');
        setNewTaskPriority('routine');
        setNewTaskDue('');
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/tasks?taskId=${taskId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const cycleStatus = (currentStatus: PatientTask['status']): PatientTask['status'] => {
    const statusOrder: PatientTask['status'][] = ['pending', 'in_progress', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    return statusOrder[(currentIndex + 1) % statusOrder.length];
  };

  const groupedTasks = tasks.reduce(
    (acc, task) => {
      const key = task.status === 'completed' || task.status === 'cancelled' ? 'done' : 'active';
      acc[key].push(task);
      return acc;
    },
    { active: [] as PatientTask[], done: [] as PatientTask[] }
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading tasks...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Task Checklist</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <Input
              placeholder="Enter task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
            />
            <div className="flex gap-2 flex-wrap">
              <select
                className="text-sm border rounded px-2 py-1"
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value as PatientTask['category'])}
              >
                <option value="workup">Workup</option>
                <option value="consult">Consult</option>
                <option value="medication">Medication</option>
                <option value="discharge">Discharge</option>
                <option value="follow_up">Follow-up</option>
                <option value="other">Other</option>
              </select>
              <select
                className="text-sm border rounded px-2 py-1"
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as PatientTask['priority'])}
              >
                <option value="stat">STAT</option>
                <option value="urgent">Urgent</option>
                <option value="routine">Routine</option>
              </select>
              <select
                className="text-sm border rounded px-2 py-1"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
              >
                <option value="">No reminder</option>
                <option value="1h">Due in 1 hour</option>
                <option value="4h">Due in 4 hours</option>
                <option value="today">Due end of day</option>
                <option value="tomorrow">Due tomorrow AM</option>
              </select>
              <Button size="sm" onClick={addTask}>
                Add
              </Button>
            </div>
          </div>
        )}

        {groupedTasks.active.length === 0 && groupedTasks.done.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4">
            No tasks yet. Add tasks manually or run AI analysis to generate tasks.
          </p>
        )}

        {groupedTasks.active.length > 0 && (
          <div className="space-y-2">
            {groupedTasks.active.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 group",
                  getTaskUrgency(task) === 'overdue' && 'bg-red-50 border border-red-200',
                  getTaskUrgency(task) === 'due-soon' && 'bg-orange-50 border border-orange-200'
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
                    <span className="text-sm font-medium">{task.task}</span>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', priorityColors[task.priority])}
                    >
                      {task.priority.toUpperCase()}
                    </Badge>
                    {getTaskUrgency(task) === 'overdue' && (
                      <Badge variant="destructive" className="text-xs">
                        OVERDUE
                      </Badge>
                    )}
                    {getTaskUrgency(task) === 'due-soon' && (
                      <Badge className="text-xs bg-orange-500">
                        DUE SOON
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {categoryIcons[task.category]}
                    <span className="capitalize">{task.category.replace('_', ' ')}</span>
                    {task.source === 'ai_analysis' && (
                      <Badge variant="secondary" className="text-xs">
                        AI
                      </Badge>
                    )}
                    {task.dueDate && (
                      <span className={cn(
                        getTaskUrgency(task) === 'overdue' && 'text-red-600 font-medium',
                        getTaskUrgency(task) === 'due-soon' && 'text-orange-600 font-medium'
                      )}>
                        Due: {new Date(task.dueDate).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    )}
                  </div>
                  {task.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {task.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => task.id && deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {groupedTasks.done.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground font-medium">
              Completed ({groupedTasks.done.length})
            </p>
            {groupedTasks.done.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-2 rounded-lg opacity-60 group"
              >
                <button
                  onClick={() => task.id && updateTaskStatus(task.id, 'pending')}
                  className="mt-0.5 flex-shrink-0"
                >
                  {statusIcons[task.status]}
                </button>
                <div className="flex-1 min-w-0">
                  <span className="text-sm line-through">{task.task}</span>
                </div>
                <button
                  onClick={() => task.id && deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

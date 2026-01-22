import { NextRequest, NextResponse } from 'next/server';
import { getAllTasks, updateTaskStatus } from '@/lib/db';
import type { PatientTask } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status')?.split(',') as PatientTask['status'][] | undefined;
    const priority = searchParams.get('priority')?.split(',') as PatientTask['priority'][] | undefined;
    const category = searchParams.get('category')?.split(',') as PatientTask['category'][] | undefined;

    const tasks = getAllTasks({
      status: status?.filter(Boolean),
      priority: priority?.filter(Boolean),
      category: category?.filter(Boolean),
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, status } = body;

    if (!taskId || !status) {
      return NextResponse.json(
        { error: 'taskId and status are required' },
        { status: 400 }
      );
    }

    const success = updateTaskStatus(taskId, status);

    if (!success) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

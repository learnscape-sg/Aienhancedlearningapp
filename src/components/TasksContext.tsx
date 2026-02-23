import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { listTeacherTasks } from '../lib/backendApi';

export interface TaskItem {
  taskId: string;
  subject?: string;
  grade?: string;
  topic?: string;
  taskType?: string;
  durationMin?: number;
  isPublic?: boolean;
  teacherId?: string;
}

interface TasksContextType {
  tasks: TaskItem[];
  refreshTasks: () => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const loadTasks = useCallback(async () => {
    if (!user || user.role !== 'teacher') {
      setTasks([]);
      return;
    }
    try {
      const { tasks: taskList } = await listTeacherTasks(user.id, { deletedOnly: false });
      const mapped: TaskItem[] = (taskList ?? []).map((row) => ({
        taskId: row.taskId,
        subject: row.subject,
        grade: row.grade,
        topic: row.topic,
        taskType: row.taskType,
        durationMin: row.durationMin,
        isPublic: row.isPublic,
      }));
      setTasks(mapped);
    } catch (error) {
      console.error('[TasksProvider] Failed to load tasks:', error);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const refreshTasks = useCallback(async () => {
    await loadTasks();
  }, [loadTasks]);

  return (
    <TasksContext.Provider value={{ tasks, refreshTasks }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within TasksProvider');
  }
  return context;
}

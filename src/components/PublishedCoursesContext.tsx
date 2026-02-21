import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { listTeacherCoursesWithStats } from '../lib/backendApi';

interface PublishedCourse {
  id: string;
  title: string;
  subject: string;
  grade: string;
  topic: string;
  textbook: string;
  hours: string;
  publishedAt: string;
  status: 'published' | 'draft';
  assignmentStatus: 'assigned' | 'unassigned';
  visibilityStatus: 'public' | 'private';
  shareStatus: 'shared' | 'none';
  students: number;
  completion: number;
  lastUpdated: string;
}

interface PublishedCoursesContextType {
  publishedCourses: PublishedCourse[];
  addPublishedCourse: (course: Omit<PublishedCourse, 'id' | 'publishedAt'>) => void;
  refreshCourses: () => Promise<void>;
}

const PublishedCoursesContext = createContext<PublishedCoursesContextType | undefined>(undefined);

export function PublishedCoursesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [publishedCourses, setPublishedCourses] = useState<PublishedCourse[]>([]);

  const addPublishedCourse = (course: Omit<PublishedCourse, 'id' | 'publishedAt'>) => {
    const title = `${course.subject} - ${course.topic}`;
    const newCourse: PublishedCourse = {
      ...course,
      title: title,
      id: Date.now().toString(),
      publishedAt: new Date().toISOString(),
      status: 'published',
      assignmentStatus: 'assigned',
      visibilityStatus: 'private',
      shareStatus: 'none',
      students: 0,
      completion: 0,
      lastUpdated: '刚刚'
    };
    setPublishedCourses(prev => [newCourse, ...prev]);
  };

  const loadCourses = useCallback(async () => {
    if (!user || user.role !== 'teacher') {
      setPublishedCourses([]);
      return;
    }
    try {
      const { courses } = await listTeacherCoursesWithStats(user.id);
      const mapped: PublishedCourse[] = courses.map((row) => ({
        id: row.id,
        title: row.title,
        subject: row.subject,
        grade: row.grade,
        topic: row.topic,
        textbook: row.textbook ?? '',
        hours: '1',
        publishedAt: '',
        status: row.status,
        assignmentStatus: row.assignmentStatus ?? (row.status === 'published' ? 'assigned' : 'unassigned'),
        visibilityStatus: row.visibilityStatus ?? 'private',
        shareStatus: row.shareStatus ?? 'none',
        students: row.students,
        completion: row.completion,
        lastUpdated: row.lastUpdated,
      }));
      setPublishedCourses(mapped);
    } catch (error) {
      console.error('[PublishedCoursesProvider] Failed to load courses:', error);
    }
  }, [user]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const refreshCourses = useCallback(async () => {
    await loadCourses();
  }, [loadCourses]);

  return (
    <PublishedCoursesContext.Provider value={{ publishedCourses, addPublishedCourse, refreshCourses }}>
      {children}
    </PublishedCoursesContext.Provider>
  );
}

export function usePublishedCourses() {
  const context = useContext(PublishedCoursesContext);
  if (!context) {
    throw new Error('usePublishedCourses must be used within PublishedCoursesProvider');
  }
  return context;
}
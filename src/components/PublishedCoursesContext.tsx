import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { listTeacherCourses } from '../lib/coursesRepository';

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
  students: number;
  completion: number;
  lastUpdated: string;
}

interface PublishedCoursesContextType {
  publishedCourses: PublishedCourse[];
  addPublishedCourse: (course: Omit<PublishedCourse, 'id' | 'publishedAt'>) => void;
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
      students: 0,
      completion: 0,
      lastUpdated: '刚刚'
    };
    setPublishedCourses(prev => [newCourse, ...prev]);
  };

  // 初始化时从 Supabase 拉取当前老师的课程列表
  useEffect(() => {
    const loadCourses = async () => {
      if (!user || user.role !== 'teacher') {
        setPublishedCourses([]);
        return;
      }

      try {
        const rows = await listTeacherCourses(user.id);
        const mapped: PublishedCourse[] = rows.map(row => {
          const subject = row.subject ?? '';
          const topic = row.topic ?? '';
          const title = subject && topic ? `${subject} - ${topic}` : subject || topic || '未命名课程';
          const updatedAt = row.updated_at ? new Date(row.updated_at) : null;

          return {
            id: row.public_id,
            title,
            subject,
            grade: row.grade ?? '',
            topic,
            textbook: row.textbook ?? '',
            hours: '1',
            publishedAt: updatedAt ? updatedAt.toISOString() : '',
            status: (row.status as PublishedCourse['status']) || 'published',
            students: row.students ?? 0,
            completion: row.completion ?? 0,
            lastUpdated: updatedAt
              ? `${updatedAt.getMonth() + 1}-${updatedAt.getDate()} ${updatedAt.getHours()}:${updatedAt.getMinutes().toString().padStart(2, '0')}`
              : '刚刚',
          };
        });

        setPublishedCourses(mapped);
      } catch (error) {
        console.error('[PublishedCoursesProvider] Failed to load courses from Supabase:', error);
      }
    };

    loadCourses();
  }, [user]);

  return (
    <PublishedCoursesContext.Provider value={{ publishedCourses, addPublishedCourse }}>
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
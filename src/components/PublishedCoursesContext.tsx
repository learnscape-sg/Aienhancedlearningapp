import React, { createContext, useContext, useState, ReactNode } from 'react';

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
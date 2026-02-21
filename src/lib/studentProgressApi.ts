/**
 * Student course progress API.
 * Calls self-learning-system POST /api/student-course-progress with Supabase JWT.
 */
import { supabase } from '../utils/supabase/client';

const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;
  if (!url) throw new Error('VITE_API_URL is not set');
  return url.replace(/\/$/, '');
};

export interface UpsertProgressParams {
  courseId: string;
  progress: number;
  completed?: boolean;
  timeSpentSeconds?: number;
  lastTaskIndex?: number;
}

export async function upsertStudentCourseProgress(
  params: UpsertProgressParams
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return;
  }

  const base = getBaseUrl();
  const response = await fetch(`${base}/api/student-course-progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      courseId: params.courseId,
      progress: Math.min(100, Math.max(0, params.progress)),
      completed: params.completed ?? false,
      timeSpentSeconds: params.timeSpentSeconds ?? 0,
      lastTaskIndex: params.lastTaskIndex ?? 0,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.warn('[studentProgressApi] Upsert failed:', err.error || response.statusText);
  }
}

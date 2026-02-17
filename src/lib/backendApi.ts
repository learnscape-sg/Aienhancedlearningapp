/**
 * API client for self-learning-system backend.
 * Base URL from VITE_API_URL (e.g. http://localhost:3000 or https://self-learning-system-xxx.vercel.app).
 */

import type {
  CurriculumDesign,
  TaskDocuments,
  SystemTaskPlan,
  Language,
  VideoSearchItem,
  VideoContentResult,
} from '../types/backend';

const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;
  console.log('VITE_API_URL=', url);
  if (!url) {
    throw new Error(
      'VITE_API_URL is not set. Add it to .env (e.g. VITE_API_URL=http://localhost:3000)'
    );
  }
  return url.replace(/\/$/, '');
};

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = getBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `API call failed: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `API call failed with status ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const json = await response.json();
    return json.data as T;
  } catch (error: unknown) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('网络连接失败，请检查后端地址或稍后重试');
    }
    if (error instanceof Error) throw error;
    throw new Error(String(error));
  }
}

export async function generateCurriculumDesign(
  subject: string,
  grade: string,
  topic: string,
  textbook: string,
  context: string = '',
  language: Language = 'zh'
): Promise<CurriculumDesign> {
  return apiCall<CurriculumDesign>('/api/curriculum', {
    method: 'POST',
    body: JSON.stringify({
      subject,
      grade,
      topic,
      textbook,
      context,
      language,
    }),
  });
}

export async function generateTaskDocuments(
  subject: string,
  topic: string,
  curriculum: CurriculumDesign,
  context: string = ''
): Promise<TaskDocuments> {
  return apiCall<TaskDocuments>('/api/documents', {
    method: 'POST',
    body: JSON.stringify({
      subject,
      topic,
      curriculumJson: JSON.stringify(curriculum),
      context,
    }),
  });
}

export async function generateSystemTaskPlan(
  taskSheetMarkdown: string,
  subject: string,
  grade: string,
  context: string = ''
): Promise<SystemTaskPlan> {
  return apiCall<SystemTaskPlan>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      taskSheetMarkdown,
      subject,
      grade,
      context,
    }),
  });
}

export async function generateTaskAsset(
  type: string,
  prompt: string,
  courseId?: string,
  taskId?: string
): Promise<unknown> {
  if (!prompt?.trim()) return null;
  try {
    return await apiCall<unknown>('/api/assets', {
      method: 'POST',
      body: JSON.stringify({ type, prompt, courseId, taskId }),
    });
  } catch (err) {
    console.error('Asset generation failed:', err);
    return null;
  }
}

export async function createCourse(
  plan: SystemTaskPlan
): Promise<{ courseId: string; url: string }> {
  return apiCall<{ courseId: string; url: string }>('/api/courses', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

export async function getCourse(
  courseId: string
): Promise<{ plan: SystemTaskPlan }> {
  return apiCall<{ plan: SystemTaskPlan }>(`/api/courses?id=${encodeURIComponent(courseId)}`, {
    method: 'GET',
  });
}

// --- Materials (teaching resources) ---
export async function searchVideos(
  q: string,
  maxResults: number = 5
): Promise<{ items: VideoSearchItem[] }> {
  const params = new URLSearchParams({ q: q.trim(), maxResults: String(Math.min(maxResults, 10)) });
  return apiCall<{ items: VideoSearchItem[] }>(`/api/materials/video-search?${params}`);
}

export async function getVideoContent(url: string): Promise<VideoContentResult> {
  return apiCall<VideoContentResult>('/api/materials/video-content', {
    method: 'POST',
    body: JSON.stringify({ url: url.trim() }),
  });
}

export type GenerateTaskDesignResult = {
  markdown: string;
  json: Record<string, unknown>;
  objective: string;
};

export async function generateTaskDesign(params: {
  subject: string;
  topic: string;
  grade: string;
  duration: string | number;
  difficulty?: string;
  prerequisites?: string;
}): Promise<GenerateTaskDesignResult> {
  return apiCall<GenerateTaskDesignResult>(
    '/api/materials/generate-task-design',
    {
      method: 'POST',
      body: JSON.stringify({
        subject: params.subject.trim(),
        topic: params.topic.trim(),
        grade: params.grade.trim(),
        duration: params.duration,
        difficulty: params.difficulty?.trim() || '',
        prerequisites: params.prerequisites?.trim() || '',
      }),
    }
  );
}

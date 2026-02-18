/**
 * API client for self-learning-system backend.
 * Base URL from VITE_API_URL (e.g. http://localhost:3000 or https://self-learning-system-xxx.vercel.app).
 */

import type {
  CurriculumDesign,
  TaskDocuments,
  SystemTaskPlan,
  SystemTask,
  Language,
  VideoSearchItem,
  VideoContentResult,
  ChatMessage,
  ExitTicketAnalysis,
  ObjectiveMetrics,
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
  input: SystemTaskPlan | { taskIds: string[] },
  teacherId?: string
): Promise<{ courseId: string; url: string }> {
  const base = Array.isArray((input as { taskIds?: string[] }).taskIds)
    ? { taskIds: (input as { taskIds: string[] }).taskIds }
    : { plan: input as SystemTaskPlan };
  const body = teacherId != null ? { ...base, teacherId } : base;
  return apiCall<{ courseId: string; url: string }>('/api/courses', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// --- Task storage (Phase 2) ---
export async function saveTask(
  task: SystemTask,
  teacherId?: string,
  meta?: { subject?: string; grade?: string; topic?: string }
): Promise<{ taskId: string }> {
  return apiCall<{ taskId: string }>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      task,
      teacherId,
      ...meta,
    }),
  });
}

export async function getTask(taskId: string): Promise<{ task: SystemTask }> {
  return apiCall<{ task: SystemTask }>(`/api/tasks?id=${encodeURIComponent(taskId)}`, {
    method: 'GET',
  });
}

export async function listTeacherTasks(teacherId: string): Promise<{
  tasks: { taskId: string; subject?: string; grade?: string; topic?: string; createdAt?: string; updatedAt?: string }[];
}> {
  return apiCall(
    `/api/tasks?teacherId=${encodeURIComponent(teacherId)}`,
    { method: 'GET' }
  );
}

export interface ClassItem {
  id: string;
  teacherId: string;
  name: string;
  grade?: string;
  createdAt?: string;
  studentCount?: number;
}

export async function listTeacherClasses(teacherId: string): Promise<{ classes: ClassItem[] }> {
  return apiCall(`/api/classes?teacherId=${encodeURIComponent(teacherId)}`, { method: 'GET' });
}

export async function createClass(
  teacherId: string,
  name: string,
  grade?: string
): Promise<ClassItem> {
  return apiCall<ClassItem>('/api/classes', {
    method: 'POST',
    body: JSON.stringify({ teacherId, name, grade }),
  });
}

export async function getClass(classId: string): Promise<{
  id: string;
  teacherId: string;
  name: string;
  grade?: string;
  createdAt?: string;
  students: { id: string; name?: string; email?: string }[];
}> {
  return apiCall(`/api/classes/${encodeURIComponent(classId)}`, { method: 'GET' });
}

export async function addStudentToClassByEmail(
  classId: string,
  email: string
): Promise<{ success: boolean; studentId: string }> {
  return apiCall(`/api/classes/${encodeURIComponent(classId)}/students`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function removeStudentFromClass(
  classId: string,
  studentId: string
): Promise<void> {
  await apiCall(
    `/api/classes/${encodeURIComponent(classId)}/students?studentId=${encodeURIComponent(studentId)}`,
    { method: 'DELETE' }
  );
}

export async function deleteClass(classId: string): Promise<void> {
  await apiCall(`/api/classes/${encodeURIComponent(classId)}`, { method: 'DELETE' });
}

// --- Assignments (Phase 2) ---
export async function assignCourseToClasses(
  courseId: string,
  classIds: string[]
): Promise<void> {
  await apiCall<{ success: boolean }>('/api/assignments', {
    method: 'POST',
    body: JSON.stringify({ courseId, classIds }),
  });
}

export async function getStudentCourses(studentId: string): Promise<{
  courseIds: string[];
  courses: { courseId: string; topic?: string }[];
}> {
  return apiCall<{ courseIds: string[]; courses: { courseId: string; topic?: string }[] }>(
    `/api/assignments?studentId=${encodeURIComponent(studentId)}`,
    { method: 'GET' }
  );
}

export async function getCourse(
  courseId: string
): Promise<{ plan: SystemTaskPlan }> {
  return apiCall<{ plan: SystemTaskPlan }>(`/api/courses?id=${encodeURIComponent(courseId)}`, {
    method: 'GET',
  });
}

// --- Chat & Exit Ticket (StudentConsole) ---
export async function sendChatMessage(
  history: ChatMessage[],
  newMessage: string,
  systemInstruction: string,
  language: Language
): Promise<string> {
  try {
    return await apiCall<string>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        history,
        newMessage,
        systemInstruction,
        language,
      }),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('网络连接失败') || errorMessage.includes('Failed to fetch')) {
      return '抱歉，无法连接到服务器。请检查网络连接后重试。';
    }
    if (errorMessage.includes('API Key') || errorMessage.includes('not configured')) {
      return '服务配置错误，请联系管理员。';
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return '请求超时，请稍后重试。';
    }
    return '连接错误，请稍后重试。';
  }
}

export async function generateExitTicket(
  learningLog: string,
  language: Language,
  studentName?: string,
  objectiveMetrics?: ObjectiveMetrics
): Promise<ExitTicketAnalysis | null> {
  try {
    return await apiCall<ExitTicketAnalysis>('/api/exit-ticket', {
      method: 'POST',
      body: JSON.stringify({
        chatLog: learningLog,
        language,
        studentName: studentName || '您',
        ...(objectiveMetrics && { objectiveMetrics }),
      }),
    });
  } catch (error) {
    console.error('Exit Ticket Error', error);
    return null;
  }
}

// --- Speech (TTS/STT) - responses not wrapped in { data } ---
export interface SpeechVoice {
  name: string;
  ssmlGender?: string;
  naturalSampleRateHertz?: number;
}

export async function getSpeechVoices(): Promise<{
  voices: SpeechVoice[];
  recommended?: string;
  total: number;
}> {
  const base = getBaseUrl();
  const response = await fetch(`${base}/api/speech/voices`, {
    method: 'GET',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch speech voices');
  }
  return response.json();
}

export async function textToSpeech(
  text: string,
  languageCode: string,
  voiceName?: string
): Promise<string> {
  const base = getBaseUrl();
  const response = await fetch(`${base}/api/speech/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      languageCode,
      voiceName,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Text-to-speech synthesis failed');
  }
  const data = await response.json();
  return data.audioData as string;
}

export async function speechToText(
  audioDataBase64: string,
  languageCode: string
): Promise<string> {
  const base = getBaseUrl();
  const response = await fetch(`${base}/api/speech/stt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioData: audioDataBase64,
      languageCode,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Speech recognition failed');
  }
  const data = await response.json();
  return data.text as string;
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

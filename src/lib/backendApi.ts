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
import { appConfig } from '@/config/appConfig';

export type ProductEventName =
  | 'teacher_signup_completed'
  | 'task_create_started'
  | 'task_create_succeeded'
  | 'course_create_succeeded'
  | 'course_publish_succeeded'
  | 'course_assign_succeeded'
  | 'course_opened'
  | 'step_entered'
  | 'step_completed'
  | 'stuck_clicked'
  | 'course_completed'
  | 'language_switched'
  | 'feedback_submitted';

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

function getExperienceHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const host = window.location.hostname.toLowerCase();
  const marketCode = host.startsWith('sg.') || host.includes('.sg.') ? 'SG' : host.startsWith('cn.') || host.includes('.cn.') ? 'CN' : '';
  const language = (localStorage.getItem('i18nextLng') || '').startsWith('en') ? 'en' : 'zh';
  const tenantId = (() => {
    if (!appConfig.enableTenantScoping) return '';
    const urlTenantId = new URLSearchParams(window.location.search).get('tenantId') || '';
    if (urlTenantId.trim()) return urlTenantId.trim();
    // Profile-derived runtime tenant (AuthContext writes this key).
    const authTenantId = (localStorage.getItem('runtimeTenantId') || '').trim();
    if (authTenantId) return authTenantId;
    // Generic local cache fallback for temporary overrides/debugging.
    const cachedTenantId = (localStorage.getItem('tenantId') || '').trim();
    if (cachedTenantId) return cachedTenantId;
    return '';
  })();
  const headers: Record<string, string> = {};
  if (marketCode) headers['x-market-code'] = marketCode;
  headers['x-language-space'] = language;
  if (tenantId) headers['x-tenant-id'] = tenantId;
  return headers;
}

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = getBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getExperienceHeaders(),
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
  context: string = '',
  language?: 'zh' | 'en'
): Promise<TaskDocuments> {
  return apiCall<TaskDocuments>('/api/documents', {
    method: 'POST',
    body: JSON.stringify({
      subject,
      topic,
      curriculumJson: JSON.stringify(curriculum),
      context,
      ...(language && { language }),
    }),
  });
}

export async function generateSystemTaskPlan(
  taskSheetMarkdown: string,
  subject: string,
  grade: string,
  context: string = '',
  language?: 'zh' | 'en'
): Promise<SystemTaskPlan> {
  return apiCall<SystemTaskPlan>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      taskSheetMarkdown,
      subject,
      grade,
      context,
      ...(language && { language }),
    }),
  });
}

export async function generateTaskAsset(
  type: string,
  prompt: string,
  courseId?: string,
  taskId?: string,
  language?: 'zh' | 'en'
): Promise<unknown> {
  if (!prompt?.trim()) return null;
  try {
    return await apiCall<unknown>('/api/assets', {
      method: 'POST',
      body: JSON.stringify({ type, prompt, courseId, taskId, ...(language && { language }) }),
    });
  } catch (err) {
    console.error('Asset generation failed:', err);
    return null;
  }
}

export async function createCourse(
  input: SystemTaskPlan | { taskIds: string[] },
  teacherId?: string,
  meta?: {
    subject?: string;
    subjectCustom?: string;
    subjectIsCustom?: boolean;
    topic?: string;
    grade?: string;
    language?: 'zh' | 'en';
  }
): Promise<{ courseId: string; url: string }> {
  const base = Array.isArray((input as { taskIds?: string[] }).taskIds)
    ? { taskIds: (input as { taskIds: string[] }).taskIds, ...(meta?.language && { language: meta.language }) }
    : {
        plan: input as SystemTaskPlan,
        ...(meta && {
          subject: meta.subject,
          subjectCustom: meta.subjectCustom,
          subjectIsCustom: meta.subjectIsCustom,
          topic: meta.topic,
          grade: meta.grade,
          language: meta.language,
        }),
      };
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
  meta?: {
    subject?: string;
    subjectCustom?: string;
    subjectIsCustom?: boolean;
    grade?: string;
    topic?: string;
    taskType?: string;
    durationMin?: number;
    difficulty?: string;
    prerequisites?: string;
  }
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

export async function listTeacherTasks(
  teacherId: string,
  options?: { includeDeleted?: boolean; deletedOnly?: boolean; restorableOnly?: boolean }
): Promise<{
  tasks: {
    taskId: string;
    subject?: string;
    subjectRaw?: string;
    subjectCustom?: string;
    subjectIsCustom?: boolean;
    grade?: string;
    topic?: string;
    taskType?: string;
    durationMin?: number;
    difficulty?: string;
    prerequisites?: string;
    isPublic?: boolean;
    publishedAt?: string;
    scheduledPublishAt?: string;
    publishStatus?: 'draft' | 'scheduled' | 'published' | 'cancelled';
    deletedAt?: string;
    canRestore?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }[];
}> {
  const qs = new URLSearchParams({ teacherId });
  if (options?.includeDeleted) qs.set('includeDeleted', 'true');
  if (options?.deletedOnly) qs.set('deletedOnly', 'true');
  if (options?.restorableOnly) qs.set('restorableOnly', 'true');
  return apiCall(`/api/tasks?${qs.toString()}`, { method: 'GET' });
}

export async function deleteTask(taskId: string, teacherId: string): Promise<void> {
  await apiCall(
    `/api/tasks?id=${encodeURIComponent(taskId)}&teacherId=${encodeURIComponent(teacherId)}`,
    { method: 'DELETE' }
  );
}

export async function updateTaskVisibility(
  taskId: string,
  teacherId: string,
  action: 'publish' | 'unpublish' | 'schedule',
  scheduledPublishAt?: string
): Promise<{
  success: boolean;
  isPublic?: boolean;
  publishStatus?: 'draft' | 'scheduled' | 'published' | 'cancelled';
  scheduledPublishAt?: string;
}> {
  return apiCall('/api/tasks', {
    method: 'PATCH',
    body: JSON.stringify({ id: taskId, teacherId, action, ...(scheduledPublishAt ? { scheduledPublishAt } : {}) }),
  });
}

export async function restoreTask(taskId: string, teacherId: string): Promise<{ success: boolean }> {
  return apiCall('/api/tasks', {
    method: 'PATCH',
    body: JSON.stringify({ id: taskId, teacherId, action: 'restore' }),
  });
}

export async function listPublicTasks(params?: {
  q?: string;
  subject?: string;
  grade?: string;
}): Promise<{
  tasks: {
    taskId: string;
    subject?: string;
    grade?: string;
    topic?: string;
    taskType?: string;
    durationMin?: number;
    difficulty?: string;
    prerequisites?: string;
    teacherId?: string;
    publishedAt?: string;
    createdAt?: string;
  }[];
}> {
  const qs = new URLSearchParams({ public: 'true' });
  if (params?.q) qs.set('q', params.q);
  if (params?.subject) qs.set('subject', params.subject);
  if (params?.grade) qs.set('grade', params.grade);
  return apiCall(`/api/tasks?${qs.toString()}`, { method: 'GET' });
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
  classIds: string[],
  teacherId: string
): Promise<{ success: boolean; assignedCount: number; skippedCount?: number }> {
  return apiCall<{ success: boolean; assignedCount: number; skippedCount?: number }>(
    '/api/assignments',
    {
      method: 'POST',
      body: JSON.stringify({ courseId, classIds, teacherId }),
    }
  );
}

export async function getCourseAssignments(
  courseId: string,
  teacherId: string
): Promise<{
  classes: { id: string; name: string; grade?: string; teacherId: string; studentCount: number }[];
}> {
  return apiCall(`/api/assignments?courseId=${encodeURIComponent(courseId)}&teacherId=${encodeURIComponent(teacherId)}`, {
    method: 'GET',
  });
}

export async function removeCourseAssignment(
  courseId: string,
  classId: string,
  teacherId: string
): Promise<{ success: boolean }> {
  return apiCall(
    `/api/assignments?courseId=${encodeURIComponent(courseId)}&classId=${encodeURIComponent(classId)}&teacherId=${encodeURIComponent(teacherId)}`,
    { method: 'DELETE' }
  );
}

export async function getStudentCourses(studentId: string): Promise<{
  courseIds: string[];
  courses: { courseId: string; topic?: string; teacherName?: string }[];
}> {
  return apiCall<{ courseIds: string[]; courses: { courseId: string; topic?: string; teacherName?: string }[] }>(
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

export interface TeacherStats {
  totalCourses: number;
  assignedCount?: number;
  publishedCount: number;
  totalStudents: number;
  avgCompletion: number;
}

export async function getTeacherStats(teacherId: string): Promise<TeacherStats> {
  return apiCall<TeacherStats>(
    `/api/teacher-stats?teacherId=${encodeURIComponent(teacherId)}`,
    { method: 'GET' }
  );
}

export interface TeacherActivity {
  action_type: string;
  target_title: string;
  target_id?: string;
  meta?: Record<string, unknown>;
  occurred_at: string;
}

export async function getTeacherActivities(
  teacherId: string,
  limit?: number
): Promise<{ activities: TeacherActivity[] }> {
  const qs = new URLSearchParams({ teacherId });
  if (limit != null) qs.set('limit', String(limit));
  return apiCall<{ activities: TeacherActivity[] }>(
    `/api/teacher-activities?${qs.toString()}`,
    { method: 'GET' }
  );
}

export interface TeacherCourseItem {
  id: string;
  title: string;
  subject: string;
  grade: string;
  topic: string;
  textbook: string;
  assignmentStatus?: 'unassigned' | 'assigned';
  visibilityStatus?: 'private' | 'public';
  shareStatus?: 'none' | 'shared';
  status: 'published' | 'draft';
  publishStatus?: 'draft' | 'scheduled' | 'published' | 'cancelled';
  scheduledPublishAt?: string | null;
  publishedAt?: string | null;
  assignmentCount: number;
  students: number;
  completion: number;
  deletedAt?: string | null;
  canRestore?: boolean;
  lastUpdated: string;
  ownerTeacherId?: string;
  ownerTeacherName?: string;
}

export interface TeacherSearchItem {
  id: string;
  name: string;
  email?: string;
}

export async function searchTeachers(query: string): Promise<{ teachers: TeacherSearchItem[] }> {
  const qs = new URLSearchParams({ q: query });
  qs.set('limit', '20');
  return apiCall<{ teachers: TeacherSearchItem[] }>(
    `/api/teachers/search?${qs.toString()}`,
    { method: 'GET' }
  );
}

export async function listTeacherCoursesWithStats(
  teacherId: string,
  options?: { includeDeleted?: boolean; deletedOnly?: boolean; restorableOnly?: boolean }
): Promise<{ courses: TeacherCourseItem[] }> {
  const qs = new URLSearchParams({ teacherId });
  if (options?.includeDeleted) qs.set('includeDeleted', 'true');
  if (options?.deletedOnly) qs.set('deletedOnly', 'true');
  if (options?.restorableOnly) qs.set('restorableOnly', 'true');
  return apiCall<{ courses: TeacherCourseItem[] }>(`/api/teacher-courses?${qs.toString()}`, {
    method: 'GET',
  });
}

export async function deleteCourse(courseId: string, teacherId: string): Promise<void> {
  await apiCall(
    `/api/courses?id=${encodeURIComponent(courseId)}&teacherId=${encodeURIComponent(teacherId)}`,
    { method: 'DELETE' }
  );
}

export async function updateCourseVisibility(
  courseId: string,
  teacherId: string,
  action: 'publish' | 'unpublish' | 'schedule',
  scheduledPublishAt?: string
): Promise<{
  success: boolean;
  visibility?: 'private' | 'public';
  publishStatus?: 'draft' | 'scheduled' | 'published' | 'cancelled';
  scheduledPublishAt?: string;
}> {
  return apiCall('/api/courses', {
    method: 'PATCH',
    body: JSON.stringify({ id: courseId, teacherId, action, ...(scheduledPublishAt ? { scheduledPublishAt } : {}) }),
  });
}

export async function restoreCourse(courseId: string, teacherId: string): Promise<{ success: boolean }> {
  return apiCall('/api/courses', {
    method: 'PATCH',
    body: JSON.stringify({ id: courseId, teacherId, action: 'restore' }),
  });
}

export async function listCourseShares(
  courseId: string,
  ownerTeacherId: string
): Promise<{
  shares: Array<{
    id: string;
    course_id: string;
    owner_teacher_id: string;
    target_teacher_id?: string;
    target_teacher_name?: string;
    share_token?: string;
    permission: 'view' | 'edit';
    can_preview: boolean;
    expires_at?: string;
    created_at: string;
  }>;
}> {
  return apiCall(
    `/api/course-shares?courseId=${encodeURIComponent(courseId)}&ownerTeacherId=${encodeURIComponent(ownerTeacherId)}`,
    { method: 'GET' }
  );
}

export async function createCourseShare(params: {
  courseId: string;
  ownerTeacherId: string;
  targetTeacherId?: string;
  permission?: 'view' | 'edit';
  expiresAt?: string | null;
  createLinkShare?: boolean;
}): Promise<{ id: string; shareToken?: string; permission: 'view' | 'edit'; targetTeacherId?: string | null }> {
  return apiCall('/api/course-shares', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function deleteCourseShare(shareId: string, ownerTeacherId: string): Promise<{ success: boolean }> {
  return apiCall(
    `/api/course-shares?id=${encodeURIComponent(shareId)}&ownerTeacherId=${encodeURIComponent(ownerTeacherId)}`,
    { method: 'DELETE' }
  );
}

// --- Shared courses (分享给我的) ---
export async function listSharedCourses(teacherId: string): Promise<{ courses: TeacherCourseItem[] }> {
  return apiCall<{ courses: TeacherCourseItem[] }>(
    `/api/shared-courses?teacherId=${encodeURIComponent(teacherId)}`,
    { method: 'GET' }
  );
}

export async function resolveShareToken(
  shareToken: string
): Promise<{ courseId: string; title: string; subject: string; grade: string; ownerTeacherId: string }> {
  return apiCall(
    `/api/shared-courses/resolve?shareToken=${encodeURIComponent(shareToken)}`,
    { method: 'GET' }
  );
}

export async function acceptShareLink(
  shareToken: string,
  teacherId: string
): Promise<{ courseId: string; success: boolean; alreadyAccepted?: boolean }> {
  return apiCall('/api/shared-courses/accept', {
    method: 'POST',
    body: JSON.stringify({ shareToken, teacherId }),
  });
}

// --- Teacher digital twins ---
export interface TeacherDigitalTwin {
  id: string;
  teacherId: string;
  name: string;
  avatar?: string;
  persona: string;
  teachingStyle: string;
  sampleQa: Array<{ q: string; a: string }>;
  externalLinks: Array<{ title: string; url: string }>;
  shareToken?: string;
  secondMeRoleId?: string;
  secondMeEndpoint?: string;
  secondMeEnabled?: boolean;
  isOwner?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TwinMemoryItem {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  indexed: boolean;
  chunksCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TwinShareItem {
  id: string;
  twin_id: string;
  owner_teacher_id: string;
  target_teacher_id?: string;
  target_teacher_name?: string;
  share_token?: string;
  permission: 'view' | 'use';
  created_at: string;
}

export async function listTeacherDigitalTwins(
  teacherId: string,
  options?: { includeShared?: boolean }
): Promise<{ twins: TeacherDigitalTwin[] }> {
  const qs = new URLSearchParams({ teacherId });
  if (options?.includeShared === false) qs.set('includeShared', 'false');
  return apiCall<{ twins: TeacherDigitalTwin[] }>(`/api/digital-twins?${qs.toString()}`, {
    method: 'GET',
  });
}

export async function getDigitalTwin(
  twinId: string,
  teacherId?: string
): Promise<TeacherDigitalTwin> {
  const qs = new URLSearchParams();
  if (teacherId) qs.set('teacherId', teacherId);
  const endpoint = qs.toString()
    ? `/api/digital-twins/${encodeURIComponent(twinId)}?${qs.toString()}`
    : `/api/digital-twins/${encodeURIComponent(twinId)}`;
  return apiCall<TeacherDigitalTwin>(endpoint, { method: 'GET' });
}

export async function createDigitalTwin(params: {
  teacherId: string;
  name: string;
  avatar?: string;
  persona: string;
  teachingStyle?: string;
  sampleQa?: Array<{ q: string; a: string }>;
  externalLinks?: Array<{ title: string; url: string }>;
  secondMeRoleId?: string;
  secondMeEndpoint?: string;
  secondMeEnabled?: boolean;
}): Promise<{ id: string; shareToken?: string }> {
  return apiCall('/api/digital-twins', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function updateDigitalTwin(
  twinId: string,
  params: {
    teacherId: string;
    name?: string;
    avatar?: string;
    persona?: string;
    teachingStyle?: string;
    sampleQa?: Array<{ q: string; a: string }>;
    externalLinks?: Array<{ title: string; url: string }>;
    secondMeRoleId?: string | null;
    secondMeEndpoint?: string | null;
    secondMeEnabled?: boolean;
  }
): Promise<{ success: boolean }> {
  return apiCall(`/api/digital-twins/${encodeURIComponent(twinId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
}

export async function deleteDigitalTwin(
  twinId: string,
  teacherId: string
): Promise<{ success: boolean }> {
  return apiCall(
    `/api/digital-twins/${encodeURIComponent(twinId)}?teacherId=${encodeURIComponent(teacherId)}`,
    { method: 'DELETE' }
  );
}

export async function listDigitalTwinShares(
  twinId: string,
  ownerTeacherId: string
): Promise<{ shares: TwinShareItem[] }> {
  return apiCall<{ shares: TwinShareItem[] }>(
    `/api/digital-twins/share?twinId=${encodeURIComponent(twinId)}&ownerTeacherId=${encodeURIComponent(ownerTeacherId)}`,
    { method: 'GET' }
  );
}

export async function createDigitalTwinShare(params: {
  twinId: string;
  ownerTeacherId: string;
  targetTeacherId?: string;
  permission?: 'view' | 'use';
  createLinkShare?: boolean;
}): Promise<{ id: string; shareToken?: string; permission: 'view' | 'use'; targetTeacherId?: string | null }> {
  return apiCall('/api/digital-twins/share', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function deleteDigitalTwinShare(
  shareId: string,
  ownerTeacherId: string
): Promise<{ success: boolean }> {
  return apiCall(
    `/api/digital-twins/share?id=${encodeURIComponent(shareId)}&ownerTeacherId=${encodeURIComponent(ownerTeacherId)}`,
    { method: 'DELETE' }
  );
}

export async function resolveDigitalTwinShareToken(
  shareToken: string
): Promise<{
  twinId: string;
  name: string;
  avatar?: string;
  persona: string;
  teachingStyle: string;
  ownerTeacherId: string;
}> {
  // Compatibility wrapper: shared twin landing now resolves via teacher-twin API.
  return resolveTeacherTwinShareToken(shareToken);
}

export async function resolveTeacherTwinShareToken(
  shareToken: string
): Promise<{
  twinId: string;
  name: string;
  avatar?: string;
  persona: string;
  teachingStyle: string;
  ownerTeacherId: string;
}> {
  // teacher_twin resolve keeps legacy landing payload stable.
  // Field mapping order is implemented server-side in /api/teacher-twins/resolve.
  return apiCall(
    `/api/teacher-twins/resolve?shareToken=${encodeURIComponent(shareToken)}`,
    { method: 'GET' }
  );
}

export async function listTwinMemories(
  twinId: string,
  teacherId: string
): Promise<{ memories: TwinMemoryItem[] }> {
  return apiCall<{ memories: TwinMemoryItem[] }>(
    `/api/digital-twins/${encodeURIComponent(twinId)}/memories?teacherId=${encodeURIComponent(teacherId)}`,
    { method: 'GET' }
  );
}

export async function retrieveTwinMemoryChunks(
  twinId: string,
  teacherId: string,
  query: string,
  topK = 5
): Promise<{ chunks: Array<{ text: string; score: number; source: string }> }> {
  const qs = new URLSearchParams({
    teacherId,
    q: query,
    topK: String(topK),
  });
  return apiCall(`/api/digital-twins/${encodeURIComponent(twinId)}/memories?${qs.toString()}`, {
    method: 'GET',
  });
}

export async function uploadTwinMemory(
  twinId: string,
  teacherId: string,
  file: File
): Promise<{ id: string; chunksCount: number; indexed: boolean }> {
  const base = getBaseUrl();
  const form = new FormData();
  form.append('teacherId', teacherId);
  form.append('file', file);
  const response = await fetch(`${base}/api/digital-twins/${encodeURIComponent(twinId)}/memories`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed with status ${response.status}`);
  }
  const json = await response.json();
  return json.data as { id: string; chunksCount: number; indexed: boolean };
}

export async function deleteTwinMemory(
  twinId: string,
  teacherId: string,
  memoryId: string
): Promise<{ success: boolean }> {
  return apiCall(
    `/api/digital-twins/${encodeURIComponent(twinId)}/memories?teacherId=${encodeURIComponent(teacherId)}&memoryId=${encodeURIComponent(memoryId)}`,
    { method: 'DELETE' }
  );
}

// --- Teacher Twin Wizard (new generation) ---
export interface TeacherTwin {
  id: string;
  teacherId: string;
  legacyTwinId?: string;
  name: string;
  status: 'draft' | 'calibrating' | 'published' | 'archived';
  subject?: string | null;
  gradeBand?: string | null;
  autonomyLevel: 0 | 1 | 2;
  activePromptVersionId?: string | null;
  wizardState: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherTwinArtifact {
  id: string;
  twinId: string;
  fileUri?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  artifactType: 'lecture' | 'worksheet' | 'question_bank' | 'lesson_plan' | 'syllabus' | 'rubric' | 'model_answer';
  subject?: string | null;
  grade?: string | null;
  authorityLevel: 'official' | 'teacher' | 'third_party';
  permissions: 'extract_only' | 'rag' | 'generate';
  indexed: boolean;
  chunksCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function listTeacherTwins(teacherId: string): Promise<{ twins: TeacherTwin[] }> {
  return apiCall<{ twins: TeacherTwin[] }>(`/api/teacher-twins?teacherId=${encodeURIComponent(teacherId)}`, {
    method: 'GET',
  });
}

export async function getTeacherTwin(twinId: string, teacherId: string): Promise<TeacherTwin> {
  return apiCall<TeacherTwin>(
    `/api/teacher-twins/${encodeURIComponent(twinId)}?teacherId=${encodeURIComponent(teacherId)}`,
    { method: 'GET' }
  );
}

export async function createTeacherTwin(params: {
  teacherId: string;
  name: string;
  subject?: string;
  gradeBand?: string;
  stepA?: Record<string, unknown>;
}): Promise<{ id: string }> {
  return apiCall('/api/teacher-twins', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function patchTeacherTwin(
  twinId: string,
  params: {
    teacherId: string;
    name?: string;
    status?: 'draft' | 'calibrating' | 'published' | 'archived';
    subject?: string;
    gradeBand?: string;
    autonomyLevel?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<{ success: boolean }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(twinId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
}

export async function saveTeacherTwinWizardStep(
  twinId: string,
  step: 'step-a' | 'step-b' | 'step-c' | 'step-d',
  params: {
    teacherId: string;
    payload: Record<string, unknown>;
  }
): Promise<{ success: boolean; step: string }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(twinId)}/wizard/${step}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
}

export async function extractTeacherTwin(params: {
  twinId: string;
  teacherId: string;
  interviewTranscript?: string;
}): Promise<{
  twinId: string;
  profileVersionId: string;
  profile: Record<string, unknown>;
  ragIndexPlan: unknown[];
  clarifyingQuestions: string[];
}> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(params.twinId)}/extract`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function compileTeacherTwin(params: {
  twinId: string;
  teacherId: string;
  profileVersionId?: string;
}): Promise<{
  twinId: string;
  promptVersionId: string;
  systemPrompt: string;
  configurableParameters: Record<string, unknown>;
  fewShotSet: unknown[];
}> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(params.twinId)}/compile`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function publishTeacherTwin(twinId: string, teacherId: string): Promise<{ success: boolean }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(twinId)}/publish`, {
    method: 'POST',
    body: JSON.stringify({ teacherId }),
  });
}

export async function listTeacherTwinArtifacts(
  twinId: string,
  teacherId: string
): Promise<{ artifacts: TeacherTwinArtifact[] }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(twinId)}/artifacts?teacherId=${encodeURIComponent(teacherId)}`, {
    method: 'GET',
  });
}

export async function uploadTeacherTwinArtifact(params: {
  twinId: string;
  teacherId: string;
  artifactType: TeacherTwinArtifact['artifactType'];
  authorityLevel: TeacherTwinArtifact['authorityLevel'];
  permissions: TeacherTwinArtifact['permissions'];
  subject?: string;
  grade?: string;
  text?: string;
  file?: File;
}): Promise<{ id: string; chunksCount: number; indexed: boolean }> {
  const base = getBaseUrl();
  const form = new FormData();
  form.append('teacherId', params.teacherId);
  form.append('artifactType', params.artifactType);
  form.append('authorityLevel', params.authorityLevel);
  form.append('permissions', params.permissions);
  if (params.subject) form.append('subject', params.subject);
  if (params.grade) form.append('grade', params.grade);
  if (params.text) form.append('text', params.text);
  if (params.file) form.append('file', params.file);
  const response = await fetch(`${base}/api/teacher-twins/${encodeURIComponent(params.twinId)}/artifacts`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed with status ${response.status}`);
  }
  const json = await response.json();
  return json.data as { id: string; chunksCount: number; indexed: boolean };
}

export async function deleteTeacherTwinArtifact(
  twinId: string,
  teacherId: string,
  artifactId: string
): Promise<{ success: boolean }> {
  return apiCall(
    `/api/teacher-twins/${encodeURIComponent(twinId)}/artifacts?teacherId=${encodeURIComponent(teacherId)}&artifactId=${encodeURIComponent(artifactId)}`,
    { method: 'DELETE' }
  );
}

export async function runTeacherTwinExplain(params: {
  twinId: string;
  teacherId: string;
  studentInput: string;
  constraints?: Record<string, unknown>;
}): Promise<{ runId: string; output: Record<string, unknown>; retrievalTrace: Record<string, unknown>; teacherApproval: string }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(params.twinId)}/runtime/explain`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function runTeacherTwinPractice(params: {
  twinId: string;
  teacherId: string;
  topic: string;
  difficulty?: string;
  constraints?: Record<string, unknown>;
}): Promise<{ runId: string; output: Record<string, unknown>; retrievalTrace: Record<string, unknown>; teacherApproval: string }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(params.twinId)}/runtime/practice`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function runTeacherTwinGrade(params: {
  twinId: string;
  teacherId: string;
  studentAnswer: string;
  retrievedReference?: unknown;
}): Promise<{ runId: string; output: Record<string, unknown>; retrievalTrace: Record<string, unknown>; teacherApproval: string }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(params.twinId)}/runtime/grade`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function reviewTeacherTwinGrade(params: {
  twinId: string;
  runId: string;
  teacherId: string;
  status: 'approved' | 'rejected';
  reviewComment?: string;
}): Promise<{ success: boolean; status: string }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(params.twinId)}/runs/${encodeURIComponent(params.runId)}/approval`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
}

export async function submitTeacherTwinFeedback(params: {
  twinId: string;
  teacherId: string;
  runId?: string;
  scenario: 'explain' | 'practice' | 'grade';
  outputId?: string;
  labelLike?: 'like' | 'dislike';
  labelCorrect?: 'correct' | 'incorrect';
  reasonTags?: string[];
  commentText?: string;
}): Promise<{ success: boolean }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(params.twinId)}/feedback`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function listTeacherTwinFeedback(
  twinId: string,
  teacherId: string
): Promise<{ feedback: Record<string, unknown>[] }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(twinId)}/feedback?teacherId=${encodeURIComponent(teacherId)}`, {
    method: 'GET',
  });
}

export async function listTeacherTwinDashboard(
  twinId: string,
  teacherId: string
): Promise<{
  totalRuns: number;
  gradeRuns: number;
  approvalRate: number;
  citationMissingRate: number;
  negativeFeedbackRate: number;
}> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(twinId)}/dashboard?teacherId=${encodeURIComponent(teacherId)}`, {
    method: 'GET',
  });
}

export async function createGoldenSetItem(params: {
  twinId: string;
  teacherId: string;
  taskType: 'explain' | 'practice' | 'grade';
  promptJson: Record<string, unknown>;
  expectedJson: Record<string, unknown>;
}): Promise<{ success: boolean }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(params.twinId)}/golden-set`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function listGoldenSetItems(
  twinId: string,
  teacherId: string
): Promise<{ items: Record<string, unknown>[] }> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(twinId)}/golden-set?teacherId=${encodeURIComponent(teacherId)}`, {
    method: 'GET',
  });
}

export async function sendTeacherTwinOnboardingMessage(params: {
  twinId: string;
  teacherId: string;
  message: string;
}): Promise<{
  assistantReply: string;
  collectedSignals: string[];
  isReadyForExtract: boolean;
  profileVersionId: string;
  profilePreview: Record<string, unknown>;
  messages: Array<{ role: 'assistant' | 'teacher'; text: string; timestamp: number }>;
}> {
  return apiCall(`/api/teacher-twins/${encodeURIComponent(params.twinId)}/onboarding/chat`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// --- Chat & Exit Ticket (StudentConsole) ---
export async function sendChatMessage(
  history: ChatMessage[],
  newMessage: string,
  systemInstruction: string,
  language: Language,
  options?: { images?: string[]; twinId?: string; useSecondMe?: boolean }
): Promise<string> {
  try {
    const body: Record<string, unknown> = {
      history,
      newMessage,
      systemInstruction,
      language,
    };
    if (options?.images && options.images.length > 0) {
      body.images = options.images;
    }
    if (options?.twinId) {
      body.twinId = options.twinId;
    }
    if (options?.useSecondMe != null) {
      body.useSecondMe = options.useSecondMe;
    }
    return await apiCall<string>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(body),
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
  maxResults: number = 5,
  platform?: 'youtube' | 'bilibili' | 'all'
): Promise<{ items: VideoSearchItem[] }> {
  const params = new URLSearchParams({ q: q.trim(), maxResults: String(Math.min(maxResults, 10)) });
  if (platform) {
    params.set('platform', platform);
  }
  return apiCall<{ items: VideoSearchItem[] }>(`/api/materials/video-search?${params}`);
}

export async function getVideoContent(url: string): Promise<VideoContentResult> {
  return apiCall<VideoContentResult>('/api/materials/video-content', {
    method: 'POST',
    body: JSON.stringify({ url: url.trim() }),
  });
}

export async function uploadMaterialResource(file: File): Promise<{
  url: string;
  mimeType: string;
  name: string;
  size: number;
  resourceKind: 'video' | 'document';
}> {
  const base = getBaseUrl();
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${base}/api/materials/upload-resource`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed with status ${response.status}`);
  }
  const json = await response.json();
  return json.data as {
    url: string;
    mimeType: string;
    name: string;
    size: number;
    resourceKind: 'video' | 'document';
  };
}

export type GenerateTaskDesignResult = {
  markdown: string | null;
  json: Record<string, unknown> | null;
  objective: string;
};

export async function generateTaskDesign(params: {
  subject: string;
  topic: string;
  grade: string;
  duration: string | number;
  difficulty?: string;
  prerequisites?: string;
  objective?: string;
  language?: 'zh' | 'en';
}): Promise<GenerateTaskDesignResult> {
  const body: Record<string, unknown> = {
    subject: params.subject.trim(),
    topic: params.topic.trim(),
    grade: params.grade.trim(),
    duration: params.duration,
    difficulty: params.difficulty?.trim() || '',
    prerequisites: params.prerequisites?.trim() || '',
  };
  if (params.objective?.trim()) {
    body.objective = params.objective.trim();
  }
  if (params.language) {
    body.language = params.language;
  }
  return apiCall<GenerateTaskDesignResult>(
    '/api/materials/generate-task-design',
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

export interface FeedbackFormData {
  pagePath: string;
  pageName: string;
  feedbackText: string;
  rating?: number;
  feedbackType?: 'bug' | 'suggestion' | 'other';
  metadata?: Record<string, unknown>;
}

export async function submitFeedback(
  feedbackData: FeedbackFormData,
  accessToken?: string
): Promise<{ id: string; message: string }> {
  return apiCall<{ id: string; message: string }>('/api/feedback', {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: JSON.stringify(feedbackData),
  });
}

export async function trackProductEvent(
  payload: {
    eventId?: string;
    eventName: ProductEventName;
    eventTime?: string;
    role?: 'teacher' | 'student' | 'admin' | 'anon';
    sessionId?: string;
    language?: 'zh' | 'en';
    courseId?: string;
    taskId?: string;
    classId?: string;
    teacherId?: string;
    studentId?: string;
    platform?: string;
    appVersion?: string;
    tenantId?: string;
    marketCode?: 'CN' | 'SG';
    properties?: Record<string, unknown>;
  },
  accessToken?: string
): Promise<void> {
  await apiCall<{ success: boolean }>('/api/events', {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: JSON.stringify(payload),
  });
}

export interface RuntimeMarketPolicy {
  video: {
    platformDefault: 'youtube' | 'bilibili' | 'all';
    fallbackPlatforms?: Array<'youtube' | 'bilibili'>;
  };
  contentLanguageDefault: {
    defaultLanguage: 'zh' | 'en';
    allowOverride?: boolean;
  };
  featureFlags: {
    flags: Record<string, boolean>;
  };
  navLanding: {
    hiddenSectionsByRole?: Record<string, string[]>;
    sectionOrderByRole?: Record<string, string[]>;
    labelOverrides?: Record<string, { zh?: string; en?: string }>;
    landingVariantByRole?: Record<string, string>;
  };
  matchedScopes: string[];
}

export interface AdminMarketPolicyRow {
  id: number;
  policy_key: 'video_platform' | 'content_language_default' | 'feature_flags' | 'nav_landing';
  scope_key: string;
  tenant_id: string | null;
  market_code: 'CN' | 'SG' | null;
  space: 'zh' | 'en' | null;
  role: 'teacher' | 'student' | 'parent' | 'admin' | null;
  policy_json: Record<string, unknown>;
  enabled: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminTenantRow {
  id: string;
  name: string;
  market_code: 'CN' | 'SG' | null;
  default_language: 'zh' | 'en' | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getRuntimePolicy(params: {
  role?: 'teacher' | 'student' | 'parent' | 'admin';
}): Promise<{ policy: RuntimeMarketPolicy }> {
  const qs = new URLSearchParams();
  if (params.role) qs.set('role', params.role);
  return apiCall<{ policy: RuntimeMarketPolicy }>(`/api/runtime/policy${qs.toString() ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export async function listAdminMarketPolicies(
  params: {
    policyKey?: 'video_platform' | 'content_language_default' | 'feature_flags' | 'nav_landing';
    tenantId?: string;
    marketCode?: 'CN' | 'SG';
    space?: 'zh' | 'en';
    role?: 'teacher' | 'student' | 'parent' | 'admin';
  },
  accessToken: string
): Promise<{ policies: AdminMarketPolicyRow[] }> {
  const qs = new URLSearchParams();
  if (params.policyKey) qs.set('policyKey', params.policyKey);
  if (params.tenantId) qs.set('tenantId', params.tenantId);
  if (params.marketCode) qs.set('marketCode', params.marketCode);
  if (params.space) qs.set('space', params.space);
  if (params.role) qs.set('role', params.role);
  return apiCall<{ policies: AdminMarketPolicyRow[] }>(`/api/admin/settings/policies${qs.toString() ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function upsertAdminMarketPolicy(
  payload: {
    policyKey: 'video_platform' | 'content_language_default' | 'feature_flags' | 'nav_landing';
    tenantId?: string | null;
    marketCode?: 'CN' | 'SG' | null;
    space?: 'zh' | 'en' | null;
    role?: 'teacher' | 'student' | 'parent' | 'admin' | null;
    policyJson: Record<string, unknown>;
    enabled?: boolean;
  },
  accessToken: string
): Promise<{ policy: AdminMarketPolicyRow }> {
  return apiCall<{ policy: AdminMarketPolicyRow }>('/api/admin/settings/policies', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export async function resolveAdminMarketPolicy(
  payload: {
    tenantId?: string | null;
    marketCode?: 'CN' | 'SG' | null;
    space?: 'zh' | 'en' | null;
    role?: 'teacher' | 'student' | 'parent' | 'admin' | null;
  },
  accessToken: string
): Promise<{ policy: RuntimeMarketPolicy }> {
  return apiCall<{ policy: RuntimeMarketPolicy }>('/api/admin/settings/policies/resolve', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export async function listAdminTenants(
  params: { q?: string; limit?: number },
  accessToken: string
): Promise<{ tenants: AdminTenantRow[] }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.limit != null) qs.set('limit', String(params.limit));
  return apiCall<{ tenants: AdminTenantRow[] }>(`/api/admin/settings/tenants${qs.toString() ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface AdminCostAnalyticsResponse {
  summary: {
    totalRequests: number;
    totalTokensIn: number;
    totalTokensOut: number;
    totalTokens: number;
    totalCostUsd: number;
    /** Domain metric: finance efficiency. */
    avgCostPerRequestUsd: number;
    dateRange: { startIso: string; endIso: string };
  };
  byDay: Array<{ day: string; requests: number; tokensIn: number; tokensOut: number; costUsd: number }>;
  byModel: Array<{ model: string; requests: number; tokensIn: number; tokensOut: number; costUsd: number }>;
  byEndpoint: Array<{ endpoint: string; requests: number; tokensIn: number; tokensOut: number; costUsd: number }>;
  highCostAnomalies: Array<{
    runId: string;
    createdAt: string;
    endpoint: string;
    model: string;
    teacherId: string | null;
    studentId: string | null;
    tokensIn: number;
    tokensOut: number;
    tokensTotal: number;
    retryCount: number;
    latencyMs: number;
    success: boolean;
    costUsd: number;
  }>;
  teacherTopN: Array<{
    teacherId: string;
    teacherName: string;
    requests: number;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
  }>;
  studentTopN: Array<{
    studentId: string;
    studentName: string;
    userType?: string | null;
    requests: number;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
  }>;
}

export async function getAdminCostAnalytics(
  params: { startDate?: string; endDate?: string; language?: string; modelUsed?: string; endpoint?: string; teacherId?: string; topN?: number },
  accessToken: string
): Promise<AdminCostAnalyticsResponse> {
  const qs = new URLSearchParams();
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.language) qs.set('language', params.language);
  if (params.modelUsed) qs.set('modelUsed', params.modelUsed);
  if (params.endpoint) qs.set('endpoint', params.endpoint);
  if (params.teacherId) qs.set('teacherId', params.teacherId);
  if (params.topN != null) qs.set('topN', String(params.topN));
  return apiCall<AdminCostAnalyticsResponse>(`/api/admin/cost-analytics?${qs.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export interface AdminPerformanceAnalyticsResponse {
  summary: {
    /** Shared reliability metric alias. */
    totalRequests: number;
    /** Shared reliability metric alias. */
    successRate: number;
    failRate: number;
    avgLatencyMs: number;
    /** Shared reliability metric alias. */
    p95LatencyMs: number;
    p99LatencyMs: number;
    /** Shared reliability metric alias. */
    retriedRequestRate: number;
    /** Shared reliability metric alias. */
    avgRetryCount: number;
    dateRange: { startIso: string; endIso: string };
  };
  dailyTrend: Array<{
    day: string;
    requests: number;
    successCount: number;
    failCount: number;
    successRate: number;
    p95LatencyMs: number;
  }>;
  endpointTop: Array<{
    endpoint: string;
    requests: number;
    successRate: number;
    failRate: number;
    retriedRequestRate: number;
    avgRetryCount: number;
    p95LatencyMs: number;
  }>;
  modelTop: Array<{
    model: string;
    requests: number;
    successRate: number;
    failRate: number;
    avgRetryCount: number;
    p95LatencyMs: number;
  }>;
  highLatencyAnomalies: Array<{
    runId: string;
    createdAt: string;
    endpoint: string;
    model: string;
    latencyMs: number;
    retryCount: number;
    success: boolean;
  }>;
}

export async function getAdminPerformanceAnalytics(
  params: { startDate?: string; endDate?: string; tenantId?: string; marketCode?: 'CN' | 'SG'; language?: string; topN?: number },
  accessToken: string
): Promise<AdminPerformanceAnalyticsResponse> {
  const qs = new URLSearchParams();
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.tenantId) qs.set('tenantId', params.tenantId);
  if (params.marketCode) qs.set('marketCode', params.marketCode);
  if (params.language) qs.set('language', params.language);
  if (params.topN != null) qs.set('topN', String(params.topN));
  return apiCall<AdminPerformanceAnalyticsResponse>(`/api/admin/performance-analytics?${qs.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export interface AdminBusinessAnalyticsResponse {
  summary: {
    teachersTotal: number;
    studentsTotal: number;
    newTeachers: number;
    newStudents: number;
    activeTeachers: number;
    activeStudents: number;
    coursesCreated: number;
    coursesPublished: number;
    coursesAssigned: number;
    courseCompletionRate: number;
    avgProgress: number;
    avgTimeSpentMinutes: number;
    teacherD7Retention: number;
    studentD7Retention: number;
    teacherMedianActivationHours: number;
    studentMedianActivationHours: number;
    stuckPerCourseOpen: number;
    dateRange: { startIso: string; endIso: string };
  };
  funnel: {
    courseCreated: number;
    coursePublished: number;
    courseAssigned: number;
    courseCompleted: number;
  };
  dailyTrend: Array<{
    day: string;
    courseCreated: number;
    coursePublished: number;
    courseCompleted: number;
    activeStudents: number;
  }>;
  teacherActivationFunnel: Array<{ stage: string; value: number }>;
  studentLearningFunnel: Array<{ stage: string; value: number }>;
  retention: {
    teacher: { d1: number; d7: number; d30: number };
    student: { d1: number; d7: number; d30: number };
    byDay: Array<{ day: string; teacherD1: number; teacherD7: number; studentD1: number; studentD7: number }>;
  };
  timeToValue: {
    teacherMedianHours: number;
    studentMedianHours: number;
  };
  learningQualityProxy: {
    stuckDensity: number;
    topStuckSteps: Array<{ step: string; count: number }>;
    highRiskFeedbackCount: number;
  };
  releaseAlerts: Array<{ level: 'info' | 'warn' | 'critical'; metric: string; value: number; threshold: number; message: string }>;
  weeklyReview: Array<{ metric: string; current: number; previous: number; deltaPct: number }>;
  topTeachersByCourses: Array<{ teacherId: string; teacherName: string; courseCount: number }>;
  topStudentsByCompletion: Array<{ studentId: string; studentName: string; completedCourses: number; avgProgress: number }>;
  topSubjects: Array<{ subject: string; count: number }>;
  topGrades: Array<{ grade: string; count: number }>;
}

export async function getAdminBusinessAnalytics(
  params: { startDate?: string; endDate?: string; topN?: number },
  accessToken: string
): Promise<AdminBusinessAnalyticsResponse> {
  const qs = new URLSearchParams();
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.topN != null) qs.set('topN', String(params.topN));
  return apiCall<AdminBusinessAnalyticsResponse>(`/api/admin/business-analytics?${qs.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export interface AdminFeedbackItem {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  pagePath: string;
  pageName: string;
  feedbackText: string;
  rating: number | null;
  feedbackType: 'bug' | 'suggestion' | 'other' | string;
  userIdentifier: string;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface AdminFeedbackResponse {
  summary: {
    total: number;
    bugCount: number;
    suggestionCount: number;
    otherCount: number;
    avgRating: number;
    dateRange: { startIso: string; endIso: string };
  };
  topicDistribution: Array<{ topic: string; count: number }>;
  highRiskQueue: AdminFeedbackItem[];
  items: AdminFeedbackItem[];
}

export async function getAdminFeedbacks(
  params: { startDate?: string; endDate?: string; tenantId?: string; marketCode?: 'CN' | 'SG'; language?: string; feedbackType?: 'bug' | 'suggestion' | 'other' | ''; pagePath?: string; q?: string; limit?: number },
  accessToken: string
): Promise<AdminFeedbackResponse> {
  const qs = new URLSearchParams();
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.tenantId) qs.set('tenantId', params.tenantId);
  if (params.marketCode) qs.set('marketCode', params.marketCode);
  if (params.language) qs.set('language', params.language);
  if (params.feedbackType) qs.set('feedbackType', params.feedbackType);
  if (params.pagePath) qs.set('pagePath', params.pagePath);
  if (params.q) qs.set('q', params.q);
  if (params.limit != null) qs.set('limit', String(params.limit));
  return apiCall<AdminFeedbackResponse>(`/api/admin/feedback?${qs.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

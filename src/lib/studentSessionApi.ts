import type { ExitTicketAnalysis, VisualizationData, ChatMessage } from '@/types/backend';
import { supabase } from '@/utils/supabase/client';
import { appConfig } from '@/config/appConfig';
import { LAST_LEARNING_TTL_MS, SESSION_RECORD_STORAGE_PREFIX } from '@/constants/learningSession';

export interface LearningReviewActivityItem {
  activity: string;
  timeSpentSec: number;
  timeSpentLabel: string;
}

export interface LearningReviewQaItem {
  task: string;
  step: string;
  question: string;
  studentAnswer: string;
  referenceAnswer: string;
  questionType?: string;
}

export interface LearningReview {
  totalTimeSec: number;
  totalTimeLabel: string;
  activitiesWithTime: LearningReviewActivityItem[];
  qaReview: LearningReviewQaItem[];
}

export interface TaskInputs {
  keywordAnswers: Record<string, string>;
  practiceTextAnswers: Record<number, string>;
  practiceChoiceAnswers: Record<number, number>;
  practiceImageAnswers: Record<number, string>;
  practiceInputMode: Record<number, 'text' | 'upload' | 'draw'>;
  practiceCurrentIndex: number;
  exitTicketAnswer: string;
  exitTicketAnswers: Record<number, string>;
}

export interface SessionRecordPayload {
  currentTaskIndex: number;
  guidedStep: number;
  maxStepReached: number;
  keywordAnswers: Record<string, string>;
  practiceTextAnswers: Record<number, string>;
  practiceChoiceAnswers: Record<number, number>;
  practiceImageAnswers: Record<number, string>;
  practiceInputMode: Record<number, 'text' | 'upload' | 'draw'>;
  practiceCurrentIndex: number;
  exitTicketAnswer: string;
  exitTicketAnswers: Record<number, string>;
  messages: ChatMessage[];
  visualizationData: VisualizationData | null;
  mindMapInput: string;
  mindmapImageAnswer: string;
  tableData: { columns: string[]; rows: string[][] };
  textEditorContent: string;
  mathEditorContent: string;
  confusionPoints: string[];
  editCounts: Record<string, number>;
  learningLog: string[];
  completedTaskIndexes: number[];
  taskInputsByIndex?: Record<number, TaskInputs>;
  objectiveMetrics?: Record<string, number>;
  learningReviewDraft?: LearningReview;
}

interface SessionRecordEnvelope {
  timestamp: number;
  payload: SessionRecordPayload;
}

const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;
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
  const marketCode =
    host.startsWith('sg.') || host.includes('.sg.')
      ? 'SG'
      : host.startsWith('cn.') || host.includes('.cn.')
        ? 'CN'
        : '';
  const language = (localStorage.getItem('i18nextLng') || '').startsWith('en') ? 'en' : 'zh';
  const tenantId = (() => {
    if (!appConfig.enableTenantScoping) return '';
    const authTenantId = (localStorage.getItem('runtimeTenantId') || '').trim();
    if (authTenantId) return authTenantId;
    return (localStorage.getItem('tenantId') || '').trim();
  })();
  const headers: Record<string, string> = {};
  if (marketCode) headers['x-market-code'] = marketCode;
  headers['x-language-space'] = language;
  if (tenantId) headers['x-tenant-id'] = tenantId;
  return headers;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers = getExperienceHeaders();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function isBase64Image(input: string | undefined): boolean {
  if (!input) return false;
  return input.startsWith('data:image/') || /^[A-Za-z0-9+/=\n\r]+$/.test(input);
}

export function getSessionRecordStorageKey(courseId?: string): string {
  return `${SESSION_RECORD_STORAGE_PREFIX}${courseId || 'default'}`;
}

function filterTaskInputImagesForLocalStorage(taskInput: TaskInputs | undefined): TaskInputs | undefined {
  if (!taskInput) return undefined;
  const filteredImages: Record<number, string> = {};
  Object.entries(taskInput.practiceImageAnswers ?? {}).forEach(([rawIndex, value]) => {
    if (!isBase64Image(value)) {
      filteredImages[Number(rawIndex)] = value;
    }
  });
  return {
    ...taskInput,
    practiceImageAnswers: filteredImages,
  };
}

export function sanitizeSessionRecordForLocalStorage(payload: SessionRecordPayload): SessionRecordPayload {
  const safePracticeImages: Record<number, string> = {};
  Object.entries(payload.practiceImageAnswers ?? {}).forEach(([rawIndex, value]) => {
    if (!isBase64Image(value)) {
      safePracticeImages[Number(rawIndex)] = value;
    }
  });

  const safeTaskInputsByIndex = Object.entries(payload.taskInputsByIndex ?? {}).reduce<Record<number, TaskInputs>>(
    (acc, [rawTaskIndex, taskInput]) => {
      const normalized = filterTaskInputImagesForLocalStorage(taskInput as TaskInputs | undefined);
      if (normalized) {
        acc[Number(rawTaskIndex)] = normalized;
      }
      return acc;
    },
    {}
  );

  return {
    ...payload,
    practiceImageAnswers: safePracticeImages,
    taskInputsByIndex: safeTaskInputsByIndex,
    mindmapImageAnswer: isBase64Image(payload.mindmapImageAnswer) ? '' : payload.mindmapImageAnswer,
  };
}

export function readLocalSessionRecord(courseId?: string): SessionRecordPayload | undefined {
  if (typeof window === 'undefined' || !courseId) return undefined;
  const storageKey = getSessionRecordStorageKey(courseId);
  const raw = localStorage.getItem(storageKey);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as SessionRecordEnvelope;
    if (!parsed || typeof parsed !== 'object' || !parsed.payload || typeof parsed.timestamp !== 'number') {
      localStorage.removeItem(storageKey);
      return undefined;
    }
    const age = Date.now() - parsed.timestamp;
    if (age > LAST_LEARNING_TTL_MS || age < 0) {
      localStorage.removeItem(storageKey);
      return undefined;
    }
    return parsed.payload;
  } catch {
    localStorage.removeItem(storageKey);
    return undefined;
  }
}

export function writeLocalSessionRecord(courseId: string | undefined, payload: SessionRecordPayload): void {
  if (typeof window === 'undefined' || !courseId) return;
  const storageKey = getSessionRecordStorageKey(courseId);
  const envelope: SessionRecordEnvelope = {
    timestamp: Date.now(),
    payload: sanitizeSessionRecordForLocalStorage(payload),
  };
  localStorage.setItem(storageKey, JSON.stringify(envelope));
}

export function cleanupExpiredLocalSessionRecords(): void {
  if (typeof window === 'undefined') return;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key?.startsWith(SESSION_RECORD_STORAGE_PREFIX)) continue;
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.removeItem(key);
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as SessionRecordEnvelope;
      const timestamp = typeof parsed?.timestamp === 'number' ? parsed.timestamp : NaN;
      const age = Number.isFinite(timestamp) ? Date.now() - timestamp : Infinity;
      if (age > LAST_LEARNING_TTL_MS || age < 0) {
        localStorage.removeItem(key);
      }
    } catch {
      localStorage.removeItem(key);
    }
  }
}

export async function uploadPracticeImage(
  imageBase64: string,
  courseId: string,
  taskIndex: number,
  questionIndex: number
): Promise<string> {
  const base = getBaseUrl();
  const headers = await getAuthHeaders();
  const response = await fetch(`${base}/api/student-session/upload-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ imageBase64, courseId, taskIndex, questionIndex }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error || '上传手写图片失败');
  }
  const url = json?.data?.url;
  if (!url || typeof url !== 'string') {
    throw new Error('上传手写图片失败：未返回 URL');
  }
  return url;
}

export async function saveSessionRecord(courseId: string, session: SessionRecordPayload): Promise<void> {
  const base = getBaseUrl();
  const headers = await getAuthHeaders();
  const response = await fetch(`${base}/api/student-session/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ courseId, session }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error || '保存课堂记录失败');
  }
}

export type ExitTicketReport = ExitTicketAnalysis & { learningReview?: LearningReview };

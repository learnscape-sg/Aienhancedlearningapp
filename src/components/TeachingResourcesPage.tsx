'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Search,
  Link as LinkIcon,
  Upload,
  Loader2,
  Download,
  Video,
  Check,
  Target,
  ListOrdered,
  FileQuestion,
  Ticket,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Eye,
  RefreshCw,
  ExternalLink,
  FileText,
  Trash2,
} from 'lucide-react';
import {
  searchVideos,
  generateTaskDesign,
  createCourse,
  saveTask,
  uploadMaterialResource,
  convertDocumentToHtml,
  trackProductEvent,
  listTeacherTwins,
  type TeacherTwin,
} from '../lib/backendApi';
import { useAuth } from './AuthContext';
import { useTasks } from './TasksContext';
import {
  getTeacherPreferencesFromProfile,
  prefSubjectIdToDisplay,
  GRADE_OPTIONS,
} from '../hooks/useTeacherPreferences';
import { downloadMarkdownAsPdf, markdownToPdfBlob } from '../lib/markdownToPdf';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { TypingText } from './ui/typing-text';
import { resolveRuntimeExperienceConfig } from '@/lib/entryDetector';
import { useRuntimePolicy } from '@/hooks/useRuntimePolicy';
import { MathTextPreview } from './student/shared/MathTextPreview';
import { SUBJECT_OPTIONS, CUSTOM_SUBJECT_OPTION, splitSubjectValue } from '../lib/subjects';
import type {
  VideoSearchItem,
  VideoContentResult,
  GeneratedQuestion,
  KeyIdea,
  SystemTask,
  SystemTaskPlan,
} from '../types/backend';

const STEPS = [
  { id: 1, key: 'objective', label: '学习目标', icon: Target },
  { id: 2, key: 'video', label: '素材选择', icon: Video },
  { id: 3, key: 'keyIdeas', label: '关键要点', icon: ListOrdered },
  { id: 4, key: 'practice', label: '练习题目', icon: FileQuestion },
  { id: 5, key: 'exitTicket', label: '离场券', icon: Ticket },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

type ParsedVideoRef = {
  platform: 'youtube' | 'bilibili';
  id: string;
};

type PersistedDocumentAsset = {
  key: string;
  label: string;
  format: 'md' | 'pdf';
  url?: string;
  bucket?: string;
  objectPath?: string;
  mimeType?: string;
  updatedAt?: string;
};

async function persistTaskDocumentAssets(markdown: string, topic: string): Promise<PersistedDocumentAsset[]> {
  const now = new Date().toISOString();
  const base = topic || '任务';
  const assets: PersistedDocumentAsset[] = [];

  const mdFile = new File([markdown], `任务文档-${base}-${Date.now()}.md`, { type: 'text/markdown' });
  const mdUploaded = await uploadMaterialResource(mdFile);
  assets.push({
    key: 'task-md',
    label: '任务文档.md',
    format: 'md',
    url: mdUploaded.url,
    bucket: mdUploaded.bucket,
    objectPath: mdUploaded.objectPath,
    mimeType: mdUploaded.mimeType,
    updatedAt: now,
  });

  const pdfBlob = await markdownToPdfBlob(markdown);
  const pdfFile = new File([pdfBlob], `任务文档-${base}-${Date.now()}.pdf`, { type: 'application/pdf' });
  const pdfUploaded = await uploadMaterialResource(pdfFile);
  assets.push({
    key: 'task-pdf',
    label: '任务文档.pdf',
    format: 'pdf',
    url: pdfUploaded.url,
    bucket: pdfUploaded.bucket,
    objectPath: pdfUploaded.objectPath,
    mimeType: pdfUploaded.mimeType,
    updatedAt: now,
  });

  return assets;
}

function parseVideoUrl(url: string): ParsedVideoRef | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'www.youtube.com' || host === 'youtube.com') {
      const v = parsed.searchParams.get('v');
      if (v) return { platform: 'youtube', id: v };
      const parts = parsed.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'shorts' || parts[0] === 'embed') && parts[1]) {
        return { platform: 'youtube', id: parts[1] };
      }
    }

    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0] || '';
      if (id) return { platform: 'youtube', id };
    }

    if (host.endsWith('bilibili.com')) {
      const match = parsed.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/i);
      if (match?.[1]) {
        return { platform: 'bilibili', id: match[1] };
      }
    }

    return null;
  } catch {
    return null;
  }
}

function normalizePlatform(item: VideoSearchItem): 'youtube' | 'bilibili' | 'unknown' {
  if (item.platform === 'youtube' || item.platform === 'bilibili') return item.platform;
  try {
    const parsed = new URL(item.url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('bilibili.com') || host.includes('b23.tv')) return 'bilibili';
  } catch {
    return 'unknown';
  }
  return 'unknown';
}

function getVideoItemKey(item: VideoSearchItem): string {
  const platform = normalizePlatform(item);
  if (platform !== 'unknown') return `${platform}:${item.id}`;
  if (item.url) return `url:${item.url}`;
  return `id:${item.id}`;
}

function getVideoEmbedUrl(item: VideoSearchItem): string | null {
  const platform = normalizePlatform(item);
  if (platform === 'youtube') {
    return `https://www.youtube.com/embed/${item.id}`;
  }
  if (platform === 'bilibili') {
    return `https://player.bilibili.com/player.html?bvid=${item.id}&p=1&danmaku=0&autoplay=0&high_quality=1`;
  }
  return null;
}

function detectResourceKind(item: VideoSearchItem): 'video' | 'document' {
  if (item.resourceKind) return item.resourceKind;
  const mime = item.mimeType?.toLowerCase() || '';
  if (mime.startsWith('video/')) return 'video';
  if (mime) return 'document';
  const lowerUrl = (item.url || '').toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(lowerUrl)) return 'video';
  return 'video';
}

function Stepper({
  currentStep,
  maxStepReached,
  completedSteps,
  onStepClick,
}: {
  currentStep: number;
  maxStepReached: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex justify-center gap-1 mb-8 flex-wrap">
      {STEPS.map(({ id, label }) => {
        const reached = id <= maxStepReached;
        const active = currentStep === id;
        const canClick = reached;
        return (
          <button
            key={id}
            type="button"
            onClick={() => canClick && onStepClick(id)}
            disabled={!canClick && !active}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all flex-1 min-w-[100px] max-w-[180px] justify-center
              ${active ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-sm' : ''}
              ${reached && !active ? 'border-green-300 bg-green-50 text-green-800 cursor-pointer hover:bg-green-100' : ''}
              ${!reached && !active ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed opacity-70' : ''}
            `}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              active ? 'border-2 border-amber-400 bg-amber-100 text-amber-800' :
              reached ? 'bg-green-200 text-green-800' :
              'border border-gray-300 bg-gray-100 text-gray-500'
            }`}>
              {reached && !active ? <Check className="w-3 h-3" /> : id}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Parse markdown-bold keywords (**...**) into fill-in blanks */
function parseKeyPointToKeyIdea(raw: string): KeyIdea {
  const blanks: string[] = [];
  const text = raw.replace(/\*\*(.+?)\*\*/g, (_match, kw: string) => {
    const cleaned = kw.trim();
    if (cleaned) blanks.push(cleaned);
    return '__KEY__';
  });
  return { text, blanks };
}

/** Convert KeyIdea back to raw string (for editing) */
function keyIdeaToRaw(idea: KeyIdea): string {
  const parts = idea.text.split('__KEY__');
  return parts
    .map((p, i) => p + (i < (idea.blanks?.length ?? 0) ? `**${idea.blanks![i]}**` : ''))
    .join('');
}

function keyIdeasToText(ideas: KeyIdea[]): string {
  return ideas.map((idea) => keyIdeaToRaw(idea)).join('\n');
}

/** Convert text to KeyIdeas, optionally preserving imageUrls by index from previous ideas */
function textToKeyIdeas(text: string, preserveFrom?: KeyIdea[]): KeyIdea[] {
  const parsed = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseKeyPointToKeyIdea(line));
  if (!preserveFrom?.length) return parsed;
  return parsed.map((idea, idx) => ({
    ...idea,
    imageUrl: preserveFrom[idx]?.imageUrl ?? idea.imageUrl,
  }));
}

/** Parse task-design practice/exit_ticket item (question/answer or q/a) into GeneratedQuestion */
function parseTaskDesignQuestion(item: Record<string, unknown>): GeneratedQuestion | null {
  const question = (item?.question ?? item?.q) as string | undefined;
  if (!question?.trim()) return null;
  const answer = (item?.answer ?? item?.a) as string | undefined;
  const options = Array.isArray(item?.options) ? (item.options as string[]) : undefined;
  const rubric = (item?.rubric ?? item?.hint) as string | undefined;
  const rawType = (item?.question_type ?? item?.questionType) as string | undefined;
  const questionType =
    rawType === 'multiple_choice' || rawType === 'short_answer' || rawType === 'true_false'
      ? rawType
      : undefined;

  let correctIndex: number | undefined;
  if (options?.length && answer != null) {
    const ansStr = String(answer).trim().toUpperCase();
    const letter = ansStr.length >= 1 ? ansStr.charAt(0) : '';
    if (letter >= 'A' && letter <= 'D') {
      correctIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
    }
  }

  const imageUrl = (item?.imageUrl ?? item?.image_url) as string | undefined;
  return {
    question: question.trim(),
    options,
    correctIndex: correctIndex !== undefined ? correctIndex : undefined,
    correctAnswer: answer != null ? String(answer).trim() : undefined,
    explanation: rubric != null ? String(rubric).trim() : undefined,
    questionType,
    imageUrl: imageUrl?.trim() || undefined,
  };
}

/** Build a single SystemTask from the collected task-design data */
function buildSystemTask(opts: {
  topic: string;
  subject: string;
  grade: string;
  learningObjective: string;
  selectedVideoItem: VideoSearchItem | null;
  customTextInstruction?: string;
  convertedHtml?: string;
  keyIdeas: KeyIdea[];
  practiceQuestions: GeneratedQuestion[];
  exitTicketQuestions: GeneratedQuestion[];
  taskDesignJson: Record<string, unknown> | null;
  taskDesignMarkdown: string | null;
  twinId?: string;
}): SystemTask {
  const isTextInstruction = !!opts.customTextInstruction?.trim() && !opts.selectedVideoItem;
  const selectedResourceKind = isTextInstruction ? 'text_instruction' : (opts.selectedVideoItem?.resourceKind || 'video');
  const resourceLabel = isTextInstruction ? '学习指引' : selectedResourceKind === 'document' ? '学习资料' : '视频';
  const resourceActionText = isTextInstruction ? '完成指引' : selectedResourceKind === 'document' ? '阅读资料' : '观看视频';
  const platform = opts.selectedVideoItem ? normalizePlatform(opts.selectedVideoItem) : null;
  const videoUrl = (() => {
    const url = opts.selectedVideoItem?.url?.trim();
    if (url) return url;
    const id = opts.selectedVideoItem?.id;
    if (!id) return '';
    if (platform === 'bilibili') return `https://www.bilibili.com/video/${id}`;
    return `https://www.youtube.com/watch?v=${id}`;
  })();

  return {
    id: `task-${Date.now()}`,
    title: opts.topic,
    viewType: 'video_player',
    assetType: 'video_gen',
    externalResourceUrl: videoUrl,
    videoPlatform: platform === 'youtube' || platform === 'bilibili' ? platform : undefined,
    externalResourceId: opts.selectedVideoItem?.id && (platform === 'youtube' || platform === 'bilibili') ? opts.selectedVideoItem.id : undefined,
    contentPayload: JSON.stringify({
      learningObjective: opts.learningObjective,
      keyIdeas: opts.keyIdeas,
      practiceQuestions: opts.practiceQuestions,
      exitTicketItems: opts.exitTicketQuestions,
      taskDesignJson: opts.taskDesignJson,
      taskDesignMarkdown: opts.taskDesignMarkdown,
      resourceKind: selectedResourceKind,
      resourceMimeType: opts.selectedVideoItem?.mimeType || '',
      customTextInstruction: isTextInstruction ? opts.customTextInstruction : undefined,
      convertedHtml: opts.convertedHtml || undefined,
    }),
    // video_player should use externalResourceUrl (YouTube URL or media URL),
    // not markdown content.
    generatedAssetContent: '',
    description: [
      `学习目标：${opts.learningObjective}`,
      opts.selectedVideoItem ? `${resourceLabel}：${opts.selectedVideoItem.title}` : (isTextInstruction ? `学习指引：${opts.customTextInstruction}` : ''),
      `关键要点：${opts.keyIdeas.length} 条`,
      `练习题目：${opts.practiceQuestions.length} 题`,
      opts.exitTicketQuestions.length > 0 ? `离场券：${opts.exitTicketQuestions.length} 题` : '',
    ].filter(Boolean).join('\n'),
    assetPrompt: '',
    outputGoal: opts.learningObjective,
    learningGoalId: undefined,
    tutorConfig: {
      systemInstruction: [
        `你是学生的学习助手。本节课主题是「${opts.topic}」（${opts.subject}，${opts.grade}）。`,
        `学习目标：${opts.learningObjective}`,
        `学生将${resourceActionText}并完成以下任务：`,
        `1. 记录关键要点（${opts.keyIdeas.length} 条）`,
        `2. 完成练习题目（${opts.practiceQuestions.length} 题）`,
        `3. 完成离场券`,
        `请引导学生逐步完成任务，鼓励他们思考并给出提示，但不要直接给出答案。`,
      ].join('\n'),
      tone: '鼓励、耐心、引导式',
      twinId: opts.twinId,
    },
    evaluationCriteria: [
      `关键要点：能正确填写 ${opts.keyIdeas.length} 条要点中的核心术语`,
      `练习题目：正确率达到 80% 以上`,
      opts.exitTicketQuestions.length > 0 ? `离场券：能正确回答离场券问题` : '',
    ].filter(Boolean).join('\n'),
  };
}

const TASK_TYPES = [
  { id: 'mastery', label: '掌握型任务', available: true },
  { id: 'guided', label: '引导型任务', available: false },
  { id: 'autonomous', label: '自主型任务', available: false },
] as const;

const TASK_TYPE_DIFFICULTY: Record<(typeof TASK_TYPES)[number]['id'], '基础' | '提升' | '挑战'> = {
  mastery: '基础',
  guided: '提升',
  autonomous: '挑战',
};

const DEFAULT_TEXT_INSTRUCTION = `请打开洋葱APP学习（指定某单元某课），完成后进入下一步
或者
请学习课本内容（指定课本内容），完成后进入下一步`;

export function TeachingResourcesPage() {
  const { user, preferences } = useAuth();
  const { policy } = useRuntimePolicy();
  const experience = resolveRuntimeExperienceConfig();
  const { refreshTasks } = useTasks();
  const [availableTwins, setAvailableTwins] = useState<Array<Pick<TeacherTwin, 'id' | 'name'> & { isOwner: boolean }>>([]);
  const [selectedTwinId, setSelectedTwinId] = useState<string>('');
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [taskType, setTaskType] = useState<'mastery' | 'guided' | 'autonomous'>('mastery');
  const [entrySubject, setEntrySubject] = useState('');
  const [entryCustomSubject, setEntryCustomSubject] = useState('');
  const [entryTopic, setEntryTopic] = useState('');
  const [entryGrade, setEntryGrade] = useState('');
  const [entryLanguage, setEntryLanguage] = useState<'zh' | 'en'>('zh');
  const [entryDuration, setEntryDuration] = useState('');
  const [entryPrerequisites, setEntryPrerequisites] = useState('');
  const [learningObjective, setLearningObjective] = useState('');
  const [videoContent, setVideoContent] = useState<VideoContentResult | null>(null);
  const [selectedVideoItem, setSelectedVideoItem] = useState<VideoSearchItem | null>(null);
  const [keyIdeas, setKeyIdeas] = useState<KeyIdea[]>([]);
  const [keyIdeasText, setKeyIdeasText] = useState('');
  const [keyIdeasEditing, setKeyIdeasEditing] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<GeneratedQuestion[]>([]);
  const [editingPracticeIndex, setEditingPracticeIndex] = useState<number | null>(null);
  const [exitTicketQuestions, setExitTicketQuestions] = useState<GeneratedQuestion[]>([]);
  const [editingExitTicketIndex, setEditingExitTicketIndex] = useState<number | null>(null);
  const [showExitAnswers, setShowExitAnswers] = useState<Record<number, boolean>>({});
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [userSelections, setUserSelections] = useState<Record<number, number>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VideoSearchItem[]>([]);
  const [customVideoItems, setCustomVideoItems] = useState<VideoSearchItem[]>([]);
  const [pasteUrl, setPasteUrl] = useState('');
  const [customTextInstruction, setCustomTextInstruction] = useState(DEFAULT_TEXT_INSTRUCTION);
  const [loading, setLoading] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [uploadingKeyIdeaIndex, setUploadingKeyIdeaIndex] = useState<number | null>(null);
  const [uploadingPracticeImageIndex, setUploadingPracticeImageIndex] = useState<number | null>(null);
  const [uploadingExitTicketImageIndex, setUploadingExitTicketImageIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [objectiveLoading, setObjectiveLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyIdeaImageInputRef = useRef<HTMLInputElement>(null);
  const keyIdeaImagePendingIndexRef = useRef<number>(0);
  const practiceImageInputRef = useRef<HTMLInputElement>(null);
  const practiceImagePendingIndexRef = useRef<number>(0);
  const exitTicketImageInputRef = useRef<HTMLInputElement>(null);
  const exitTicketImagePendingIndexRef = useRef<number>(0);
  const generateTaskDesignPromiseRef = useRef<Promise<{ objective: string; json?: Record<string, unknown>; markdown?: string }> | null>(null);
  const taskDesignJsonRef = useRef<Record<string, unknown> | null>(null);
  const taskDesignMarkdownRef = useRef<string | null>(null);
  const [taskDesignReady, setTaskDesignReady] = useState(false);
  const [videoStepIntroDismissed, setVideoStepIntroDismissed] = useState(false);
  const [keyIdeasIntroDismissed, setKeyIdeasIntroDismissed] = useState(false);
  const [practiceIntroDismissed, setPracticeIntroDismissed] = useState(false);
  const [exitTicketIntroDismissed, setExitTicketIntroDismissed] = useState(false);
  const [generatedTask, setGeneratedTask] = useState<SystemTask | null>(null);
  const [taskGenerating, setTaskGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [restReady, setRestReady] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  const preferredVideoPlatform: 'youtube' | 'bilibili' | 'all' =
    policy?.video?.platformDefault
      ?? (experience.entry.marketCode === 'SG' ? 'youtube' : 'bilibili');
  const marketLabel = experience.entry.marketCode === 'SG' ? 'SG' : experience.entry.marketCode === 'CN' ? 'CN' : 'GLOBAL';
  const preferredPlatformLabel =
    preferredVideoPlatform === 'youtube'
      ? 'YouTube'
      : preferredVideoPlatform === 'bilibili'
        ? 'Bilibili'
        : 'YouTube + Bilibili';

  useEffect(() => {
    if (!user?.id) return;
    listTeacherTwins(user.id)
      .then((res) =>
        setAvailableTwins(
          (res.twins ?? []).map((twin) => ({
            id: twin.id,
            name: twin.name,
            // teacher_twin list is owner-scoped in current API.
            isOwner: true,
          }))
        )
      )
      .catch((err) => console.error('Failed to load digital twins:', err));
  }, [user?.id]);

  const hasPrefilledRef = useRef(false);
  useEffect(() => {
    if (hasPrefilledRef.current) return;
    hasPrefilledRef.current = true;
    const prefs = getTeacherPreferencesFromProfile(preferences);
    if (prefs.defaultGrade && GRADE_OPTIONS.some((g) => g === prefs.defaultGrade)) setEntryGrade(prefs.defaultGrade);
    const subjectDisplay = prefSubjectIdToDisplay(prefs.defaultSubject);
    if (subjectDisplay && SUBJECT_OPTIONS.includes(subjectDisplay)) {
      setEntrySubject(subjectDisplay);
    } else if (subjectDisplay) {
      setEntrySubject(CUSTOM_SUBJECT_OPTION);
      setEntryCustomSubject(subjectDisplay);
    }
  }, [preferences?.defaultGrade, preferences?.defaultSubject]);

  const completedSteps = new Set<number>();
  if (learningObjective.trim()) completedSteps.add(1);
  if (videoContent || customTextInstruction.trim()) completedSteps.add(2);
  if (keyIdeas.length > 0) completedSteps.add(3);
  if (practiceQuestions.length > 0) completedSteps.add(4);
  if (exitTicketQuestions.length > 0) completedSteps.add(5);

  const handleStartTaskDesign = () => {
    const effectiveSubject = (entrySubject === CUSTOM_SUBJECT_OPTION ? entryCustomSubject : entrySubject).trim();
    const topic = entryTopic.trim();
    if (!topic || !effectiveSubject) return;
    const autoDifficulty = TASK_TYPE_DIFFICULTY[taskType];
    setTaskDesignReady(false);
    setRestReady(false);
    void trackProductEvent({
      eventName: 'task_create_started',
      role: 'teacher',
      teacherId: user?.id,
      language: entryLanguage,
      properties: { source: 'TeachingResourcesPage', subject: effectiveSubject, grade: entryGrade, topic },
    }).catch(() => undefined);
    const promise = generateTaskDesign({
      subject: effectiveSubject,
      topic,
      grade: entryGrade,
      duration: entryDuration.trim() || '15',
      taskType,
      difficulty: autoDifficulty,
      prerequisites: entryPrerequisites || undefined,
      language: entryLanguage,
    });
    generateTaskDesignPromiseRef.current = promise;
    promise.then(() => setTaskDesignReady(true)).catch(() => setTaskDesignReady(false));
    setStep(1);
    setMaxStepReached(1);
    setKeyIdeasIntroDismissed(false);
    setPracticeIntroDismissed(false);
    setExitTicketIntroDismissed(false);
  };

  const handleStartPlanning = async () => {
    const promise = generateTaskDesignPromiseRef.current;
    if (!promise) {
      setError('请先从入口页点击「开始任务设计」');
      return;
    }
    setObjectiveLoading(true);
    setError(null);
    try {
      const result = await promise;
      setLearningObjective(result.objective || '');
      taskDesignJsonRef.current = result.json ?? null;
      taskDesignMarkdownRef.current = result.markdown ?? null;
      generateTaskDesignPromiseRef.current = null;
    } catch (e) {
      const message = e instanceof Error ? e.message : '生成学习目标失败';
      const effectiveSubject = (entrySubject === CUSTOM_SUBJECT_OPTION ? entryCustomSubject : entrySubject).trim();
      setError(message);
      void trackProductEvent({
        eventName: 'task_design_generation_failed',
        role: 'teacher',
        teacherId: user?.id,
        language: entryLanguage,
        properties: {
          source: 'TeachingResourcesPage',
          stage: 'objective',
          subject: effectiveSubject,
          grade: entryGrade,
          topic: entryTopic.trim(),
          errorMessage: message,
        },
      }).catch(() => undefined);
    } finally {
      setObjectiveLoading(false);
    }
  };

  const triggerTaskRestGeneration = () => {
    if (!learningObjective.trim()) return;
    const effectiveSubject = (entrySubject === CUSTOM_SUBJECT_OPTION ? entryCustomSubject : entrySubject).trim();
    setError(null);
    setKeyIdeas([]);
    setKeyIdeasText('');
    setKeyIdeasEditing(false);
    setPracticeQuestions([]);
    setEditingPracticeIndex(null);
    setExitTicketQuestions([]);
    setRestReady(false);
    const autoDifficulty = TASK_TYPE_DIFFICULTY[taskType];
    const promise = generateTaskDesign({
      subject: effectiveSubject,
      topic: entryTopic.trim(),
      grade: entryGrade,
      duration: entryDuration.trim() || '15',
      taskType,
      difficulty: autoDifficulty,
      prerequisites: entryPrerequisites || undefined,
      objective: learningObjective.trim(),
      language: entryLanguage,
    });
    promise
      .then((res) => {
        taskDesignJsonRef.current = res.json ?? null;
        taskDesignMarkdownRef.current = res.markdown ?? null;
        setRestReady(true);
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : '生成任务内容失败';
        setError(message);
        void trackProductEvent({
          eventName: 'task_design_generation_failed',
          role: 'teacher',
          teacherId: user?.id,
          language: entryLanguage,
          properties: {
            source: 'TeachingResourcesPage',
            stage: 'task_rest',
            subject: effectiveSubject,
            grade: entryGrade,
            topic: entryTopic.trim(),
            errorMessage: message,
          },
        }).catch(() => undefined);
      });
  };

  const handleRetryCurrentStep = () => {
    if (step === 0) {
      handleStartTaskDesign();
      return;
    }
    if (step === 1) {
      void handleStartPlanning();
      return;
    }
    if (step === 2) {
      if (!restReady && learningObjective.trim()) {
        triggerTaskRestGeneration();
        return;
      }
      if (searchQuery.trim()) {
        void handleSearchVideos();
      }
      return;
    }
    if (step === 6) {
      void handleGenerateTask();
    }
  };

  const handleSearchVideos = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const { items } = await searchVideos(q, 6, preferredVideoPlatform);
      setSearchResults(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteUrl = async () => {
    const url = pasteUrl.trim();
    if (!url) return;
    const parsed = parseVideoUrl(url);
    if (!parsed) {
      setError('请输入有效的 YouTube 或 B站视频链接');
      return;
    }
    const candidateKey = `${parsed.platform}:${parsed.id}`;
    if (
      searchResults.some((v) => getVideoItemKey(v) === candidateKey) ||
      customVideoItems.some((v) => getVideoItemKey(v) === candidateKey)
    ) {
      setError('该视频已在列表中');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let title = parsed.platform === 'bilibili' ? '自定义B站视频' : '自定义YouTube视频';
      let thumbnailUrl = '';

      if (parsed.platform === 'youtube') {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.title) title = data.title;
        }
        thumbnailUrl = `https://img.youtube.com/vi/${parsed.id}/mqdefault.jpg`;
      }

      const item: VideoSearchItem = {
        id: parsed.id,
        title,
        thumbnailUrl,
        url,
        platform: parsed.platform,
        resourceKind: 'video',
      };
      setCustomVideoItems((prev) => [...prev, item]);
      setPasteUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取视频信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = (item: VideoSearchItem) => {
    setSelectedVideoItem(item);
    setVideoContent({ title: item.title });
    setCustomTextInstruction('');
    setError(null);
  };

  const handleUseTextInstruction = () => {
    const text = customTextInstruction.trim();
    if (!text) return;
    setSelectedVideoItem(null);
    setVideoContent({ title: text });
    setError(null);
  };

  const handleUploadResource = async (file: File) => {
    setUploadingResource(true);
    setError(null);
    try {
      const uploaded = await uploadMaterialResource(file);
      const item: VideoSearchItem = {
        id: `${uploaded.resourceKind}-${Date.now()}`,
        title: uploaded.name,
        thumbnailUrl: '',
        url: uploaded.url,
        resourceKind: uploaded.resourceKind,
        mimeType: uploaded.mimeType,
      };
      setCustomVideoItems((prev) => [item, ...prev]);
      setSelectedVideoItem(item);
      setVideoContent({ title: uploaded.name });
      setCustomTextInstruction('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败，请改用粘贴视频链接');
    } finally {
      setUploadingResource(false);
    }
  };

  const handleKeyIdeaImageUpload = async (idx: number, file: File) => {
    if (!/^image\//i.test(file.type)) {
      setError('请上传图片文件（PNG、JPG、GIF、WebP）');
      return;
    }
    setUploadingKeyIdeaIndex(idx);
    setError(null);
    try {
      const uploaded = await uploadMaterialResource(file);
      setKeyIdeas((prev) => {
        const next = [...prev];
        if (!next[idx]) return prev;
        next[idx] = { ...next[idx], imageUrl: uploaded.url };
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '图片上传失败');
    } finally {
      setUploadingKeyIdeaIndex(null);
    }
  };

  const handlePracticeImageUpload = async (idx: number, file: File) => {
    if (!/^image\//i.test(file.type)) {
      setError('请上传图片文件（PNG、JPG、GIF、WebP）');
      return;
    }
    setUploadingPracticeImageIndex(idx);
    setError(null);
    try {
      const uploaded = await uploadMaterialResource(file);
      setPracticeQuestions((prev) => {
        const next = [...prev];
        if (!next[idx]) return prev;
        next[idx] = { ...next[idx], imageUrl: uploaded.url };
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '图片上传失败');
    } finally {
      setUploadingPracticeImageIndex(null);
    }
  };

  const handleExitTicketImageUpload = async (idx: number, file: File) => {
    if (!/^image\//i.test(file.type)) {
      setError('请上传图片文件（PNG、JPG、GIF、WebP）');
      return;
    }
    setUploadingExitTicketImageIndex(idx);
    setError(null);
    try {
      const uploaded = await uploadMaterialResource(file);
      setExitTicketQuestions((prev) => {
        const next = [...prev];
        if (!next[idx]) return prev;
        next[idx] = { ...next[idx], imageUrl: uploaded.url };
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '图片上传失败');
    } finally {
      setUploadingExitTicketImageIndex(null);
    }
  };

  const handleViewKeyIdeas = () => {
    const json = taskDesignJsonRef.current;
    const keyPoints = (json?.key_points as string[] | undefined) || [];
    const parsedIdeas = keyPoints.map((t) => parseKeyPointToKeyIdea(t));
    setKeyIdeas(parsedIdeas);
    setKeyIdeasText(keyIdeasToText(parsedIdeas));
    setKeyIdeasEditing(false);
    setStep(3);
    setMaxStepReached((m) => Math.max(m, 3));
  };

  // 进入 Step 4 时从 json.practice 填充练习题目（依赖 restReady，Phase 2 完成后会重新执行）
  // 兼容 task.json 格式：guided_practice/independent_practice 或 we_do/you_do，字段 question/answer 或 q/a
  useEffect(() => {
    if (step !== 4 || practiceQuestions.length > 0 || !restReady) return;
    const json = taskDesignJsonRef.current;
    const practice = json?.practice as Record<string, unknown> | undefined;
    if (!practice) return;
    const guided = (Array.isArray(practice.guided_practice) ? practice.guided_practice : practice.we_do) as Record<string, unknown>[] | undefined;
    const independent = (Array.isArray(practice.independent_practice) ? practice.independent_practice : practice.you_do) as Record<string, unknown>[] | undefined;
    const list: GeneratedQuestion[] = [];
    [...(guided || []), ...(independent || [])].forEach((item) => {
      const parsed = parseTaskDesignQuestion(item);
      if (parsed) list.push(parsed);
    });
    if (list.length > 0) setPracticeQuestions(list);
  }, [step, practiceQuestions.length, restReady]);

  // 进入 Step 5 时从 json.exit_ticket 填充离场券（依赖 restReady，Phase 2 完成后会重新执行）
  // 兼容 task.json 格式：exit_ticket 为直接数组，或 { items: [...] }；字段 question/answer 或 q/a
  useEffect(() => {
    if (step !== 5 || exitTicketQuestions.length > 0 || !restReady) return;
    const json = taskDesignJsonRef.current;
    const rawTicket = json?.exit_ticket;
    const items = Array.isArray(rawTicket) ? rawTicket : (Array.isArray((rawTicket as Record<string, unknown>)?.items) ? (rawTicket as { items: unknown[] }).items : []) as Record<string, unknown>[];
    const list: GeneratedQuestion[] = [];
    items.forEach((item) => {
      const parsed = parseTaskDesignQuestion(item);
      if (parsed) list.push(parsed);
    });
    if (list.length > 0) setExitTicketQuestions(list);
  }, [step, exitTicketQuestions.length, restReady]);

  // 阶段二完成且当前在 Step 3 时，从 ref 填充 keyIdeas
  useEffect(() => {
    if (!restReady || step !== 3 || keyIdeas.length > 0) return;
    const json = taskDesignJsonRef.current;
    const keyPoints = (json?.key_points as string[] | undefined) || [];
    if (keyPoints.length > 0) {
      const parsedIdeas = keyPoints.map((t) => parseKeyPointToKeyIdea(t));
      setKeyIdeas(parsedIdeas);
      setKeyIdeasText(keyIdeasToText(parsedIdeas));
      setKeyIdeasEditing(false);
    }
  }, [restReady, step, keyIdeas.length]);

  const handleGenerateTask = async () => {
    setTaskGenerating(true);
    setGenerateError(null);
    setPreviewUrl(null);
    setStep(6);
    setMaxStepReached((m) => Math.max(m, 6));

    try {
      let convertedHtml: string | undefined;
      const item = selectedVideoItem;
      if (item?.resourceKind === 'document') {
        const mime = (item.mimeType || '').toLowerCase();
        if (mime === 'text/plain' || mime.startsWith('text/markdown')) {
          const { html } = await convertDocumentToHtml(item.url, item.mimeType);
          convertedHtml = html || undefined;
        }
      }

      // 1. Build the SystemTask from local data
      const task = buildSystemTask({
        topic: entryTopic,
        subject: (entrySubject === CUSTOM_SUBJECT_OPTION ? entryCustomSubject : entrySubject).trim(),
        grade: entryGrade,
        learningObjective,
        selectedVideoItem,
        customTextInstruction: !selectedVideoItem && videoContent ? videoContent.title : undefined,
        convertedHtml,
        keyIdeas,
        practiceQuestions,
        exitTicketQuestions,
        taskDesignJson: taskDesignJsonRef.current,
        taskDesignMarkdown: taskDesignMarkdownRef.current,
        twinId: selectedTwinId || undefined,
      });
      setGeneratedTask(task);

      // 2. Save task to tasks table, then create course from taskIds
      const subjectMeta = splitSubjectValue((entrySubject === CUSTOM_SUBJECT_OPTION ? entryCustomSubject : entrySubject).trim());
      let taskDocumentAssets: PersistedDocumentAsset[] = [];
      if (taskDesignMarkdownRef.current?.trim()) {
        try {
          taskDocumentAssets = await persistTaskDocumentAssets(taskDesignMarkdownRef.current, entryTopic);
        } catch (error) {
          console.error('Persist task documents failed:', error);
          taskDocumentAssets = [];
        }
      }

      const { taskId } = await saveTask(task, user?.id, {
        subject: subjectMeta.subject,
        subjectCustom: subjectMeta.subjectCustom,
        subjectIsCustom: subjectMeta.subjectIsCustom,
        grade: entryGrade,
        topic: entryTopic,
        taskType,
        durationMin: parseInt(entryDuration, 10) || 15,
        difficulty: TASK_TYPE_DIFFICULTY[taskType],
        prerequisites: entryPrerequisites,
        source: 'task_generation',
        documentAssets: taskDocumentAssets.length > 0 ? { task: taskDocumentAssets } : undefined,
      });
      void trackProductEvent({
        eventName: 'task_create_succeeded',
        role: 'teacher',
        teacherId: user?.id,
        language: entryLanguage,
        taskId,
        properties: { source: 'TeachingResourcesPage', taskType },
      }).catch(() => undefined);
      const result = await createCourse({ taskIds: [taskId] }, user?.id, {
        language: entryLanguage,
        subject: subjectMeta.subject,
        subjectCustom: subjectMeta.subjectCustom,
        subjectIsCustom: subjectMeta.subjectIsCustom,
      });
      void trackProductEvent({
        eventName: 'course_create_succeeded',
        role: 'teacher',
        teacherId: user?.id,
        language: entryLanguage,
        courseId: result.courseId,
        taskId,
        properties: { source: 'TeachingResourcesPage' },
      }).catch(() => undefined);
      const langParam = entryLanguage === 'en' ? '?lang=en' : '';
      setPreviewUrl(`${window.location.origin}/course/${result.courseId}${langParam}`);
      await refreshTasks();

      // 3. Stay on step 6; user clicks button to proceed
      setTaskGenerating(false);
    } catch (err) {
      console.error('Failed to generate task:', err);
      const message = err instanceof Error ? err.message : '生成任务失败，请重试';
      const effectiveSubject = (entrySubject === CUSTOM_SUBJECT_OPTION ? entryCustomSubject : entrySubject).trim();
      setGenerateError(message);
      void trackProductEvent({
        eventName: 'task_design_generation_failed',
        role: 'teacher',
        teacherId: user?.id,
        language: entryLanguage,
        properties: {
          source: 'TeachingResourcesPage',
          stage: 'create_course',
          subject: effectiveSubject,
          grade: entryGrade,
          topic: entryTopic.trim(),
          errorMessage: message,
        },
      }).catch(() => undefined);
      setTaskGenerating(false);
    }
  };

  const handleExportTask = async () => {
    const markdown = taskDesignMarkdownRef.current;
    if (!markdown?.trim()) {
      window.alert('暂无可导出的任务文档');
      return;
    }
    setPdfExporting(true);
    try {
      await downloadMarkdownAsPdf(
        markdown,
        `学习任务-${entryTopic}-${Date.now()}.pdf`
      );
    } finally {
      setPdfExporting(false);
    }
  };

  const handleExportTaskMarkdown = () => {
    const markdown = taskDesignMarkdownRef.current;
    if (!markdown?.trim()) {
      window.alert('暂无可导出的任务文档');
      return;
    }
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `学习任务-${entryTopic || '未命名'}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFull = async () => {
    const markdown = taskDesignMarkdownRef.current;
    let content: string;
    if (markdown?.trim()) {
      content = markdown;
    } else {
      const lines: string[] = [];
      lines.push('# 学习目标');
      lines.push(learningObjective);
      lines.push('');
      if (videoContent?.title) {
        lines.push('# 教学素材');
        lines.push(videoContent.title);
        lines.push('');
      }
      if (keyIdeas.length > 0) {
        lines.push('# 关键要点');
        keyIdeas.forEach((k, i) => lines.push(`${i + 1}. ${k.text.replace(/__KEY__/g, '______')}`));
        lines.push('');
      }
      if (practiceQuestions.length > 0) {
        lines.push('# 练习题目');
        practiceQuestions.forEach((q, i) => {
          lines.push(`${i + 1}. ${q.question}`);
          if (q.options?.length) {
            q.options.forEach((opt, j) =>
              lines.push(`   ${String.fromCharCode(65 + j)}. ${opt}${q.correctIndex === j ? ' ✓' : ''}`)
            );
          } else if (q.correctAnswer) lines.push(`   参考答案：${q.correctAnswer}`);
          if (q.explanation) lines.push(`   解析：${q.explanation}`);
        });
        lines.push('');
      }
      if (exitTicketQuestions.length > 0) {
        lines.push('# 离场券');
        exitTicketQuestions.forEach((q, idx) => {
          lines.push(`${idx + 1}. ${q.question}`);
          if (q.correctAnswer) lines.push(`   参考答案：${q.correctAnswer}`);
        });
      }
      content = lines.join('\n');
    }
    setPdfExporting(true);
    try {
      await downloadMarkdownAsPdf(content, `课程-${Date.now()}.pdf`);
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] w-full px-6 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">任务设计</h1>
      </div>

      {step >= 1 && (
        <Stepper
          currentStep={step}
          maxStepReached={maxStepReached}
          completedSteps={completedSteps}
          onStepClick={(s) => setStep(s)}
        />
      )}

      {error && (
        <div className="mb-2 flex items-center gap-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRetryCurrentStep}>
            重试当前步骤
          </Button>
        </div>
      )}

      {/* Entry Page (step 0) */}
      {step === 0 && (
        <div className="max-w-6xl mx-auto w-full">
        <Card className="border-2">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground">为任意学习者设计学习任务</h2>
              <p className="text-sm text-muted-foreground mt-1">
                填写基础信息，两分钟内生成个性化学习与巩固活动
              </p>
            </div>
            <div className="grid gap-4 max-w-4xl mx-auto">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  任务类型
                </label>
                <Tabs
                  value={taskType}
                  onValueChange={(v) => v && setTaskType(v as typeof taskType)}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    {TASK_TYPES.map((t) => (
                      <TabsTrigger
                        key={t.id}
                        value={t.id}
                        disabled={!t.available}
                      >
                        {t.label}
                        {!t.available && (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            (即将推出)
                          </span>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  课程主题
                </label>
                <Input
                  placeholder="输入任何主题，如：牛顿第三定律"
                  value={entryTopic}
                  onChange={(e) => setEntryTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && entryTopic.trim() && (entrySubject === CUSTOM_SUBJECT_OPTION ? entryCustomSubject.trim() : entrySubject.trim()) && handleStartTaskDesign()}
                  className="h-11 text-base"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    科目
                  </label>
                  <select
                    value={entrySubject}
                    onChange={(e) => setEntrySubject(e.target.value)}
                    className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">请选择</option>
                    {SUBJECT_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {entrySubject === CUSTOM_SUBJECT_OPTION && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">
                      自定义学科
                    </label>
                    <Input
                      placeholder="请输入学科名称"
                      value={entryCustomSubject}
                      onChange={(e) => setEntryCustomSubject(e.target.value)}
                      className="h-11"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    年级
                  </label>
                  <select
                    value={entryGrade}
                    onChange={(e) => setEntryGrade(e.target.value)}
                    className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">请选择</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    时长（分钟）
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    placeholder="15"
                    value={entryDuration}
                    onChange={(e) => setEntryDuration(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  内容语言
                </label>
                <select
                  value={entryLanguage}
                  onChange={(e) => setEntryLanguage(e.target.value as 'zh' | 'en')}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="zh">简体中文</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  数字分身 <span className="text-xs text-muted-foreground">（可选）</span>
                </label>
                <select
                  value={selectedTwinId}
                  onChange={(e) => setSelectedTwinId(e.target.value)}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">默认 AI 导师</option>
                  {availableTwins.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.isOwner ? '' : '（分享）'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  前置知识 <span className="text-xs text-muted-foreground">（可选，多个以「，」分隔）</span>
                </label>
                <Input
                  placeholder="例如：力，运动状态，惯性"
                  value={entryPrerequisites}
                  onChange={(e) => setEntryPrerequisites(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <Button
                size="lg"
                className="w-full h-12 mt-2"
                onClick={handleStartTaskDesign}
                disabled={!entryTopic.trim() || !(entrySubject === CUSTOM_SUBJECT_OPTION ? entryCustomSubject.trim() : entrySubject.trim())}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                开始任务设计
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Step 1: Learning Objective - Insta-Lesson style intro + form */}
      {step === 1 && (
        <div className="w-full">
          {!learningObjective.trim() ? (
            /* 引导页 - 小对话框效果（图标在对话框外） */
            <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Target className="w-7 h-7 text-amber-600" />
              </div>
              <Card className="flex-1 min-w-0 border border-gray-200 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <TypingText
                    text={`有效的课程，始于清晰、可评估的学习目标。

本系统采用独创的「掌握型任务」设计原则：每个目标都力求具体、可操作，便于后续选择学习素材、设计关键要点和练习题目，形成完整闭环。

我们会根据您填写的课程主题、学科、年级和难度，综合推荐一个学习目标。生成过程通常需要十到三十秒，请您耐心等待。`}
                    speed={35}
                    className="mb-6"
                  />
                  <div className="flex justify-end">
                    {taskDesignReady ? (
                      <Button
                        size="lg"
                        onClick={handleStartPlanning}
                        disabled={
                          !entryTopic.trim()
                          || !(entrySubject === CUSTOM_SUBJECT_OPTION ? entryCustomSubject.trim() : entrySubject.trim())
                          || objectiveLoading
                        }
                      >
                        {objectiveLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                          <ChevronRight className="w-5 h-5 mr-2" />
                        )}
                        选择学习目标
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        正在生成任务设计，请稍候…
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          ) : (
            /* 编辑页 - 横跨整个页面 */
            <Card className="w-full">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-2">学习目标</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  我们为您的任务推荐了以下学习目标，您也可以直接编辑，进行优化。
                </p>
                <Textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="例如：我可以解释牛顿第三定律，并举例说明作用力与反作用力。数学公式用 $...$ 表示，如 $F=ma$"
                  value={learningObjective}
                  onChange={(e) => setLearningObjective(e.target.value)}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => { setStep(0); setMaxStepReached(0); }}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一步
                  </Button>
                  <Button
                    onClick={() => {
                      if (!learningObjective.trim()) return;
                      const effectiveSubject = (entrySubject === CUSTOM_SUBJECT_OPTION ? entryCustomSubject : entrySubject).trim();
                      setError(null);
                      setKeyIdeas([]);
                      setKeyIdeasText('');
                      setKeyIdeasEditing(false);
                      setPracticeQuestions([]);
                      setEditingPracticeIndex(null);
                      setExitTicketQuestions([]);
                      setRestReady(false);
                      // 启动 task.json 生成（Phase 2），后台运行，用户选择素材时并行
                      const autoDifficulty = TASK_TYPE_DIFFICULTY[taskType];
                      const promise = generateTaskDesign({
                        subject: effectiveSubject,
                        topic: entryTopic.trim(),
                        grade: entryGrade,
                        duration: entryDuration.trim() || '15',
                        taskType,
                        difficulty: autoDifficulty,
                        prerequisites: entryPrerequisites || undefined,
                        objective: learningObjective.trim(),
                        language: entryLanguage,
                      });
                      promise
                        .then((res) => {
                          taskDesignJsonRef.current = res.json ?? null;
                          taskDesignMarkdownRef.current = res.markdown ?? null;
                          setRestReady(true);
                        })
                        .catch((e) => {
                          const message = e instanceof Error ? e.message : '生成任务内容失败';
                          setError(message);
                          void trackProductEvent({
                            eventName: 'task_design_generation_failed',
                            role: 'teacher',
                            teacherId: user?.id,
                            language: entryLanguage,
                            properties: {
                              source: 'TeachingResourcesPage',
                              stage: 'task_rest',
                              subject: effectiveSubject,
                              grade: entryGrade,
                              topic: entryTopic.trim(),
                              errorMessage: message,
                            },
                          }).catch(() => undefined);
                        });
                      setStep(2);
                      setMaxStepReached(2);
                    }}
                    disabled={!learningObjective.trim()}
                  >
                    选择教学素材 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Video Selection - Insta-Lesson style intro + form */}
      {step === 2 && (
        <div className="w-full">
          {!videoStepIntroDismissed ? (
            /* 引导页 - 小对话框效果（图标在对话框外） */
            <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Video className="w-7 h-7 text-emerald-600" />
              </div>
              <Card className="flex-1 min-w-0 border border-gray-200 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <TypingText
                    text={`当前默认视频来源为 ${preferredPlatformLabel}。

您可以使用推荐搜索，也可以直接粘贴视频链接，或上传视频/文档资料作为学习输入。`}
                    speed={35}
                    className="mb-6"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      onClick={async () => {
                        setVideoStepIntroDismissed(true);
                        const q = entryTopic.trim() || 'physics teaching';
                        setSearchQuery(q);
                        setLoading(true);
                        setError(null);
                        try {
                          const { items } = await searchVideos(q, 6, preferredVideoPlatform);
                          setSearchResults(items);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : '搜索视频失败');
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      <ChevronRight className="w-5 h-5 mr-2" />
                      选择教学素材
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          ) : (
        /* 编辑页 - 横跨整个页面 */
        <div className="space-y-6 w-full">
          <div>
            <h2 className="text-lg font-semibold mb-1">教学素材</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {`当前默认来源：${preferredPlatformLabel}。您可查看推荐视频，粘贴自定义视频链接， 或者直接上传资料。您也可以在下面的文本框输入学习指引，引导学生通过洋葱app 或者课本学习。`}
            </p>
            <div className="mb-4">
              <Input
                placeholder="Search keyword, e.g. Newton's first law (Enter to search)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchVideos()}
                className="max-w-sm"
              />
            </div>
          </div>

          {loading && searchResults.length === 0 && customVideoItems.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
              <Loader2 className="w-5 h-5 animate-spin" />
              正在为您搜索推荐视频…
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
              {[
                ...searchResults,
                ...customVideoItems.filter((c) => !searchResults.some((s) => getVideoItemKey(s) === getVideoItemKey(c))),
              ].map((item) => (
                <Card
                  key={getVideoItemKey(item)}
                  className="overflow-hidden hover:ring-2 hover:ring-primary transition-all group h-full grid grid-rows-[auto_1fr_auto] gap-0 min-h-0"
                >
                  <div className="relative aspect-video w-full bg-muted overflow-hidden">
                    {getVideoEmbedUrl(item) ? (
                      <iframe
                        src={getVideoEmbedUrl(item)!}
                        title={item.title}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : detectResourceKind(item) === 'video' ? (
                      <video
                        controls
                        className="absolute inset-0 w-full h-full object-cover"
                        src={item.url}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2 px-3 text-center">
                        <p>文档资料</p>
                        <a href={item.url} target="_blank" rel="noreferrer" className="underline">
                          打开文档
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="p-3 min-h-0 flex items-start">
                    <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                  </div>
                  <div className="p-3 pt-0">
                    {selectedVideoItem && getVideoItemKey(selectedVideoItem) === getVideoItemKey(item) ? (
                      <div
                        className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                        aria-label="已选中"
                      >
                        <Check className="h-3 w-3" />
                        已选中
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleSelectVideo(item)}
                        disabled={loading}
                      >
                        <Video className="w-3 h-3 mr-1" />
                        选用
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              <Card
                className="overflow-hidden border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
                onClick={() => document.getElementById('paste-url-input')?.focus()}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center flex-1 w-full">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                    <span className="text-2xl font-light text-muted-foreground">+</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">添加自定义视频</p>
                </CardContent>
              </Card>
              <Card
                className="overflow-hidden border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
                onClick={() => !uploadingResource && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="video/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadResource(file);
                    e.currentTarget.value = '';
                  }}
                />
                <CardContent className="p-6 flex flex-col items-center justify-center flex-1 w-full">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                    {uploadingResource ? (
                      <Loader2 className="w-7 h-7 text-muted-foreground animate-spin" />
                    ) : (
                      <Upload className="w-7 h-7 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {uploadingResource ? '正在上传…' : '上传资料'}
                  </p>
                </CardContent>
              </Card>
          </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Input
              id="paste-url-input"
              placeholder="Paste YouTube / Bilibili URL"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasteUrl()}
              className="max-w-md"
            />
            <Button onClick={handlePasteUrl} disabled={!pasteUrl.trim() || loading}>
              <LinkIcon className="w-4 h-4 mr-1" />
              获取
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">或输入学习指引（无视频/文档时）</p>
            <Textarea
              placeholder={'请打开洋葱APP学习（指定某单元某课），完成后进入下一步\n或者\n请学习课本内容（指定课本内容），完成后进入下一步'}
              value={customTextInstruction}
              onChange={(e) => setCustomTextInstruction(e.target.value)}
              className="min-h-[80px] resize-y max-w-6xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleUseTextInstruction();
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseTextInstruction}
              disabled={!customTextInstruction.trim()}
            >
              <FileText className="w-4 h-4 mr-1" />
              使用此指引
            </Button>
          </div>

          {videoContent && (
            <p className="text-sm text-green-700">
              {selectedVideoItem ? (
                <>已选素材：《{videoContent.title}》— 可点击下方按钮查看关键要点。</>
              ) : (
                <>已选学习指引：{videoContent.title}</>
              )}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              上一步
            </Button>
            <Button variant="outline" size="sm" onClick={handleSearchVideos} disabled={!searchQuery.trim() || loading}>
              <Search className="w-4 h-4 mr-1" />
              刷新
            </Button>
            <Button
              onClick={handleViewKeyIdeas}
              disabled={!videoContent}
            >
              查看关键要点 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
          )}
        </div>
      )}

      {/* Step 3: Key Ideas - 引导页 + 关键要点内容 */}
      {step === 3 && (
        <div className="w-full">
          {!keyIdeasIntroDismissed ? (
            /* 引导页 - 小对话框效果（图标在对话框外） */
            <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <ListOrdered className="w-7 h-7 text-emerald-600" />
              </div>
              <Card className="flex-1 min-w-0 border border-gray-200 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <TypingText
                    text={`学生阅读或者观看素材时应记录关键要点。

我们正在为您准备引导式笔记。`}
                    speed={35}
                    className="mb-6"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      onClick={() => setKeyIdeasIntroDismissed(true)}
                    >
                      查看关键要点 <ChevronRight className="w-5 h-5 mr-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          ) : (
            /* 编辑页 - 横跨整个页面 */
            <Card className="w-full">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-2">关键要点</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  默认展示渲染结果，点击下方区域进入编辑模式；编辑时每行一个要点，方便增减条目。可为每条添加配图（如示意图、地图、课文插图等）。
                </p>
                {!restReady ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    正在准备关键要点…
                  </div>
                ) : keyIdeasEditing ? (
                  <div className="mb-4 space-y-2">
                    <Textarea
                      className="min-h-[220px] text-sm"
                      value={keyIdeasText}
                      onChange={(e) => {
                        const nextText = e.target.value;
                        setKeyIdeasText(nextText);
                        setKeyIdeas(textToKeyIdeas(nextText, keyIdeas));
                      }}
                      autoFocus
                      placeholder={`每行一个关键要点，可自由增减条目。
示例：
根据 $F=ma$，**力**等于质量乘以加速度
惯性是物体保持原有运动状态的性质`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-fit"
                      onClick={() => setKeyIdeasEditing(false)}
                    >
                      完成编辑
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      ref={keyIdeaImageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const idx = keyIdeaImagePendingIndexRef.current;
                          handleKeyIdeaImageUpload(idx, file);
                        }
                        e.target.value = '';
                      }}
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setKeyIdeasEditing(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setKeyIdeasEditing(true);
                        }
                      }}
                      className="min-h-[220px] mb-4 rounded-md border px-3 py-3 cursor-text hover:border-slate-300 hover:bg-slate-50/60 transition-colors"
                    >
                      {keyIdeas.length > 0 ? (
                        <div className="space-y-4 text-sm">
                          {keyIdeas.map((idea, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                              <span className="shrink-0 text-muted-foreground pt-0.5">{idx + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <MathTextPreview text={keyIdeaToRaw(idea)} className="[&_p]:mb-0" />
                                <div className="mt-2 flex items-center gap-2">
                                  {idea.imageUrl ? (
                                    <>
                                      <img
                                        src={idea.imageUrl}
                                        alt=""
                                        className="h-20 w-auto max-w-[200px] rounded border object-contain bg-gray-50"
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-xs"
                                        onClick={(ev) => { ev.stopPropagation(); keyIdeaImagePendingIndexRef.current = idx; keyIdeaImageInputRef.current?.click(); }}
                                      >
                                        更换
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs"
                                      disabled={uploadingKeyIdeaIndex === idx}
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        keyIdeaImagePendingIndexRef.current = idx;
                                        keyIdeaImageInputRef.current?.click();
                                      }}
                                    >
                                      {uploadingKeyIdeaIndex === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                                      添加图片
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">暂无关键要点，点击此处开始编辑。</p>
                      )}
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一步
                  </Button>
                  <Button
                    onClick={() => { setStep(4); setMaxStepReached((m) => Math.max(m, 4)); }}
                    disabled={!restReady}
                  >
                    查看练习题目 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 4: Practice Questions - 引导页 + 编辑页 */}
      {step === 4 && (
        <div className="w-full">
          {!practiceIntroDismissed ? (
            /* 引导页 - 小对话框效果（图标在对话框外） */
            <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileQuestion className="w-7 h-7 text-emerald-600" />
              </div>
              <Card className="flex-1 min-w-0 border border-gray-200 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <TypingText
                    text="接下来，学生应运用所学知识。我们正在为您准备他们可以一起回答的练习题。"
                    speed={35}
                    className="mb-6"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      onClick={() => setPracticeIntroDismissed(true)}
                    >
                      查看练习题目 <ChevronRight className="w-5 h-5 mr-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          ) : (
            /* 编辑页 - 横跨整个页面 */
            <Card className="w-full">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-1">练习题目</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  点击题目进入编辑模式，或点击「显示答案」查看参考答案。可为每道题添加配图（如地图、图表、课文插图等）。
                </p>
                <input
                  ref={practiceImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePracticeImageUpload(practiceImagePendingIndexRef.current, file);
                    e.target.value = '';
                  }}
                />
            {practiceQuestions.length > 0 && (
              <div className="space-y-5 mb-6">
                {practiceQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-gray-600">{idx + 1}.</span>
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {q.questionType === 'true_false' || (!q.options?.length && /^(true|false)$/i.test((q.correctAnswer || '').trim())) ? '是非题' : q.options?.length ? '选择题' : '简答题'}
                      </span>
                      {q.options?.length ? (
                        <RefreshCw className="h-4 w-4 shrink-0 text-gray-400" />
                      ) : null}
                    </div>
                    {editingPracticeIndex === idx ? (
                      <div className="space-y-4">
                        <Textarea
                          className="font-medium text-gray-900 min-h-[60px]"
                          value={q.question}
                          onChange={(e) => {
                            const next = [...practiceQuestions];
                            next[idx] = { ...next[idx], question: e.target.value };
                            setPracticeQuestions(next);
                          }}
                          placeholder="题目内容，公式用 $...$ 表示"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          {q.imageUrl ? (
                            <>
                              <img
                                src={q.imageUrl}
                                alt=""
                                className="h-24 w-auto max-w-[240px] rounded border object-contain bg-gray-50"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => { practiceImagePendingIndexRef.current = idx; practiceImageInputRef.current?.click(); }}
                              >
                                更换图片
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={uploadingPracticeImageIndex === idx}
                              onClick={() => {
                                practiceImagePendingIndexRef.current = idx;
                                practiceImageInputRef.current?.click();
                              }}
                            >
                              {uploadingPracticeImageIndex === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                              添加题目配图
                            </Button>
                          )}
                        </div>
                        {q.options?.length ? (
                          <div className="space-y-2" role="radiogroup" aria-label={`第 ${idx + 1} 题选项`}>
                            {q.options.map((opt, j) => {
                              const selected = userSelections[idx] === j;
                              const revealed = !!showAnswers[idx];
                              const isCorrect = q.correctIndex === j;
                              const isWrong = revealed && selected && !isCorrect;
                              const showCorrect = revealed && isCorrect;
                              const showWrong = revealed && selected && isWrong;
                              return (
                                <div key={j} className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() =>
                                      setUserSelections((prev) => {
                                        const next = { ...prev };
                                        if (prev[idx] === j) delete next[idx];
                                        else next[idx] = j;
                                        return next;
                                      })
                                    }
                                    className={`
                                      flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium
                                      ${showCorrect ? 'bg-green-500 text-white' : ''}
                                      ${showWrong ? 'bg-red-400 text-white' : ''}
                                      ${!revealed || (!showCorrect && !showWrong) ? 'bg-gray-500 text-white' : ''}
                                    `}
                                  >
                                    {String.fromCharCode(65 + j)}
                                  </button>
                                  <Input
                                    className={`flex-1 ${
                                      showCorrect ? 'border-green-500 bg-green-50' : ''
                                    } ${showWrong ? 'border-red-400 bg-red-50' : ''}`}
                                    value={opt}
                                    onChange={(e) => {
                                      const next = [...practiceQuestions];
                                      const opts = [...(next[idx].options || [])];
                                      opts[j] = e.target.value;
                                      next[idx] = { ...next[idx], options: opts };
                                      setPracticeQuestions(next);
                                    }}
                                    placeholder={`选项 ${String.fromCharCode(65 + j)}`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                        <div className="rounded-lg bg-green-50 p-3 text-sm space-y-2">
                          <div>
                            <span className="font-medium text-green-800">参考答案：</span>
                            {(q.questionType === 'true_false' || (!q.options?.length && /^(true|false)$/i.test((q.correctAnswer || '').trim()))) ? (
                              <div className="flex gap-2 mt-2">
                                {['True', 'False'].map((val) => {
                                  const isSelected = (q.correctAnswer || '').trim().toLowerCase() === val.toLowerCase();
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => {
                                        const next = [...practiceQuestions];
                                        next[idx] = { ...next[idx], correctAnswer: val };
                                        setPracticeQuestions(next);
                                      }}
                                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                                        isSelected ? 'bg-green-200 border-green-600 text-green-900' : 'bg-white border-green-200 text-green-800 hover:bg-green-50'
                                      }`}
                                    >
                                      {val === 'True' ? '对 (True)' : '错 (False)'}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <Textarea
                                className="mt-1 min-h-[50px] border-green-200 bg-white"
                                value={q.correctAnswer || ''}
                                onChange={(e) => {
                                  const next = [...practiceQuestions];
                                  next[idx] = { ...next[idx], correctAnswer: e.target.value };
                                  setPracticeQuestions(next);
                                }}
                                placeholder="参考答案"
                              />
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-green-800">解析：</span>
                            <Textarea
                              className="mt-1 min-h-[50px] border-green-200 bg-white"
                              value={q.explanation || ''}
                              onChange={(e) => {
                                const next = [...practiceQuestions];
                                next[idx] = { ...next[idx], explanation: e.target.value };
                                setPracticeQuestions(next);
                              }}
                              placeholder="解析说明"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="w-fit" onClick={() => setEditingPracticeIndex(null)}>
                              完成编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                const next = practiceQuestions.filter((_, i) => i !== idx);
                                setPracticeQuestions(next);
                                setEditingPracticeIndex(null);
                                setShowAnswers((prev) => {
                                  const r: Record<number, boolean> = {};
                                  practiceQuestions.forEach((_, i) => {
                                    if (i !== idx) {
                                      const newIdx = i < idx ? i : i - 1;
                                      if (prev[i] !== undefined) r[newIdx] = prev[i];
                                    }
                                  });
                                  return r;
                                });
                                setUserSelections((prev) => {
                                  const r: Record<number, number> = {};
                                  practiceQuestions.forEach((_, i) => {
                                    if (i !== idx) {
                                      const newIdx = i < idx ? i : i - 1;
                                      if (prev[i] !== undefined) r[newIdx] = prev[i];
                                    }
                                  });
                                  return r;
                                });
                              }}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />删除
                            </Button>
                          </div>
                          </div>
                        ) : (
                      <>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setEditingPracticeIndex(idx)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingPracticeIndex(idx)}
                          className="min-h-[44px] px-3 py-2 rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-50/80 cursor-text transition-colors text-left mb-3"
                        >
                          <MathTextPreview text={q.question} className="font-medium text-gray-900 [&_p]:mb-0" />
                        </div>
                        {q.imageUrl ? (
                          <div className="mb-4 flex items-center gap-2">
                            <img
                              src={q.imageUrl}
                              alt=""
                              className="max-h-48 w-auto max-w-full rounded border object-contain bg-gray-50"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="shrink-0"
                              onClick={(e) => { e.stopPropagation(); practiceImagePendingIndexRef.current = idx; practiceImageInputRef.current?.click(); }}
                            >
                              更换
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mb-4"
                            disabled={uploadingPracticeImageIndex === idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              practiceImagePendingIndexRef.current = idx;
                              practiceImageInputRef.current?.click();
                            }}
                          >
                            {uploadingPracticeImageIndex === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                            添加题目配图
                          </Button>
                        )}
                        {(q.questionType === 'true_false' || (!q.options?.length && /^(true|false)$/i.test((q.correctAnswer || '').trim()))) ? (
                          <div className="flex gap-3 mb-4" role="radiogroup" aria-label="对或错">
                            {[
                              { v: 0, label: '对', correctVal: 'True' },
                              { v: 1, label: '错', correctVal: 'False' },
                            ].map(({ v, label, correctVal }) => {
                              const selected = userSelections[idx] === v;
                              const revealed = !!showAnswers[idx];
                              const isCorrect = (q.correctAnswer || '').trim().toLowerCase() === correctVal.toLowerCase();
                              const isWrong = revealed && selected && !isCorrect;
                              const showCorrect = revealed && isCorrect;
                              const showWrong = revealed && selected && isWrong;
                              return (
                                <button
                                  key={v}
                                  type="button"
                                  role="radio"
                                  aria-checked={selected}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUserSelections((prev) => {
                                      const next = { ...prev };
                                      if (prev[idx] === v) delete next[idx];
                                      else next[idx] = v;
                                      return next;
                                    });
                                  }}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                                    showCorrect ? 'bg-green-500 text-white border-green-600' : ''
                                  } ${showWrong ? 'bg-red-400 text-white border-red-500' : ''} ${
                                    !revealed || (!showCorrect && !showWrong) ? 'border-gray-300 bg-gray-100 text-gray-700' : ''
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        ) : q.options?.length ? (
                          <div className="space-y-2 mb-4" role="radiogroup" aria-label={`第 ${idx + 1} 题选项`}>
                            {q.options.map((opt, j) => {
                              const selected = userSelections[idx] === j;
                              const revealed = !!showAnswers[idx];
                              const isCorrect = q.correctIndex === j;
                              const isWrong = revealed && selected && !isCorrect;
                              const showCorrect = revealed && isCorrect;
                              const showWrong = revealed && selected && isWrong;
                              return (
                                <div key={j} className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={(e) => { e.stopPropagation(); setUserSelections((prev) => { const next = { ...prev }; if (prev[idx] === j) delete next[idx]; else next[idx] = j; return next; }); }}
                                    className={`
                                      flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium
                                      ${showCorrect ? 'bg-green-500 text-white' : ''}
                                      ${showWrong ? 'bg-red-400 text-white' : ''}
                                      ${!revealed || (!showCorrect && !showWrong) ? 'bg-gray-500 text-white' : ''}
                                    `}
                                  >
                                    {String.fromCharCode(65 + j)}
                                  </button>
                                  <MathTextPreview text={opt} className="flex-1 [&_p]:mb-0" />
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-sm text-gray-900 hover:text-gray-700"
                            onClick={(e) => { e.stopPropagation(); setShowAnswers((prev) => ({ ...prev, [idx]: !prev[idx] })); }}
                          >
                            <Eye className="h-4 w-4" />
                            {showAnswers[idx] ? '隐藏答案' : '显示答案'}
                          </button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-auto py-0 px-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = practiceQuestions.filter((_, i) => i !== idx);
                              setPracticeQuestions(next);
                              setShowAnswers((prev) => {
                                const r: Record<number, boolean> = {};
                                practiceQuestions.forEach((_, i) => {
                                  if (i !== idx) {
                                    const newIdx = i < idx ? i : i - 1;
                                    if (prev[i] !== undefined) r[newIdx] = prev[i];
                                  }
                                });
                                return r;
                              });
                              setUserSelections((prev) => {
                                const r: Record<number, number> = {};
                                practiceQuestions.forEach((_, i) => {
                                  if (i !== idx) {
                                    const newIdx = i < idx ? i : i - 1;
                                    if (prev[i] !== undefined) r[newIdx] = prev[i];
                                  }
                                });
                                return r;
                              });
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />删除
                          </Button>
                        </div>
                        {showAnswers[idx] && (
                          <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm space-y-2">
                            <div>
                              <span className="font-medium text-green-800">参考答案：</span>
                              <MathTextPreview text={q.correctAnswer || ''} className="mt-1 [&_p]:mb-0" />
                            </div>
                            {q.explanation && (
                              <div>
                                <span className="font-medium text-green-800">解析：</span>
                                <MathTextPreview text={q.explanation} className="mt-1 [&_p]:mb-0" />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一步
                  </Button>
                  <Button onClick={() => { setStep(5); setMaxStepReached((m) => Math.max(m, 5)); }}>
                    查看离场券 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 5: Exit Ticket - 引导页 + 编辑页 */}
      {step === 5 && (
        <div className="w-full">
          {!exitTicketIntroDismissed ? (
            /* 引导页 - 小对话框效果（图标在对话框外） */
            <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Ticket className="w-7 h-7 text-emerald-600" />
              </div>
              <Card className="flex-1 min-w-0 border border-gray-200 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <TypingText
                    text="课程结束时，学生应展示所学内容。我们为您准备了离场券，让检验学习效果更顺畅。"
                    speed={35}
                    className="mb-6"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      onClick={() => setExitTicketIntroDismissed(true)}
                    >
                      查看离场券 <ChevronRight className="w-5 h-5 mr-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          ) : (
            /* 编辑页 - 横跨整个页面 */
            <Card className="w-full">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-2">离场券</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  课程结束时用题目检验学习效果。点击题目进入编辑模式。可为每道题添加配图（如地图、图表等）。
                </p>
                <input
                  ref={exitTicketImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleExitTicketImageUpload(exitTicketImagePendingIndexRef.current, file);
                    e.target.value = '';
                  }}
                />
                {exitTicketQuestions.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {exitTicketQuestions.map((q, idx) => (
                      <div key={idx} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <label className="font-medium text-gray-900 block mb-2">{idx + 1}. 题目</label>
                        {editingExitTicketIndex === idx ? (
                          <div className="space-y-3">
                            <Textarea
                              className="mb-2 min-h-[60px]"
                              value={q.question}
                              onChange={(e) => {
                                const next = [...exitTicketQuestions];
                                next[idx] = { ...next[idx], question: e.target.value };
                                setExitTicketQuestions(next);
                              }}
                              placeholder="题目内容，公式用 $...$ 表示"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              {q.imageUrl ? (
                                <>
                                  <img
                                    src={q.imageUrl}
                                    alt=""
                                    className="h-24 w-auto max-w-[240px] rounded border object-contain bg-gray-50"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { exitTicketImagePendingIndexRef.current = idx; exitTicketImageInputRef.current?.click(); }}
                                  >
                                    更换图片
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={uploadingExitTicketImageIndex === idx}
                                  onClick={() => {
                                    exitTicketImagePendingIndexRef.current = idx;
                                    exitTicketImageInputRef.current?.click();
                                  }}
                                >
                                  {uploadingExitTicketImageIndex === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                                  添加题目配图
                                </Button>
                              )}
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">参考答案</label>
                              <Textarea
                                className="mt-1 min-h-[50px]"
                                value={q.correctAnswer || ''}
                                onChange={(e) => {
                                  const next = [...exitTicketQuestions];
                                  next[idx] = { ...next[idx], correctAnswer: e.target.value };
                                  setExitTicketQuestions(next);
                                }}
                                placeholder="参考答案"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="w-fit" onClick={() => setEditingExitTicketIndex(null)}>
                                完成编辑
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  const next = exitTicketQuestions.filter((_, i) => i !== idx);
                                  setExitTicketQuestions(next);
                                  setEditingExitTicketIndex(null);
                                  setShowExitAnswers((prev) => {
                                    const r: Record<number, boolean> = {};
                                    exitTicketQuestions.forEach((_, i) => {
                                      if (i !== idx) {
                                        const newIdx = i < idx ? i : i - 1;
                                        if (prev[i] !== undefined) r[newIdx] = prev[i];
                                      }
                                    });
                                    return r;
                                  });
                                }}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />删除
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setEditingExitTicketIndex(idx)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingExitTicketIndex(idx)}
                              className="min-h-[44px] px-3 py-2 rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-50/80 cursor-text transition-colors text-left mb-2"
                            >
                              <MathTextPreview text={q.question} className="font-medium text-gray-900 [&_p]:mb-0" />
                            </div>
                            {q.imageUrl ? (
                              <div className="mb-3 flex items-center gap-2">
                                <img
                                  src={q.imageUrl}
                                  alt=""
                                  className="max-h-48 w-auto max-w-full rounded border object-contain bg-gray-50"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="shrink-0"
                                  onClick={(e) => { e.stopPropagation(); exitTicketImagePendingIndexRef.current = idx; exitTicketImageInputRef.current?.click(); }}
                                >
                                  更换
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="mb-3"
                                disabled={uploadingExitTicketImageIndex === idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exitTicketImagePendingIndexRef.current = idx;
                                  exitTicketImageInputRef.current?.click();
                                }}
                              >
                                {uploadingExitTicketImageIndex === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                                添加题目配图
                              </Button>
                            )}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-0 text-xs"
                                onClick={(e) => { e.stopPropagation(); setShowExitAnswers((prev) => ({ ...prev, [idx]: !prev[idx] })); }}
                              >
                                {showExitAnswers[idx] ? '隐藏答案' : '显示答案'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-auto py-0 px-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const next = exitTicketQuestions.filter((_, i) => i !== idx);
                                  setExitTicketQuestions(next);
                                  setShowExitAnswers((prev) => {
                                    const r: Record<number, boolean> = {};
                                    exitTicketQuestions.forEach((_, i) => {
                                      if (i !== idx) {
                                        const newIdx = i < idx ? i : i - 1;
                                        if (prev[i] !== undefined) r[newIdx] = prev[i];
                                      }
                                    });
                                    return r;
                                  });
                                }}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />删除
                              </Button>
                            </div>
                            {showExitAnswers[idx] && (
                              <div className="mt-2">
                                <label className="text-sm font-medium text-gray-700">参考答案</label>
                                <MathTextPreview text={q.correctAnswer || ''} className="mt-1 [&_p]:mb-0" />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(4)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一步
                  </Button>
                  <Button onClick={handleGenerateTask}>
                    生成学习任务 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 6: Generating Task (引导页 - 生成中) */}
      {step === 6 && (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-indigo-600" />
            </div>
            <Card className="flex-1 min-w-0 border border-gray-200 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <TypingText
                  text={`我们正在为您生成学习任务……

• 一份学生任务单，供学习者完成。
• 带有 AI 互动引导的线上学习环境。
• 关键要点、练习题和离场券。

掌握型学习任务非常适合：
• 帮助学生查漏补缺。
• 巩固课堂所学知识。
• 支持学生自主学习。

当您需要一份学习任务，我们就在这里。`}
                  speed={30}
                  className="mb-6"
                />
                {generateError ? (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600">{generateError}</p>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setStep(5)}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        返回编辑
                      </Button>
                      <Button onClick={handleGenerateTask}>
                        重新生成
                      </Button>
                    </div>
                  </div>
                ) : taskGenerating ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">正在保存至云端并生成预览链接…</span>
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <Button onClick={() => { setStep(7); setMaxStepReached((m) => Math.max(m, 7)); }}>
                      任务完成，点击展示 <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 7: Task Generated (完成页) */}
      {step === 7 && generatedTask && (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-indigo-600" />
            </div>
            <Card className="flex-1 min-w-0 border border-gray-200 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <p className="text-base mb-2">
                  您的学习任务已生成完毕！
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 mb-6">
                  <li>• 主题：{generatedTask.title}</li>
                  <li>• 视频：{selectedVideoItem?.title ?? '无'}</li>
                  <li>• 关键要点：{keyIdeas.length} 条</li>
                  <li>• 练习题目：{practiceQuestions.length} 题</li>
                  {exitTicketQuestions.length > 0 && (
                    <li>• 离场券：{exitTicketQuestions.length} 题</li>
                  )}
                </ul>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep(5)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一页
                  </Button>
                  <Button variant="outline" onClick={handleExportTask} disabled={pdfExporting}>
                    {pdfExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                    导出任务文档(PDF)
                  </Button>
                  <Button variant="outline" onClick={handleExportTaskMarkdown}>
                    <Download className="w-4 h-4 mr-1" />
                    导出任务文档(MD)
                  </Button>
                  <Button
                    onClick={() => {
                      if (previewUrl) {
                        window.open(previewUrl, '_blank');
                      }
                    }}
                    disabled={!previewUrl}
                  >
                    预览线上任务 <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

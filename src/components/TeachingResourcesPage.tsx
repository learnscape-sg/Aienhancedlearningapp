'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Search,
  Link as LinkIcon,
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
} from 'lucide-react';
import {
  searchVideos,
  generateTaskDesign,
  createCourse,
  saveTask,
} from '../lib/backendApi';
import { useAuth } from './AuthContext';
import {
  getTeacherPreferencesFromProfile,
  prefSubjectIdToDisplay,
  GRADE_OPTIONS,
} from '../hooks/useTeacherPreferences';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { TypingText } from './ui/typing-text';
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
  { id: 2, key: 'video', label: '视频选择', icon: Video },
  { id: 3, key: 'keyIdeas', label: '关键要点', icon: ListOrdered },
  { id: 4, key: 'practice', label: '练习题目', icon: FileQuestion },
  { id: 5, key: 'exitTicket', label: '离场券', icon: Ticket },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') {
      return parsed.searchParams.get('v');
    }
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.replace(/^\//, '').split('/')[0] || null;
    }
    return null;
  } catch {
    return null;
  }
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

/** Render key idea text with __KEY__ replaced by highlighted blanks */
function KeyIdeaBlock({ idea }: { idea: KeyIdea }) {
  const parts = idea.text.split('__KEY__');
  const blanks = idea.blanks || [];
  return (
    <p className="text-sm">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="inline-block bg-green-100 border-2 border-green-600 px-2 py-0.5 rounded-md font-medium text-foreground mx-0.5">
              {blanks[i] ?? '______'}
            </span>
          )}
        </span>
      ))}
    </p>
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

/** Build a single SystemTask from the collected task-design data */
function buildSystemTask(opts: {
  topic: string;
  subject: string;
  grade: string;
  difficulty: string;
  learningObjective: string;
  selectedVideoItem: VideoSearchItem | null;
  keyIdeas: KeyIdea[];
  practiceQuestions: GeneratedQuestion[];
  exitTicketQuestion: GeneratedQuestion | null;
  taskDesignJson: Record<string, unknown> | null;
  taskDesignMarkdown: string | null;
}): SystemTask {
  const videoUrl = opts.selectedVideoItem?.url
    ?? (opts.selectedVideoItem?.id
      ? `https://www.youtube.com/watch?v=${opts.selectedVideoItem.id}`
      : '');

  return {
    id: `task-${Date.now()}`,
    title: opts.topic,
    viewType: 'video_player',
    assetType: 'video_gen',
    externalResourceUrl: videoUrl,
    contentPayload: JSON.stringify({
      learningObjective: opts.learningObjective,
      keyIdeas: opts.keyIdeas,
      practiceQuestions: opts.practiceQuestions,
      exitTicket: opts.exitTicketQuestion,
      taskDesignJson: opts.taskDesignJson,
    }),
    // video_player should use externalResourceUrl (YouTube URL or media URL),
    // not markdown content.
    generatedAssetContent: '',
    description: [
      `学习目标：${opts.learningObjective}`,
      opts.selectedVideoItem ? `视频：${opts.selectedVideoItem.title}` : '',
      `关键要点：${opts.keyIdeas.length} 条`,
      `练习题目：${opts.practiceQuestions.length} 题`,
      opts.exitTicketQuestion ? `离场券：1 题` : '',
    ].filter(Boolean).join('\n'),
    assetPrompt: '',
    outputGoal: opts.learningObjective,
    learningGoalId: undefined,
    tutorConfig: {
      systemInstruction: [
        `你是学生的学习助手。本节课主题是「${opts.topic}」（${opts.subject}，${opts.grade}）。`,
        `学习目标：${opts.learningObjective}`,
        `学生将观看视频并完成以下任务：`,
        `1. 记录关键要点（${opts.keyIdeas.length} 条）`,
        `2. 完成练习题目（${opts.practiceQuestions.length} 题）`,
        `3. 完成离场券`,
        `请引导学生逐步完成任务，鼓励他们思考并给出提示，但不要直接给出答案。`,
      ].join('\n'),
      tone: '鼓励、耐心、引导式',
    },
    evaluationCriteria: [
      `关键要点：能正确填写 ${opts.keyIdeas.length} 条要点中的核心术语`,
      `练习题目：正确率达到 80% 以上`,
      opts.exitTicketQuestion ? `离场券：能正确回答离场券问题` : '',
    ].filter(Boolean).join('\n'),
  };
}

const SUBJECT_OPTIONS = [
  '语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '其他',
];

const DIFFICULTY_OPTIONS = ['基础', '提高', '拔尖'] as const;

const TASK_TYPES = [
  { id: 'mastery', label: '掌握型任务', available: true },
  { id: 'guided', label: '引导型任务', available: false },
  { id: 'autonomous', label: '自主型任务', available: false },
] as const;

export function TeachingResourcesPage() {
  const { user, preferences } = useAuth();
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [taskType, setTaskType] = useState<'mastery' | 'guided' | 'autonomous'>('mastery');
  const [entrySubject, setEntrySubject] = useState('物理');
  const [entryTopic, setEntryTopic] = useState('牛顿第一定律');
  const [entryGrade, setEntryGrade] = useState('高一');
  const [entryDuration, setEntryDuration] = useState('15');
  const [entryDifficulty, setEntryDifficulty] = useState('基础');
  const [entryPrerequisites, setEntryPrerequisites] = useState('力，运动状态，惯性');
  const [learningObjective, setLearningObjective] = useState('');
  const [videoContent, setVideoContent] = useState<VideoContentResult | null>(null);
  const [selectedVideoItem, setSelectedVideoItem] = useState<VideoSearchItem | null>(null);
  const [keyIdeas, setKeyIdeas] = useState<KeyIdea[]>([]);
  const [practiceQuestions, setPracticeQuestions] = useState<GeneratedQuestion[]>([]);
  const [exitTicketQuestion, setExitTicketQuestion] = useState<GeneratedQuestion | null>(null);
  const [showExitAnswer, setShowExitAnswer] = useState(false);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [userSelections, setUserSelections] = useState<Record<number, number>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VideoSearchItem[]>([]);
  const [customVideoItems, setCustomVideoItems] = useState<VideoSearchItem[]>([]);
  const [pasteUrl, setPasteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectiveLoading, setObjectiveLoading] = useState(false);
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

  const hasPrefilledRef = useRef(false);
  useEffect(() => {
    if (hasPrefilledRef.current) return;
    hasPrefilledRef.current = true;
    const prefs = getTeacherPreferencesFromProfile(preferences);
    if (prefs.defaultGrade && GRADE_OPTIONS.some((g) => g === prefs.defaultGrade)) setEntryGrade(prefs.defaultGrade);
    const subjectDisplay = prefSubjectIdToDisplay(prefs.defaultSubject);
    if (subjectDisplay && SUBJECT_OPTIONS.includes(subjectDisplay)) setEntrySubject(subjectDisplay);
  }, [preferences?.defaultGrade, preferences?.defaultSubject]);

  const completedSteps = new Set<number>();
  if (learningObjective.trim()) completedSteps.add(1);
  if (videoContent) completedSteps.add(2);
  if (keyIdeas.length > 0) completedSteps.add(3);
  if (practiceQuestions.length > 0) completedSteps.add(4);
  if (exitTicketQuestion) completedSteps.add(5);

  const handleStartTaskDesign = () => {
    const topic = entryTopic.trim();
    if (!topic) return;
    setTaskDesignReady(false);
    const promise = generateTaskDesign({
      subject: entrySubject,
      topic,
      grade: entryGrade,
      duration: entryDuration.trim() || '15',
      difficulty: entryDifficulty || undefined,
      prerequisites: entryPrerequisites || undefined,
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
      setError(e instanceof Error ? e.message : '生成学习目标失败');
    } finally {
      setObjectiveLoading(false);
    }
  };

  const handleSearchVideos = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const { items } = await searchVideos(q, 6);
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
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      setError('请输入有效的 YouTube 视频链接');
      return;
    }
    if (searchResults.some((v) => v.id === videoId) || customVideoItems.some((v) => v.id === videoId)) {
      setError('该视频已在列表中');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      );
      let title = '自定义视频';
      if (res.ok) {
        const data = await res.json();
        if (data?.title) title = data.title;
      }
      const item: VideoSearchItem = {
        id: videoId,
        title,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        url,
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
    setError(null);
  };

  const handleViewKeyIdeas = () => {
    const json = taskDesignJsonRef.current;
    const keyPoints = (json?.key_points as string[] | undefined) || [];
    setKeyIdeas(keyPoints.map((t) => parseKeyPointToKeyIdea(t)));
    setStep(3);
    setMaxStepReached((m) => Math.max(m, 3));
  };

  // 进入 Step 4 时从 json.practice 填充练习题目
  useEffect(() => {
    if (step !== 4 || practiceQuestions.length > 0) return;
    const json = taskDesignJsonRef.current;
    const practice = json?.practice as {
      guided_practice?: { q: string; a: string }[];
      independent_practice?: { q: string; a: string }[];
      we_do?: { q: string; a: string }[];
      you_do?: { q: string; a: string }[];
    } | undefined;
    if (!practice) return;
    const list: GeneratedQuestion[] = [];
    const guided = practice.guided_practice || practice.we_do || [];
    const independent = practice.independent_practice || practice.you_do || [];
    guided.forEach((item) => {
      if (item?.q) list.push({ question: item.q, correctAnswer: item.a });
    });
    independent.forEach((item) => {
      if (item?.q) list.push({ question: item.q, correctAnswer: item.a });
    });
    if (list.length > 0) setPracticeQuestions(list);
  }, [step, practiceQuestions.length]);

  // 进入 Step 5 时从 json.exit_ticket 填充离场券
  useEffect(() => {
    if (step !== 5 || exitTicketQuestion) return;
    const json = taskDesignJsonRef.current;
    const exitTicket = json?.exit_ticket as { items?: { q: string; a: string }[] } | undefined;
    const items = exitTicket?.items || [];
    const first = items[0];
    if (first?.q) setExitTicketQuestion({ question: first.q, correctAnswer: first.a });
  }, [step, exitTicketQuestion]);

  const handleGenerateTask = async () => {
    setTaskGenerating(true);
    setGenerateError(null);
    setPreviewUrl(null);
    setStep(6);
    setMaxStepReached((m) => Math.max(m, 6));

    try {
      // 1. Build the SystemTask from local data
      const task = buildSystemTask({
        topic: entryTopic,
        subject: entrySubject,
        grade: entryGrade,
        difficulty: entryDifficulty,
        learningObjective,
        selectedVideoItem,
        keyIdeas,
        practiceQuestions,
        exitTicketQuestion,
        taskDesignJson: taskDesignJsonRef.current,
        taskDesignMarkdown: taskDesignMarkdownRef.current,
      });
      setGeneratedTask(task);

      // 2. Save task to tasks table, then create course from taskIds
      const { taskId } = await saveTask(task, user?.id, {
        subject: entrySubject,
        grade: entryGrade,
        topic: entryTopic,
        taskType,
        durationMin: parseInt(entryDuration, 10) || 15,
        difficulty: entryDifficulty,
        prerequisites: entryPrerequisites,
      });
      const result = await createCourse({ taskIds: [taskId] }, user?.id);
      setPreviewUrl(result.url);

      // 3. Stay on step 6; user clicks button to proceed
      setTaskGenerating(false);
    } catch (err) {
      console.error('Failed to generate task:', err);
      setGenerateError(err instanceof Error ? err.message : '生成任务失败，请重试');
      setTaskGenerating(false);
    }
  };

  const handleExportTask = () => {
    const markdown = taskDesignMarkdownRef.current;
    if (!markdown?.trim()) {
      window.alert('暂无可导出的任务文档');
      return;
    }
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `学习任务-${entryTopic}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleExportFull = () => {
    const markdown = taskDesignMarkdownRef.current;
    let text: string;
    let ext: string;
    if (markdown?.trim()) {
      text = markdown;
      ext = '.md';
    } else {
      const lines: string[] = [];
      lines.push('# 学习目标');
      lines.push(learningObjective);
      lines.push('');
      if (videoContent?.title) {
        lines.push('# 教学视频');
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
      if (exitTicketQuestion) {
        lines.push('# 离场券');
        lines.push(exitTicketQuestion.question);
        if (exitTicketQuestion.correctAnswer)
          lines.push(`参考答案：${exitTicketQuestion.correctAnswer}`);
      }
      text = lines.join('\n');
      ext = '.txt';
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `课程-${Date.now()}${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
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
        <p className="text-sm text-destructive mb-2">{error}</p>
      )}

      {/* Entry Page (step 0) */}
      {step === 0 && (
        <div className="max-w-2xl mx-auto w-full">
        <Card className="border-2">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground">为任意学习者设计学习任务</h2>
              <p className="text-sm text-muted-foreground mt-1">
                填写基础信息，两分钟内生成个性化学习与巩固活动
              </p>
            </div>
            <div className="grid gap-4 max-w-xl mx-auto">
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
                  onKeyDown={(e) => e.key === 'Enter' && entryTopic.trim() && handleStartTaskDesign()}
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
                  难度 <span className="text-xs text-muted-foreground">（可选）</span>
                </label>
                <select
                  value={entryDifficulty}
                  onChange={(e) => setEntryDifficulty(e.target.value)}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">请选择</option>
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
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
                disabled={!entryTopic.trim()}
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
            <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Target className="w-7 h-7 text-amber-600" />
              </div>
              <Card className="flex-1 min-w-0 border border-gray-200 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <TypingText
                    text={`有效的课程，始于清晰、可评估的学习目标。

本系统采用独创的「掌握型任务」设计原则：每个目标都力求具体、可操作，便于后续选择视频、设计关键要点和练习题目，形成完整闭环。

我们会根据您填写的课程主题、学科、年级和难度，综合推荐一个学习目标。生成过程通常需要十到三十秒，请您耐心等待。`}
                    speed={35}
                    className="mb-6"
                  />
                  <div className="flex justify-end">
                    {taskDesignReady ? (
                      <Button
                        size="lg"
                        onClick={handleStartPlanning}
                        disabled={!entryTopic.trim() || objectiveLoading}
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
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="例如：我可以解释牛顿第三定律，并举例说明作用力与反作用力。"
                  value={learningObjective}
                  onChange={(e) => setLearningObjective(e.target.value)}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => { setStep(0); setMaxStepReached(0); }}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一步
                  </Button>
                  <Button
                    onClick={() => { setStep(2); setMaxStepReached(2); }}
                    disabled={!learningObjective.trim()}
                  >
                    选择教学视频 <ChevronRight className="w-4 h-4 ml-1" />
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
            <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Video className="w-7 h-7 text-emerald-600" />
              </div>
              <Card className="flex-1 min-w-0 border border-gray-200 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <TypingText
                    text={`不同学习者有不同的需求。这意味着传统以教师为主导的课堂往往难以吸引每一位学生，这对教师来说也是一种压力。

但如果让学生观看视频呢？学生可以按自己的节奏学习，而成人提供鼓励与支持。这样，每个人都能成功！

我们正在扫描经过审核的教育类 YouTube 频道，分析视频内容与字幕……为您找到高质量、适龄的教学内容，帮助每位学生有效学习。`}
                    speed={35}
                    className="mb-6"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      onClick={async () => {
                        setVideoStepIntroDismissed(true);
                        const q = entryTopic.trim() || '物理 教学';
                        setSearchQuery(q);
                        setLoading(true);
                        setError(null);
                        try {
                          const { items } = await searchVideos(q, 6);
                          setSearchResults(items);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : '搜索视频失败');
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      <ChevronRight className="w-5 h-5 mr-2" />
                      选择教学视频
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
            <h2 className="text-lg font-semibold mb-1">教学视频</h2>
            <p className="text-sm text-muted-foreground mb-4">
              查看我们为您推荐的视频，选择一支供学生观看，或者通过粘贴视频的 URL 来添加自定义视频。
            </p>
            <div className="mb-4">
              <Input
                placeholder="搜索关键词，如：牛顿第一定律（按 Enter 搜索）"
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
                ...customVideoItems.filter((c) => !searchResults.some((s) => s.id === c.id)),
              ].map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:ring-2 hover:ring-primary transition-all group h-full grid grid-rows-[auto_1fr_auto] gap-0 min-h-0"
                >
                  <div className="relative aspect-video w-full bg-muted overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${item.id}`}
                      title={item.title}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-3 min-h-0 flex items-start">
                    <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                  </div>
                  <div className="p-3 pt-0">
                    {selectedVideoItem?.id === item.id ? (
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
          </div>
          )}

          <div className="flex gap-2 pt-2">
            <Input
              id="paste-url-input"
              placeholder="或粘贴 YouTube 视频链接"
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

          {videoContent && (
            <p className="text-sm text-green-700">
              已选视频：《{videoContent.title}》— 可点击下方按钮查看关键要点。
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
            <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <ListOrdered className="w-7 h-7 text-emerald-600" />
              </div>
              <Card className="flex-1 min-w-0 border border-gray-200 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <TypingText
                    text={`学生观看视频时应记录关键要点。

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
                  学生观看视频时可填写高亮术语。您可直接编辑下方内容。
                </p>
                {keyIdeas.length > 0 && (
                  <ol className="list-decimal list-inside space-y-3 text-sm mb-4">
                    {keyIdeas.map((idea, idx) => (
                      <li key={idx}>
                        <KeyIdeaBlock idea={idea} />
                      </li>
                    ))}
                  </ol>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一步
                  </Button>
                  <Button onClick={() => { setStep(4); setMaxStepReached((m) => Math.max(m, 4)); }}>
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
            <div className="max-w-2xl mx-auto">
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
                  您可直接编辑下列题目，或点击「显示答案」查看参考答案。
                </p>
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
                        {q.options?.length ? '选择题' : '简答题'}
                      </span>
                      {q.options?.length ? (
                        <RefreshCw className="h-4 w-4 shrink-0 text-gray-400" />
                      ) : null}
                    </div>
                    <p className="font-medium text-gray-900 mb-4">{q.question}</p>
                    {q.options?.length ? (
                      <div className="space-y-2 mb-4" role="radiogroup" aria-label={`第 ${idx + 1} 题选项`}>
                        {q.options.map((opt, j) => {
                          const selected = userSelections[idx] === j;
                          const revealed = !!showAnswers[idx];
                          const isCorrect = q.correctIndex === j;
                          const isWrong = revealed && selected && !isCorrect;
                          const showCorrect = revealed && isCorrect;
                          const showWrong = revealed && selected && isWrong;
                          return (
                            <button
                              key={j}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              aria-label={`选项 ${String.fromCharCode(65 + j)}: ${opt}`}
                              onClick={() =>
                                setUserSelections((prev) => {
                                  const next = { ...prev };
                                  if (prev[idx] === j) delete next[idx];
                                  else next[idx] = j;
                                  return next;
                                })
                              }
                              className={`
                                w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left
                                transition-colors cursor-pointer border-2
                                hover:border-gray-400 hover:bg-gray-50
                                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-400
                                ${selected && !revealed ? 'border-amber-500 bg-amber-50/80' : 'border-transparent bg-gray-100'}
                                ${showCorrect ? 'border-green-500 bg-green-50' : ''}
                                ${showWrong ? 'border-red-400 bg-red-50' : ''}
                              `}
                            >
                              <span
                                className={`
                                  flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium
                                  ${showCorrect ? 'bg-green-500 text-white' : ''}
                                  ${showWrong ? 'bg-red-400 text-white' : ''}
                                  ${!revealed || (!showCorrect && !showWrong) ? 'bg-gray-500 text-white' : ''}
                                `}
                              >
                                {String.fromCharCode(65 + j)}
                              </span>
                              <span className={showCorrect ? 'font-medium text-green-800' : showWrong ? 'text-red-800' : 'text-gray-800'}>
                                {opt}
                                {showCorrect && ' ✓'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-sm text-gray-900 hover:text-gray-700"
                      onClick={() =>
                        setShowAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }))
                      }
                    >
                      <Eye className="h-4 w-4" />
                      {showAnswers[idx] ? '隐藏答案' : '显示答案'}
                    </button>
                    {showAnswers[idx] && (q.correctAnswer || q.explanation) && (
                      <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm">
                        {q.correctAnswer && (
                          <p className="font-medium text-green-800">参考答案：{q.correctAnswer}</p>
                        )}
                        {q.explanation && (
                          <p className="mt-1 text-green-700/90">解析：{q.explanation}</p>
                        )}
                      </div>
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
            <div className="max-w-2xl mx-auto">
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
                  课程结束时用一道题检验学习效果。可编辑。
                </p>
                {exitTicketQuestion && (
                  <div className="space-y-2 mb-4">
                    <p className="font-medium">{exitTicketQuestion.question}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-0 text-xs"
                      onClick={() => setShowExitAnswer((a) => !a)}
                    >
                      {showExitAnswer ? '隐藏答案' : '显示答案'}
                    </Button>
                    {showExitAnswer && exitTicketQuestion.correctAnswer && (
                      <p className="text-sm text-muted-foreground">
                        参考答案：{exitTicketQuestion.correctAnswer}
                      </p>
                    )}
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
        <div className="max-w-2xl mx-auto">
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
        <div className="max-w-2xl mx-auto">
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
                  {exitTicketQuestion && <li>• 离场券：1 题</li>}
                </ul>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep(5)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一页
                  </Button>
                  <Button variant="outline" onClick={handleExportTask}>
                    <Download className="w-4 h-4 mr-1" />
                    导出任务文档
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

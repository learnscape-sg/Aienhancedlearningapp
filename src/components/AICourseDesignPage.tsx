import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { Progress } from './ui/progress';
import {
  Target,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Layers,
  ChevronDown,
  Download,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from './AuthContext';
import {
  getTeacherPreferencesFromProfile,
  prefSubjectIdToDisplay,
  GRADE_OPTIONS,
} from '../hooks/useTeacherPreferences';
import { usePublishedCourses } from './PublishedCoursesContext';
import {
  generateCurriculumDesign,
  generateTaskDocuments,
  generateSystemTaskPlan,
  generateTaskAsset,
  saveTask,
  createCourse,
  uploadMaterialResource,
  trackProductEvent,
} from '../lib/backendApi';
import type {
  CurriculumDesign,
  TaskDocuments,
  SystemTaskPlan,
} from '../types/backend';
import { saveCourseMetaToSupabase } from '../lib/coursesRepository';
import { downloadMarkdownAsPdf, markdownToPdfBlob } from '../lib/markdownToPdf';
import { SUBJECT_OPTIONS, CUSTOM_SUBJECT_OPTION, splitSubjectValue } from '../lib/subjects';
import { TaskPreviewEdit } from './TaskPreviewEdit';
import { useFirstClickHint } from './guides/useFirstClickHint';
import { FirstClickHintDialog } from './guides/FirstClickHintDialog';

type Step = 'form' | 'generating' | 'preview' | 'created';

type GenStep = 'curriculum' | 'documents' | 'tasks' | 'assets';

const needsAssetGeneration = (assetType: string): boolean =>
  assetType !== 'editable_text' && assetType !== 'math_editable';

const createGenerationBatchId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

const downloadMarkdownFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

async function persistMarkdownAndPdfAssets(params: {
  markdown: string;
  mdFileName: string;
  pdfFileName: string;
  mdKey: string;
  mdLabel: string;
  pdfKey: string;
  pdfLabel: string;
}): Promise<PersistedDocumentAsset[]> {
  const assets: PersistedDocumentAsset[] = [];
  const now = new Date().toISOString();

  const mdFile = new File([params.markdown], params.mdFileName, { type: 'text/markdown;charset=utf-8' });
  const mdUploaded = await uploadMaterialResource(mdFile);
  assets.push({
    key: params.mdKey,
    label: params.mdLabel,
    format: 'md',
    url: mdUploaded.url,
    bucket: mdUploaded.bucket,
    objectPath: mdUploaded.objectPath,
    mimeType: mdUploaded.mimeType,
    updatedAt: now,
  });

  const pdfBlob = await markdownToPdfBlob(params.markdown);
  const pdfFile = new File([pdfBlob], params.pdfFileName, { type: 'application/pdf' });
  const pdfUploaded = await uploadMaterialResource(pdfFile);
  assets.push({
    key: params.pdfKey,
    label: params.pdfLabel,
    format: 'pdf',
    url: pdfUploaded.url,
    bucket: pdfUploaded.bucket,
    objectPath: pdfUploaded.objectPath,
    mimeType: pdfUploaded.mimeType,
    updatedAt: now,
  });

  return assets;
}

/** 任务 topic 仅存课题；任务标题独立来自 task_json.title */
const buildTaskTopicForStorage = (params: { topic: string }): string => params.topic.trim();

interface AICourseDesignPageProps {
  onNextStep?: (data: { plan: SystemTaskPlan; courseId?: string; courseUrl?: string }) => void;
}

export function AICourseDesignPage({ onNextStep }: AICourseDesignPageProps) {
  const { user, preferences } = useAuth();
  const { addPublishedCourse } = usePublishedCourses();
  const [step, setStep] = useState<Step>('form');
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [textbook, setTextbook] = useState('');
  const [pedagogy, setPedagogy] = useState('');
  const [context, setContext] = useState('');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  const [curriculum, setCurriculum] = useState<CurriculumDesign | null>(null);
  const [documents, setDocuments] = useState<TaskDocuments | null>(null);
  const [plan, setPlan] = useState<SystemTaskPlan | null>(null);

  const [genStep, setGenStep] = useState<GenStep | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [createdCourse, setCreatedCourse] = useState<{
    courseId: string;
    url: string;
  } | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [regeneratingTaskId, setRegeneratingTaskId] = useState<string | null>(null);
  const [previewTaskIndex, setPreviewTaskIndex] = useState(0);
  const [pdfDownloading, setPdfDownloading] = useState<'task' | 'guide' | null>(null);
  const generateHint = useFirstClickHint('teacherCourseDesignGenerate');
  const createCourseHint = useFirstClickHint('teacherCourseDesignCreateCourse');

  useEffect(() => {
    if (!plan) return;
    const maxIndex = Math.max(plan.tasks.length - 1, 0);
    setPreviewTaskIndex((prev) => Math.min(prev, maxIndex));
  }, [plan?.tasks.length]);

  const hasPrefilledRef = useRef(false);
  useEffect(() => {
    if (hasPrefilledRef.current) return;
    hasPrefilledRef.current = true;
    const prefs = getTeacherPreferencesFromProfile(preferences);
    if (prefs.defaultGrade && GRADE_OPTIONS.some((g) => g === prefs.defaultGrade)) setGrade(prefs.defaultGrade);
    if (prefs.defaultSubject) {
      const subjectDisplay = prefSubjectIdToDisplay(prefs.defaultSubject);
      if (subjectDisplay && SUBJECT_OPTIONS.includes(subjectDisplay)) {
        setSubject(subjectDisplay);
      } else if (subjectDisplay) {
        setSubject(CUSTOM_SUBJECT_OPTION);
        setCustomSubject(subjectDisplay);
      }
    }
  }, [preferences?.defaultGrade, preferences?.defaultSubject]);

  const runGeneration = async () => {
    const effectiveSubject = (subject === CUSTOM_SUBJECT_OPTION ? customSubject : subject).trim();
    if (!effectiveSubject || !grade.trim() || !topic.trim()) {
      setGenError('请填写学科、年级和课题');
      return;
    }
    setStep('generating');
    setGenError(null);
    setCurriculum(null);
    setDocuments(null);
    setPlan(null);

    const textbookVal = textbook.trim() || '统编版';
    const pedagogyVal = pedagogy.trim();
    const contextVal = context.trim();
    void trackProductEvent({
      eventName: 'task_create_started',
      role: 'teacher',
      teacherId: user?.id,
      language,
      properties: { source: 'AICourseDesignPage', subject: effectiveSubject, grade: grade.trim(), topic: topic.trim() },
    }).catch(() => undefined);

    try {
      setGenStep('curriculum');
      const curriculumResult = await generateCurriculumDesign(
        effectiveSubject,
        grade.trim(),
        topic.trim(),
        textbookVal,
        pedagogyVal,
        contextVal,
        language
      );
      setCurriculum(curriculumResult);

      setGenStep('documents');
      const documentsResult = await generateTaskDocuments(
        effectiveSubject,
        topic.trim(),
        curriculumResult,
        pedagogyVal,
        contextVal,
        language
      );
      setDocuments(documentsResult);

      setGenStep('tasks');
      const planResult = await generateSystemTaskPlan(
        documentsResult.studentTaskSheet,
        effectiveSubject,
        grade.trim(),
        pedagogyVal,
        contextVal,
        language
      );

      // Step 4: 预生成素材
      setGenStep('assets');
      const newTasks = [...planResult.tasks];
      for (let i = 0; i < newTasks.length; i++) {
        const task = newTasks[i];
        if (needsAssetGeneration(task.assetType) && task.assetPrompt?.trim()) {
          try {
            const assetResult = await generateTaskAsset(task.assetType, task.assetPrompt, undefined, undefined, language);
            if (assetResult != null) {
              newTasks[i] = {
                ...task,
                generatedAssetContent:
                  typeof assetResult === 'object'
                    ? JSON.stringify(assetResult)
                    : String(assetResult),
              };
            }
          } catch (e) {
            console.error(`Asset generation failed for task ${task.id}:`, e);
          }
        }
      }

      const planWithAssets = {
        ...planResult,
        tasks: newTasks,
      };
      setPlan(planWithAssets);
      setPreviewTaskIndex(0);
      void trackProductEvent({
        eventName: 'task_create_succeeded',
        role: 'teacher',
        teacherId: user?.id,
        language,
        properties: { source: 'AICourseDesignPage', taskCount: planWithAssets.tasks.length },
      }).catch(() => undefined);
      setGenStep(null);
      setStep('preview');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenError(msg);
      void trackProductEvent({
        eventName: 'task_design_generation_failed',
        role: 'teacher',
        teacherId: user?.id,
        language,
        properties: {
          source: 'AICourseDesignPage',
          subject: effectiveSubject,
          grade: grade.trim(),
          topic: topic.trim(),
          stage: genStep || 'unknown',
          errorMessage: msg,
        },
      }).catch(() => undefined);
      setGenStep(null);
    }
  };

  const retryFromCurriculum = async () => {
    setGenError(null);
    setGenStep('curriculum');
    const textbookVal = textbook.trim() || '统编版';
    const pedagogyVal = pedagogy.trim();
    const contextVal = context.trim();
    const effectiveSubject = (subject === CUSTOM_SUBJECT_OPTION ? customSubject : subject).trim();
    try {
      const curriculumResult = await generateCurriculumDesign(
        effectiveSubject,
        grade.trim(),
        topic.trim(),
        textbookVal,
        pedagogyVal,
        contextVal,
        language
      );
      setCurriculum(curriculumResult);
      setGenStep('documents');
      const documentsResult = await generateTaskDocuments(
        effectiveSubject,
        topic.trim(),
        curriculumResult,
        pedagogyVal,
        contextVal,
        language
      );
      setDocuments(documentsResult);
      setGenStep('tasks');
      const planResult = await generateSystemTaskPlan(
        documentsResult.studentTaskSheet,
        effectiveSubject,
        grade.trim(),
        pedagogyVal,
        contextVal,
        language
      );

      setGenStep('assets');
      const newTasks = [...planResult.tasks];
      for (let i = 0; i < newTasks.length; i++) {
        const task = newTasks[i];
        if (needsAssetGeneration(task.assetType) && task.assetPrompt?.trim()) {
          try {
            const assetResult = await generateTaskAsset(task.assetType, task.assetPrompt, undefined, undefined, language);
            if (assetResult != null) {
              newTasks[i] = {
                ...task,
                generatedAssetContent:
                  typeof assetResult === 'object'
                    ? JSON.stringify(assetResult)
                    : String(assetResult),
              };
            }
          } catch (e) {
            console.error(`Asset generation failed for task ${task.id}:`, e);
          }
        }
      }

      const planWithAssets = { ...planResult, tasks: newTasks };
      setPlan(planWithAssets);
      setPreviewTaskIndex(0);
      setGenStep(null);
      setStep('preview');
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
      setGenStep(null);
    }
  };

  const handleUpdateTask = (
    taskIndex: number,
    updates: { title?: string; description?: string; assetPrompt?: string }
  ) => {
    if (!plan) return;
    const newTasks = [...plan.tasks];
    newTasks[taskIndex] = { ...newTasks[taskIndex], ...updates };
    setPlan({ ...plan, tasks: newTasks });
  };

  const handleRegenerateAsset = async (taskIndex: number) => {
    if (!plan) return;
    const task = plan.tasks[taskIndex];
    if (!needsAssetGeneration(task.assetType) || !task.assetPrompt?.trim()) return;
    setRegeneratingTaskId(task.id);
    try {
      const assetResult = await generateTaskAsset(task.assetType, task.assetPrompt, undefined, undefined, language);
      if (assetResult != null) {
        const newTasks = [...plan.tasks];
        newTasks[taskIndex] = {
          ...task,
          generatedAssetContent:
            typeof assetResult === 'object'
              ? JSON.stringify(assetResult)
              : String(assetResult),
        };
        setPlan({ ...plan, tasks: newTasks });
      }
    } catch (e) {
      console.error('Regenerate asset failed:', e);
    } finally {
      setRegeneratingTaskId(null);
    }
  };

  const handlePreviewNavigate = (nextIndex: number) => {
    if (!plan) return;
    const maxIndex = Math.max(plan.tasks.length - 1, 0);
    const clamped = Math.max(0, Math.min(nextIndex, maxIndex));
    setPreviewTaskIndex(clamped);
  };

  const handleDeleteCurrentTask = () => {
    if (!plan || plan.tasks.length <= 1) return;
    const removingTask = plan.tasks[previewTaskIndex];
    const nextTasks = plan.tasks.filter((_, index) => index !== previewTaskIndex);
    setRegeneratingTaskId((prev) => (prev === removingTask?.id ? null : prev));
    setPlan({ ...plan, tasks: nextTasks });
    setPreviewTaskIndex((prev) => Math.min(prev, nextTasks.length - 1));
  };

  const handleCreateCourse = async () => {
    if (!plan) return;
    const effectiveSubject = (subject === CUSTOM_SUBJECT_OPTION ? customSubject : subject).trim();
    const subjectMeta = splitSubjectValue(effectiveSubject);
    setCreateLoading(true);
    setCreateError(null);
    try {
      const batchId = createGenerationBatchId();
      const taskIds: string[] = [];
      const courseDocumentAssets: PersistedDocumentAsset[] = [];

      if (documents?.studentTaskSheet?.trim()) {
        try {
          const assets = await persistMarkdownAndPdfAssets({
            markdown: documents.studentTaskSheet,
            mdFileName: `自学任务书-${topic || '课程'}-${Date.now()}.md`,
            pdfFileName: `自学任务书-${topic || '课程'}-${Date.now()}.pdf`,
            mdKey: 'course-student-md',
            mdLabel: '自学任务书.md',
            pdfKey: 'course-student-pdf',
            pdfLabel: '自学任务书.pdf',
          });
          courseDocumentAssets.push(...assets);
        } catch (error) {
          console.error('Persist student task sheet failed:', error);
        }
      }
      if (documents?.teacherGuide?.trim()) {
        try {
          const assets = await persistMarkdownAndPdfAssets({
            markdown: documents.teacherGuide,
            mdFileName: `教师指南-${topic || '课程'}-${Date.now()}.md`,
            pdfFileName: `教师指南-${topic || '课程'}-${Date.now()}.pdf`,
            mdKey: 'course-teacher-md',
            mdLabel: '教师指南.md',
            pdfKey: 'course-teacher-pdf',
            pdfLabel: '教师指南.pdf',
          });
          courseDocumentAssets.push(...assets);
        } catch (error) {
          console.error('Persist teacher guide failed:', error);
        }
      }

      for (let i = 0; i < plan.tasks.length; i++) {
        const task = plan.tasks[i];
        const taskTopic = buildTaskTopicForStorage({ topic });
        try {
          const { taskId } = await saveTask(task, user?.id, {
            subject: subjectMeta.subject,
            subjectCustom: subjectMeta.subjectCustom,
            subjectIsCustom: subjectMeta.subjectIsCustom,
            grade,
            topic: taskTopic,
            generationBatchId: batchId,
            source: 'course_generation',
          });
          taskIds.push(taskId);
        } catch (taskSaveError) {
          const message = taskSaveError instanceof Error ? taskSaveError.message : String(taskSaveError);
          throw new Error(`第 ${i + 1} 个任务保存失败：${message}`);
        }
      }

      const result = await createCourse({ taskIds }, user?.id, {
        subject: subjectMeta.subject,
        subjectCustom: subjectMeta.subjectCustom,
        subjectIsCustom: subjectMeta.subjectIsCustom,
        topic,
        grade,
        pedagogy: pedagogy.trim() || undefined,
        language,
        documentAssets: courseDocumentAssets.length > 0 ? { course: courseDocumentAssets } : undefined,
      });
      void trackProductEvent({
        eventName: 'course_create_succeeded',
        role: 'teacher',
        teacherId: user?.id,
        language,
        courseId: result.courseId,
        properties: { source: 'AICourseDesignPage', taskCount: taskIds.length },
      }).catch(() => undefined);

      // 尝试将课程元数据写入 Supabase，再更新前端课程管理列表
      if (user && user.role === 'teacher') {
        try {
          await saveCourseMetaToSupabase({
            publicId: result.courseId,
            teacherId: user.id,
            subject,
            grade,
            topic,
            textbook,
          });
        } catch (metaError) {
          console.error('Failed to save course meta to Supabase:', metaError);
          // 不阻塞课程创建流程，只在控制台提示
        }

        // 更新前端课程管理上下文，让课程管理页立即显示新课程
        addPublishedCourse({
          subject,
          grade,
          topic,
          textbook,
          hours: '1',
          status: 'published',
          assignmentStatus: 'unassigned',
          visibilityStatus: 'private',
          shareStatus: 'none',
          students: 0,
          completion: 0,
          lastUpdated: '刚刚',
        });
      }

      const courseUrl = `${window.location.origin}/course/${result.courseId}`;
      setCreatedCourse({ courseId: result.courseId, url: courseUrl });
      setStep('created');
      onNextStep?.({
        plan,
        courseId: result.courseId,
        courseUrl,
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI 课程设计</h1>
        <p className="text-muted-foreground mt-2">
          填写基础信息后，由 AI 生成课程设计、任务单与学习任务，并创建课程
        </p>
      </div>

      {step === 'form' && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">1. 基础信息</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="subject-select">学科</Label>
                <select
                  id="subject-select"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-12 px-3 py-2 border border-input rounded-md bg-input-background"
                >
                  <option value="">请选择</option>
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">年级</Label>
                <select
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full h-12 px-3 py-2 border border-input rounded-md bg-input-background"
                >
                  <option value="">请选择</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {subject === CUSTOM_SUBJECT_OPTION && (
              <div className="space-y-2">
                <Label htmlFor="custom-subject">自定义学科</Label>
                <Input
                  id="custom-subject"
                  placeholder="请输入学科名称"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="h-12"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="topic">课题</Label>
              <Input
                id="topic"
                placeholder="如：牛顿第一定律"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="textbook">教材版本</Label>
              <Input
                id="textbook"
                placeholder="如：统编版（可选）"
                value={textbook}
                onChange={(e) => setTextbook(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pedagogy">教学法（可选）</Label>
              <Input
                id="pedagogy"
                placeholder="如：PBL、5E、项目制学习"
                value={pedagogy}
                onChange={(e) => setPedagogy(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="context">补充说明</Label>
              <Textarea
                id="context"
                placeholder="可选：课时、重点难点等"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">内容语言</Label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'zh' | 'en')}
                className="w-full h-12 px-3 py-2 border border-input rounded-md bg-input-background"
              >
                <option value="zh">简体中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <Button
              onClick={() => generateHint.runWithHint(runGeneration)}
              className="w-full h-12"
            >
              <Target className="w-5 h-5 mr-2" />
              开始生成课程设计
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'generating' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. 生成进度</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Progress
                value={
                  genStep === 'curriculum'
                    ? 25
                    : genStep === 'documents'
                      ? 50
                      : genStep === 'tasks'
                        ? 75
                        : genStep === 'assets'
                          ? 90
                          : 100
                }
                className="h-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {genStep === 'curriculum' && '正在生成课程设计…'}
                {genStep === 'documents' && '正在生成任务单与教师指南…'}
                {genStep === 'tasks' && '正在生成系统任务计划…'}
                {genStep === 'assets' && '正在生成素材…'}
                {!genStep && '处理中…'}
              </p>
            </div>
            {genError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>生成失败</AlertTitle>
                <AlertDescription>{genError}</AlertDescription>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => setStep('form')}>
                    返回修改
                  </Button>
                  <Button size="sm" onClick={retryFromCurriculum}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    重试
                  </Button>
                </div>
              </Alert>
            )}
            {curriculum && (
              <Accordion type="single" collapsible defaultValue="curriculum">
                <AccordionItem value="curriculum">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      课程设计已生成
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground mb-2">大概念：</p>
                    <div className="text-sm [&_p]:mb-2 [&_*]:break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {curriculum.bigConcept}
                      </ReactMarkdown>
                    </div>
                    <div className="text-sm leading-relaxed [&_p]:mb-2 [&_*]:break-words mt-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {curriculum.logicChain}
                      </ReactMarkdown>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            {documents && (
              <Accordion type="single" collapsible defaultValue="documents">
                <AccordionItem value="documents">
                  <AccordionPrimitive.Header className="flex items-center">
                    <AccordionPrimitive.Trigger
                      className="flex flex-1 items-center gap-2 py-4 text-left text-sm font-medium outline-none transition-all hover:underline [&[data-state=open]_svg]:rotate-180"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                      任务单与教师指南已生成
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                    </AccordionPrimitive.Trigger>
                    <span className="flex shrink-0 items-center gap-2 py-4 pl-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={pdfDownloading === 'task'}
                        onClick={async () => {
                          setPdfDownloading('task');
                          try {
                            await downloadMarkdownAsPdf(
                              documents.studentTaskSheet,
                              `任务单-${topic || '课程'}-${Date.now()}.pdf`
                            );
                          } finally {
                            setPdfDownloading(null);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/90 hover:underline disabled:opacity-50"
                      >
                        {pdfDownloading === 'task' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        任务单 .pdf
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadMarkdownFile(
                            documents.studentTaskSheet,
                            `任务单-${topic || '课程'}-${Date.now()}.md`
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/90 hover:underline"
                      >
                        <Download className="w-3 h-3" />
                        任务单 .md
                      </button>
                      <button
                        type="button"
                        disabled={pdfDownloading === 'guide'}
                        onClick={async () => {
                          setPdfDownloading('guide');
                          try {
                            await downloadMarkdownAsPdf(
                              documents.teacherGuide,
                              `教师指南-${topic || '课程'}-${Date.now()}.pdf`
                            );
                          } finally {
                            setPdfDownloading(null);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/90 hover:underline disabled:opacity-50"
                      >
                        {pdfDownloading === 'guide' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        教师指南 .pdf
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadMarkdownFile(
                            documents.teacherGuide,
                            `教师指南-${topic || '课程'}-${Date.now()}.md`
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/90 hover:underline"
                      >
                        <Download className="w-3 h-3" />
                        教师指南 .md
                      </button>
                    </span>
                  </AccordionPrimitive.Header>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground mb-2">任务单摘要（前 500 字）：</p>
                    <div className="text-sm max-h-48 overflow-y-auto prose prose-sm dark:prose-invert max-w-none [&_*]:break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {`${documents.studentTaskSheet.slice(0, 500)}${documents.studentTaskSheet.length > 500 ? '\n…' : ''}`}
                      </ReactMarkdown>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            {genStep && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>请稍候…</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'preview' && plan && (
        <div className="space-y-6">
          {curriculum && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. 课程设计 / 大概念</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2"><strong>大概念：</strong></p>
                <div className="text-sm [&_p]:mb-2 [&_*]:break-words mb-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {curriculum.bigConcept}
                  </ReactMarkdown>
                </div>
                <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_*]:break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {curriculum.logicChain}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {documents && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. 任务单与教师指南</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pdfDownloading === 'task'}
                    onClick={async () => {
                      setPdfDownloading('task');
                      try {
                        await downloadMarkdownAsPdf(
                          documents.studentTaskSheet,
                          `任务单-${topic || '课程'}-${Date.now()}.pdf`
                        );
                      } finally {
                        setPdfDownloading(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:text-primary/90 hover:underline border border-primary/30 rounded-md disabled:opacity-50"
                  >
                    {pdfDownloading === 'task' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    下载任务单 .pdf
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadMarkdownFile(
                        documents.studentTaskSheet,
                        `任务单-${topic || '课程'}-${Date.now()}.md`
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:text-primary/90 hover:underline border border-primary/30 rounded-md"
                  >
                    <Download className="w-4 h-4" />
                    下载任务单 .md
                  </button>
                  <button
                    type="button"
                    disabled={pdfDownloading === 'guide'}
                    onClick={async () => {
                      setPdfDownloading('guide');
                      try {
                        await downloadMarkdownAsPdf(
                          documents.teacherGuide,
                          `教师指南-${topic || '课程'}-${Date.now()}.pdf`
                        );
                      } finally {
                        setPdfDownloading(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:text-primary/90 hover:underline border border-primary/30 rounded-md disabled:opacity-50"
                  >
                    {pdfDownloading === 'guide' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    下载教师指南 .pdf
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadMarkdownFile(
                        documents.teacherGuide,
                        `教师指南-${topic || '课程'}-${Date.now()}.md`
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:text-primary/90 hover:underline border border-primary/30 rounded-md"
                  >
                    <Download className="w-4 h-4" />
                    下载教师指南 .md
                  </button>
                </div>
                <Accordion type="single" collapsible>
                  <AccordionItem value="task">
                    <AccordionTrigger>任务单摘要（前 500 字）</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm max-h-48 overflow-y-auto prose prose-sm dark:prose-invert max-w-none [&_*]:break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {`${documents.studentTaskSheet.slice(0, 500)}${documents.studentTaskSheet.length > 500 ? '\n…' : ''}`}
                        </ReactMarkdown>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="guide">
                    <AccordionTrigger>教师指南摘要（前 500 字）</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm max-h-48 overflow-y-auto prose prose-sm dark:prose-invert max-w-none [&_*]:break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {`${documents.teacherGuide.slice(0, 500)}${documents.teacherGuide.length > 500 ? '\n…' : ''}`}
                        </ReactMarkdown>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}

          <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. 任务列表与创建课程</CardTitle>
            <p className="text-sm text-muted-foreground">
              共 {plan.tasks.length} 个任务，请确认素材后点击「创建课程」。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.tasks.length > 0 && (
              <TaskPreviewEdit
                key={plan.tasks[previewTaskIndex]?.id}
                task={plan.tasks[previewTaskIndex]}
                taskIndex={previewTaskIndex}
                totalTasks={plan.tasks.length}
                onUpdate={(updates) => handleUpdateTask(previewTaskIndex, updates)}
                onNavigate={handlePreviewNavigate}
                onDelete={handleDeleteCurrentTask}
                mode="create"
                regeneratingTaskId={regeneratingTaskId}
                onRegenerate={() => handleRegenerateAsset(previewTaskIndex)}
                language={language}
              />
            )}
            {createError && (
              <Alert variant="destructive">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3">
              <Button
                onClick={() => createCourseHint.runWithHint(handleCreateCourse)}
                disabled={createLoading}
              >
                {createLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中…
                  </>
                ) : (
                  '创建课程'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('form');
                  setCurriculum(null);
                  setDocuments(null);
                  setPlan(null);
                }}
              >
                重新设计
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {step === 'created' && createdCourse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              课程已创建
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">学生端链接（在新标签页打开即可进入学习）：</p>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={createdCourse.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {createdCourse.url}
              </a>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={createdCourse.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  在新标签页打开学生端
                </a>
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setStep('form');
                setCurriculum(null);
                setDocuments(null);
                setPlan(null);
                setCreatedCourse(null);
              }}
            >
              再创建一门课程
            </Button>
          </CardContent>
        </Card>
      )}
      <FirstClickHintDialog
        open={generateHint.open}
        onOpenChange={generateHint.setOpen}
        onCancel={generateHint.handleCancel}
        onConfirm={generateHint.handleConfirm}
        hint={generateHint.hint}
        language={generateHint.language}
      />
      <FirstClickHintDialog
        open={createCourseHint.open}
        onOpenChange={createCourseHint.setOpen}
        onCancel={createCourseHint.handleCancel}
        onConfirm={createCourseHint.handleConfirm}
        hint={createCourseHint.hint}
        language={createCourseHint.language}
      />
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
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
} from 'lucide-react';
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
  createCourse,
} from '../lib/backendApi';
import type {
  CurriculumDesign,
  TaskDocuments,
  SystemTaskPlan,
} from '../types/backend';
import { saveCourseMetaToSupabase } from '../lib/coursesRepository';

type Step = 'form' | 'generating' | 'preview' | 'created';

type GenStep = 'curriculum' | 'documents' | 'tasks';

interface AICourseDesignPageProps {
  onNextStep?: (data: { plan: SystemTaskPlan; courseId?: string; courseUrl?: string }) => void;
}

const AI_COURSE_SUBJECTS = ['数学', '物理', '化学', '生物', '语文', '英语', '历史', '地理'];

export function AICourseDesignPage({ onNextStep }: AICourseDesignPageProps) {
  const { user, preferences } = useAuth();
  const { addPublishedCourse } = usePublishedCourses();
  const [step, setStep] = useState<Step>('form');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [textbook, setTextbook] = useState('');
  const [context, setContext] = useState('');

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

  const hasPrefilledRef = useRef(false);
  useEffect(() => {
    if (hasPrefilledRef.current) return;
    hasPrefilledRef.current = true;
    const prefs = getTeacherPreferencesFromProfile(preferences);
    if (prefs.defaultGrade && GRADE_OPTIONS.some((g) => g === prefs.defaultGrade)) setGrade(prefs.defaultGrade);
    if (prefs.defaultSubject) {
      const subjectDisplay = prefSubjectIdToDisplay(prefs.defaultSubject);
      if (subjectDisplay && AI_COURSE_SUBJECTS.includes(subjectDisplay)) setSubject(subjectDisplay);
    }
  }, [preferences?.defaultGrade, preferences?.defaultSubject]);

  const runGeneration = async () => {
    if (!subject.trim() || !grade.trim() || !topic.trim()) {
      setGenError('请填写学科、年级和课题');
      return;
    }
    setStep('generating');
    setGenError(null);
    setCurriculum(null);
    setDocuments(null);
    setPlan(null);

    const lang = 'zh';
    const textbookVal = textbook.trim() || '统编版';
    const contextVal = context.trim();

    try {
      setGenStep('curriculum');
      const curriculumResult = await generateCurriculumDesign(
        subject.trim(),
        grade.trim(),
        topic.trim(),
        textbookVal,
        contextVal,
        lang
      );
      setCurriculum(curriculumResult);

      setGenStep('documents');
      const documentsResult = await generateTaskDocuments(
        subject.trim(),
        topic.trim(),
        curriculumResult,
        contextVal
      );
      setDocuments(documentsResult);

      setGenStep('tasks');
      const planResult = await generateSystemTaskPlan(
        documentsResult.studentTaskSheet,
        subject.trim(),
        grade.trim(),
        contextVal
      );
      setPlan(planResult);
      setGenStep(null);
      setStep('preview');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenError(msg);
      setGenStep(null);
    }
  };

  const retryFromCurriculum = async () => {
    setGenError(null);
    setGenStep('curriculum');
    const lang = 'zh';
    const textbookVal = textbook.trim() || '统编版';
    const contextVal = context.trim();
    try {
      const curriculumResult = await generateCurriculumDesign(
        subject.trim(),
        grade.trim(),
        topic.trim(),
        textbookVal,
        contextVal,
        lang
      );
      setCurriculum(curriculumResult);
      setGenStep('documents');
      const documentsResult = await generateTaskDocuments(
        subject.trim(),
        topic.trim(),
        curriculumResult,
        contextVal
      );
      setDocuments(documentsResult);
      setGenStep('tasks');
      const planResult = await generateSystemTaskPlan(
        documentsResult.studentTaskSheet,
        subject.trim(),
        grade.trim(),
        contextVal
      );
      setPlan(planResult);
      setGenStep(null);
      setStep('preview');
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
      setGenStep(null);
    }
  };

  const handleCreateCourse = async () => {
    if (!plan) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const result = await createCourse(plan, user?.id);

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
              <Layers className="w-5 h-5 text-cyan-600" />
              <CardTitle className="text-lg">1. 基础信息</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="subject">学科</Label>
                <Input
                  id="subject"
                  placeholder="如：物理"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-12"
                />
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
              <Label htmlFor="context">补充说明</Label>
              <Textarea
                id="context"
                placeholder="可选：课时、重点难点等"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={runGeneration}
              className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-white"
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
                    ? 33
                    : genStep === 'documents'
                      ? 66
                      : genStep === 'tasks'
                        ? 90
                        : 100
                }
                className="h-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {genStep === 'curriculum' && '正在生成课程设计…'}
                {genStep === 'documents' && '正在生成任务单与教师指南…'}
                {genStep === 'tasks' && '正在生成系统任务计划…'}
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
                    <p className="text-sm text-muted-foreground mb-2">
                      大概念：{curriculum.bigConcept}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{curriculum.logicChain}</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            {documents && (
              <Accordion type="single" collapsible defaultValue="documents">
                <AccordionItem value="documents">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      任务单与教师指南已生成
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground mb-2">任务单摘要（前 500 字）：</p>
                    <p className="text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {documents.studentTaskSheet.slice(0, 500)}
                      {documents.studentTaskSheet.length > 500 && '…'}
                    </p>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. 任务列表与创建课程</CardTitle>
            <p className="text-sm text-muted-foreground">
              共 {plan.tasks.length} 个任务，确认后点击「创建课程」。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-1 text-sm">
              {plan.tasks.map((t, i) => (
                <li key={t.id}>
                  {i + 1}. {t.title}
                </li>
              ))}
            </ul>
            {createError && (
              <Alert variant="destructive">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3">
              <Button
                onClick={handleCreateCourse}
                disabled={createLoading}
                className="bg-cyan-600 hover:bg-cyan-700"
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
                className="text-cyan-600 hover:underline break-all"
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
    </div>
  );
}

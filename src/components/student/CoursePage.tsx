import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCourse, trackProductEvent } from '@/lib/backendApi';
import { touchCourseOpened } from '@/lib/studentProgressApi';
import { supabase } from '@/utils/supabase/client';
import type { SystemTaskPlan, ExitTicketAnalysis } from '@/types/backend';
import { Loader2, AlertCircle } from 'lucide-react';
import StudentConsole from './StudentConsole';
import { useRuntimePolicy } from '@/hooks/useRuntimePolicy';

type StudentProgress = { progress: number; last_task_index: number; completed: boolean };

function isGuidedVideoTask(task: unknown): boolean {
  const t = task as { viewType?: string; contentPayload?: string } | undefined;
  if (!t || t.viewType !== 'video_player' || !t.contentPayload?.trim()) return false;
  try {
    const payload = JSON.parse(t.contentPayload) as { learningObjective?: string };
    return !!payload.learningObjective;
  } catch {
    return false;
  }
}

function resolveInitialLearningPosition(
  plan: SystemTaskPlan,
  studentProgress?: StudentProgress
): { initialTaskIndex?: number; initialGuidedStep?: number } {
  if (!studentProgress || !Array.isArray(plan.tasks) || plan.tasks.length === 0) {
    return {};
  }
  const totalTasks = plan.tasks.length;
  const progressPercent = Math.max(0, Math.min(100, Number(studentProgress.progress) || 0));
  const taskIndexFromProgress = Math.max(
    0,
    Math.min(Math.floor((progressPercent / 100) * totalTasks), totalTasks - 1)
  );
  const taskIndexFromRecord = Math.max(0, Math.min(Number(studentProgress.last_task_index) || 0, totalTasks - 1));
  const taskIndex = Math.max(taskIndexFromRecord, taskIndexFromProgress);
  let initialGuidedStep = 1;
  if (isGuidedVideoTask(plan.tasks[taskIndex])) {
    // portion = 当前任务内已完成比例 (0~1)，与保存公式 progress=(taskIndex+guidedStep/5)/total*100 对应
    const portion = Math.max(0, Math.min(1, (progressPercent / 100) * totalTasks - taskIndex));
    initialGuidedStep = Math.min(5, Math.max(1, Math.round(portion * 5) + 1));
  }
  return { initialTaskIndex: taskIndex, initialGuidedStep };
}

export function CoursePage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation('coursePage');
  const { policy } = useRuntimePolicy();
  const courseId = params.id ?? '';
  const [plan, setPlan] = useState<SystemTaskPlan | null>(null);
  const [initialTaskIndex, setInitialTaskIndex] = useState<number | undefined>(undefined);
  const [initialGuidedStep, setInitialGuidedStep] = useState<number | undefined>(undefined);
  const [initialExitData, setInitialExitData] = useState<ExitTicketAnalysis | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contentLanguage: 'zh' | 'en' = useMemo(() => {
    const langFromUrl = searchParams.get('lang');
    if (langFromUrl === 'zh' || langFromUrl === 'en') return langFromUrl;
    const policyDefault = policy?.contentLanguageDefault?.defaultLanguage;
    if (policyDefault === 'zh' || policyDefault === 'en') return policyDefault;
    const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    if (host.startsWith('sg.') || host.includes('.sg.')) return 'en';
    if (host.startsWith('cn.') || host.includes('.cn.')) return 'zh';
    return 'zh';
  }, [searchParams, policy?.contentLanguageDefault?.defaultLanguage]);

  useEffect(() => {
    i18n.changeLanguage(contentLanguage);
  }, [i18n, contentLanguage]);

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) {
        setError(t('invalidCourseId'));
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await getCourse(courseId);
        if (!data?.plan) {
          throw new Error(t('dataFormatError'));
        }
        setPlan(data.plan);
        const initialPos = resolveInitialLearningPosition(data.plan, data.studentProgress);
        setInitialTaskIndex(initialPos.initialTaskIndex);
        setInitialGuidedStep(initialPos.initialGuidedStep);
        setInitialExitData(data.lastAssessment ?? undefined);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lastLearningCourseId', courseId);
          localStorage.setItem('lastLearningTimestamp', Date.now().toString());
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const assignmentSource = searchParams.get('assignmentSource') as 'class' | 'group' | null;
        const groupId = searchParams.get('groupId');
        const classId = searchParams.get('classId');
        touchCourseOpened(courseId).catch(() => undefined);
        await trackProductEvent(
          {
            eventName: 'course_opened',
            role: 'student',
            language: contentLanguage,
            courseId,
            properties: {
              source: 'CoursePage',
              ...(assignmentSource && { assignmentSource }),
              ...(groupId && { groupId }),
              ...(classId && { classId }),
            },
          },
          token
        );
      } catch (err) {
        console.error('Failed to load course:', err);
        setError(err instanceof Error ? err.message : t('loadFailedCheckLink'));
      } finally {
        setLoading(false);
      }
    };
    loadCourse();
  }, [courseId, t, contentLanguage, searchParams]);

  const handleComplete = (_log: string, _finalMindMap?: string) => {
    // StudentConsole handles exit ticket internally; callback for optional analytics
  };

  const handleApiKeyError = () => {
    console.warn('API Key Error');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={32} />
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-card p-8 rounded-2xl shadow-xl max-w-md text-center border border-border">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-destructive" size={32} />
            </div>
            <h1 className="text-xl font-bold mb-2 text-foreground">{t('courseLoadFailed')}</h1>
            <div className="text-muted-foreground mb-6 space-y-2">
              <p>{error || t('courseNotExistOrExpired')}</p>
              {courseId && <p className="text-xs mt-2">{t('courseIdLabel')}: {courseId}</p>}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-lg transition-all"
              >
                {t('backToHome')}
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  if (courseId) {
                    getCourse(courseId)
                      .then((data) => {
                        setPlan(data.plan);
                        const initialPos = resolveInitialLearningPosition(data.plan, data.studentProgress);
                        setInitialTaskIndex(initialPos.initialTaskIndex);
                        setInitialGuidedStep(initialPos.initialGuidedStep);
                        setInitialExitData(data.lastAssessment ?? undefined);
                        setError(null);
                      })
                      .catch((err) => setError(err.message || t('retryFailed')))
                      .finally(() => setLoading(false));
                  }
                }}
                className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg transition-all"
              >
                {t('retry')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const assignmentSource = searchParams.get('assignmentSource') as 'class' | 'group' | null;
  const groupId = searchParams.get('groupId') || undefined;
  const classId = searchParams.get('classId') || undefined;

  return (
    <StudentConsole
      plan={plan}
      onComplete={handleComplete}
      onApiKeyError={handleApiKeyError}
      onBack={() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('lastLearningCourseId');
          localStorage.removeItem('lastLearningTimestamp');
        }
        navigate('/');
      }}
      contentLanguage={contentLanguage}
      assignmentSource={assignmentSource ?? undefined}
      groupId={groupId}
      classId={classId}
      initialTaskIndex={initialTaskIndex}
      initialGuidedStep={initialGuidedStep}
      initialExitData={initialExitData}
    />
  );
}

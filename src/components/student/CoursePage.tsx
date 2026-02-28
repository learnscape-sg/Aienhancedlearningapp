import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCourse, trackProductEvent } from '@/lib/backendApi';
import { supabase } from '@/utils/supabase/client';
import type { SystemTaskPlan } from '@/types/backend';
import { Loader2, AlertCircle } from 'lucide-react';
import StudentConsole from './StudentConsole';

export function CoursePage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation('coursePage');
  const courseId = params.id ?? '';
  const [plan, setPlan] = useState<SystemTaskPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const langFromUrl = searchParams.get('lang');
    if (langFromUrl && (langFromUrl === 'zh' || langFromUrl === 'en')) {
      i18n.changeLanguage(langFromUrl);
    }
  }, [searchParams, i18n]);

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
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        await trackProductEvent(
          {
            eventName: 'course_opened',
            role: 'student',
            language: (searchParams.get('lang') as 'zh' | 'en') || undefined,
            courseId,
            properties: { source: 'CoursePage' },
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
  }, [courseId, t]);

  const handleComplete = (_log: string, _finalMindMap?: string) => {
    // StudentConsole handles exit ticket internally; callback for optional analytics
  };

  const handleApiKeyError = () => {
    console.warn('API Key Error');
  };

  const handleLanguageChange = (lang: 'zh' | 'en') => {
    const next = new URLSearchParams(searchParams);
    next.set('lang', lang);
    setSearchParams(next, { replace: true });
    void supabase.auth
      .getSession()
      .then(({ data: sessionData }) =>
        trackProductEvent(
          {
            eventName: 'language_switched',
            role: 'student',
            language: lang,
            courseId,
            properties: { source: 'CoursePage' },
          },
          sessionData.session?.access_token
        )
      )
      .catch(() => undefined);
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

  const langFromUrl = searchParams.get('lang');
  const contentLanguage: 'zh' | 'en' =
    langFromUrl === 'en'
      ? 'en'
      : langFromUrl === 'zh'
        ? 'zh'
        : i18n.resolvedLanguage?.startsWith('en') || i18n.language?.startsWith('en')
          ? 'en'
          : 'zh';

  return (
    <StudentConsole
      plan={plan}
      onComplete={handleComplete}
      onApiKeyError={handleApiKeyError}
      contentLanguage={contentLanguage}
      onLanguageChange={handleLanguageChange}
    />
  );
}

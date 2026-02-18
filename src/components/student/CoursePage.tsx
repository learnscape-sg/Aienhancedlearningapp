import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourse } from '@/lib/backendApi';
import type { SystemTaskPlan } from '@/types/backend';
import { Loader2, AlertCircle } from 'lucide-react';
import StudentConsole from './StudentConsole';

export function CoursePage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const courseId = params.id ?? '';
  const [plan, setPlan] = useState<SystemTaskPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) {
        setError('课程 ID 无效');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await getCourse(courseId);
        if (!data?.plan) {
          throw new Error('课程数据格式错误');
        }
        setPlan(data.plan);
      } catch (err) {
        console.error('Failed to load course:', err);
        setError(err instanceof Error ? err.message : '课程加载失败，请检查链接是否正确');
      } finally {
        setLoading(false);
      }
    };
    loadCourse();
  }, [courseId]);

  const handleComplete = (_log: string, _finalMindMap?: string) => {
    // StudentConsole handles exit ticket internally; callback for optional analytics
  };

  const handleApiKeyError = () => {
    console.warn('API Key Error');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={32} />
          <p className="text-muted-foreground">正在加载课程...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6">
        <div className="bg-card p-8 rounded-2xl shadow-xl max-w-md text-center border border-border">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-destructive" size={32} />
          </div>
          <h1 className="text-xl font-bold mb-2 text-foreground">课程加载失败</h1>
          <div className="text-muted-foreground mb-6 space-y-2">
            <p>{error || '课程不存在或已过期'}</p>
            {courseId && <p className="text-xs mt-2">课程 ID: {courseId}</p>}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-lg transition-all"
            >
              返回首页
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
                    .catch((err) => setError(err.message || '重试失败'))
                    .finally(() => setLoading(false));
                }
              }}
              className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg transition-all"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudentConsole
      plan={plan}
      onComplete={handleComplete}
      onApiKeyError={handleApiKeyError}
    />
  );
}

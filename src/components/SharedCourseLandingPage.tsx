import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { resolveShareToken, acceptShareLink } from '@/lib/backendApi';
import { getLearnYourWayOrigin } from '@/config/appConfig';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BookOpen, Loader2, AlertCircle, LogIn, Play } from 'lucide-react';

export function SharedCourseLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [courseInfo, setCourseInfo] = useState<{
    courseId: string;
    title: string;
    subject: string;
    grade: string;
    ownerTeacherId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('链接无效');
      setLoading(false);
      return;
    }
    resolveShareToken(token)
      .then((data) => setCourseInfo(data))
      .catch((err) => setError(err instanceof Error ? err.message : '分享链接无效或已过期'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleLoginToAdd = () => {
    const redirect = encodeURIComponent(`/shared-course/${token}`);
    navigate(`/?redirect=${redirect}`);
  };

  const handleAcceptAsTeacher = async () => {
    if (!user?.id || !token) return;
    setAccepting(true);
    try {
      await acceptShareLink(token, user.id);
      navigate('/?section=courses&courseTab=shared');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入失败，请重试');
    } finally {
      setAccepting(false);
    }
  };

  const handleStartAsStudent = () => {
    if (!courseInfo?.courseId) return;
    window.open(`${getLearnYourWayOrigin()}/course/${courseInfo.courseId}`, '_blank');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !courseInfo) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-center">链接无效或已过期</CardTitle>
            <CardDescription className="text-center">{error || '课程不存在或已被删除'}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/')}>返回首页</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-center">{courseInfo.title}</CardTitle>
            <CardDescription className="text-center">
              {courseInfo.subject} · {courseInfo.grade}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              登录后可将此课程加入「分享给我的」并在课程管理中分配给学生
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={handleLoginToAdd}>
                <LogIn className="w-4 h-4 mr-2" />
                登录后加入我的课程
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                返回首页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === 'teacher') {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-center">{courseInfo.title}</CardTitle>
            <CardDescription className="text-center">
              {courseInfo.subject} · {courseInfo.grade}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              点击下方按钮将课程加入「分享给我的」，即可在课程管理中预览和分配给学生
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={handleAcceptAsTeacher} disabled={accepting}>
                {accepting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BookOpen className="w-4 h-4 mr-2" />
                )}
                加入我的课程
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                返回首页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Student
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-center">{courseInfo.title}</CardTitle>
          <CardDescription className="text-center">
            {courseInfo.subject} · {courseInfo.grade}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            点击下方按钮开始学习
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={handleStartAsStudent}>
              <Play className="w-4 h-4 mr-2" />
              开始学习
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              返回首页
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { resolveDigitalTwinShareToken } from '@/lib/backendApi';

export function SharedTwinLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{
    twinId: string;
    name: string;
    avatar?: string;
    persona: string;
    teachingStyle: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('链接无效');
      setLoading(false);
      return;
    }
    resolveDigitalTwinShareToken(token)
      .then((data) => setInfo(data))
      .catch((err) => setError(err instanceof Error ? err.message : '链接无效或已过期'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <CardTitle className="text-center">链接无效</CardTitle>
            <CardDescription className="text-center">{error ?? '分享链接失效'}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/')}>返回首页</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <CardTitle>{info.avatar || '🤖'} {info.name}</CardTitle>
          <CardDescription>教学风格：{info.teachingStyle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{info.persona}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => navigate('/?section=settings')}>前往教师设置使用该分身</Button>
            <Button variant="outline" onClick={() => navigate('/')}>返回首页</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

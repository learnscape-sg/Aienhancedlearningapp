import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from './AuthContext';
import { TeacherTwinChatOnboardingPage } from './TeacherTwinChatOnboardingPage';
import {
  listTeacherTwinDashboard,
  listTeacherTwins,
  patchTeacherTwin,
  type TeacherTwin,
} from '@/lib/backendApi';

type Mode = 'list' | 'create' | 'edit';

export function TeacherDigitalTwinList() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('list');
  const [loading, setLoading] = useState(false);
  const [twins, setTwins] = useState<TeacherTwin[]>([]);
  const [selectedTwin, setSelectedTwin] = useState<TeacherTwin | null>(null);
  const [dashboard, setDashboard] = useState<{
    totalRuns: number;
    gradeRuns: number;
    approvalRate: number;
    citationMissingRate: number;
    negativeFeedbackRate: number;
  } | null>(null);

  const loadTwins = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { twins } = await listTeacherTwins(user.id);
      setTwins(twins ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTwin = async (twin: TeacherTwin) => {
    if (!user?.id) return;
    setSelectedTwin(twin);
    try {
      const metrics = await listTeacherTwinDashboard(twin.id, user.id);
      setDashboard(metrics);
    } catch {
      setDashboard(null);
    }
  };

  const handleArchive = async (twin: TeacherTwin) => {
    if (!user?.id) return;
    await patchTeacherTwin(twin.id, {
      teacherId: user.id,
      status: twin.status === 'archived' ? 'draft' : 'archived',
    });
    await loadTwins();
    if (selectedTwin?.id === twin.id) {
      setSelectedTwin({
        ...selectedTwin,
        status: twin.status === 'archived' ? 'draft' : 'archived',
      });
    }
  };

  useEffect(() => {
    loadTwins().catch(console.error);
  }, [user?.id]);

  if (!user?.id) return null;

  if (mode === 'create') {
    return (
      <TeacherTwinChatOnboardingPage
        teacherId={user.id}
        onCancel={() => setMode('list')}
        onCompleted={async () => {
          setMode('list');
          await loadTwins();
        }}
      />
    );
  }

  if (mode === 'edit' && selectedTwin) {
    return (
      <TeacherTwinChatOnboardingPage
        teacherId={user.id}
        initialTwinId={selectedTwin.id}
        onCancel={() => setMode('list')}
        onCompleted={async () => {
          setMode('list');
          await loadTwins();
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>我的 Teacher Twin</CardTitle>
            <CardDescription>通过 AI 对话引导创建/校准/发布，替代旧版简单表单。</CardDescription>
          </div>
          <Button onClick={() => setMode('create')}>创建 Teacher Twin</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">加载中…</p> : null}
        {twins.length === 0 ? <p className="text-sm text-muted-foreground">暂无分身，先创建一个吧。</p> : null}

        <div className="space-y-2">
          {twins.map((twin) => (
            <div key={twin.id} className="border rounded-md p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{twin.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {twin.subject || '-'} · {twin.gradeBand || '-'} · autonomy {twin.autonomyLevel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={twin.status === 'published' ? 'default' : 'secondary'}>{twin.status}</Badge>
                  <Button variant="outline" size="sm" onClick={() => handleSelectTwin(twin)}>详情</Button>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedTwin(twin); setMode('edit'); }}>编辑</Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleArchive(twin)}>
                    {twin.status === 'archived' ? '恢复' : '归档'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedTwin ? (
          <div className="border rounded-md p-4 space-y-3">
            <p className="font-medium">当前分身：{selectedTwin.name}</p>
            <p className="text-sm text-muted-foreground">状态：{selectedTwin.status}</p>
            {dashboard ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div className="border rounded-md p-2">Runs: {dashboard.totalRuns}</div>
                <div className="border rounded-md p-2">Grade Approval: {(dashboard.approvalRate * 100).toFixed(0)}%</div>
                <div className="border rounded-md p-2">Citation Missing: {(dashboard.citationMissingRate * 100).toFixed(0)}%</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无运行指标</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

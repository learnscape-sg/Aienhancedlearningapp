import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  createDigitalTwin,
  createDigitalTwinShare,
  deleteDigitalTwin,
  deleteDigitalTwinShare,
  deleteTwinMemory,
  listDigitalTwinShares,
  listTeacherDigitalTwins,
  listTwinMemories,
  searchTeachers,
  type TeacherDigitalTwin,
  type TeacherSearchItem,
  type TwinMemoryItem,
  type TwinShareItem,
  updateDigitalTwin,
  uploadTwinMemory,
} from '@/lib/backendApi';
import { TeacherDigitalTwinPage } from './TeacherDigitalTwinPage';
import { useAuth } from './AuthContext';

type Mode = 'list' | 'create' | 'edit';

export function TeacherDigitalTwinList() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('list');
  const [loading, setLoading] = useState(false);
  const [twins, setTwins] = useState<TeacherDigitalTwin[]>([]);
  const [selectedTwin, setSelectedTwin] = useState<TeacherDigitalTwin | null>(null);
  const [shares, setShares] = useState<TwinShareItem[]>([]);
  const [memories, setMemories] = useState<TwinMemoryItem[]>([]);
  const [shareTargetQuery, setShareTargetQuery] = useState('');
  const [shareTargetResults, setShareTargetResults] = useState<TeacherSearchItem[]>([]);
  const [selectedShareTarget, setSelectedShareTarget] = useState<TeacherSearchItem | null>(null);
  const [sharePermission, setSharePermission] = useState<'view' | 'use'>('view');

  const loadTwins = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { twins } = await listTeacherDigitalTwins(user.id, { includeShared: true });
      setTwins(twins ?? []);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (twin: TeacherDigitalTwin) => {
    if (!user?.id) return;
    setSelectedTwin(twin);
    if (twin.isOwner) {
      const [{ shares }, { memories }] = await Promise.all([
        listDigitalTwinShares(twin.id, user.id),
        listTwinMemories(twin.id, user.id),
      ]);
      setShares(shares ?? []);
      setMemories(memories ?? []);
    } else {
      setShares([]);
      setMemories([]);
    }
  };

  useEffect(() => {
    loadTwins().catch(console.error);
  }, [user?.id]);

  useEffect(() => {
    if (!shareTargetQuery.trim() || !user?.id) {
      setShareTargetResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { teachers } = await searchTeachers(shareTargetQuery.trim());
        setShareTargetResults((teachers ?? []).filter((t) => t.id !== user.id));
      } catch {
        setShareTargetResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [shareTargetQuery, user?.id]);

  const handleCreate = async (payload: any) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await createDigitalTwin({ ...payload, teacherId: user.id });
      setMode('list');
      await loadTwins();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (payload: any) => {
    if (!user?.id || !selectedTwin) return;
    setLoading(true);
    try {
      await updateDigitalTwin(selectedTwin.id, { ...payload, teacherId: user.id });
      setMode('list');
      await loadTwins();
      setSelectedTwin(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (twin: TeacherDigitalTwin) => {
    if (!user?.id || !window.confirm(`确认删除分身「${twin.name}」？`)) return;
    await deleteDigitalTwin(twin.id, user.id);
    if (selectedTwin?.id === twin.id) setSelectedTwin(null);
    await loadTwins();
  };

  const handleUploadMemory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTwin || !user?.id) return;
    try {
      await uploadTwinMemory(selectedTwin.id, user.id, file);
      const { memories } = await listTwinMemories(selectedTwin.id, user.id);
      setMemories(memories ?? []);
      e.target.value = '';
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败');
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!selectedTwin || !user?.id) return;
    await deleteTwinMemory(selectedTwin.id, user.id, memoryId);
    const { memories } = await listTwinMemories(selectedTwin.id, user.id);
    setMemories(memories ?? []);
  };

  const handleCreateShare = async () => {
    if (!selectedTwin || !user?.id || !selectedShareTarget?.id) return;
    await createDigitalTwinShare({
      twinId: selectedTwin.id,
      ownerTeacherId: user.id,
      targetTeacherId: selectedShareTarget.id,
      permission: sharePermission,
    });
    const { shares } = await listDigitalTwinShares(selectedTwin.id, user.id);
    setShares(shares ?? []);
    setSelectedShareTarget(null);
    setShareTargetQuery('');
  };

  const handleCreateShareLink = async () => {
    if (!selectedTwin || !user?.id) return;
    const created = await createDigitalTwinShare({
      twinId: selectedTwin.id,
      ownerTeacherId: user.id,
      permission: sharePermission,
      createLinkShare: true,
    });
    const link = `${window.location.origin}/shared-twin/${created.shareToken}`;
    await navigator.clipboard.writeText(link);
    alert(`分享链接已复制：${link}`);
    const { shares } = await listDigitalTwinShares(selectedTwin.id, user.id);
    setShares(shares ?? []);
  };

  const handleDeleteShare = async (shareId: string) => {
    if (!user?.id || !selectedTwin) return;
    await deleteDigitalTwinShare(shareId, user.id);
    const { shares } = await listDigitalTwinShares(selectedTwin.id, user.id);
    setShares(shares ?? []);
  };

  if (!user?.id) return null;

  if (mode === 'create') {
    return <TeacherDigitalTwinPage loading={loading} onCancel={() => setMode('list')} onSubmit={handleCreate} />;
  }
  if (mode === 'edit' && selectedTwin) {
    return (
      <TeacherDigitalTwinPage
        initialValue={selectedTwin}
        loading={loading}
        onCancel={() => setMode('list')}
        onSubmit={handleUpdate}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>我的数字分身</CardTitle>
            <CardDescription>可绑定到任务/课程，并分享给其他教师。</CardDescription>
          </div>
          <Button onClick={() => setMode('create')}>创建分身</Button>
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
                  <p className="font-medium">{twin.avatar || '🤖'} {twin.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{twin.persona}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={twin.isOwner ? 'default' : 'secondary'}>
                    {twin.isOwner ? '我创建的' : '分享给我的'}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => loadDetails(twin)}>详情</Button>
                  {twin.isOwner ? <Button variant="outline" size="sm" onClick={() => { setSelectedTwin(twin); setMode('edit'); }}>编辑</Button> : null}
                  {twin.isOwner ? <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(twin)}>删除</Button> : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedTwin ? (
          <div className="border rounded-md p-4 space-y-4">
            <p className="font-medium">当前分身：{selectedTwin.name}</p>
            {selectedTwin.isOwner ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">记忆库</p>
                  <Input type="file" accept=".txt,.md,.pdf" onChange={handleUploadMemory} />
                  {memories.length === 0 ? <p className="text-sm text-muted-foreground">暂无记忆文件</p> : null}
                  {memories.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                      <span>{m.fileName} · {m.chunksCount} chunks</span>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteMemory(m.id)}>删除</Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">分享</p>
                  <div className="flex items-end gap-2">
                    {selectedShareTarget ? (
                      <div className="flex-1 border rounded-md px-3 py-2 text-sm">已选教师：{selectedShareTarget.name}</div>
                    ) : (
                      <div className="relative flex-1">
                        <Input
                          placeholder="搜索教师姓名或邮箱..."
                          value={shareTargetQuery}
                          onChange={(e) => setShareTargetQuery(e.target.value)}
                        />
                        {shareTargetResults.length > 0 ? (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 border bg-background rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {shareTargetResults.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                                onClick={() => {
                                  setSelectedShareTarget(t);
                                  setShareTargetQuery('');
                                  setShareTargetResults([]);
                                }}
                              >
                                {t.name}{t.email ? ` (${t.email})` : ''}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                    <select
                      className="border rounded-md px-3 py-2 text-sm h-10"
                      value={sharePermission}
                      onChange={(e) => setSharePermission(e.target.value as 'view' | 'use')}
                    >
                      <option value="view">view</option>
                      <option value="use">use</option>
                    </select>
                    <Button onClick={handleCreateShare} disabled={!selectedShareTarget}>账号分享</Button>
                    <Button variant="outline" onClick={handleCreateShareLink}>链接分享</Button>
                  </div>
                  {shares.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                      <span>{s.target_teacher_id ? `教师：${s.target_teacher_name ?? s.target_teacher_id}` : `链接：${s.share_token}`}</span>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteShare(s.id)}>撤销</Button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">该分身为分享资源，可在任务配置中选择使用。</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

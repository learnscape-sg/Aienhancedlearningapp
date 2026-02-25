import React, { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import {
  compileTeacherTwin,
  createTeacherTwin,
  publishTeacherTwin,
  sendTeacherTwinOnboardingMessage,
} from '@/lib/backendApi';

type ChatMsg = { role: 'assistant' | 'teacher'; text: string; timestamp: number };

interface TeacherTwinChatOnboardingPageProps {
  teacherId: string;
  initialTwinId?: string;
  onCancel: () => void;
  onCompleted: () => void;
}

export function TeacherTwinChatOnboardingPage({
  teacherId,
  initialTwinId,
  onCancel,
  onCompleted,
}: TeacherTwinChatOnboardingPageProps) {
  const [twinId, setTwinId] = useState(initialTwinId ?? '');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      text: '你好，我会通过对话为你生成 Teacher Twin。先告诉我：你主要教什么学科、哪个年级段？',
      timestamp: Date.now(),
    },
  ]);
  const [profilePreview, setProfilePreview] = useState<Record<string, unknown> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSend = useMemo(() => !!input.trim() && !loading, [input, loading]);

  const ensureTwin = async () => {
    if (twinId) return twinId;
    const created = await createTeacherTwin({
      teacherId,
      name: `Teacher Twin ${new Date().toLocaleDateString()}`,
    });
    setTwinId(created.id);
    return created.id;
  };

  const handleSend = async () => {
    if (!canSend) return;
    setLoading(true);
    setError('');
    try {
      const userText = input.trim();
      setInput('');
      const id = await ensureTwin();
      setMessages((prev) => [...prev, { role: 'teacher', text: userText, timestamp: Date.now() }]);
      const res = await sendTeacherTwinOnboardingMessage({
        twinId: id,
        teacherId,
        message: userText,
      });
      setMessages(res.messages);
      setProfilePreview(res.profilePreview);
      setIsReady(res.isReadyForExtract);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAndPublish = async () => {
    if (!twinId) return;
    setLoading(true);
    setError('');
    try {
      await compileTeacherTwin({ twinId, teacherId });
      await publishTeacherTwin(twinId, teacherId);
      onCompleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>对话式创建 Teacher Twin</CardTitle>
        <CardDescription>你只需要自然聊天，AI 会被动引导并自动抽取 persona / skills。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="border rounded-md p-3 space-y-2 max-h-[420px] overflow-y-auto">
          {messages.map((m, idx) => (
            <div key={`${m.timestamp}-${idx}`} className={m.role === 'assistant' ? 'text-sm' : 'text-sm text-right'}>
              <p className={m.role === 'assistant' ? 'text-muted-foreground' : ''}>
                <span className="font-medium">{m.role === 'assistant' ? 'AI' : '你'}：</span>{m.text}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="直接回答 AI 问题，例如：我教 G8 物理，讲解偏苏格拉底式..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSend) {
                e.preventDefault();
                handleSend().catch(() => null);
              }
            }}
          />
          <Button onClick={handleSend} disabled={!canSend}>
            {loading ? '发送中…' : '发送'}
          </Button>
        </div>

        {profilePreview ? (
          <div className="border rounded-md p-3">
            <p className="text-sm font-medium">实时抽取预览（增量）</p>
            <textarea
              readOnly
              value={JSON.stringify(profilePreview, null, 2)}
              rows={10}
              className="mt-2 w-full rounded-md border px-3 py-2 bg-background font-mono text-xs"
            />
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onCancel} disabled={loading}>取消</Button>
          <Button onClick={handleGenerateAndPublish} disabled={loading || !twinId || !isReady}>
            一键生成并发布
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

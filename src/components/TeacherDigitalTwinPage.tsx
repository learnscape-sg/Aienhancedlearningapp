import React, { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import type { TeacherDigitalTwin } from '@/lib/backendApi';

type SampleQA = { q: string; a: string };
type ExternalLink = { title: string; url: string };

interface TeacherDigitalTwinPageProps {
  initialValue?: Partial<TeacherDigitalTwin>;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    name: string;
    avatar?: string;
    persona: string;
    teachingStyle: string;
    sampleQa: SampleQA[];
    externalLinks: ExternalLink[];
    secondMeRoleId?: string;
    secondMeEndpoint?: string;
    secondMeEnabled?: boolean;
  }) => Promise<void> | void;
}

const styleOptions = [
  { id: 'socratic', label: '苏格拉底式' },
  { id: 'encouraging', label: '鼓励式' },
  { id: 'direct', label: '直接式' },
  { id: 'humorous', label: '幽默式' },
];

export function TeacherDigitalTwinPage({
  initialValue,
  loading = false,
  onCancel,
  onSubmit,
}: TeacherDigitalTwinPageProps) {
  const [name, setName] = useState(initialValue?.name ?? '');
  const [avatar, setAvatar] = useState(initialValue?.avatar ?? '🤖');
  const [persona, setPersona] = useState(initialValue?.persona ?? '');
  const [teachingStyle, setTeachingStyle] = useState(initialValue?.teachingStyle ?? 'encouraging');
  const [sampleQaText, setSampleQaText] = useState(
    JSON.stringify(initialValue?.sampleQa ?? [], null, 2)
  );
  const [externalLinksText, setExternalLinksText] = useState(
    JSON.stringify(initialValue?.externalLinks ?? [], null, 2)
  );
  const [secondMeRoleId, setSecondMeRoleId] = useState(initialValue?.secondMeRoleId ?? '');
  const [secondMeEndpoint, setSecondMeEndpoint] = useState(initialValue?.secondMeEndpoint ?? '');
  const [secondMeEnabled, setSecondMeEnabled] = useState(!!initialValue?.secondMeEnabled);
  const [error, setError] = useState('');

  const parsed = useMemo(() => {
    try {
      const sampleQa = JSON.parse(sampleQaText || '[]');
      const externalLinks = JSON.parse(externalLinksText || '[]');
      return {
        sampleQa: Array.isArray(sampleQa) ? sampleQa : [],
        externalLinks: Array.isArray(externalLinks) ? externalLinks : [],
        parseError: '',
      };
    } catch (e: unknown) {
      return {
        sampleQa: [],
        externalLinks: [],
        parseError: e instanceof Error ? e.message : 'JSON 解析失败',
      };
    }
  }, [sampleQaText, externalLinksText]);

  const handleSubmit = async () => {
    if (!name.trim() || !persona.trim()) {
      setError('请填写分身名称和人格描述');
      return;
    }
    if (parsed.parseError) {
      setError(`示例问答或外部资源 JSON 无效：${parsed.parseError}`);
      return;
    }
    setError('');
    await onSubmit({
      name: name.trim(),
      avatar: avatar.trim() || '🤖',
      persona: persona.trim(),
      teachingStyle,
      sampleQa: parsed.sampleQa,
      externalLinks: parsed.externalLinks,
      secondMeRoleId: secondMeRoleId.trim() || undefined,
      secondMeEndpoint: secondMeEndpoint.trim() || undefined,
      secondMeEnabled,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialValue?.id ? '编辑数字分身' : '创建数字分身'}</CardTitle>
        <CardDescription>
          先完成阶段一+二能力。Second-Me role_id 仅用于阶段三验证通道（可选）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>分身名称</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：张老师的学习伙伴" />
        </div>
        <div>
          <Label>头像</Label>
          <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="🤖 或图片URL" />
        </div>
        <div>
          <Label>人格描述</Label>
          <textarea
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            rows={6}
            className="w-full rounded-md border px-3 py-2 bg-background"
            placeholder="描述分身的教学理念、表达习惯、价值观..."
          />
        </div>
        <div>
          <Label>教学风格</Label>
          <select
            value={teachingStyle}
            onChange={(e) => setTeachingStyle(e.target.value)}
            className="w-full rounded-md border px-3 py-2 bg-background"
          >
            {styleOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>示例问答（JSON 数组）</Label>
          <textarea
            value={sampleQaText}
            onChange={(e) => setSampleQaText(e.target.value)}
            rows={4}
            className="w-full rounded-md border px-3 py-2 font-mono text-xs bg-background"
          />
        </div>
        <div>
          <Label>外部资源（JSON 数组）</Label>
          <textarea
            value={externalLinksText}
            onChange={(e) => setExternalLinksText(e.target.value)}
            rows={4}
            className="w-full rounded-md border px-3 py-2 font-mono text-xs bg-background"
          />
        </div>
        <div className="border rounded-md p-3 space-y-3">
          <p className="text-sm font-medium">阶段三验证通道（可选）</p>
          <div>
            <Label>Second-Me role_id</Label>
            <Input value={secondMeRoleId} onChange={(e) => setSecondMeRoleId(e.target.value)} />
          </div>
          <div>
            <Label>Second-Me endpoint</Label>
            <Input value={secondMeEndpoint} onChange={(e) => setSecondMeEndpoint(e.target.value)} placeholder="https://xxx.secondme/api" />
          </div>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={secondMeEnabled}
              onChange={(e) => setSecondMeEnabled(e.target.checked)}
            />
            启用第三方 Second-Me 验证（灰度）
          </label>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '保存中…' : '保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

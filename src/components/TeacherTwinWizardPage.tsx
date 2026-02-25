import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  compileTeacherTwin,
  createTeacherTwin,
  deleteTeacherTwinArtifact,
  extractTeacherTwin,
  listTeacherTwinArtifacts,
  patchTeacherTwin,
  publishTeacherTwin,
  runTeacherTwinExplain,
  runTeacherTwinGrade,
  runTeacherTwinPractice,
  saveTeacherTwinWizardStep,
  uploadTeacherTwinArtifact,
  type TeacherTwin,
  type TeacherTwinArtifact,
} from '@/lib/backendApi';

const interviewPrompts = [
  '你希望学生感受到的课堂语气是什么？',
  '你通常如何解释复杂概念（类比/例题/提问）？',
  '你对答题步骤的要求有多严格？',
  '你会如何鼓励答错的学生？',
  '批改时你最关注哪些维度（内容/结构/语言/逻辑）？',
];

type WizardStep = 1 | 2 | 3 | 4;

interface TeacherTwinWizardPageProps {
  teacherId: string;
  initialTwin?: TeacherTwin | null;
  onCancel: () => void;
  onCompleted: () => void;
}

export function TeacherTwinWizardPage({
  teacherId,
  initialTwin,
  onCancel,
  onCompleted,
}: TeacherTwinWizardPageProps) {
  const isEdit = !!initialTwin?.id;
  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [twinId, setTwinId] = useState(initialTwin?.id || '');
  const [artifacts, setArtifacts] = useState<TeacherTwinArtifact[]>([]);
  const [error, setError] = useState('');

  const stepAInit = (initialTwin?.wizardState?.['step-a'] as Record<string, unknown>) || {};
  const stepBInit = (initialTwin?.wizardState?.['step-b'] as Record<string, unknown>) || {};
  const stepDInit = (initialTwin?.wizardState?.['step-d'] as Record<string, unknown>) || {};

  const [name, setName] = useState(String(stepAInit.name ?? initialTwin?.name ?? ''));
  const [subject, setSubject] = useState(String(stepAInit.subject ?? initialTwin?.subject ?? ''));
  const [gradeBand, setGradeBand] = useState(String(stepAInit.gradeBand ?? initialTwin?.gradeBand ?? ''));
  const [language, setLanguage] = useState(String(stepAInit.language ?? 'zh'));
  const [timezone, setTimezone] = useState(String(stepAInit.timezone ?? 'Asia/Shanghai'));
  const [goal, setGoal] = useState(String(stepAInit.goal ?? 'mastery'));

  const [interviewAnswers, setInterviewAnswers] = useState<string[]>(
    Array.isArray(stepBInit.answers) && stepBInit.answers.length > 0
      ? stepBInit.answers.map((x) => String(x))
      : interviewPrompts.map(() => '')
  );
  const [exampleExplain, setExampleExplain] = useState(String(stepBInit.exampleExplain ?? ''));
  const [examplePractice, setExamplePractice] = useState(String(stepBInit.examplePractice ?? ''));
  const [exampleGradeComment, setExampleGradeComment] = useState(String(stepBInit.exampleGradeComment ?? ''));

  const [artifactType, setArtifactType] = useState<TeacherTwinArtifact['artifactType']>('lecture');
  const [authorityLevel, setAuthorityLevel] = useState<TeacherTwinArtifact['authorityLevel']>('teacher');
  const [permissions, setPermissions] = useState<TeacherTwinArtifact['permissions']>('rag');
  const [artifactText, setArtifactText] = useState('');
  const [artifactFile, setArtifactFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [autonomyLevel, setAutonomyLevel] = useState<number>(Number(stepDInit.autonomyLevel ?? initialTwin?.autonomyLevel ?? 1));
  const [extractResult, setExtractResult] = useState<string>('');
  const [compileResult, setCompileResult] = useState<string>('');
  const [trialExplain, setTrialExplain] = useState('');
  const [trialPracticeTopic, setTrialPracticeTopic] = useState('');
  const [trialGradeAnswer, setTrialGradeAnswer] = useState('');
  const [trialOutput, setTrialOutput] = useState<string>('');

  const stepLabel = useMemo(() => `Step ${step}/4`, [step]);

  useEffect(() => {
    if (!twinId) return;
    listTeacherTwinArtifacts(twinId, teacherId)
      .then(({ artifacts: rows }) => setArtifacts(rows ?? []))
      .catch(() => setArtifacts([]));
  }, [twinId, teacherId]);

  const ensureDraftTwin = async (): Promise<string> => {
    if (twinId) return twinId;
    if (!name.trim()) throw new Error('请先填写分身名称');
    const created = await createTeacherTwin({
      teacherId,
      name: name.trim(),
      subject: subject.trim() || undefined,
      gradeBand: gradeBand.trim() || undefined,
      stepA: {
        name: name.trim(),
        subject: subject.trim(),
        gradeBand: gradeBand.trim(),
        language,
        timezone,
        goal,
      },
    });
    setTwinId(created.id);
    return created.id;
  };

  const saveStepA = async () => {
    if (!name.trim()) throw new Error('请填写分身名称');
    const id = await ensureDraftTwin();
    await saveTeacherTwinWizardStep(id, 'step-a', {
      teacherId,
      payload: {
        name: name.trim(),
        subject: subject.trim(),
        gradeBand: gradeBand.trim(),
        language,
        timezone,
        goal,
      },
    });
    await patchTeacherTwin(id, {
      teacherId,
      name: name.trim(),
      subject: subject.trim(),
      gradeBand: gradeBand.trim(),
    });
  };

  const buildInterviewTranscript = () => {
    const lines: string[] = [];
    interviewPrompts.forEach((q, idx) => {
      lines.push(`[snippet_${idx + 1}] Q: ${q}`);
      lines.push(`[snippet_${idx + 1}] A: ${interviewAnswers[idx] || ''}`);
    });
    lines.push(`[snippet_example_explain] 示例讲解: ${exampleExplain}`);
    lines.push(`[snippet_example_practice] 示例出题: ${examplePractice}`);
    lines.push(`[snippet_example_grade] 示例点评: ${exampleGradeComment}`);
    return lines.join('\n');
  };

  const saveStepB = async () => {
    const id = await ensureDraftTwin();
    await saveTeacherTwinWizardStep(id, 'step-b', {
      teacherId,
      payload: {
        answers: interviewAnswers,
        exampleExplain,
        examplePractice,
        exampleGradeComment,
        interviewTranscript: buildInterviewTranscript(),
      },
    });
  };

  const saveStepD = async () => {
    const id = await ensureDraftTwin();
    await saveTeacherTwinWizardStep(id, 'step-d', {
      teacherId,
      payload: {
        autonomyLevel,
      },
    });
    await patchTeacherTwin(id, { teacherId, autonomyLevel });
  };

  const handleNext = async () => {
    setLoading(true);
    setError('');
    try {
      if (step === 1) await saveStepA();
      if (step === 2) await saveStepB();
      if (step === 4) await saveStepD();
      setStep((prev) => (prev < 4 ? ((prev + 1) as WizardStep) : prev));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    setError('');
    setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev));
  };

  const handleUploadArtifact = async () => {
    if (!twinId) {
      setError('请先完成 Step A');
      return;
    }
    if (!artifactFile && !artifactText.trim()) {
      setError('请上传文件或输入文本');
      return;
    }
    setUploading(true);
    setError('');
    try {
      await uploadTeacherTwinArtifact({
        twinId,
        teacherId,
        artifactType,
        authorityLevel,
        permissions,
        subject: subject.trim() || undefined,
        grade: gradeBand.trim() || undefined,
        text: artifactText.trim() || undefined,
        file: artifactFile || undefined,
      });
      const { artifacts: rows } = await listTeacherTwinArtifacts(twinId, teacherId);
      setArtifacts(rows ?? []);
      setArtifactFile(null);
      setArtifactText('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    if (!twinId) return;
    await deleteTeacherTwinArtifact(twinId, teacherId, artifactId);
    const { artifacts: rows } = await listTeacherTwinArtifacts(twinId, teacherId);
    setArtifacts(rows ?? []);
  };

  const runExtract = async () => {
    if (!twinId) return;
    setLoading(true);
    setError('');
    try {
      const res = await extractTeacherTwin({
        twinId,
        teacherId,
        interviewTranscript: buildInterviewTranscript(),
      });
      setExtractResult(`profile_version=${res.profileVersionId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '抽取失败');
    } finally {
      setLoading(false);
    }
  };

  const runCompile = async () => {
    if (!twinId) return;
    setLoading(true);
    setError('');
    try {
      const res = await compileTeacherTwin({ twinId, teacherId });
      setCompileResult(`prompt_version=${res.promptVersionId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '编译失败');
    } finally {
      setLoading(false);
    }
  };

  const runTrialExplain = async () => {
    if (!twinId || !trialExplain.trim()) return;
    const res = await runTeacherTwinExplain({
      twinId,
      teacherId,
      studentInput: trialExplain,
      constraints: { language },
    });
    setTrialOutput(JSON.stringify(res.output, null, 2));
  };

  const runTrialPractice = async () => {
    if (!twinId || !trialPracticeTopic.trim()) return;
    const res = await runTeacherTwinPractice({
      twinId,
      teacherId,
      topic: trialPracticeTopic,
      difficulty: 'basic',
      constraints: { language },
    });
    setTrialOutput(JSON.stringify(res.output, null, 2));
  };

  const runTrialGrade = async () => {
    if (!twinId || !trialGradeAnswer.trim()) return;
    const res = await runTeacherTwinGrade({
      twinId,
      teacherId,
      studentAnswer: trialGradeAnswer,
    });
    setTrialOutput(JSON.stringify(res.output, null, 2));
  };

  const handlePublish = async () => {
    if (!twinId) return;
    setLoading(true);
    setError('');
    try {
      await saveStepD();
      await publishTeacherTwin(twinId, teacherId);
      onCompleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '发布失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? '编辑 Teacher Twin' : '创建 Teacher Twin'}</CardTitle>
        <CardDescription>{stepLabel}：引导对话 + 资料上传 + 抽取编译 + 校准发布</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 1 ? (
          <div className="space-y-3">
            <div>
              <Label>分身名称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：李老师写作分身" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>学科</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="English Writing / Physics" />
              </div>
              <div>
                <Label>年级段</Label>
                <Input value={gradeBand} onChange={(e) => setGradeBand(e.target.value)} placeholder="G7-9 / PSLE" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>语言</Label>
                <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="zh / en" />
              </div>
              <div>
                <Label>时区</Label>
                <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Shanghai" />
              </div>
            </div>
            <div>
              <Label>教学目标</Label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="mastery / score improvement / competition" />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            {interviewPrompts.map((q, idx) => (
              <div key={q}>
                <Label>{q}</Label>
                <textarea
                  value={interviewAnswers[idx] ?? ''}
                  onChange={(e) => {
                    const next = [...interviewAnswers];
                    next[idx] = e.target.value;
                    setInterviewAnswers(next);
                  }}
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 bg-background"
                />
              </div>
            ))}
            <div>
              <Label>示例任务 - Explain（你会如何讲）</Label>
              <textarea
                value={exampleExplain}
                onChange={(e) => setExampleExplain(e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 bg-background"
              />
            </div>
            <div>
              <Label>示例任务 - Practice（你会如何出题）</Label>
              <textarea
                value={examplePractice}
                onChange={(e) => setExamplePractice(e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 bg-background"
              />
            </div>
            <div>
              <Label>示例任务 - Grade（你会如何点评）</Label>
              <textarea
                value={exampleGradeComment}
                onChange={(e) => setExampleGradeComment(e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 bg-background"
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label>资料类型</Label>
                <select
                  value={artifactType}
                  onChange={(e) => setArtifactType(e.target.value as TeacherTwinArtifact['artifactType'])}
                  className="w-full rounded-md border px-3 py-2 bg-background"
                >
                  <option value="lecture">lecture</option>
                  <option value="worksheet">worksheet</option>
                  <option value="question_bank">question_bank</option>
                  <option value="lesson_plan">lesson_plan</option>
                  <option value="syllabus">syllabus</option>
                  <option value="rubric">rubric</option>
                  <option value="model_answer">model_answer</option>
                </select>
              </div>
              <div>
                <Label>权威级别</Label>
                <select
                  value={authorityLevel}
                  onChange={(e) => setAuthorityLevel(e.target.value as TeacherTwinArtifact['authorityLevel'])}
                  className="w-full rounded-md border px-3 py-2 bg-background"
                >
                  <option value="official">official</option>
                  <option value="teacher">teacher</option>
                  <option value="third_party">third_party</option>
                </select>
              </div>
              <div>
                <Label>权限</Label>
                <select
                  value={permissions}
                  onChange={(e) => setPermissions(e.target.value as TeacherTwinArtifact['permissions'])}
                  className="w-full rounded-md border px-3 py-2 bg-background"
                >
                  <option value="extract_only">extract_only</option>
                  <option value="rag">rag</option>
                  <option value="generate">generate</option>
                </select>
              </div>
            </div>
            <div>
              <Label>上传文件（txt/md/pdf）</Label>
              <Input type="file" accept=".txt,.md,.pdf" onChange={(e) => setArtifactFile(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label>或粘贴文本</Label>
              <textarea
                value={artifactText}
                onChange={(e) => setArtifactText(e.target.value)}
                rows={5}
                className="w-full rounded-md border px-3 py-2 bg-background"
              />
            </div>
            <Button onClick={handleUploadArtifact} disabled={uploading}>
              {uploading ? '上传中…' : '上传并索引'}
            </Button>
            <div className="space-y-2">
              {artifacts.map((a) => (
                <div key={a.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                  <span>
                    {a.fileName || a.id} · {a.artifactType} · {a.permissions} · {a.chunksCount} chunks
                  </span>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteArtifact(a.id)}>
                    删除
                  </Button>
                </div>
              ))}
              {artifacts.length === 0 ? <p className="text-sm text-muted-foreground">尚未上传资料</p> : null}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <div>
              <Label>Autonomy Level</Label>
              <select
                value={String(autonomyLevel)}
                onChange={(e) => setAutonomyLevel(Number(e.target.value))}
                className="w-full rounded-md border px-3 py-2 bg-background"
              >
                <option value="0">0 - manual</option>
                <option value="1">1 - suggestion</option>
                <option value="2">2 - semi-auto</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={runExtract} disabled={!twinId || loading}>1) 执行抽取</Button>
              <Button variant="outline" onClick={runCompile} disabled={!twinId || loading}>2) 编译 Prompt</Button>
              <Button onClick={handlePublish} disabled={!twinId || loading}>3) 发布</Button>
            </div>
            {extractResult ? <p className="text-sm text-muted-foreground">{extractResult}</p> : null}
            {compileResult ? <p className="text-sm text-muted-foreground">{compileResult}</p> : null}

            <div className="border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium">试跑 Explain / Practice / Grade</p>
              <div>
                <Input
                  value={trialExplain}
                  onChange={(e) => setTrialExplain(e.target.value)}
                  placeholder="Explain: 输入学生问题"
                />
                <Button className="mt-2" size="sm" variant="outline" onClick={runTrialExplain} disabled={!twinId}>试跑 Explain</Button>
              </div>
              <div>
                <Input
                  value={trialPracticeTopic}
                  onChange={(e) => setTrialPracticeTopic(e.target.value)}
                  placeholder="Practice: 输入 topic"
                />
                <Button className="mt-2" size="sm" variant="outline" onClick={runTrialPractice} disabled={!twinId}>试跑 Practice</Button>
              </div>
              <div>
                <textarea
                  value={trialGradeAnswer}
                  onChange={(e) => setTrialGradeAnswer(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 bg-background"
                  placeholder="Grade: 输入学生答案"
                />
                <Button className="mt-2" size="sm" variant="outline" onClick={runTrialGrade} disabled={!twinId}>试跑 Grade</Button>
              </div>
              {trialOutput ? (
                <textarea value={trialOutput} readOnly rows={10} className="w-full rounded-md border px-3 py-2 bg-background font-mono text-xs" />
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onCancel} disabled={loading || uploading}>取消</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrev} disabled={step === 1 || loading || uploading}>上一步</Button>
            {step < 4 ? (
              <Button onClick={handleNext} disabled={loading || uploading}>下一步</Button>
            ) : (
              <Button onClick={handlePublish} disabled={loading || uploading || !twinId}>发布</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

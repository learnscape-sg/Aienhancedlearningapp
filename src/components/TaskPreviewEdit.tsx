import React, { useState, useRef, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  Upload,
  Link2,
  Target,
  ListOrdered,
  FileQuestion,
  Ticket,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { uploadMaterialResource } from '../lib/backendApi';
import { keyIdeasToText, textToKeyIdeas } from '../lib/keyIdeaUtils';
import { MathTextPreview } from './student/shared/MathTextPreview';
import type { SystemTask, KeyIdea, GeneratedQuestion } from '../types/backend';

const needsAssetGeneration = (assetType: string): boolean =>
  assetType !== 'editable_text' && assetType !== 'math_editable';

interface GuidedPayload {
  learningObjective?: string;
  keyIdeas?: KeyIdea[];
  practiceQuestions?: GeneratedQuestion[];
  exitTicketItems?: GeneratedQuestion[];
  [key: string]: unknown;
}

function parseGuidedPayload(contentPayload?: string): GuidedPayload | null {
  if (!contentPayload?.trim()) return null;
  try {
    const parsed = JSON.parse(contentPayload) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as GuidedPayload;
  } catch {
    return null;
  }
}

function buildDescriptionFromPayload(payload: GuidedPayload): string {
  const parts: string[] = [];
  if (payload.learningObjective) parts.push(`学习目标：${payload.learningObjective}`);
  if (payload.keyIdeas?.length) parts.push(`关键要点：${payload.keyIdeas.length} 条`);
  if (payload.practiceQuestions?.length) parts.push(`练习题目：${payload.practiceQuestions.length} 题`);
  if (payload.exitTicketItems?.length) parts.push(`离场券：${payload.exitTicketItems.length} 题`);
  return parts.join('\n');
}

function resolveImageSrc(content?: string): string | null {
  if (!content) return null;
  if (content.startsWith('data:image')) return content;
  if (/^https?:\/\//i.test(content)) return content;
  const looksLikeBase64 = /^[A-Za-z0-9+/=\r\n]+$/.test(content);
  return looksLikeBase64 ? `data:image/png;base64,${content}` : null;
}

export interface TaskPreviewEditProps {
  task: SystemTask;
  taskIndex: number;
  totalTasks: number;
  onUpdate: (updates: Partial<SystemTask>) => void;
  onNavigate?: (index: number) => void;
  onDelete?: () => void;
  mode: 'create' | 'edit';
  regeneratingTaskId?: string | null;
  onRegenerate?: () => void;
  language?: 'zh' | 'en';
}

export function TaskPreviewEdit({
  task,
  taskIndex,
  totalTasks,
  onUpdate,
  onNavigate,
  onDelete,
  mode,
  regeneratingTaskId = null,
  onRegenerate,
  language = 'zh',
}: TaskPreviewEditProps) {
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [pasteUrlValue, setPasteUrlValue] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [keyIdeasTextEditing, setKeyIdeasTextEditing] = useState(false);
  const [editingPracticeIdx, setEditingPracticeIdx] = useState<number | null>(null);
  const [editingExitTicketIdx, setEditingExitTicketIdx] = useState<number | null>(null);
  const [uploadingKeyIdeaIdx, setUploadingKeyIdeaIdx] = useState<number | null>(null);
  const [uploadingPracticeIdx, setUploadingPracticeIdx] = useState<number | null>(null);
  const [uploadingExitTicketIdx, setUploadingExitTicketIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyIdeaImageInputRef = useRef<HTMLInputElement>(null);
  const practiceImageInputRef = useRef<HTMLInputElement>(null);
  const exitTicketImageInputRef = useRef<HTMLInputElement>(null);
  const keyIdeaImagePendingIdx = useRef<number>(0);
  const practiceImagePendingIdx = useRef<number>(0);
  const exitTicketImagePendingIdx = useRef<number>(0);

  const needsAsset = needsAssetGeneration(task.assetType) && task.assetPrompt;
  const hasAsset = !!task.generatedAssetContent;
  const isImageGen = task.assetType === 'image_gen';

  const guidedPayload = useMemo(() => parseGuidedPayload(task.contentPayload), [task.contentPayload]);
  const isGuidedTask = task.viewType === 'video_player' && !!guidedPayload;

  const applyGuidedUpdate = (updates: Partial<GuidedPayload>) => {
    const base = guidedPayload ? { ...guidedPayload } : {};
    const next = { ...base, ...updates };
    const contentPayload = JSON.stringify(next);
    const description = buildDescriptionFromPayload(next);
    onUpdate({ contentPayload, description });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !/^image\//i.test(file.type)) {
      setImageError('请上传图片文件（PNG、JPG、GIF、WebP）');
      return;
    }
    setUploadingImage(true);
    setImageError(null);
    try {
      const uploaded = await uploadMaterialResource(file);
      onUpdate({ generatedAssetContent: uploaded.url });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handlePasteUrl = () => {
    const url = pasteUrlValue.trim();
    if (!/^https?:\/\//i.test(url)) {
      setImageError('请输入有效的图片 URL（以 http:// 或 https:// 开头）');
      return;
    }
    onUpdate({ generatedAssetContent: url });
    setPasteUrlValue('');
    setImageError(null);
  };

  const handleRegenerateAsset = async () => {
    if (!needsAsset || !task.assetPrompt?.trim() || !onRegenerate) return;
    onRegenerate();
  };

  const handleKeyIdeaImageUpload = async (idx: number, file: File) => {
    if (!/^image\//i.test(file.type) || !guidedPayload?.keyIdeas) return;
    setUploadingKeyIdeaIdx(idx);
    try {
      const uploaded = await uploadMaterialResource(file);
      const next = [...guidedPayload.keyIdeas];
      if (next[idx]) next[idx] = { ...next[idx], imageUrl: uploaded.url };
      applyGuidedUpdate({ keyIdeas: next });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setUploadingKeyIdeaIdx(null);
    }
  };

  const handlePracticeImageUpload = async (idx: number, file: File) => {
    if (!/^image\//i.test(file.type) || !guidedPayload?.practiceQuestions) return;
    setUploadingPracticeIdx(idx);
    try {
      const uploaded = await uploadMaterialResource(file);
      const next = [...guidedPayload.practiceQuestions];
      if (next[idx]) next[idx] = { ...next[idx], imageUrl: uploaded.url };
      applyGuidedUpdate({ practiceQuestions: next });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setUploadingPracticeIdx(null);
    }
  };

  const handleExitTicketImageUpload = async (idx: number, file: File) => {
    if (!/^image\//i.test(file.type) || !guidedPayload?.exitTicketItems) return;
    setUploadingExitTicketIdx(idx);
    try {
      const uploaded = await uploadMaterialResource(file);
      const next = [...guidedPayload.exitTicketItems];
      if (next[idx]) next[idx] = { ...next[idx], imageUrl: uploaded.url };
      applyGuidedUpdate({ exitTicketItems: next });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setUploadingExitTicketIdx(null);
    }
  };

  return (
    <div className="space-y-4">
      {(onNavigate || onDelete) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            第 {taskIndex + 1} / {totalTasks} 个任务
          </p>
          <div className="flex flex-wrap gap-2">
            {onNavigate && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate(taskIndex - 1)}
                  disabled={taskIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一个
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate(taskIndex + 1)}
                  disabled={taskIndex >= totalTasks - 1}
                >
                  下一个
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            )}
            {onDelete && totalTasks > 1 && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除当前任务
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 bg-gray-50/50 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{taskIndex + 1}.</span>
              <Input
                value={task.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                className="font-medium text-gray-900 h-8 flex-1"
                placeholder="任务标题"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {editingDesc ? (
                <div className="space-y-2">
                  <Textarea
                    value={task.description || ''}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    onBlur={() => setEditingDesc(false)}
                    className="min-h-24 text-sm"
                    placeholder="任务描述"
                    autoFocus
                  />
                  <Button size="sm" variant="outline" onClick={() => setEditingDesc(false)}>
                    完成编辑
                  </Button>
                </div>
              ) : task.description ? (
                <div className="space-y-1">
                  <div className="prose prose-sm max-w-none text-slate-700">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath, remarkGfm]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0">{children}</p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-slate-800">{children}</strong>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-2 ml-4">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-2 ml-4">{children}</ol>
                        ),
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                      }}
                    >
                      {(task.description?.length ?? 0) > 200 && !expandedDesc
                        ? `${task.description.slice(0, 200)}...`
                        : task.description}
                    </ReactMarkdown>
                  </div>
                  {(task.description?.length ?? 0) > 200 && (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-primary hover:text-primary/90 text-xs font-medium"
                      onClick={() => setExpandedDesc((prev) => !prev)}
                    >
                      {expandedDesc ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          收起
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          展开全文
                        </>
                      )}
                    </button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700 -ml-1"
                    onClick={() => setEditingDesc(true)}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    编辑
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-slate-500"
                  onClick={() => setEditingDesc(true)}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  添加描述
                </Button>
              )}
            </div>
          </div>
          {needsAsset && (
            <div className="flex flex-wrap gap-2">
              {onRegenerate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegenerateAsset}
                  disabled={regeneratingTaskId === task.id}
                >
                  {regeneratingTaskId === task.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="ml-1">重新生成</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-600 hover:text-slate-800"
                onClick={() => setEditingPrompt((prev) => !prev)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                编辑提示词
              </Button>
            </div>
          )}
        </div>

        {isGuidedTask && guidedPayload && (
          <Accordion type="multiple" defaultValue={['objective', 'keyIdeas', 'practice', 'exitTicket']} className="mt-4">
            <AccordionItem value="objective">
              <AccordionTrigger className="text-sm font-medium">
                <Target className="w-4 h-4 mr-2" />
                学习目标
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  value={guidedPayload.learningObjective || ''}
                  onChange={(e) => applyGuidedUpdate({ learningObjective: e.target.value })}
                  className="min-h-20 text-sm"
                  placeholder="学习目标…"
                />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="keyIdeas">
              <AccordionTrigger className="text-sm font-medium">
                <ListOrdered className="w-4 h-4 mr-2" />
                关键要点（{guidedPayload.keyIdeas?.length ?? 0} 条）
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <input
                  ref={keyIdeaImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleKeyIdeaImageUpload(keyIdeaImagePendingIdx.current, file);
                    e.target.value = '';
                  }}
                />
                {keyIdeasTextEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={keyIdeasToText(guidedPayload.keyIdeas ?? [])}
                      onChange={(e) =>
                        applyGuidedUpdate({
                          keyIdeas: textToKeyIdeas(e.target.value, guidedPayload.keyIdeas),
                        })
                      }
                      className="min-h-32 text-sm font-mono"
                      placeholder="每行一个关键要点，用 **关键词** 表示填空"
                      autoFocus
                    />
                    <Button size="sm" variant="outline" onClick={() => setKeyIdeasTextEditing(false)}>
                      完成编辑
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(guidedPayload.keyIdeas ?? []).map((idea, idx) => {
                      const display = idea.blanks?.length
                        ? idea.text
                            .split('__KEY__')
                            .map((p, i) => p + (i < (idea.blanks?.length ?? 0) ? `**${idea.blanks![i]}**` : ''))
                            .join('')
                        : idea.text;
                      return (
                        <div key={idx} className="flex items-start gap-2 rounded border p-2 bg-white">
                          <div className="flex-1 min-w-0">
                            <MathTextPreview text={display} className="text-sm [&_p]:mb-0" />
                            {idea.imageUrl && (
                              <img src={idea.imageUrl} alt="" className="mt-2 max-h-24 rounded border object-contain" />
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {idea.imageUrl ? (
                              <>
                                <img src={idea.imageUrl} alt="" className="h-12 w-auto rounded border" />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    keyIdeaImagePendingIdx.current = idx;
                                    keyIdeaImageInputRef.current?.click();
                                  }}
                                >
                                  更换
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={uploadingKeyIdeaIdx === idx}
                                onClick={() => {
                                  keyIdeaImagePendingIdx.current = idx;
                                  keyIdeaImageInputRef.current?.click();
                                }}
                              >
                                {uploadingKeyIdeaIdx === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                                添加图片
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <Button size="sm" variant="ghost" onClick={() => setKeyIdeasTextEditing(true)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      编辑关键要点
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="practice">
              <AccordionTrigger className="text-sm font-medium">
                <FileQuestion className="w-4 h-4 mr-2" />
                练习题目（{guidedPayload.practiceQuestions?.length ?? 0} 题）
              </AccordionTrigger>
              <AccordionContent>
                <input
                  ref={practiceImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePracticeImageUpload(practiceImagePendingIdx.current, file);
                    e.target.value = '';
                  }}
                />
                <div className="space-y-4">
                  {(guidedPayload.practiceQuestions ?? []).map((q, idx) => (
                    <div key={idx} className="rounded border p-3 bg-white space-y-2">
                      {editingPracticeIdx === idx ? (
                        <div className="space-y-2">
                          <Textarea
                            value={q.question}
                            onChange={(e) => {
                              const next = [...(guidedPayload.practiceQuestions ?? [])];
                              next[idx] = { ...next[idx], question: e.target.value };
                              applyGuidedUpdate({ practiceQuestions: next });
                            }}
                            className="min-h-16"
                            autoFocus
                          />
                          <Input
                            placeholder="参考答案"
                            value={q.correctAnswer ?? ''}
                            onChange={(e) => {
                              const next = [...(guidedPayload.practiceQuestions ?? [])];
                              next[idx] = { ...next[idx], correctAnswer: e.target.value };
                              applyGuidedUpdate({ practiceQuestions: next });
                            }}
                          />
                          <Button size="sm" variant="outline" onClick={() => setEditingPracticeIdx(null)}>完成</Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded p-2 -m-2" onClick={() => setEditingPracticeIdx(idx)}>
                            <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                            <MathTextPreview text={q.question} className="text-sm flex-1 [&_p]:mb-0" />
                          </div>
                          {q.imageUrl && <img src={q.imageUrl} alt="" className="mt-1 max-h-32 rounded border object-contain" />}
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingPracticeIdx(idx)}>
                              <Pencil className="w-3 h-3 mr-1" />编辑
                            </Button>
                            {q.imageUrl ? (
                              <Button size="sm" variant="ghost" onClick={() => { practiceImagePendingIdx.current = idx; practiceImageInputRef.current?.click(); }}>更换图片</Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled={uploadingPracticeIdx === idx} onClick={() => { practiceImagePendingIdx.current = idx; practiceImageInputRef.current?.click(); }}>
                                {uploadingPracticeIdx === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}添加配图
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="exitTicket">
              <AccordionTrigger className="text-sm font-medium">
                <Ticket className="w-4 h-4 mr-2" />
                离场券（{guidedPayload.exitTicketItems?.length ?? 0} 题）
              </AccordionTrigger>
              <AccordionContent>
                <input
                  ref={exitTicketImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleExitTicketImageUpload(exitTicketImagePendingIdx.current, file);
                    e.target.value = '';
                  }}
                />
                <div className="space-y-4">
                  {(guidedPayload.exitTicketItems ?? []).map((q, idx) => (
                    <div key={idx} className="rounded border p-3 bg-white space-y-2">
                      {editingExitTicketIdx === idx ? (
                        <div className="space-y-2">
                          <Textarea
                            value={q.question}
                            onChange={(e) => {
                              const next = [...(guidedPayload.exitTicketItems ?? [])];
                              next[idx] = { ...next[idx], question: e.target.value };
                              applyGuidedUpdate({ exitTicketItems: next });
                            }}
                            className="min-h-16"
                            autoFocus
                          />
                          <Input
                            placeholder="参考答案"
                            value={q.correctAnswer ?? ''}
                            onChange={(e) => {
                              const next = [...(guidedPayload.exitTicketItems ?? [])];
                              next[idx] = { ...next[idx], correctAnswer: e.target.value };
                              applyGuidedUpdate({ exitTicketItems: next });
                            }}
                          />
                          <Button size="sm" variant="outline" onClick={() => setEditingExitTicketIdx(null)}>完成</Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded p-2 -m-2" onClick={() => setEditingExitTicketIdx(idx)}>
                            <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                            <MathTextPreview text={q.question} className="text-sm flex-1 [&_p]:mb-0" />
                          </div>
                          {q.imageUrl && <img src={q.imageUrl} alt="" className="mt-1 max-h-32 rounded border object-contain" />}
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingExitTicketIdx(idx)}>
                              <Pencil className="w-3 h-3 mr-1" />编辑
                            </Button>
                            {q.imageUrl ? (
                              <Button size="sm" variant="ghost" onClick={() => { exitTicketImagePendingIdx.current = idx; exitTicketImageInputRef.current?.click(); }}>更换图片</Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled={uploadingExitTicketIdx === idx} onClick={() => { exitTicketImagePendingIdx.current = idx; exitTicketImageInputRef.current?.click(); }}>
                                {uploadingExitTicketIdx === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}添加配图
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {needsAsset && (
          <div className="mt-2 space-y-3">
            {editingPrompt && (
              <div className="rounded border border-slate-200 bg-white p-3 space-y-2">
                <Label className="text-xs font-medium text-slate-600">
                  当前提示词（可用于图片/视频/实验等生成）
                </Label>
                <Textarea
                  value={task.assetPrompt || ''}
                  onChange={(e) => onUpdate({ assetPrompt: e.target.value })}
                  className="min-h-20 text-sm font-mono"
                  placeholder="输入生成素材的提示词…"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingPrompt(false)}>
                    保存并关闭
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(false)}>
                    取消
                  </Button>
                </div>
              </div>
            )}

            {isImageGen && (
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Upload className="w-4 h-4 mr-1" />
                  )}
                  上传图片
                </Button>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="粘贴网络图片 URL"
                    value={pasteUrlValue}
                    onChange={(e) => setPasteUrlValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasteUrl()}
                    className="max-w-xs h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={handlePasteUrl}>
                    <Link2 className="w-4 h-4 mr-1" />
                    使用 URL
                  </Button>
                </div>
              </div>
            )}

            {imageError && (
              <p className="text-sm text-red-600">{imageError}</p>
            )}

            {hasAsset ? (
              <>
                {task.assetType === 'image_gen' && (() => {
                  const src = resolveImageSrc(task.generatedAssetContent);
                  return src ? (
                    <img
                      src={src}
                      alt={task.title}
                      className="max-h-48 w-auto object-contain rounded border border-gray-200"
                    />
                  ) : (
                    <p className="text-sm text-amber-600">图片预览不可用</p>
                  );
                })()}
                {task.assetType === 'video_gen' &&
                  (task.generatedAssetContent?.startsWith('data:video') ? (
                    <video
                      src={task.generatedAssetContent}
                      controls
                      className="max-h-48 rounded border border-gray-200"
                    />
                  ) : (
                    <p className="text-sm text-amber-600">视频预览不可用</p>
                  ))}
                {task.assetType === 'html_webpage' && (
                  <iframe
                    srcDoc={task.generatedAssetContent}
                    title={task.title}
                    className="w-full h-48 rounded border border-gray-200 bg-white"
                    sandbox="allow-scripts"
                  />
                )}
                {task.assetType === 'mindmap_code' && (
                  <pre className="text-xs overflow-auto max-h-32 p-2 bg-white rounded border border-gray-200">
                    {task.generatedAssetContent?.slice(0, 300)}
                    {(task.generatedAssetContent?.length ?? 0) > 300 && '…'}
                  </pre>
                )}
                {task.assetType === 'table_json' && (
                  <pre className="text-xs overflow-auto max-h-32 p-2 bg-white rounded border border-gray-200">
                    {task.generatedAssetContent?.slice(0, 300)}
                    {(task.generatedAssetContent?.length ?? 0) > 300 && '…'}
                  </pre>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">未生成素材</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

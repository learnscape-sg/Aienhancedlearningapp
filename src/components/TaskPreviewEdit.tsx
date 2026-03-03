import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
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
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { uploadMaterialResource } from '../lib/backendApi';
import type { SystemTask } from '../types/backend';

const needsAssetGeneration = (assetType: string): boolean =>
  assetType !== 'editable_text' && assetType !== 'math_editable';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const needsAsset = needsAssetGeneration(task.assetType) && task.assetPrompt;
  const hasAsset = !!task.generatedAssetContent;
  const isImageGen = task.assetType === 'image_gen';

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

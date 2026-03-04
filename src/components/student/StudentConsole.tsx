import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  SystemTaskPlan,
  ChatMessage,
  ExitTicketAnalysis,
  Characteristic,
  ObjectiveMetrics,
} from '@/types/backend';
import { sendChatMessage, generateTaskAsset, generateExitTicket, trackProductEvent } from '@/lib/backendApi';
import { upsertStudentCourseProgress } from '@/lib/studentProgressApi';
import { useAuth } from '../AuthContext';
import { FontSizeSelector } from '../shared/FontSizeSelector';
import { supabase } from '@/utils/supabase/client';
import { 
  BookOpen, 
  MessageCircle, 
  ArrowRight, 
  ArrowLeft,
  Check,
  CheckCircle,
  X,
  Loader2,
  Image as ImageIcon,
  Type,
  Search,
  Globe,
  PenTool,
  AlignLeft,
  AlertCircle,
  Eye,
  Edit,
  Table,
  HelpCircle,
  FileText,
  Brain,
  Sparkles,
  Video,
  ZoomIn,
  ZoomOut,
  Maximize,
  RefreshCcw,
  Star,
  Award,
  Activity,
  List,
  Zap,
  Target,
  TrendingUp,
  Mic,
  Volume2,
  VolumeX,
  Upload,
  Camera,
  Pencil
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { MermaidPreview } from './shared/MermaidPreview';
import { MathTextPreview } from './shared/MathTextPreview';
import { RealTimeProgressTracker } from './shared/RealTimeProgressTracker';
import { VisualizationEditor } from './shared/VisualizationEditor';
import { AnimatedAvatar, type AvatarState } from './shared/AnimatedAvatar';
import { AITutorBubble } from './shared/AITutorBubble';
import { FullscreenModal } from './shared/FullscreenModal';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { visualizationDataToMermaid, mermaidToVisualizationData } from './shared/VisualizationEditor/utils/mermaidConverter';
import type { MarkdownComponentProps } from '@/utils/types';
import type { VisualizationData, VisualizationNode, VisualizationEdge, VisualizationProgress } from '@/types/backend';
import { generateGuidancePrompt, shouldTriggerAIFeedback, calculateCompletionRate } from './shared/VisualizationEditor/utils/aiGuidance';
import type { VisualizationAction } from './shared/VisualizationEditor/utils/aiGuidance';

interface StudentConsoleProps {
  plan: SystemTaskPlan;
  onComplete: (log: string, finalMindMap?: string) => void;
  onApiKeyError?: () => void;
  /** 返回上一页（如不传则不显示返回按钮） */
  onBack?: () => void;
  /** Content language (from tenant/market/space + policy or URL ?lang=). Used for API calls and TTS/STT. */
  contentLanguage?: 'zh' | 'en';
  /** Assignment source for product events (from course list navigation) */
  assignmentSource?: 'class' | 'group';
  groupId?: string;
  classId?: string;
}

interface GuidedKeyIdea {
  text: string;
  blanks?: string[];
  imageUrl?: string;
}

interface GuidedQuestion {
  question: string;
  options?: string[];
  correctAnswer?: string;
  questionType?: 'multiple_choice' | 'short_answer' | 'true_false';
  imageUrl?: string;
}

interface GuidedPayload {
  learningObjective?: string;
  whyItMatters?: { meaning_anchor?: string; advance_organizer?: string };
  keyIdeas?: GuidedKeyIdea[];
  practiceQuestions?: GuidedQuestion[];
  exitTicket?: GuidedQuestion | null;
  exitTicketItems?: GuidedQuestion[];
  taskDesignJson?: Record<string, unknown> | null;
  customTextInstruction?: string;
  resourceKind?: 'video' | 'document' | 'text_instruction';
  resourceMimeType?: string;
  convertedHtml?: string;
}

function parseGuidedPayload(payload?: string): GuidedPayload | null {
  if (!payload?.trim()) return null;
  try {
    const json = JSON.parse(payload) as Record<string, unknown>;
    const td = (json.taskDesignJson as Record<string, unknown>) ?? null;
    const whyRaw = td?.why_it_matters;
    const whyItMatters = (() => {
      if (typeof whyRaw === 'string' && whyRaw.trim()) {
        return { meaning_anchor: whyRaw.trim(), advance_organizer: '' };
      }
      const why = whyRaw as { meaning_anchor?: string; advance_organizer?: string } | undefined;
      return why && (why.meaning_anchor || why.advance_organizer) ? why : undefined;
    })();
    return {
      learningObjective: typeof json.learningObjective === 'string' ? json.learningObjective : undefined,
      whyItMatters,
      keyIdeas: Array.isArray(json.keyIdeas) ? json.keyIdeas as GuidedKeyIdea[] : [],
      practiceQuestions: Array.isArray(json.practiceQuestions) ? json.practiceQuestions as GuidedQuestion[] : [],
      exitTicket: (json.exitTicket as GuidedQuestion | null) ?? null,
      exitTicketItems: (() => {
        // Prefer exitTicketItems from payload (TeachingResourcesPage passes array)
        const fromPayload = json.exitTicketItems;
        if (Array.isArray(fromPayload) && fromPayload.length > 0) {
          return fromPayload as GuidedQuestion[];
        }
        // Else parse from taskDesignJson.exit_ticket (direct array or { items: [...] })
        const raw = td?.exit_ticket;
        const items = Array.isArray(raw)
          ? (raw as Array<Record<string, unknown>>)
          : Array.isArray((raw as { items?: unknown[] })?.items)
            ? ((raw as { items: unknown[] }).items as Array<Record<string, unknown>>)
            : [];
        return items
          .map((item) => {
            const rawType = (item?.question_type ?? item?.questionType) as string | undefined;
            const questionType =
              rawType === 'multiple_choice' || rawType === 'short_answer' || rawType === 'true_false'
                ? rawType
                : undefined;
            return {
              question: String((item?.question ?? item?.q) || '').trim(),
              correctAnswer: (item?.answer ?? item?.a) != null ? String(item.answer ?? item.a) : undefined,
              options: Array.isArray(item?.options) ? (item.options as string[]) : undefined,
              questionType,
            };
          })
          .filter((item) => item.question.length > 0) as GuidedQuestion[];
      })(),
      taskDesignJson: td,
      customTextInstruction: typeof json.customTextInstruction === 'string' ? json.customTextInstruction.trim() || undefined : undefined,
      resourceKind: typeof json.resourceKind === 'string' && ['video', 'document', 'text_instruction'].includes(json.resourceKind) ? json.resourceKind as 'video' | 'document' | 'text_instruction' : undefined,
      resourceMimeType: typeof json.resourceMimeType === 'string' ? json.resourceMimeType.trim() || undefined : undefined,
      convertedHtml: typeof json.convertedHtml === 'string' ? json.convertedHtml.trim() || undefined : undefined,
    };
  } catch {
    return null;
  }
}

/** Strip leading "A. ", "B. " etc. from option text to avoid double prefix in UI */
function normalizeOptionText(text: string): string {
  return text.replace(/^[A-D][\.\)\u3001\s]+/i, '').trim();
}

function extractQuestionStemAndOptions(question: string, options?: string[]): { stem: string; options: string[] } {
  if (options && options.length > 0) {
    return { stem: question, options: options.map(normalizeOptionText) };
  }
  const lines = question
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const optionLines = lines.filter((line) => /^[A-D][\.\)\u3001\s]/i.test(line));
  if (optionLines.length >= 2) {
    const stemLines = lines.filter((line) => !/^[A-D][\.\)\u3001\s]/i.test(line));
    const cleaned = optionLines.map((line) => line.replace(/^[A-D][\.\)\u3001\s]+/i, '').trim());
    return {
      stem: stemLines.join('\n').trim() || question,
      options: cleaned,
    };
  }
  return { stem: question, options: [] };
}

function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      return parsed.pathname.replace(/^\//, '').split('/')[0] || null;
    }

    if (host.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return v;

      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' || parts[0] === 'shorts') {
        return parts[1] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/** Extract Bilibili bvid from bilibili.com/b23.tv URLs. Used for China market embed. */
function extractBilibiliBvid(url: string): string | null {
  if (!url?.trim()) return null;
  const s = url.trim();
  const bvMatch = s.match(/\b(BV[0-9A-Za-z]+)\b/i);
  if (bvMatch) return bvMatch[1];
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('bilibili.com') && !host.includes('b23.tv')) return null;
    const q = parsed.searchParams.get('bvid');
    if (q) return q;
    const pathMatch = parsed.pathname.match(/(?:\/video\/|\/)(BV[0-9A-Za-z]+)/i);
    return pathMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

// Text Editor Preview Component for writing space
const TextEditorPreview = ({ content, onEditClick }: { content: string; onEditClick: () => void }) => {
  const { t } = useTranslation('studentConsole');
  return (
    <div 
      className="h-full overflow-y-auto custom-scrollbar bg-white p-8 cursor-text hover:bg-slate-50/50 transition-colors"
      onClick={onEditClick}
      title={t('clickToEdit')}
    >
      <div className="prose prose-slate prose-sm max-w-none text-slate-700 font-sans leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({...props}: MarkdownComponentProps<'h1'>) => <h1 className="text-xl font-bold text-slate-900 mb-4" {...props} />,
            h2: ({...props}: MarkdownComponentProps<'h2'>) => <h2 className="text-lg font-bold text-slate-900 mt-4 mb-2" {...props} />,
            h3: ({...props}: MarkdownComponentProps<'h3'>) => <h3 className="text-md font-bold text-slate-700 mt-3 mb-1" {...props} />,
            strong: ({...props}: MarkdownComponentProps<'strong'>) => <strong className="text-slate-900 font-bold" {...props} />,
            li: ({...props}: MarkdownComponentProps<'li'>) => <li className="ml-4 list-disc text-slate-700 mb-1" {...props} />,
            p: ({...props}: MarkdownComponentProps<'p'>) => <p className="mb-3 leading-relaxed" {...props} />,
            ul: ({...props}: MarkdownComponentProps<'ul'>) => <ul className="mb-4 space-y-1" {...props} />,
            ol: ({...props}: MarkdownComponentProps<'ol'>) => <ol className="mb-4 space-y-1 list-decimal ml-6" {...props} />,
            code: ({inline, ...props}: MarkdownComponentProps<'code'> & { inline?: boolean }) => 
              inline ? (
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800" {...props} />
              ) : (
                <code className="block bg-slate-100 p-3 rounded text-sm font-mono text-slate-800 overflow-x-auto mb-4" {...props} />
              ),
            pre: ({...props}: MarkdownComponentProps<'pre'>) => <pre className="mb-4" {...props} />,
          }}
        >
          {content || t('noContentEditHint')}
        </ReactMarkdown>
      </div>
    </div>
  );
};

const StudentConsole: React.FC<StudentConsoleProps> = ({
  plan,
  onComplete,
  onApiKeyError,
  onBack,
  contentLanguage = 'zh',
  assignmentSource,
  groupId,
  classId,
}) => {
  const { user } = useAuth();
  const params = useParams();
  const { t } = useTranslation('studentConsole');
  const courseId = params.id as string | undefined;
  const sessionStartRef = useRef(Date.now());

  const reportProgress = useCallback(
    (progress: number, completed: boolean, lastTaskIndex: number) => {
      if (!courseId || !user?.id) return;
      const timeSpentSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
      upsertStudentCourseProgress({
        courseId,
        progress,
        completed,
        timeSpentSeconds,
        lastTaskIndex,
      }).catch((err) => console.warn('[StudentConsole] Progress report failed:', err));
    },
    [courseId, user?.id]
  );

  // --- State (currentTaskIndex must be before emitEvent which uses it) ---
  const taskIndexStorageKey = `currentTaskIndex_${courseId || 'default'}`;
  const [currentTaskIndex, setCurrentTaskIndex] = useState(() => {
    if (typeof window !== 'undefined' && courseId) {
      const saved = localStorage.getItem(taskIndexStorageKey);
      if (saved !== null) {
        const index = parseInt(saved, 10);
        if (!isNaN(index) && index >= 0 && index < plan.tasks.length) {
          return index;
        }
      }
    }
    return 0;
  });

  const assignmentEventProps = useMemo(
    () => ({
      ...(assignmentSource && { assignmentSource }),
      ...(groupId && { groupId }),
      ...(classId && { classId }),
    }),
    [assignmentSource, groupId, classId]
  );

  const emitEvent = useCallback(
    async (
      eventName: 'step_entered' | 'step_completed' | 'stuck_clicked' | 'course_completed',
      properties?: Record<string, unknown>
    ) => {
      const { data: sessionData } = await supabase.auth.getSession();
      await trackProductEvent(
        {
          eventName,
          role: 'student',
          language: contentLanguage,
          courseId,
          taskId: plan.tasks[currentTaskIndex]?.id,
          studentId: user?.id,
          properties: { taskIndex: currentTaskIndex, ...assignmentEventProps, ...properties },
        },
        sessionData.session?.access_token
      );
    },
    [contentLanguage, courseId, currentTaskIndex, plan.tasks, user?.id, assignmentEventProps]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [studentLog, setStudentLog] = useState<string[]>([]);
  
  // Layout State - 80/20 split, no resizers
  const containerRef = useRef<HTMLDivElement>(null);

  // AI Bubble mode: floating avatar + popup
  const [bubbleOpen, setBubbleOpen] = useState(false);

  // Asset State
  const [assetData, setAssetData] = useState<any>(null);
  const [isAssetLoading, setIsAssetLoading] = useState(false); // Restored for runtime fallback
  
  // Interactive View States
  const [mindMapInput, setMindMapInput] = useState<string>(''); 
  const [mindMapError, setMindMapError] = useState<string | null>(null);
  const [mindMapScale, setMindMapScale] = useState(1); // Zoom state
  const [confusionPoints, setConfusionPoints] = useState<string[]>([]); // 困惑点列表
  const [showConfusionInput, setShowConfusionInput] = useState(false); // 显示困惑点输入框
  const [confusionInput, setConfusionInput] = useState(''); // 困惑点输入内容
  const [visualizationData, setVisualizationData] = useState<VisualizationData | null>(null); // 可视化数据
  
  // Fullscreen modal states
  const [isFullscreenExperiment, setIsFullscreenExperiment] = useState(false);
  const [isFullscreenMindmap, setIsFullscreenMindmap] = useState(false);
  
  // 可视化进度追踪
  const [visualizationProgress, setVisualizationProgress] = useState<VisualizationProgress>({
    totalNodes: 0,
    totalEdges: 0,
    confusionPoints: 0,
    completionRate: 0
  });
  const [lastVisualizationAction, setLastVisualizationAction] = useState<VisualizationAction>('idle');
  const [lastVisualizationActionTime, setLastVisualizationActionTime] = useState<number>(Date.now());
  const [previousNodeCount, setPreviousNodeCount] = useState<number>(0);
  const [previousEdgeCount, setPreviousEdgeCount] = useState<number>(0);
  
  // Table View States
  const [tableData, setTableData] = useState<{columns: string[], rows: string[][]}>({ columns: [], rows: [] });

  // Text Editor State
  const [textEditorContent, setTextEditorContent] = useState<string>('');
  const [isTextEditorPreview, setIsTextEditorPreview] = useState<boolean>(false);
  
  // Math Editor State
  const [mathEditorContent, setMathEditorContent] = useState<string>('');
  const getGuidedProgressKey = (idx: number) => `guidedProgress_${courseId || 'default'}_${idx}`;
  const [guidedStep, setGuidedStep] = useState(() => {
    if (typeof window !== 'undefined' && courseId) {
      const savedIdx = localStorage.getItem(taskIndexStorageKey);
      const idx = savedIdx !== null && !isNaN(parseInt(savedIdx, 10)) ? parseInt(savedIdx, 10) : 0;
      const saved = localStorage.getItem(getGuidedProgressKey(idx));
      if (saved) {
        try {
          const { step, max } = JSON.parse(saved);
          if (typeof step === 'number' && step >= 1 && step <= 5 && typeof max === 'number' && max >= 1 && max <= 5) {
            return step;
          }
        } catch { /* ignore */ }
      }
    }
    return 1;
  });
  const [maxStepReached, setMaxStepReached] = useState(() => {
    if (typeof window !== 'undefined' && courseId) {
      const savedIdx = localStorage.getItem(taskIndexStorageKey);
      const idx = savedIdx !== null && !isNaN(parseInt(savedIdx, 10)) ? parseInt(savedIdx, 10) : 0;
      const saved = localStorage.getItem(getGuidedProgressKey(idx));
      if (saved) {
        try {
          const { max } = JSON.parse(saved);
          if (typeof max === 'number' && max >= 1 && max <= 5) return max;
        } catch { /* ignore */ }
      }
    }
    return 1;
  });
  const [keywordAnswers, setKeywordAnswers] = useState<Record<string, string>>({});
  const [practiceTextAnswers, setPracticeTextAnswers] = useState<Record<number, string>>({});
  const [practiceChoiceAnswers, setPracticeChoiceAnswers] = useState<Record<number, number>>({});
  const [practiceImageAnswers, setPracticeImageAnswers] = useState<Record<number, string>>({});
  const [practiceInputMode, setPracticeInputMode] = useState<Record<number, 'text' | 'upload' | 'draw'>>({});
  const [practiceCurrentIndex, setPracticeCurrentIndex] = useState(0);
  const practiceCanvasRef = useRef<SignatureCanvas>(null);
  const [mindmapInputMode, setMindmapInputMode] = useState<'upload' | 'draw'>('upload');
  const [mindmapImageAnswer, setMindmapImageAnswer] = useState<string>('');
  const mindmapCanvasRef = useRef<SignatureCanvas>(null);
  const [showPracticeSolutions, setShowPracticeSolutions] = useState<Record<number, boolean>>({});
  const [stuckClicksPerPracticeQuestion, setStuckClicksPerPracticeQuestion] = useState<Record<number, number>>({});
  const [stuckClicksForKeyIdeas, setStuckClicksForKeyIdeas] = useState(0);
  const [showKeyIdeaBlanks, setShowKeyIdeaBlanks] = useState(false);
  const [exitTicketAnswer, setExitTicketAnswer] = useState('');
  const [exitTicketAnswers, setExitTicketAnswers] = useState<Record<number, string>>({});
  const [showExitTicketAnswer, setShowExitTicketAnswer] = useState(false);

  // Edit Count Tracking (for progress tracker)
  const [editCounts, setEditCounts] = useState({
    mindMap: 0,
    table: 0,
    text: 0,
    math: 0
  });

  // Improvement Count Tracking (基于"我做完了"循环)
  const [improvementCount, setImprovementCount] = useState(0);
  const [lastDoneClickTime, setLastDoneClickTime] = useState<number | null>(null);
  const [hasEditAfterDone, setHasEditAfterDone] = useState(false);

  // Completed Tasks Tracking (基于AI明确给出"任务完成"信号)
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());

  // Exit Ticket / Report States
  const [showReport, setShowReport] = useState(false);
  const [exitData, setExitData] = useState<ExitTicketAnalysis | null>(null);
  const [selectedCharacteristic, setSelectedCharacteristic] = useState<string | null>('self_drive');
  const [finalMindMapCode, setFinalMindMapCode] = useState<string | null>(null);
  const [learningLog, setLearningLog] = useState<string>('');
  
  // Student Name State: use logged-in user name, then localStorage, else "您"
  const [studentName, setStudentName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('studentName') || '您';
    }
    return '您';
  });

  useEffect(() => {
    if (user?.name?.trim()) {
      setStudentName(user.name.trim());
      if (typeof window !== 'undefined') {
        localStorage.setItem('studentName', user.name.trim());
      }
    }
  }, [user?.name]);

  // AI Tutor: 使用 i18n，后续再定义个性化
  const tutorName = t('aiSystem');
  const tutorAvatar = '🤖';
  
  // Avatar animation state
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const avatarStateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Voice features state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);
  const [voiceServiceAvailable, setVoiceServiceAvailable] = useState(true);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');

  // Autoplay unlock (browsers block audio.play() before first user gesture)
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const pendingAutoSpeakRef = useRef<string | null>(null);

  useEffect(() => {
    const unlock = () => setHasUserInteracted(true);
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Speech recognition hook
  const {
    isRecording,
    isProcessing: isProcessingSpeech,
    error: speechError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useSpeechRecognition({
    language: contentLanguage === 'en' ? 'en-US' : 'zh-CN',
    onResult: (text) => {
      // Hold-to-talk UX: release sends recognized text immediately
      handleSendMessage(text);
    },
    onError: (error) => {
      console.error('Speech recognition error:', error);
      // Check if service is unavailable and disable voice features gracefully
      if (error.message.includes('not configured') || error.message.includes('credentials')) {
        setVoiceServiceAvailable(false);
        setVoiceEnabled(false);
      }
    },
  });

  // Text-to-speech hook
  const {
    isPlaying: isPlayingVoice,
    isLoading: isLoadingVoice,
    error: ttsError,
    play: playVoice,
    stop: stopVoice,
  } = useTextToSpeech({
    language: contentLanguage === 'en' ? 'en-US' : 'cmn-CN',
    voiceName: 'cmn-CN-Chirp3-HD-Despina',
    onPlayStart: () => {
      setAvatarState('speaking');
    },
    onPlayEnd: () => {
      setAvatarState('idle');
    },
    onError: (error) => {
      console.error('Text-to-speech error:', error);
      // Check if service is unavailable and disable voice features gracefully
      if (error.message.includes('not configured') || error.message.includes('credentials')) {
        setVoiceServiceAvailable(false);
        setAutoPlayVoice(false);
      }
    },
  });

  // If we have pending auto-speak text, play it once after user interaction unlocks autoplay
  useEffect(() => {
    if (!hasUserInteracted) return;
    const text = pendingAutoSpeakRef.current;
    if (!text) return;
    if (!(autoPlayVoice && voiceEnabled && voiceServiceAvailable)) return;

    pendingAutoSpeakRef.current = null;
    // Small delay to ensure UI is stable
    setTimeout(() => {
      playVoice(text).catch((err) => {
        console.warn('Deferred auto-play voice failed:', err);
      });
    }, 200);
  }, [hasUserInteracted, autoPlayVoice, voiceEnabled, voiceServiceAvailable, playVoice]);

  const mindMapRef = useRef<HTMLDivElement>(null);

  // Refs
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // 跟踪已发送问候消息的任务索引，避免重复发送
  const greetingSentRef = useRef<Set<number>>(new Set());
  const guidedDoneInFlight = useRef(false); // 防止引导流 handleDone 双击重复请求
  // 进入步骤 5 时的消息数量，用于判断 [STEP_PASS] 是否来自步骤 5 的 AI 判定
  const messagesCountAtStep5EntryRef = useRef<number>(0);
  const lastConsumedStepPassMessageIndexRef = useRef<number | null>(null);
  const currentTask = plan.tasks[currentTaskIndex] ?? plan.tasks[0];
  
  // Derived View Type
  const viewType = currentTask.viewType || 'text_editor';
  const guidedPayload = useMemo(
    () => parseGuidedPayload(currentTask.contentPayload),
    [currentTask.contentPayload]
  );
  const guidedKeyIdeas = guidedPayload?.keyIdeas || [];
  const guidedPractice = guidedPayload?.practiceQuestions || [];
  const guidedExitTicket = guidedPayload?.exitTicket || null;
  const guidedExitTickets: GuidedQuestion[] = useMemo(() => {
    const items = guidedPayload?.exitTicketItems || [];
    if (items.length > 0) return items;
    return guidedExitTicket ? [guidedExitTicket] : [];
  }, [guidedPayload?.exitTicketItems, guidedExitTicket]);
  const allExitTicketsCompleted = useMemo(() => {
    if (guidedStep !== 5) return true;
    if (guidedExitTickets.length === 0) return exitTicketAnswer.trim().length > 0;
    return guidedExitTickets.every((_, idx) => {
      const answer = (exitTicketAnswers[idx] ?? (idx === 0 ? exitTicketAnswer : '')).trim();
      return answer.length > 0;
    });
  }, [guidedStep, guidedExitTickets, exitTicketAnswers, exitTicketAnswer]);
  const isGuidedVideoFlow = viewType === 'video_player' && !!guidedPayload?.learningObjective;

  // 进入「我能练一练」时重置为第一题
  useEffect(() => {
    if (guidedStep === 4) {
      setPracticeCurrentIndex(0);
    }
  }, [guidedStep]);

  useEffect(() => {
    setStuckClicksForKeyIdeas(0);
    setShowKeyIdeaBlanks(false);
  }, [currentTaskIndex]);

  // 切换题目时清空手写画布（避免误存到上一题）
  useEffect(() => {
    if (guidedStep === 4) {
      practiceCanvasRef.current?.clear();
    }
  }, [guidedStep, practiceCurrentIndex]);

  useEffect(() => {
    if (viewType === 'mindmap_editor') {
      mindmapCanvasRef.current?.clear();
    }
  }, [viewType, currentTaskIndex]);

  const getIconForTrait = (key: string) => {
      switch(key) {
          case 'self_drive': return <Target size={18} className="text-cyan-600"/>;
          case 'focus': return <Zap size={18} className="text-yellow-600"/>;
          case 'thinking': return <Search size={18} className="text-purple-600"/>;
          case 'improvement': return <TrendingUp size={18} className="text-emerald-600"/>;
          default: return <Activity size={18}/>;
      }
  };

  const prevTaskIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevTaskIndexRef.current === null) {
      prevTaskIndexRef.current = currentTaskIndex;
      return;
    }
    if (prevTaskIndexRef.current === currentTaskIndex) return;
    prevTaskIndexRef.current = currentTaskIndex;
    setGuidedStep(1);
    setMaxStepReached(1);
    setKeywordAnswers({});
    setPracticeTextAnswers({});
    setPracticeChoiceAnswers({});
    setShowPracticeSolutions({});
    setExitTicketAnswer('');
    setExitTicketAnswers({});
    setShowExitTicketAnswer(false);
  }, [currentTaskIndex]);

  useEffect(() => {
    if (typeof window !== 'undefined' && courseId && guidedStep >= 1 && guidedStep <= 5 && maxStepReached >= 1 && maxStepReached <= 5) {
      const key = `guidedProgress_${courseId}_${currentTaskIndex}`;
      localStorage.setItem(key, JSON.stringify({ step: guidedStep, max: maxStepReached }));
    }
  }, [currentTaskIndex, guidedStep, maxStepReached, courseId]);

  // --- Effects ---

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is fully updated (also when bubble opens)
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });
  }, [messages, bubbleOpen]);

  // Update avatar state based on typing status and voice state
  useEffect(() => {
    // Clear any existing timer first
    if (avatarStateTimerRef.current) {
      clearTimeout(avatarStateTimerRef.current);
      avatarStateTimerRef.current = null;
    }

    if (isRecording) {
      // 用户正在录音
      setAvatarState('listening');
    } else if (chatInput.trim().length > 0) {
      // 用户正在输入框中打字
      setAvatarState('listening');
    } else if (isTyping) {
      // AI正在处理用户消息
      setAvatarState('thinking');
    } else if (isPlayingVoice) {
      // AI正在播放语音
      setAvatarState('speaking');
    } else if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // 如果最后一条消息是AI的回复，显示speaking状态（包括文字输出）
      if (lastMessage.role === 'model') {
        // 检查消息是否是新添加的（5秒内）
        const messageAge = Date.now() - lastMessage.timestamp;
        if (messageAge < 5000) {
          // AI刚回复，显示speaking状态（文字输出过程）
          setAvatarState('speaking');
          // 5秒后切换回idle（给用户时间阅读）
          avatarStateTimerRef.current = setTimeout(() => {
            setAvatarState('idle');
            avatarStateTimerRef.current = null;
          }, 5000);
        } else {
          // 消息已经显示一段时间了，切换回idle
          setAvatarState('idle');
        }
      } else {
        setAvatarState('idle');
      }
    } else {
      setAvatarState('idle');
    }

    // Always return cleanup function to clear timer
    return () => {
      if (avatarStateTimerRef.current) {
        clearTimeout(avatarStateTimerRef.current);
        avatarStateTimerRef.current = null;
      }
    };
  }, [isTyping, messages, isRecording, isPlayingVoice, chatInput]);

  // Initialize Mermaid with LIGHT THEME
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Dynamic import to avoid server-side import issues
    import('mermaid').then((mermaidModule) => {
      const mermaid = mermaidModule.default;
      mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'base',
        securityLevel: 'loose',
        fontFamily: 'sans-serif',
        themeVariables: {
          darkMode: false,
          background: '#ffffff',
          primaryColor: '#e0f2fe',
          edgeLabelBackground: '#ffffff',
          lineColor: '#334155',
          textColor: '#0f172a',
          mainBkg: '#f0f9ff',
          nodeBorder: '#0284c7'
        }
      });
    }).catch((err) => {
      console.error('Failed to load mermaid:', err);
    });
  }, []);

  // MindMap Render Logic
  const mindMapIdRef = useRef<string | null>(null);
  
  const renderMindMap = async (code: string, containerRef: React.RefObject<HTMLDivElement>) => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Generate ID only once on mount to avoid hydration issues
    if (!mindMapIdRef.current) {
      mindMapIdRef.current = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    if (containerRef.current) {
        try {
            // Dynamic import to avoid server-side import issues
            const mermaidModule = await import('mermaid');
            const mermaid = mermaidModule.default;
            
            const cleanCode = code.trim();
            if (!cleanCode) return;

            const finalCode = (cleanCode.startsWith('graph') || cleanCode.startsWith('mindmap')) 
                ? cleanCode 
                : `graph TD\n  Node["${cleanCode.replace(/"/g, "'")}"]`;

            const { svg } = await mermaid.render(mindMapIdRef.current, finalCode);
            
            if (containerRef.current) {
                containerRef.current.innerHTML = svg;
                if (containerRef === mindMapRef) setMindMapError(null);
            }
        } catch (e: unknown) {
             console.debug("Mermaid render warning:", e);
             if (containerRef === mindMapRef) setMindMapError("语法结构不完整或有误");
        }
    }
  };

  // Debounce Render for Student Map
  useEffect(() => {
    if (viewType === 'mindmap_editor') {
        const timer = setTimeout(() => {
            renderMindMap(mindMapInput, mindMapRef as React.RefObject<HTMLDivElement>);
        }, 600);
        return () => clearTimeout(timer);
    }
  }, [mindMapInput, viewType]);

  // Initial Task Setup (With Runtime Fallback)
  useEffect(() => {
    const initTask = () => {
      addLog(`Started Task ${currentTaskIndex + 1}: ${currentTask.title} (${viewType})`);
      void emitEvent('step_entered', { taskTitle: currentTask.title }).catch(() => undefined);
      setAssetData(null);
      setMindMapError(null);
      setMindMapScale(1);
      setIsAssetLoading(false);
      // 重置困惑点相关状态（新任务开始）
      setConfusionPoints([]);
      setShowConfusionInput(false);
      setConfusionInput('');
      // 重置可视化数据（新任务开始）
      setVisualizationData(null);
      // 重置编辑计数（新任务开始）
      setEditCounts({ mindMap: 0, table: 0, text: 0, math: 0 });
      
      const preGenerated = currentTask.generatedAssetContent;

      try {
          if (viewType === 'mindmap_editor') {
             if (preGenerated) {
                 // Teacher prepared it - use it directly
                 setMindMapInput(preGenerated);
                 // Convert to VisualizationData
                 try {
                     const vData = mermaidToVisualizationData(preGenerated);
                     setVisualizationData(vData);
                 } catch (e) {
                     console.error('Failed to convert Mermaid to VisualizationData:', e);
                     setVisualizationData({
                         type: 'mindmap',
                         nodes: [],
                         edges: [],
                         metadata: {}
                     });
                 }
             } else {
                 // CRITICAL: Do NOT auto-generate. Provide blank template for student to create.
                 // If contentPayload contains Mermaid code (teacher pasted manually), use it as template
                 const prompt = currentTask.contentPayload || currentTask.assetPrompt || '';
                 
                 // If the "prompt" actually looks like mermaid code (teacher pasted code manually), use it as starting template
                 if (prompt.trim().startsWith('graph') || prompt.trim().startsWith('mindmap')) {
                     // Use as template, but student should modify it
                     setMindMapInput(prompt);
                     try {
                         const vData = mermaidToVisualizationData(prompt);
                         setVisualizationData(vData);
                     } catch (e) {
                         console.error('Failed to convert Mermaid to VisualizationData:', e);
                         setVisualizationData({
                             type: 'mindmap',
                             nodes: [],
                             edges: [],
                             metadata: {}
                         });
                     }
                 } else {
                     // Provide minimal blank template - student must create their own
                     // For Step 6 (知识体系建构), provide a very basic structure
                     const isStep6 = currentTask.title?.includes('知识体系') || currentTask.outputGoal?.includes('知识体系');
                     if (isStep6) {
                         // Minimal template with just the central concept
                         const topic = currentTask.title || '本节课主题';
                         const template = `mindmap\n  Root((${topic}))\n    A[概念一]\n    B[概念二]`;
                         setMindMapInput(template);
                         try {
                             const vData = mermaidToVisualizationData(template);
                             setVisualizationData(vData);
                         } catch (e) {
                             setVisualizationData({
                                 type: 'mindmap',
                                 nodes: [{ id: 'root', label: topic, type: 'concept' }],
                                 edges: [],
                                 metadata: { centralConcept: topic }
                             });
                         }
                     } else {
                         // Completely blank for other tasks
                         const blankTemplate = 'mindmap\n  Root((中心概念))';
                         setMindMapInput(blankTemplate);
                         setVisualizationData({
                             type: 'mindmap',
                             nodes: [{ id: 'root', label: '中心概念', type: 'concept' }],
                             edges: [],
                             metadata: { centralConcept: '中心概念' }
                         });
                     }
                 }
             }
          
          } else if (viewType === 'table_editor') {
             const emptyFallback = { columns: ['', ''], rows: [['', ''], ['', '']] };
             if (preGenerated) {
                 try {
                     const data = JSON.parse(preGenerated);
                     if (data && data.columns && data.rows !== undefined) {
                         const rowCount = typeof data.rows === 'number' ? data.rows : (Array.isArray(data.rows) ? data.rows.length : 2);
                         const emptyRows = Array(rowCount).fill(null).map(() => Array(data.columns.length).fill(''));
                         setTableData({ columns: data.columns, rows: emptyRows });
                     } else {
                        throw new Error("无效的表格数据");
                     }
                 } catch (e) {
                     setTableData(emptyFallback);
                 }
             } else {
                 setTableData(emptyFallback);
             }

          } else if (viewType === 'text_editor') {
              // Initialize text editor with content payload (prompt/template)
              // 格式化内容：将编号任务纵向排列
              const rawContent = currentTask.contentPayload || currentTask.description || '';
              const formatContentPayload = (content: string) => {
                  if (!content) return content;
                  // 检查是否包含编号模式（1. 2. 3.）
                  const numberedPattern = /(\d+\.)/;
                  if (numberedPattern.test(content)) {
                      // 按编号分割
                      const items = content.split(/(?=\d+\.)/).filter(item => item.trim());
                      if (items.length > 1) {
                          // 将每个任务项分行显示，确保纵向排列
                          return items.map(item => item.trim()).join('\n\n');
                      }
                  }
                  return content;
              };
              const formattedContent = formatContentPayload(rawContent);
              setTextEditorContent(formattedContent);
              setAssetData(currentTask.contentPayload);

          } else if (viewType === 'math_editor') {
              // Initialize math editor with content payload or description
              const rawContent = currentTask.contentPayload || currentTask.description || '';
              setMathEditorContent(rawContent);
              setAssetData(currentTask.contentPayload);

          } else if (viewType === 'video_player') {
             const videoSource = (
               currentTask.externalResourceUrl
               || preGenerated
               || ''
             ).trim();
             if (videoSource) {
               setAssetData(videoSource);
             }
          } else {
             // For Images, Videos, HTML
             if (preGenerated) {
                 setAssetData(preGenerated);
             } else if (currentTask.assetPrompt) {
                 // Fallback for images? Maybe not for v0.5 to keep it fast, 
                 // but if you really want "Original" feeling:
                 setIsAssetLoading(true);
                 generateTaskAsset(currentTask.assetType, currentTask.assetPrompt, courseId, currentTask.id, contentLanguage).then(res => {
                     setAssetData(res);
                 }).finally(() => setIsAssetLoading(false));
             }
          }
      } catch (e) {
          console.error("Task Init Error", e);
      }

      // 检查是否已经为当前任务发送过问候消息，避免重复发送
      if (!greetingSentRef.current.has(currentTaskIndex)) {
        // 基于任务内容生成温暖的开场白（拆成多条消息，避免突兀的长文本框+滚动条）
        const taskTitle = currentTask.title || t('newTask');
        const taskDesc = currentTask.description || '';
        const scenarioHint = taskDesc.substring(0, 100).replace(/\n/g, ' ').trim();

        const greetingParts: string[] = currentTaskIndex === 0
          ? [
              t('greetingFirst', { name: studentName }),
              scenarioHint ? t('greetingFirstWithHint', { title: taskTitle }) : t('greetingFirstNoHint', { title: taskTitle }),
              t('greetingFirstEnd'),
            ]
          : [
              t('greetingLater', { name: studentName }),
              t('greetingLaterBody', { title: taskTitle }),
              t('greetingLaterEnd'),
            ];

        const timestamp = Date.now();
        setMessages(prev => [...prev, ...greetingParts.map((text) => ({ role: 'model' as const, text, timestamp }))]);
        greetingSentRef.current.add(currentTaskIndex);
        setBubbleOpen(true);

        const greetingFull = greetingParts.join('\n\n');
        if (currentTaskIndex === 0 && autoPlayVoice && voiceEnabled && voiceServiceAvailable) {
          if (hasUserInteracted) {
            setTimeout(() => {
              playVoice(greetingFull).catch(err => {
                console.warn('Auto-play greeting voice failed:', err);
              });
            }, 500);
          } else {
            pendingAutoSpeakRef.current = greetingFull;
          }
        }
      }
    };

    initTask();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTaskIndex, emitEvent, plan]);

  // Monitor visualization progress and trigger AI feedback when student is stuck
  useEffect(() => {
    const currentViewType = plan.tasks[currentTaskIndex]?.viewType;
    if (currentViewType !== 'mindmap_editor' || !visualizationData) return;
    
    const checkProgress = setInterval(() => {
      const idleTime = Date.now() - lastVisualizationActionTime;
      
      // Check if student is stuck (idle for more than 2 minutes)
      if (idleTime > 120000 && lastVisualizationAction === 'idle') {
        const prompt = generateGuidancePrompt(visualizationData, 'idle', idleTime);
        handleSendMessage(undefined, prompt);
        setLastVisualizationActionTime(Date.now()); // Reset timer to avoid spam
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(checkProgress);
  }, [plan.tasks, currentTaskIndex, visualizationData, lastVisualizationAction, lastVisualizationActionTime]);

  // --- Helpers ---
  const addLog = (text: string) => {
    // Use ISO string format that works consistently on both server and client
    const timestamp = new Date().toISOString().substring(11, 19);
    setStudentLog(prev => [...prev, `[${timestamp}] ${text}`]);
  };

  // Mindmap editor handlers (moved to component level for use in fullscreen modal)
  const handleVisualizationChange = useCallback((newData: VisualizationData) => {
    const oldNodeCount = visualizationData?.nodes.length || 0;
    const oldEdgeCount = visualizationData?.edges.length || 0;
    const newNodeCount = newData.nodes.length;
    const newEdgeCount = newData.edges.length;
    
    setVisualizationData(newData);
    
    // Update progress
    const progress: VisualizationProgress = {
      totalNodes: newNodeCount,
      totalEdges: newEdgeCount,
      confusionPoints: newData.metadata?.confusionPoints?.length || 0,
      completionRate: calculateCompletionRate(newData)
    };
    setVisualizationProgress(progress);
    setPreviousNodeCount(oldNodeCount);
    setPreviousEdgeCount(oldEdgeCount);
    
    // Convert VisualizationData back to Mermaid code ONLY if type is 'mindmap'
    if (newData.type === 'mindmap') {
      try {
        const mermaidCode = visualizationDataToMermaid(newData);
        setMindMapInput(mermaidCode);
        // Track edits
        setEditCounts(prev => ({ ...prev, mindMap: prev.mindMap + 1 }));
        // Mark edit after "done" click
        if (lastDoneClickTime !== null) {
          setHasEditAfterDone(true);
        }
      } catch (e) {
        console.error('Failed to convert VisualizationData to Mermaid:', e);
        setMindMapError('转换错误：无法生成 Mermaid 代码');
      }
    } else {
      // For conceptmap and knowledgegraph, just track edits without Mermaid conversion
      setEditCounts(prev => ({ ...prev, mindMap: prev.mindMap + 1 }));
      if (lastDoneClickTime !== null) {
        setHasEditAfterDone(true);
      }
    }
  }, [visualizationData, lastDoneClickTime]);

  const handleNodeCreated = useCallback((node: VisualizationNode) => {
    setLastVisualizationAction('node_created');
    setLastVisualizationActionTime(Date.now());
    addLog(`创建节点：${node.label}`);
    
    // Use current visualizationData state
    const currentData = visualizationData || { type: 'mindmap' as const, nodes: [], edges: [], metadata: {} };
    const currentNodeCount = currentData.nodes.length + 1; // +1 because node was just created
    
    // Check if should trigger AI feedback
    const shouldTrigger = shouldTriggerAIFeedback(
      'node_created',
      previousNodeCount,
      currentNodeCount,
      previousEdgeCount,
      currentData.edges.length,
      0
    );
    
    if (shouldTrigger) {
      // Create updated data for prompt
      const updatedData: VisualizationData = {
        ...currentData,
        nodes: [...currentData.nodes, node]
      };
      const prompt = generateGuidancePrompt(updatedData, 'node_created', 0);
      handleSendMessage(undefined, prompt);
    }
  }, [visualizationData, previousNodeCount, previousEdgeCount]);

  const handleNodeEdited = useCallback((node: VisualizationNode) => {
    setLastVisualizationAction('idle');
    setLastVisualizationActionTime(Date.now());
    addLog(`编辑节点：${node.label}`);
  }, []);

  const handleEdgeCreated = useCallback((edge: VisualizationEdge) => {
    setLastVisualizationAction('edge_created');
    setLastVisualizationActionTime(Date.now());
    const currentData = visualizationData || { type: 'mindmap' as const, nodes: [], edges: [], metadata: {} };
    const sourceNode = currentData.nodes.find(n => n.id === edge.source);
    const targetNode = currentData.nodes.find(n => n.id === edge.target);
    addLog(`创建连接：${sourceNode?.label || '未知'} -> ${targetNode?.label || '未知'}`);
    
    // Check if should trigger AI feedback
    const currentEdgeCount = currentData.edges.length + 1; // +1 because edge was just created
    const shouldTrigger = shouldTriggerAIFeedback(
      'edge_created',
      previousNodeCount,
      currentData.nodes.length,
      previousEdgeCount,
      currentEdgeCount,
      0
    );
    
    if (shouldTrigger) {
      // Create updated data for prompt
      const updatedData: VisualizationData = {
        ...currentData,
        edges: [...currentData.edges, edge]
      };
      const prompt = generateGuidancePrompt(updatedData, 'edge_created', 0);
      handleSendMessage(undefined, prompt);
    }
  }, [visualizationData, previousNodeCount, previousEdgeCount]);

  const handleConfusionMarked = useCallback((nodeId: string, label: string) => {
    setLastVisualizationAction('confusion_marked');
    setLastVisualizationActionTime(Date.now());
    addLog(`标记困惑点：${label}`);
    
    // Always trigger AI feedback for confusion points
    const currentData = visualizationData || { type: 'mindmap' as const, nodes: [], edges: [], metadata: {} };
    const prompt = generateGuidancePrompt(currentData, 'confusion_marked', 0);
    handleSendMessage(undefined, prompt);
  }, [visualizationData]);

  const handleProgressUpdate = useCallback((progress: VisualizationProgress) => {
    setVisualizationProgress(progress);
  }, []);

  const handleGenerateFramework = useCallback(async (topic: string): Promise<VisualizationData> => {
    setIsAssetLoading(true);
    try {
      const prompt = `根据课程主题"${topic}"，生成一个思维导图框架，包含3-5个核心概念节点。要求：
1. 使用Mermaid mindmap格式
2. 中心概念为"${topic}"
3. 包含3-5个主要分支概念
4. 每个概念应该是该主题的核心知识点
5. 输出格式：mindmap\\n  Root((${topic}))\\n    概念1\\n    概念2\\n    ...`;

      const mermaidCode = await generateTaskAsset('mindmap_code', prompt, courseId, currentTask?.id, contentLanguage);
      if (mermaidCode) {
        const vData = mermaidToVisualizationData(mermaidCode);
        setVisualizationData(vData);
        setMindMapInput(mermaidCode);
        addLog(`AI生成了思维导图框架：${topic}`);
        return vData;
      } else {
        throw new Error('Failed to generate framework');
      }
    } catch (error) {
      console.error('Failed to generate framework:', error);
      throw error;
    } finally {
      setIsAssetLoading(false);
    }
  }, [courseId, currentTask?.id, contentLanguage]);

  const getTaskContext = () => {
      let context = "";
      if (viewType === 'mindmap_editor') {
        context = mindmapImageAnswer
          ? 'Student submitted a handwritten/photo knowledge map image.'
          : 'Student has not submitted a knowledge map image yet.';
      } else if (viewType === 'table_editor') context = `Student Table Data: \nColumns: ${tableData.columns.join(', ')}. \nCurrent Content: ${JSON.stringify(tableData.rows)}`;
      else if (viewType === 'text_editor') context = `Student Text Editor Content: \n${textEditorContent}`;
      else if (viewType === 'math_editor') context = `Student Math Editor Content: \n${mathEditorContent}`;
      else if (viewType === 'image_gallery') context = `Student is viewing an AI generated image.`;
      else if (viewType === 'video_player') context = `Student is watching a video.`;
      else if (viewType === 'interactive_experiment') context = `Student is performing an interactive experiment.`;
      else context = `Student is performing task type: ${viewType}`;
      return context;
  };

  const handleSendMessage = async (forcedInput?: string, hiddenContext?: string, images?: string[]) => {
    const inputText = forcedInput || chatInput;
    if (!inputText.trim()) return;
    if (isTyping) return; // 防止并发重复请求

    // Generate timestamp only on client side (this is in event handler, so safe)
    const timestamp = Date.now();
    const userMsg: ChatMessage = { role: 'user', text: inputText, timestamp };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);
    setAvatarState('thinking'); // User sent message, AI is thinking
    addLog(`User Input: "${inputText}"`);

    // Force scroll to bottom after adding user message
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);

    let viewContext = getTaskContext();
    if (hiddenContext) {
        viewContext += `\nSystem Note: ${hiddenContext}`;
    }
    
    // 图像不足时的兜底文字引导：从任务描述中提取信息
    if (viewType === 'image_gallery' && currentTask.description) {
        const taskDescription = currentTask.description;
        // 提取关键信息用于文字描述
        viewContext += `\nTask Description for Image Context: ${taskDescription.substring(0, 500)}`;
    }

    // 检测学科类型（从任务标题、描述或plan中推断）
    const subject = (plan as any).subject || 
                    currentTask.title || 
                    currentTask.description || 
                    '通用';
    const isMathOrScience = ['数学', '物理', '化学', '生物', '科学', 'math', 'physics', 'chemistry', 'biology', 'science'].some(s => 
      subject.toLowerCase().includes(s.toLowerCase())
    );

    // 图像不足时的文字引导：从任务描述中提取信息
    let imageFallbackContext = '';
    if (viewType === 'image_gallery' && currentTask.description) {
        const taskDesc = currentTask.description.substring(0, 800);
        imageFallbackContext = `\n\n## 图像信息补充（当学生询问图像细节时使用）\n如果学生询问图像中的具体信息（如价格、数量、位置等），而图像信息不足时，请根据以下任务描述提供文字说明：\n${taskDesc}\n请用自然、生动的语言描述场景，帮助学生理解图像所表达的情境。`;
    }

    let dynamicSystemInstruction = `
${contentLanguage === 'en' ? '## MANDATORY - RESPOND IN ENGLISH ONLY\nYour ENTIRE response must be in English. Do NOT use any Chinese characters. Every sentence must be written in English.\n' : ''}
## 当前任务信息
- 任务标题：${currentTask.title}
- 学习目标：${currentTask.outputGoal}
- 学生当前状态：${viewContext}

## 教学策略
${currentTask.tutorConfig.systemInstruction || '引导学生自主思考，通过提问和讨论帮助学生理解。'}${imageFallbackContext}

## 语气要求
- 语气风格：${currentTask.tutorConfig.tone === 'Socratic' ? '苏格拉底式提问，但要用温暖、鼓励的方式提问，不要显得咄咄逼人' : currentTask.tutorConfig.tone}
- 语言：${contentLanguage === 'en' ? 'English only' : '简体中文'}

## 学科特别指导
${isMathOrScience ? `
**理科特别指导**：
- 数学、物理等学科虽然严谨，但你的表达要温暖。不要说"根据公式 $y=kx+b$"，而要说"我们一起看看这个函数 $y=kx+b$，它有什么特点呢？"
- 用生活化的例子帮助理解抽象概念。比如"想象一下，就像..."
- 当学生卡住时，不要说"你错了"，而要说"让我们换个角度想想..."
- 多用鼓励："你已经很接近了！"、"这个思路很棒！"
- 如果涉及数学公式，使用LaTeX格式：$公式$

**概念介绍特别要求**：
- 当需要介绍新概念（如截距、斜率、函数等）时，不要直接给出完整定义
- 先通过提问引导学生思考："你觉得...有什么特点？"、"如果我们把...比作...，你觉得...？"
- 等待学生回应后，再根据他们的理解逐步揭示概念的关键特征
- 让学生自己"发现"概念，而不是被动接受定义
` : `
**文科指导**：
- 保持生动有趣的语言风格
- 用故事、比喻让内容更生动
- 鼓励学生表达自己的见解
`}

## 提示策略（当学生请求帮助时）
- **分步给出提示**：每次只给一个关键提示点，不要一次性呈现所有提示
- **等待学生尝试**：给出提示后，等待学生回应或尝试，再决定是否继续
- **根据进度调整**：如果学生理解了第一个提示，可能不需要后续提示；如果仍有困难，再逐步给出下一个提示
- **避免信息过载**：一次只聚焦一个关键点，让学生有足够时间消化和理解

## 回复格式要求
- 不要使用Markdown格式（如**粗体**、#标题等），用自然的${contentLanguage === 'en' ? 'English' : '中文'}表达
- 可以适当使用表情符号（如😊、💡、👍），但每条最多1个
- **语言生动但简洁**：每次回复 2-4 句，总长度 60-120 字。${contentLanguage === 'en' ? 'Respond in English only.' : '使用简体中文。'}
- 如果涉及数学公式，使用LaTeX格式：$公式$
- **禁止重复**上一条消息中已说过的内容；禁止在同一条回复中出现重复段落
- **只聚焦当前步骤**，不要主动提及其他任务类型（学生做视频任务时不提思维导图等）
`;

    if (contentLanguage === 'en') {
      dynamicSystemInstruction = `
## CURRENT TASK
- Title: ${currentTask.title}
- Learning objective: ${currentTask.outputGoal}
- Student status: ${viewContext}

## Teaching strategy
- Be warm, encouraging, and concise.
- Ask one focused question at a time.
- Only discuss the CURRENT task/step.
- Do not reveal full answers directly.

## Subject guidance
${isMathOrScience
  ? `- For math/science, explain with concrete everyday examples and short formula references when needed (LaTeX: $...$).
- Keep explanations intuitive before formal definitions.`
  : `- For non-STEM tasks, use clear language and practical examples.`}

## Response rules
- Output language: English ONLY. Do not use any Chinese characters.
- No Markdown formatting.
- 2-4 sentences, concise and natural.
- Do not repeat prior wording.
- If student asks for hints, provide exactly ONE hint first.
`;
    }

    try {
        const responseText = await sendChatMessage(
          messages.concat(userMsg),
          userMsg.text,
          dynamicSystemInstruction,
          contentLanguage,
          {
            ...(images && images.length > 0 ? { images } : {}),
            ...(currentTask.tutorConfig.twinId ? { twinId: currentTask.tutorConfig.twinId } : {}),
          }
        );
        setMessages(prev => [...prev, { role: 'model', text: responseText, timestamp }]);
        // Avatar state will be automatically set to 'speaking' by useEffect when new message is added
        addLog(`AI Response: "${responseText.substring(0, 30)}..."`);
        
        // Auto-play voice if enabled and service is available
        if (autoPlayVoice && voiceEnabled && voiceServiceAvailable) {
          // Small delay to ensure message is rendered
          setTimeout(() => {
            playVoice(responseText).catch(err => {
              console.warn('Auto-play voice failed:', err);
              // Don't show error to user, just silently fail
            });
          }, 500);
        }
    } catch (e: unknown) {
        // Handle chat errors if they relate to auth
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes("Requested entity was not found") && onApiKeyError) {
            onApiKeyError();
        }
        setMessages(prev => [...prev, { role: 'model', text: t('connectionError'), timestamp }]);
        setAvatarState('idle'); // Error occurred, return to idle
    } finally {
        setIsTyping(false);
        guidedDoneInFlight.current = false; // 释放引导流请求锁
        // Avatar state is managed by the useEffect hook above, which properly handles
        // state transitions based on isTyping, isPlayingVoice, messages, etc.
        // No need for additional setTimeout here as it would use stale closure values.
    }
  };

  const getStuckHintDetailedContext = (): string => {
    if (!isGuidedVideoFlow) return '';
    if (guidedStep === 3 && guidedKeyIdeas.length > 0) {
      const lines: string[] = [
        contentLanguage === 'en'
          ? 'KEY IDEAS FILLING - Current items with student answers vs reference keywords:'
          : '关键要点填空 - 当前题目、学生已填内容、参考答案（供渐进式提示使用）：',
      ];
      guidedKeyIdeas.forEach((idea, idx) => {
        const parts = idea.text.split('__KEY__');
        const blankCount = Math.max(0, parts.length - 1);
        const refKeywords = idea.blanks || [];
        const studentFills =
          blankCount > 0
            ? Array.from({ length: blankCount }).map((_, bi) => keywordAnswers[`blank-${idx}-${bi}`] || '')
            : [keywordAnswers[`idea-${idx}`] || ''];
        const missing = studentFills.map((v, i) => (v.trim() ? '' : `[空${i + 1}]`)).filter(Boolean);
        lines.push(
          `[${idx + 1}] 题干: ${idea.text.replace(/__KEY__/g, '___')} | 学生已填: ${JSON.stringify(studentFills)} | 缺失: ${missing.join(' ') || '无'} | 参考答案: ${JSON.stringify(refKeywords)}`
        );
      });
      lines.push(
        contentLanguage === 'en'
          ? `Stuck clicks so far: ${stuckClicksForKeyIdeas}. Give hint #${stuckClicksForKeyIdeas + 1} - start vague, increase specificity with each click.`
          : `已点击「我卡住了」${stuckClicksForKeyIdeas} 次。给出第 ${stuckClicksForKeyIdeas + 1} 次提示 - 循序渐进，每次点击时信息量逐渐增强。`
      );
      return lines.join('\n');
    }
    if (guidedStep === 4 && guidedPractice.length > 0) {
      const idx = practiceCurrentIndex;
      const q = guidedPractice[idx];
      const parsed = extractQuestionStemAndOptions(q.question || '', q.options);
      const stuckCount = stuckClicksPerPracticeQuestion[idx] ?? 0;
      const isTF = q.questionType === 'true_false' || (!parsed.options?.length && /^(true|false)$/i.test((q.correctAnswer || '').trim()));
      const studentAns = isTF
        ? typeof practiceChoiceAnswers[idx] === 'number'
          ? (contentLanguage === 'en' ? ['True', 'False'] : ['对', '错'])[practiceChoiceAnswers[idx]]
          : ''
        : parsed.options?.length
          ? typeof practiceChoiceAnswers[idx] === 'number'
            ? parsed.options[practiceChoiceAnswers[idx]]
            : ''
          : practiceTextAnswers[idx] || (practiceImageAnswers[idx] ? '[手写]' : '');
      const refAns = q.correctAnswer || '';
      const lines = [
        contentLanguage === 'en'
          ? 'PRACTICE QUESTION - Current question, student answer, reference answer:'
          : '练习题目 - 当前题目、学生答案、参考答案（供渐进式提示使用）：',
        `题目: ${parsed.stem}`,
        `学生答案: ${studentAns || '(未答)'}`,
        `参考答案: ${refAns}`,
        contentLanguage === 'en'
          ? `Stuck clicks on this question: ${stuckCount}. Give hint #${stuckCount + 1} - start vague, increase specificity with each click.`
          : `本题已点击「我卡住了」${stuckCount} 次。给出第 ${stuckCount + 1} 次提示 - 循序渐进，每次点击时信息量逐渐增强。`,
      ];
      return lines.join('\n');
    }
    return '';
  };

  const handleStuck = () => {
    setBubbleOpen(true);
    let answerJustRevealed = false;
    if (isGuidedVideoFlow && guidedStep === 3 && guidedKeyIdeas.length > 0) {
      const next = stuckClicksForKeyIdeas + 1;
      setStuckClicksForKeyIdeas(next);
      if (next >= 5) {
        setShowKeyIdeaBlanks(true);
        answerJustRevealed = true;
      }
    }
    if (isGuidedVideoFlow && guidedStep === 4 && guidedPractice.length > 0) {
      const idx = practiceCurrentIndex;
      const next = (stuckClicksPerPracticeQuestion[idx] ?? 0) + 1;
      setStuckClicksPerPracticeQuestion((prev) => ({ ...prev, [idx]: next }));
      if (next >= 5) {
        setShowPracticeSolutions((prev) => ({ ...prev, [idx]: true }));
        answerJustRevealed = true;
      }
    }
    const context = getTaskContext();
    const guidedCtx = isGuidedVideoFlow
      ? `\nGuided step ${guidedStep}/5: ${[t('guidedStep1'),t('guidedStep2'),t('guidedStep3'),t('guidedStep4'),t('guidedStep5')][guidedStep - 1] || ''}\n${getGuidedStepProgress()}`
      : '';
    const detailedCtx = getStuckHintDetailedContext();
    const answerRevealedNote = answerJustRevealed
      ? (contentLanguage === 'en'
          ? "\n\nIMPORTANT: The student has clicked 'I'm Stuck' 5 times on this item. The reference answer has been revealed on screen. In your response, you MUST briefly acknowledge this (e.g. 'I see the reference answer is now visible') and encourage them to try with the hint."
          : '\n\n重要：学生已在本条上点击「我卡住了」5 次，参考答案已展示在屏幕上。你必须在回复中简要说明这一点（例如「参考答案已经显示出来了」），并鼓励他们借助提示再试一试。')
      : '';
    const progressiveInstruction =
      contentLanguage === 'en'
        ? `\n\nPROGRESSIVE HINT STRATEGY (MUST follow):
- Base your hint on the CURRENT item and what the student has MISSED (compare student answer vs reference).
- Hint intensity: 1st click = very vague (e.g. direction/category); 2nd = a bit more specific; 3rd-4th = narrow down (e.g. first letter, word count); 5th = if answer revealed, encourage trying.
- Each hint must be concrete and actionable - avoid generic advice like "think carefully".`
        : `\n\n渐进式提示策略（必须遵循）：
- 提示必须基于当前题目、以及学生缺失的信息（对比学生答案与参考答案）。
- 提示强度：第1次=极简方向；第2次=稍具体；第3-4次=逐步收窄（如首字、字数）；第5次=若已展示答案，鼓励尝试。
- 每次提示须具体可操作，避免空泛建议。`;
    handleSendMessage(
        t('stuckHint'),
        `Student clicked 'I'm Stuck'. Context: ${context}${guidedCtx}
${detailedCtx ? `\n${detailedCtx}` : ''}${answerRevealedNote}${progressiveInstruction}

CRITICAL: Give hints STEP BY STEP, not all at once.
- Give ONLY ONE hint/guidance point in this response (2-3 sentences, max 100 chars)
- Wait for the student to respond or try before giving the next hint
- Only discuss the CURRENT step/task; do NOT mention other task types
- Do NOT give the answer directly
- Do NOT list multiple hints in one response - focus on ONE key point`
    );
    void emitEvent('stuck_clicked', { guidedStep, isGuidedVideoFlow }).catch(() => undefined);
  };

  const handleDone = () => {
    setBubbleOpen(true);
    if (guidedDoneInFlight.current) return; // 防重复请求
    const now = Date.now();
    
    // 检查是否完成了一次改进循环：之前点击过"我做完了" + 之后有编辑 + 再次点击"我做完了"
    if (lastDoneClickTime !== null && hasEditAfterDone && (now - lastDoneClickTime) < 5 * 60 * 1000) {
      setImprovementCount(prev => prev + 1);
      setHasEditAfterDone(false);
    }
    setLastDoneClickTime(now);
    void emitEvent('step_completed', { guidedStep, isGuidedVideoFlow }).catch(() => undefined);

    // ──── 引导流模式：按步骤验证 ────
    if (isGuidedVideoFlow) {
      if (guidedStep === 5 && !allExitTicketsCompleted) {
        const message = contentLanguage === 'en'
          ? 'Please complete all exit ticket questions before finishing this step.'
          : '请先完成出门条全部题目，再点击“我做完了”。';
        window.alert(message);
        return;
      }
      guidedDoneInFlight.current = true;
      const stepTitles = [t('guidedStep1'), t('guidedStep2'), t('guidedStep3'), t('guidedStep4'), t('guidedStep5')];
      const currentStepTitle = stepTitles[guidedStep - 1] || `步骤${guidedStep}`;
      const stepProgress = getGuidedStepProgress();

      // 步骤 1/2：使用预定义回复，跳过 AI 调用，省时省成本
      const isLightStep = guidedStep <= 2;
      if (isLightStep) {
        const presetKey = guidedStep === 1 ? 'guidedStep1PresetReplies' : 'guidedStep2PresetReplies';
        const replies = t(presetKey, { returnObjects: true }) as string[] | undefined;
        const presetText = Array.isArray(replies) && replies.length > 0
          ? replies[Math.floor(Math.random() * replies.length)]
          : (contentLanguage === 'zh' ? '很好！点击下方按钮进入下一步。' : 'Great! Click the button below to continue.');
        const timestamp = Date.now();
        const userMsg: ChatMessage = { role: 'user', text: t('guidedDoneStep', { step: currentStepTitle }), timestamp };
        const modelMsg: ChatMessage = { role: 'model', text: `${presetText} [STEP_PASS]`, timestamp };
        setMessages((prev) => [...prev, userMsg, modelMsg]);
        guidedDoneInFlight.current = false;
        setTimeout(() => {
          if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }, 50);
        return;
      }

      // Step 4「我能练一练」：收集手写答案图片，按题目顺序
      const practiceImages: string[] =
        guidedStep === 4 && Object.keys(practiceImageAnswers).length > 0
          ? Object.entries(practiceImageAnswers)
              .filter(([, v]) => !!v)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([, v]) => v)
          : [];

      const hiddenCtx = `Student clicked 'I'm Done' for guided step ${guidedStep}: "${currentStepTitle}".
Task: ${currentTask.title}
Goal: ${currentTask.outputGoal}
${stepProgress}

STEP VERIFICATION PROTOCOL (guided flow):
- You are verifying step ${guidedStep}/5: "${currentStepTitle}".
- ${isLightStep
  ? 'This is a lightweight step (reading/watching). Acknowledge and approve directly.'
  : guidedStep === 4 && practiceImages.length > 0
  ? 'Review the student\'s practice answers. HANDWRITTEN IMAGES are attached - compare each answer with the provided reference answer, judge correctness, and give specific encouraging feedback.'
  : `Review the student's work for this step. Be encouraging but check completeness.`}
- Language: vivid but concise, 2-4 sentences, max 100 chars. Output in ${contentLanguage === 'en' ? 'English' : 'Simplified Chinese'} only.
- Do NOT mention other steps, mindmaps, or unrelated concepts.
- Do NOT repeat content from previous messages.
- CRITICAL: If the step is satisfactorily completed, you MUST end your response with the EXACT marker: [STEP_PASS]
  This marker tells the system to show a "${contentLanguage === 'en' ? 'Next Step' : '进入下一步'}" button.
- If the step is NOT complete, give ONE specific suggestion to improve, then encourage retry. Do NOT include [STEP_PASS].
- Do NOT include [STEP_PASS] unless you truly approve this step.`;

      handleSendMessage(
        t('guidedDoneStep', { step: currentStepTitle }),
        hiddenCtx,
        practiceImages.length > 0 ? practiceImages : undefined
      );
      return;
    }

    // ──── 非引导流（原有逻辑）────
    const context = getTaskContext();
    const doneImages =
      viewType === 'mindmap_editor' && mindmapImageAnswer
        ? [mindmapImageAnswer]
        : undefined;
    handleSendMessage(
        t('guidedDoneTask'), 
        `Student clicked 'I'm Done'. Context: ${context}. 
Evaluation Criteria: ${currentTask.evaluationCriteria}. 
Output Goal: ${currentTask.outputGoal}

CRITICAL TASK COMPLETION PROTOCOL:
1. First, review their work against the outputGoal: "${currentTask.outputGoal}"
2. If their work meets the core requirements, give positive feedback
3. If there are gaps, provide 1-2 specific improvement suggestions (but don't be overly strict)
4. MOST IMPORTANT: After evaluation, if the task is substantially complete, you MUST explicitly tell the student (in ${contentLanguage === 'en' ? 'English' : 'Chinese'}):
   ${contentLanguage === 'en' ? '"Great! You have completed this task. You can click the \'Next Task\' button to continue."' : '"很好！你已经完成了这个任务。你可以点击\'下一个任务\'按钮继续学习了。"'}
5. Do NOT continue asking questions or requesting more work if the core goal is met
6. Allow students to move forward even if their work isn't perfect - learning is iterative
7. Give immediate positive feedback on what they did well before any suggestions`
      ,
      doneImages
    );
  };

  const handleOptimizeMap = async () => {
      if (!mindMapInput) return;
      setIsAssetLoading(true);
      try {
          const improvedCode = await generateTaskAsset('mindmap_code', `Optimize and expand this Mermaid code: ${mindMapInput}. Keep it concise but add relevant branches.`, courseId, currentTask?.id, contentLanguage);
          if (improvedCode) setMindMapInput(improvedCode);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAssetLoading(false);
      }
  };

  const handleNextTask = async () => {
    if (isTyping) return;
    if (currentTaskIndex < plan.tasks.length - 1) {
      const prevTask = currentTask;
      const prevContext = getTaskContext();
      const nextIndex = currentTaskIndex + 1;
      const nextTask = plan.tasks[nextIndex];

      // 确保重置加载状态，防止遮罩层残留
      setIsAssetLoading(false);
      // 下一任务由过渡引导消息接管，避免与默认问候重复
      greetingSentRef.current.add(nextIndex);
      setCurrentTaskIndex(nextIndex);
      const progressPct = Math.round(((currentTaskIndex + 1) / plan.tasks.length) * 100);
      reportProgress(progressPct, false, nextIndex);
      if (typeof window !== 'undefined') {
        localStorage.setItem(taskIndexStorageKey, nextIndex.toString());
      }
      // 重置编辑计数（新任务开始）
      setEditCounts({ mindMap: 0, table: 0, text: 0, math: 0 });
      // 重置改进追踪状态
      setLastDoneClickTime(null);
      setHasEditAfterDone(false);
      // 重置聊天滚动位置
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);

      // AI 同步反馈：评价上一步 + 引导下一步
      const transitionInstruction = contentLanguage === 'en'
        ? `You are the student's learning tutor. Generate a short transition feedback using the context below.

[Previous task]
- Title: ${prevTask.title}
- Goal: ${prevTask.outputGoal}
- Evaluation criteria: ${prevTask.evaluationCriteria}
- Current student state: ${prevContext}

[Next task]
- Title: ${nextTask?.title || 'Next task'}
- Goal: ${nextTask?.outputGoal || 'Please read the task instruction'}

Requirements:
1) First sentence: affirm the previous step (praise + 1 practical suggestion)
2) Second sentence: guide what to do first in the next step
3) Warm and concise, no Markdown, 2-3 sentences
4) English ONLY. Do not use Chinese.
5) Do not ask the student to redo completed work.`
        : `你是学生的学习导师。请基于以下上下文，输出一段“过渡反馈”：

【上一步任务】
- 标题：${prevTask.title}
- 目标：${prevTask.outputGoal}
- 评价标准：${prevTask.evaluationCriteria}
- 学生当前完成状态：${prevContext}

【下一步任务】
- 标题：${nextTask?.title || '下一任务'}
- 目标：${nextTask?.outputGoal || '请阅读任务说明'}

输出要求（必须同时包含）：
1) 先用 1 句话评价学生刚完成的上一步（肯定 + 1条建议）
2) 再用 1 句话引导下一步（告诉他先做什么）
3) 语气温暖、生动但简洁；不使用 Markdown；总长度 60-100 字
4) 不要要求学生返回重做；不要重复前面消息中已说过的内容

CRITICAL: Output language must be 简体中文 only.
`;

      try {
        setIsTyping(true);
        const transitionText = await sendChatMessage(
          messages,
          contentLanguage === 'en' ? 'System event: student clicked Next' : '系统事件：学生点击了“下一步”',
          transitionInstruction,
          contentLanguage,
          currentTask.tutorConfig.twinId ? { twinId: currentTask.tutorConfig.twinId } : undefined
        );
        const ts = Date.now();
        setMessages(prev => [...prev, { role: 'model', text: transitionText, timestamp: ts }]);
        addLog(`AI Transition: "${transitionText.substring(0, 40)}..."`);

        if (autoPlayVoice && voiceEnabled && voiceServiceAvailable) {
          setTimeout(() => {
            playVoice(transitionText).catch((err) => {
              console.warn('Transition voice failed:', err);
            });
          }, 300);
        }
      } catch (err) {
        console.error('Transition guidance failed:', err);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handlePrevTask = () => {
    if (isTyping) return;
    if (currentTaskIndex > 0) {
      const prevIndex = currentTaskIndex - 1;
      setIsAssetLoading(false);
      greetingSentRef.current.add(prevIndex);
      setCurrentTaskIndex(prevIndex);
      const progressPct = Math.round(((prevIndex + 1) / plan.tasks.length) * 100);
      reportProgress(progressPct, false, prevIndex);
      if (typeof window !== 'undefined') {
        localStorage.setItem(taskIndexStorageKey, prevIndex.toString());
      }
      setEditCounts({ mindMap: 0, table: 0, text: 0, math: 0 });
      setLastDoneClickTime(null);
      setHasEditAfterDone(false);
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const switchToTaskIndex = (targetIndex: number) => {
    if (isTyping || targetIndex < 0 || targetIndex >= plan.tasks.length || targetIndex === currentTaskIndex) return;
    setIsAssetLoading(false);
    greetingSentRef.current.add(targetIndex);
    setCurrentTaskIndex(targetIndex);
    const progressPct = Math.round(((targetIndex + 1) / plan.tasks.length) * 100);
    reportProgress(progressPct, false, targetIndex);
    if (typeof window !== 'undefined') {
      localStorage.setItem(taskIndexStorageKey, targetIndex.toString());
    }
    setEditCounts({ mindMap: 0, table: 0, text: 0, math: 0 });
    setLastDoneClickTime(null);
    setHasEditAfterDone(false);
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // 引导流步骤进度描述（供 handleDone 使用）
  const getGuidedStepProgress = (): string => {
    const stepTitles = [t('guidedStep1'), t('guidedStep2'), t('guidedStep3'), t('guidedStep4'), t('guidedStep5')];
    const currentStepTitle = stepTitles[guidedStep - 1] || `步骤${guidedStep}`;

    if (guidedStep === 1) return `当前步骤「${currentStepTitle}」：学生已阅读学习目标。`;
    if (guidedStep === 2) return `当前步骤「${currentStepTitle}」：学生已完成自主学习。`;
    if (guidedStep === 3) {
      const totalBlanks = guidedKeyIdeas.reduce((acc, idea) => {
        const blankCount = Math.max(0, idea.text.split('__KEY__').length - 1);
        return acc + (blankCount > 0 ? blankCount : 1);
      }, 0);
      const filledBlanks = guidedKeyIdeas.reduce((acc, idea, idx) => {
        const blankCount = Math.max(0, idea.text.split('__KEY__').length - 1);
        if (blankCount > 0) {
          return acc + Array.from({ length: blankCount }).filter((_, blankIdx) =>
            (keywordAnswers[`blank-${idx}-${blankIdx}`] || '').trim().length > 0
          ).length;
        }
        return acc + ((keywordAnswers[`idea-${idx}`] || '').trim().length > 0 ? 1 : 0);
      }, 0);
      const answers = guidedKeyIdeas.map((idea, idx) => {
        const blankCount = Math.max(0, idea.text.split('__KEY__').length - 1);
        if (blankCount > 0) {
          return Array.from({ length: blankCount }).map((_, blankIdx) =>
            keywordAnswers[`blank-${idx}-${blankIdx}`] || ''
          );
        }
        return [keywordAnswers[`idea-${idx}`] || ''];
      });
      return `当前步骤「${currentStepTitle}」：填空完成 ${filledBlanks}/${totalBlanks}。学生答案：${JSON.stringify(answers)}`;
    }
    if (guidedStep === 4) {
      const totalQ = guidedPractice.length;
      const answered = guidedPractice.filter((q, idx) => {
        const parsed = extractQuestionStemAndOptions(q.question || '', q.options);
        const isTrueFalse =
          q.questionType === 'true_false' ||
          (!parsed.options?.length && /^(true|false)$/i.test((q.correctAnswer || '').trim()));
        if (isTrueFalse) return typeof practiceChoiceAnswers[idx] === 'number';
        if (parsed.options.length > 0) return typeof practiceChoiceAnswers[idx] === 'number';
        return (practiceTextAnswers[idx] || '').trim().length > 0 || !!practiceImageAnswers[idx];
      }).length;
      let imageSeq = 0;
      const tfLabels = contentLanguage === 'en' ? ['True', 'False'] : ['对', '错'];
      const answers = guidedPractice.map((q, idx) => {
        const parsed = extractQuestionStemAndOptions(q.question || '', q.options);
        const correctAns = q.correctAnswer ? `参考答案：${q.correctAnswer}` : '';
        const isTrueFalse =
          q.questionType === 'true_false' ||
          (!parsed.options?.length && /^(true|false)$/i.test((q.correctAnswer || '').trim()));
        if (isTrueFalse && typeof practiceChoiceAnswers[idx] === 'number') {
          return `Q${idx + 1}: ${tfLabels[practiceChoiceAnswers[idx]]} ${correctAns}`;
        }
        if (parsed.options.length > 0 && typeof practiceChoiceAnswers[idx] === 'number') {
          return `Q${idx + 1}: ${String.fromCharCode(65 + practiceChoiceAnswers[idx])}. ${parsed.options[practiceChoiceAnswers[idx]] || ''} ${correctAns}`;
        }
        if (practiceImageAnswers[idx]) {
          imageSeq += 1;
          return `Q${idx + 1}: [手写答案，见附件图片${imageSeq}] ${correctAns}`;
        }
        return `Q${idx + 1}: ${practiceTextAnswers[idx] || '(未答)'} ${correctAns}`;
      });
      const imageInstruction =
        imageSeq > 0
          ? ' 附件中有手写答案图片，按顺序对应上述题目。请查看图片，对比参考答案判断对错并给出针对性反馈。'
          : '';
      return `当前步骤「${currentStepTitle}」：完成 ${answered}/${totalQ}。题目与答案：${answers.join('；')}${imageInstruction}`;
    }
    if (guidedStep === 5) {
      const answers = guidedExitTickets.map((item, idx) => ({
        question: item.question,
        answer: (exitTicketAnswers[idx] ?? (idx === 0 ? exitTicketAnswer : '')).trim() || '(空)',
      }));
      return `当前步骤「${currentStepTitle}」：学生出门条回答：${JSON.stringify(answers)}`;
    }
    return `当前步骤「${currentStepTitle}」：学生已完成。`;
  };

  // 引导流：进入下一步（由聊天区 [STEP_PASS] 按钮触发，点击后按钮立即消失，防止多次点击）
  const handleGuidedAdvance = (msgIdx: number) => {
    lastConsumedStepPassMessageIndexRef.current = msgIdx;
    if (guidedStep < 5) {
      const next = guidedStep + 1;
      setMaxStepReached(prev => Math.max(prev, next));
      if (next === 5) {
        messagesCountAtStep5EntryRef.current = messages.length;
      }
      setGuidedStep(next);
    } else if (currentTaskIndex < plan.tasks.length - 1) {
      // 非最后任务 → 进入下一个任务
      handleNextTask();
    } else {
      // 最后一个任务的最后一步 → 完成学习
      handleFinishLearning();
    }
  };


  // 检测任务完成消息
  const isTaskCompletionMessage = (text: string): boolean => {
    const completionKeywords = [
      '任务完成',
      '可以点击.*下一个任务',
      '可以进入下一个任务',
      '下一个任务.*按钮',
      '完成了这个任务',
      '可以点击.*下一个',
      '进入下一个任务'
    ];
    return completionKeywords.some(keyword => {
      try {
        const regex = new RegExp(keyword, 'i');
        return regex.test(text);
      } catch {
        return text.includes(keyword);
      }
    });
  };

  // 检测任务完成消息并更新已完成任务数
  useEffect(() => {
    const completionKeywords = [
      '任务完成',
      '可以点击.*下一个任务',
      '可以进入下一个任务',
      '下一个任务.*按钮',
      '完成了这个任务',
      '可以点击.*下一个',
      '进入下一个任务'
    ];
    
    const checkCompletion = (text: string): boolean => {
      return completionKeywords.some(keyword => {
        try {
          const regex = new RegExp(keyword, 'i');
          return regex.test(text);
        } catch {
          return text.includes(keyword);
        }
      });
    };
    
    messages.forEach((msg) => {
      if (msg.role === 'model' && checkCompletion(msg.text)) {
        // 检查这是否是当前任务的第一条完成消息
        setCompletedTasks(prev => {
          if (!prev.has(currentTaskIndex)) {
            return new Set([...prev, currentTaskIndex]);
          }
          return prev;
        });
      }
    });
  }, [messages, currentTaskIndex]);

  // Extract objective metrics from learning data
  const extractObjectiveMetrics = (
    messages: ChatMessage[],
    log: string[],
    totalTasks: number
  ): ObjectiveMetrics => {
    // Parse timestamps from log
    const timestamps: number[] = [];
    const logEntries = log.map(entry => {
      try {
        const match = entry.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
        if (match && match.length >= 4) {
          const hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const seconds = parseInt(match[3], 10);
          if (!isNaN(hours) && !isNaN(minutes) && !isNaN(seconds)) {
            const timestamp = hours * 3600 + minutes * 60 + seconds;
            timestamps.push(timestamp);
            return { timestamp, text: entry };
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
      return { timestamp: 0, text: entry };
    });

    // Calculate time gaps (only use valid timestamps > 0)
    const validTimestamps = timestamps.filter(t => t > 0).sort((a, b) => a - b);
    const timeGaps: number[] = [];
    for (let i = 1; i < validTimestamps.length; i++) {
      const gap = validTimestamps[i] - validTimestamps[i - 1];
      if (gap > 0 && gap < 86400) { // Valid gap: > 0 and < 24 hours
        timeGaps.push(gap);
      }
    }

    // Analyze user inputs
    const userInputs = messages.filter(m => m.role === 'user').map(m => m.text);
    const inputLengths = userInputs.map(text => text.length);
    const averageInputLength = inputLengths.length > 0 
      ? inputLengths.reduce((a, b) => a + b, 0) / inputLengths.length 
      : 0;

    // Count questions (inputs containing "?", "？", "什么", "为什么", "如何", etc.)
    const questionKeywords = ['?', '？', '什么', '为什么', '如何', '怎么', '怎样', '能否', '可以吗'];
    const totalQuestions = userInputs.filter(input => 
      questionKeywords.some(keyword => input.includes(keyword))
    ).length;

    // Count button clicks from log
    const stuckClicks = log.filter(entry => entry.includes('我卡住了') || entry.includes('stuck')).length;
    const doneClicks = log.filter(entry => entry.includes('我做完了') || entry.includes('done')).length;
    const evaluateClicks = log.filter(entry => entry.includes('请求评价') || entry.includes('evaluate') || entry.includes('feedback')).length;

    // Count edits (approximate from log entries)
    const mindMapEdits = log.filter(entry => entry.includes('mindmap') || entry.includes('思维导图')).length;
    const tableEdits = log.filter(entry => entry.includes('table') || entry.includes('表格')).length;
    const textEdits = log.filter(entry => entry.includes('text') || entry.includes('文本')).length;
    const mathEdits = log.filter(entry => entry.includes('math') || entry.includes('数学')).length;
    const totalEdits = mindMapEdits + tableEdits + textEdits + mathEdits;

    // Count task switches
    const taskSwitchCount = log.filter(entry => entry.includes('Started Task') || entry.includes('任务')).length;

    // Calculate time metrics (use valid timestamps)
    const totalSessionTime = validTimestamps.length > 0 && validTimestamps[validTimestamps.length - 1] > validTimestamps[0]
      ? validTimestamps[validTimestamps.length - 1] - validTimestamps[0] 
      : 0;
    const averageTimeBetweenActions = timeGaps.length > 0
      ? timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length
      : 0;
    const longGaps = timeGaps.filter(gap => gap > 300).length; // > 5 minutes
    const shortGaps = timeGaps.filter(gap => gap < 30).length; // < 30 seconds

    // Ensure all values are valid numbers
    return {
      averageInputLength: isNaN(averageInputLength) ? 0 : averageInputLength,
      totalInputs: userInputs.length || 0,
      shortInputs: inputLengths.filter(len => len < 10).length || 0,
      longInputs: inputLengths.filter(len => len > 200).length || 0,
      totalQuestions: totalQuestions || 0,
      stuckClicks: stuckClicks || 0,
      doneClicks: doneClicks || 0,
      evaluateClicks: evaluateClicks || 0,
      totalSessionTime: isNaN(totalSessionTime) ? 0 : totalSessionTime,
      averageTimeBetweenActions: isNaN(averageTimeBetweenActions) ? 0 : averageTimeBetweenActions,
      longGaps: longGaps || 0,
      shortGaps: shortGaps || 0,
      totalEdits: totalEdits || 0,
      mindMapEdits: mindMapEdits || 0,
      tableEdits: tableEdits || 0,
      textEdits: textEdits || 0,
      mathEdits: mathEdits || 0,
      tasksCompleted: totalTasks || 0,
      tasksSkipped: 0,
      taskSwitchCount: taskSwitchCount || 0
    };
  };

  const handleFinishLearning = async () => {
    // Capture the final mind map if the current view is a mind map editor
    const finalMindMap = viewType === 'mindmap_editor' ? (mindmapImageAnswer || mindMapInput) : undefined;
    const log = studentLog.join("\n");
    
    // Extract objective metrics
    let objectiveMetrics: ObjectiveMetrics | undefined;
    try {
      objectiveMetrics = extractObjectiveMetrics(messages, studentLog, plan.tasks.length);
      console.log('[StudentConsole] Extracted objective metrics:', objectiveMetrics);
    } catch (extractError) {
      console.error('[StudentConsole] Error extracting objective metrics:', extractError);
      // Continue without objective metrics if extraction fails
      objectiveMetrics = undefined;
    }
    
    reportProgress(100, true, plan.tasks.length - 1);
    void emitEvent('course_completed', { totalTasks: plan.tasks.length }).catch(() => undefined);
    setLearningLog(log);
    if (finalMindMap) {
      setFinalMindMapCode(finalMindMap);
    }
    setShowReport(true);
    setExitData(null); // Reset to show loading screen
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lastLearningCourseId');
      localStorage.removeItem('lastLearningTimestamp');
    }

    const sessionDurationSec = Math.round((Date.now() - sessionStartRef.current) / 1000);
    void trackProductEvent({
      eventName: 'exit_ticket_generation_started',
      role: 'student',
      language: contentLanguage,
      courseId,
      studentId: user?.id,
      properties: {
        source: 'StudentConsole',
        taskCount: plan.tasks.length,
        hasObjectiveMetrics: Boolean(objectiveMetrics),
        sessionDurationSec,
        ...(assignmentSource && { assignmentSource }),
        ...(groupId && { groupId }),
        ...(classId && { classId }),
      },
    }).catch(() => undefined);
    
    try {
      console.log('[StudentConsole] Calling generateExitTicket with:', {
        logLength: log.length,
        studentName,
        hasObjectiveMetrics: !!objectiveMetrics
      });
      const data = await generateExitTicket(log, contentLanguage, studentName, objectiveMetrics, courseId);
      console.log('[StudentConsole] Exit ticket generated successfully');
      setExitData(data);
      void trackProductEvent({
        eventName: 'exit_ticket_generation_succeeded',
        role: 'student',
        language: contentLanguage,
        courseId,
        studentId: user?.id,
        properties: {
          source: 'StudentConsole',
          hasData: Boolean(data),
          characteristicCount: Array.isArray(data?.characteristics) ? data.characteristics.length : 0,
          ...(assignmentSource && { assignmentSource }),
          ...(groupId && { groupId }),
          ...(classId && { classId }),
        },
      }).catch(() => undefined);
      if (data && Array.isArray(data.characteristics) && data.characteristics.length > 0) {
        setSelectedCharacteristic(data.characteristics[0].key);
      }
    } catch (error) {
      console.error("[StudentConsole] Error generating exit ticket:", error);
      if (error instanceof Error) {
        console.error("[StudentConsole] Error message:", error.message);
        console.error("[StudentConsole] Error stack:", error.stack);
      }
      setExitData(null);
      void trackProductEvent({
        eventName: 'exit_ticket_generation_failed',
        role: 'student',
        language: contentLanguage,
        courseId,
        studentId: user?.id,
        properties: {
          source: 'StudentConsole',
          errorMessage: error instanceof Error ? error.message : String(error),
          ...(assignmentSource && { assignmentSource }),
          ...(groupId && { groupId }),
          ...(classId && { classId }),
        },
      }).catch(() => undefined);
    }
  };

  const handleRestartLearning = () => {
    // Reset all states to restart the course
    setShowReport(false);
    setExitData(null);
    setLearningLog('');
    setFinalMindMapCode(null);
    setCurrentTaskIndex(0);
    // 清除 localStorage 中的任务索引和步骤进度
    if (typeof window !== 'undefined') {
      localStorage.removeItem(taskIndexStorageKey);
      for (let i = 0; i < plan.tasks.length; i++) {
        localStorage.removeItem(`guidedProgress_${courseId}_${i}`);
      }
    }
    setMessages([]);
    setStudentLog([]);
    setMindMapInput('');
    setMindmapImageAnswer('');
    setMindmapInputMode('upload');
    setTableData({ columns: [], rows: [] });
    setTextEditorContent('');
    setMathEditorContent('');
    setAssetData(null);
    // 重置困惑点相关状态
    setConfusionPoints([]);
    setShowConfusionInput(false);
    setConfusionInput('');
    // 重置编辑计数
    setEditCounts({ mindMap: 0, table: 0, text: 0, math: 0 });
  };

  const handleEndLearning = () => {
    // Close the current page/window
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lastLearningCourseId');
      localStorage.removeItem('lastLearningTimestamp');
      window.close();
      // If window.close() doesn't work (e.g., tab wasn't opened by script), try to navigate away
      setTimeout(() => {
        if (!document.hidden) {
          window.location.href = '/';
        }
      }, 100);
    }
  };

  // --- Renderers ---

  // 1. Loading Screen (Report Generation)
  if (showReport && !exitData) {
    return (
      <div className="relative min-h-screen bg-slate-50 flex flex-col p-6 text-slate-800 font-sans overflow-hidden">
        <div className="z-10 flex flex-col items-center justify-center flex-shrink-0">
           <Loader2 className="w-16 h-16 text-cyan-600 animate-spin mx-auto mb-4" />
           <h2 className="text-2xl font-bold mb-2">{t('processing')}</h2>
           <p className="text-slate-500 mb-4 leading-relaxed border-l-2 border-cyan-500 pl-4 text-left italic bg-white p-4 rounded-r-lg shadow-sm max-w-md">
             {t('processingTip')}
           </p>
           <div className="h-1 w-48 bg-slate-200 rounded-full mx-auto overflow-hidden mb-6">
             <div className="h-full bg-cyan-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] w-full origin-left"></div>
           </div>
        </div>

        {/* Learning Process Review */}
        {(studentLog.length > 0 || messages.length > 0) && (
          <div className="flex-1 min-h-0 flex flex-col max-w-2xl mx-auto w-full">
            <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
              <BookOpen size={16} /> 学习过程回顾
            </h3>
            <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
              {studentLog.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">思维日志</h4>
                  <div className="space-y-1.5 text-sm text-slate-700">
                    {studentLog.slice(-12).map((line, i) => (
                      <div key={i} className="pl-3 border-l-2 border-amber-200 py-0.5">{line}</div>
                    ))}
                  </div>
                </div>
              )}
              {messages.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-2">对话摘要</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
                    {messages.slice(-8).map((msg, i) => (
                      <div key={i} className={`px-3 py-2 rounded-lg ${msg.role === 'user' ? 'bg-emerald-50 text-slate-800' : 'bg-slate-50 text-slate-700'}`}>
                        <span className="text-[10px] font-bold uppercase opacity-70">{msg.role === 'user' ? '我' : (tutorName || t('aiSystem'))}</span>
                        <div className="mt-0.5 line-clamp-2">{msg.text.slice(0, 120)}{msg.text.length > 120 ? '…' : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Report Screen
  if (showReport && exitData) {
    // Prepare Data for Radar Chart
    const radarData = exitData.characteristics.map(c => ({
        subject: c.name,
        A: c.score,
        fullMark: 100,
        key: c.key // helper
    }));

    // Prepare Data for Bar Chart (Selected Characteristic)
    const activeTrait = exitData.characteristics.find(c => c.key === selectedCharacteristic);
    const barData = activeTrait ? activeTrait.dimensions.map(d => ({
        name: d.name.split(' ')[0], // Short name like D1
        fullName: d.name,
        score: d.score,
        comment: d.comment
    })) : [];

    return (
      <div className="relative min-h-screen bg-slate-50 p-6 text-slate-800 font-sans overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4 border border-emerald-200">
               <Award size={32} className="text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('sessionComplete')}</h1>
            <p className="text-slate-500 uppercase tracking-widest text-xs">{t('ticketGenerated')}</p>
          </div>
          
          {/* Section 1: Score & Summary Card */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl transition-all hover:shadow-2xl">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                 <div className="flex-none w-full md:w-auto md:min-w-[200px] text-center md:text-left md:border-r border-slate-100 md:pr-8 pb-6 md:pb-0 border-b md:border-b-0">
                      <h3 className="text-xs uppercase font-bold text-slate-400 mb-3">{t('masteryScore')}</h3>
                      <div className="flex items-baseline justify-center md:justify-start gap-2">
                         <span className="text-7xl font-bold text-emerald-600 tracking-tighter">{exitData.overallScore}</span>
                         <span className="text-xl text-slate-400 font-medium">/100</span>
                      </div>
                 </div>
                 <div className="flex-1">
                    <h3 className="text-xs uppercase font-bold text-slate-400 mb-3 flex items-center gap-2">
                        <Star size={14} className="text-amber-500"/> {t('keyTakeaway')}
                    </h3>
                    <p className="text-lg leading-relaxed text-slate-800 font-medium">
                        {exitData.summary}
                    </p>
                 </div>
              </div>
          </div>

          {/* Section 2: Next Steps */}
          <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-3xl border border-indigo-100 shadow-lg">
             <h3 className="text-indigo-700 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
               <List size={18}/> {t('nextSteps')}
             </h3>
             <p className="text-slate-700 text-md leading-relaxed">
                {exitData.nextSteps}
             </p>
          </div>

          {/* Section 3: Xueba Four Characteristics (Interactive) */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
             <h4 className="text-sm font-bold text-slate-500 mb-8 uppercase w-full flex items-center gap-2 border-b border-slate-100 pb-4">
                <Activity size={18} className="text-purple-600"/> {t('radarTitle')}
             </h4>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                 {/* Left: Radar Chart */}
                 <div className="h-72 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar 
                            name={studentName} 
                            dataKey="A" 
                            stroke="#8b5cf6" 
                            fill="#8b5cf6" 
                            fillOpacity={0.3} 
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                      <div className="text-center text-xs text-slate-400 mt-2">
                          点击右侧卡片查看详情 →
                      </div>
                 </div>

                 {/* Right: Characteristic Selectors */}
                 <div className="grid grid-cols-2 gap-3">
                     {exitData.characteristics.map((c) => (
                         <button 
                            key={c.key}
                            onClick={() => setSelectedCharacteristic(c.key)}
                            className={`p-4 rounded-xl border text-left transition-all ${
                                selectedCharacteristic === c.key 
                                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200 shadow-sm' 
                                : 'bg-slate-50 border-slate-200 hover:bg-white hover:shadow-md'
                            }`}
                         >
                            <div className="flex items-center justify-between mb-2">
                                {getIconForTrait(c.key)}
                                <span className="text-xl font-bold text-slate-800">{c.score}</span>
                            </div>
                            <div className="text-xs font-bold text-slate-600">{c.name}</div>
                         </button>
                     ))}
                 </div>
             </div>

             {/* Expanded Detail View (Bar Chart & Analysis) */}
             {activeTrait && (
                 <div className="mt-8 pt-8 border-t border-slate-100 animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-6">
                        {getIconForTrait(activeTrait.key)}
                        <h3 className="font-bold text-lg text-slate-800">{activeTrait.name} - 维度分析</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Bar Chart */}
                        <div className="h-60 w-full bg-slate-50 rounded-xl p-4 border border-slate-100">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis 
                                        dataKey="fullName" 
                                        type="category" 
                                        width={120} 
                                        tick={{fontSize: 11, fill: '#64748b'}} 
                                        interval={0}
                                    />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="score" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                             </ResponsiveContainer>
                        </div>
                        
                        {/* Comments */}
                        <div className="space-y-4">
                            {activeTrait.dimensions.map((d, i) => (
                                <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">{d.name}</span>
                                        <span className="text-xs font-bold text-emerald-600">{d.score}/100</span>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        {d.comment}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
             )}
          </div>

          {/* Section 4: Learning Goals & Big Concept Review */}
          {((plan.learningGoals && plan.learningGoals.length > 0) || plan.bigConcept) ? (
            <div className="bg-gradient-to-br from-amber-50 to-white p-8 rounded-3xl border border-amber-100 shadow-lg">
              <h3 className="text-amber-700 font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                <BookOpen size={18}/> 学习回顾
              </h3>
              
              {/* Big Concept */}
              {plan.bigConcept && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-wider">大概念</h4>
                  <div className="bg-white p-4 rounded-xl border border-amber-200">
                    <div className="text-slate-700 leading-relaxed">
                      <MathTextPreview text={plan.bigConcept} />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Learning Goals */}
              {plan.learningGoals && plan.learningGoals.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-600 mb-3 uppercase tracking-wider">学习目标</h4>
                  <div className="space-y-3">
                    {plan.learningGoals.map((goal, idx) => (
                      <div key={goal.id || idx} className="bg-white p-4 rounded-xl border border-amber-200 flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-slate-700 leading-relaxed">
                            <MathTextPreview text={goal.text} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="mt-4 text-xs text-amber-600 italic">
                💡 回顾这些核心概念和目标，看看您是否已经掌握了它们
              </p>
            </div>
          ) : null}

          {/* Section 5: System Log */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
            <h3 className="text-xs uppercase font-bold text-slate-400 mb-4 flex items-center gap-2">
              <List size={14}/> {t('systemLog')}
            </h3>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 max-h-60 overflow-y-auto font-mono text-[11px] text-slate-500 leading-normal custom-scrollbar">
              {learningLog.split('\n').map((line, i) => (
                <div key={i} className="mb-2 border-l-2 border-slate-300 pl-3">{line}</div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-8 pb-12">
             <button 
               onClick={handleRestartLearning}
               className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 rounded-full text-white font-bold transition-all shadow-lg hover:shadow-cyan-600/30 flex items-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
             >
               <RefreshCcw size={20} /> {t('restartLearning')}
             </button>
             <button 
               onClick={handleEndLearning}
               className="px-8 py-4 bg-slate-600 hover:bg-slate-700 rounded-full text-white font-bold transition-all shadow-lg hover:shadow-slate-600/30 flex items-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
             >
               <CheckCircle size={20} /> {t('endLearning')}
             </button>
          </div>
        </div>
      </div>
    );
  }

  const renderPhotoHandwriteInput = (
    mode: 'upload' | 'draw',
    setMode: React.Dispatch<React.SetStateAction<'upload' | 'draw'>>,
    imageValue: string,
    setImageValue: React.Dispatch<React.SetStateAction<string>>,
    canvasRef: React.RefObject<SignatureCanvas>
  ) => {
    const hasImageAnswer = !!imageValue;
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === 'upload'
                ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Camera size={14} /> 拍照上传
          </button>
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === 'draw'
                ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Pencil size={14} /> 屏幕手写
          </button>
        </div>

        {mode === 'upload' && (
          <div className="space-y-2">
            <label className="flex flex-col items-center justify-center w-full min-h-[140px] border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm text-slate-600">{t('takePhotoUpload')}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target?.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64 = reader.result as string;
                    setImageValue(base64);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {hasImageAnswer && (
              <div className="flex items-center gap-2">
                <img src={imageValue} alt={t('handwrittenAnswer')} className="max-h-24 rounded border border-slate-200" />
                <button
                  type="button"
                  onClick={() => setImageValue('')}
                  className="text-xs text-red-600 hover:underline"
                >
                  移除
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'draw' && (
          <div className="space-y-2">
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
              <SignatureCanvas
                ref={canvasRef}
                canvasProps={{ className: 'w-full h-44 touch-none' }}
                penColor="black"
                backgroundColor="white"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => canvasRef.current?.clear()}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 bg-white hover:bg-slate-50"
              >
                清空
              </button>
              <button
                type="button"
                onClick={() => {
                  const dataUrl = canvasRef.current?.toDataURL('image/png');
                  if (dataUrl) setImageValue(dataUrl);
                }}
                className="px-3 py-1.5 text-xs rounded bg-cyan-600 text-white hover:bg-cyan-700"
              >
                保存手写
              </button>
            </div>
            {hasImageAnswer && (
              <div className="flex items-center gap-2">
                <img src={imageValue} alt={t('handwrittenAnswer')} className="max-h-24 rounded border border-slate-200" />
                <button
                  type="button"
                  onClick={() => setImageValue('')}
                  className="text-xs text-red-600 hover:underline"
                >
                  重新绘制
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderLeftWorkspace = () => {
    // Guided flow for teacher-generated JSON (video + worksheet)
    if (isGuidedVideoFlow) {
      const source = currentTask.externalResourceUrl || (typeof assetData === 'string' ? assetData : '') || '';
      const platform = currentTask.videoPlatform;
      const explicitId = currentTask.externalResourceId?.trim();
      const youtubeId = (platform === 'youtube' && explicitId) ? explicitId : (platform !== 'bilibili' ? extractYouTubeVideoId(source) : null);
      const bilibiliBvid = (platform === 'bilibili' && explicitId) ? explicitId : (platform !== 'youtube' ? extractBilibiliBvid(source) : null);
      const useYoutube = (platform === 'youtube' && youtubeId) || (!platform && youtubeId);
      const useBilibili = (platform === 'bilibili' && bilibiliBvid) || (!platform && bilibiliBvid && !youtubeId);
      const stepTitles = [t('guidedStep1'), t('guidedStep2'), t('guidedStep3'), t('guidedStep4'), t('guidedStep5')];

      return (
        <div className="w-full h-full bg-slate-50/30 flex flex-col">
          <div className="shrink-0 p-4 border-b border-slate-200 bg-white">
            <div className="grid grid-cols-5 gap-2">
              {stepTitles.map((title, idx) => {
                const stepNo = idx + 1;
                const active = guidedStep === stepNo;
                const reached = stepNo <= maxStepReached;
                const canClick = reached;
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => { if (canClick) setGuidedStep(stepNo); }}
                    disabled={!canClick && !active}
                    className={`rounded-md border px-2 py-2 text-[11px] font-medium transition-colors ${
                      active
                        ? 'bg-cyan-100 border-cyan-300 text-cyan-800'
                        : reached
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-pointer hover:bg-emerald-100'
                          : 'bg-white border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {reached && !active && <CheckCircle size={10} className="inline mr-1 -mt-0.5" />}
                    {stepNo}. {title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-5">
              {guidedStep === 1 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-3">{t('guidedStep1')}</h3>
                  <div className="text-slate-700 leading-relaxed space-y-4">
                      <p>
                      <strong>{t('learningObjective')}：</strong>
                      <MathTextPreview
                        text={guidedPayload?.learningObjective || currentTask.outputGoal || t('learnObjectivePlaceholder')}
                        className="inline [&_p]:inline [&_p]:mb-0"
                      />
                    </p>
                    {guidedPayload?.whyItMatters?.meaning_anchor && (
                      <p><strong>{t('whyLearnThis')}</strong> <MathTextPreview text={guidedPayload.whyItMatters.meaning_anchor} className="inline [&_p]:inline [&_p]:mb-0" /></p>
                    )}
                    {guidedPayload?.whyItMatters?.advance_organizer && (
                      <p><strong>{t('whatToLearn')}</strong> <MathTextPreview text={guidedPayload.whyItMatters.advance_organizer} className="inline [&_p]:inline [&_p]:mb-0" /></p>
                    )}
                  </div>
                </div>
              )}

              {guidedStep === 2 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-lg font-bold text-slate-800 mb-3 px-2">{t('guidedStep2')}</h3>
                  <div className="rounded-lg overflow-hidden bg-black/80">
                    {guidedPayload?.customTextInstruction?.trim() && !source ? (
                      <div className="p-6 bg-slate-100 text-slate-800 min-h-[120px]">
                        <p className="text-base leading-relaxed whitespace-pre-wrap">
                          <MathTextPreview text={guidedPayload.customTextInstruction.trim()} />
                        </p>
                      </div>
                    ) : guidedPayload?.resourceKind === 'document' && guidedPayload?.convertedHtml?.trim() ? (
                      <div
                        className="p-6 bg-white text-slate-800 prose prose-sm max-w-none min-h-[120px] overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: guidedPayload.convertedHtml }}
                      />
                    ) : guidedPayload?.resourceKind === 'document' && source ? (
                      (() => {
                        const mimeType = (guidedPayload?.resourceMimeType || '').toLowerCase();
                        const isOffice = mimeType.includes('document') || mimeType.includes('wordprocessing') || mimeType.includes('presentation') || mimeType.includes('powerpoint');
                        const embedUrl = isOffice ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(source)}` : source;
                        return (
                          <iframe
                            src={embedUrl}
                            title={t('instructionalVideo')}
                            className="w-full min-h-[60vh] border-0"
                            allowFullScreen
                          />
                        );
                      })()
                    ) : useYoutube ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        title={t('instructionalVideo')}
                        className="w-full aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : useBilibili ? (
                      <iframe
                        src={`https://player.bilibili.com/player.html?bvid=${bilibiliBvid}&p=1&danmaku=0&autoplay=0`}
                        title={t('instructionalVideo')}
                        className="w-full aspect-video"
                        scrolling="no"
                        frameBorder="0"
                        allowFullScreen
                      />
                    ) : source ? (
                      <video controls className="w-full aspect-video" src={source}>
                        {t('browserNoVideo')}
                      </video>
                    ) : (
                      <div className="aspect-video flex items-center justify-center text-slate-300 text-sm">
                        {t('noVideoAvailable')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {guidedStep === 3 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">{t('guidedStep3')}</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {t('fillKeywordHint')}
                  </p>
                  <div className="space-y-5">
                    {guidedKeyIdeas.map((idea, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="mt-1 w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
                          {idea.imageUrl && (
                            <img
                              src={idea.imageUrl}
                              alt=""
                              className="mb-3 max-h-48 w-auto max-w-full rounded border object-contain bg-slate-50"
                            />
                          )}
                          {(() => {
                            const parts = idea.text.split('__KEY__');
                            const blankCount = Math.max(0, parts.length - 1);
                            if (blankCount > 0) {
                              return (
                                <div className="text-sm text-slate-700 leading-8 flex flex-wrap items-center">
                                  {parts.map((part, partIdx) => (
                                    <React.Fragment key={partIdx}>
                                      <MathTextPreview text={part} className="inline text-sm text-slate-700 [&_p]:inline [&_p]:mb-0 [&>div]:inline" />
                                      {partIdx < parts.length - 1 && (
                                        <input
                                          type="text"
                                          value={keywordAnswers[`blank-${idx}-${partIdx}`] || ''}
                                          onChange={(e) =>
                                            setKeywordAnswers((prev) => ({
                                              ...prev,
                                              [`blank-${idx}-${partIdx}`]: e.target.value,
                                            }))
                                          }
                                          placeholder={`${partIdx + 1}`}
                                          className="mx-1 inline-block h-7 min-w-[72px] max-w-[120px] rounded-md border border-emerald-300 bg-emerald-50 px-2 text-xs text-emerald-700 align-middle focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                        />
                                      )}
                                    </React.Fragment>
                                  ))}
                                </div>
                              );
                            }
                            return (
                              <div className="flex items-center flex-wrap gap-2 text-sm text-slate-700 leading-7">
                                <MathTextPreview text={idea.text} className="text-sm text-slate-700" />
                                <input
                                  type="text"
                                  value={keywordAnswers[`idea-${idx}`] || ''}
                                  onChange={(e) =>
                                    setKeywordAnswers((prev) => ({ ...prev, [`idea-${idx}`]: e.target.value }))
                                  }
                                  placeholder={t('fillBlank')}
                                  className="inline-block h-7 min-w-[72px] max-w-[120px] rounded-md border border-emerald-300 bg-emerald-50 px-2 text-xs text-emerald-700 align-middle focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                />
                              </div>
                            );
                          })()}
                          {idea.blanks && idea.blanks.length > 0 && showKeyIdeaBlanks && (
                            <div className="text-xs text-slate-500 mt-3 flex gap-1 items-start">
                              <span>参考关键词：</span>
                              <MathTextPreview text={idea.blanks.join('、')} className="text-xs text-slate-500 [&_p]:mb-0 inline" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {guidedStep === 4 && guidedPractice.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">{t('guidedStep4')}</h3>
                    <span className="text-sm text-slate-500">
                      第 {practiceCurrentIndex + 1} / {guidedPractice.length} 题
                    </span>
                  </div>
                  {(() => {
                    const idx = practiceCurrentIndex;
                    const q = guidedPractice[idx];
                    const parsed = extractQuestionStemAndOptions(q.question || '', q.options);
                    const inputMode = practiceInputMode[idx] || 'text';
                    const hasImageAnswer = !!practiceImageAnswers[idx];
                    const isTrueFalse =
                      q.questionType === 'true_false' ||
                      (!parsed.options?.length && /^(true|false)$/i.test((q.correctAnswer || '').trim()));
                    const trueFalseLabels = contentLanguage === 'en' ? ['True', 'False'] : ['对', '错'];
                    return (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/60">
                          {q.imageUrl && (
                            <img
                              src={q.imageUrl}
                              alt=""
                              className="mb-3 max-h-48 w-auto max-w-full rounded border object-contain bg-white"
                            />
                          )}
                          <div className="text-sm font-semibold text-slate-800 mb-3 flex gap-1">
                            <span>{idx + 1}.</span>
                            <MathTextPreview text={parsed.stem} className="text-sm font-semibold text-slate-800 [&_p]:mb-0" />
                          </div>
                          {isTrueFalse ? (
                            <div className="flex gap-4 mt-3" role="radiogroup" aria-label={contentLanguage === 'en' ? 'True or False' : '对或错'}>
                              {[0, 1].map((choiceIdx) => {
                                const selected = practiceChoiceAnswers[idx] === choiceIdx;
                                const label = trueFalseLabels[choiceIdx];
                                const Icon = choiceIdx === 0 ? Check : X;
                                return (
                                  <button
                                    key={choiceIdx}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => setPracticeChoiceAnswers((prev) => ({ ...prev, [idx]: choiceIdx }))}
                                    className={`flex-1 min-h-[48px] flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-base font-medium transition-all ${
                                      selected ? 'bg-cyan-50 border-cyan-400 text-cyan-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <Icon size={20} />
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : parsed.options.length > 0 ? (
                            <div className="space-y-2">
                              {parsed.options.map((option, optionIdx) => (
                                <button
                                  key={`${idx}-${optionIdx}`}
                                  type="button"
                                  onClick={() => setPracticeChoiceAnswers((prev) => ({ ...prev, [idx]: optionIdx }))}
                                  className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                                    practiceChoiceAnswers[idx] === optionIdx
                                      ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                                      : 'bg-white border-slate-300 text-slate-700'
                                  }`}
                                >
                                  <span className="flex gap-1 items-start">
                                    <span>{String.fromCharCode(65 + optionIdx)}.</span>
                                    <MathTextPreview text={option} className="text-sm [&_p]:mb-0 inline" />
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <>
                              <div className="flex gap-2 mb-3">
                                <button
                                  type="button"
                                  onClick={() => setPracticeInputMode((prev) => ({ ...prev, [idx]: 'text' }))}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    inputMode === 'text' ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <Type size={14} /> 文字输入
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPracticeInputMode((prev) => ({ ...prev, [idx]: 'upload' }))}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    inputMode === 'upload' ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <Camera size={14} /> 拍照上传
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPracticeInputMode((prev) => ({ ...prev, [idx]: 'draw' }))}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    inputMode === 'draw' ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <Pencil size={14} /> 屏幕手写
                                </button>
                              </div>
                              {inputMode === 'text' && (
                                <textarea
                                  value={practiceTextAnswers[idx] || ''}
                                  onChange={(e) => setPracticeTextAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                                  placeholder={t('enterYourAnswer')}
                                  className="w-full min-h-[90px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
                                />
                              )}
                              {(inputMode === 'upload' || inputMode === 'draw') &&
                                renderPhotoHandwriteInput(
                                  inputMode,
                                  (next) =>
                                    setPracticeInputMode((prev) => ({ ...prev, [idx]: next })),
                                  practiceImageAnswers[idx] || '',
                                  (next) =>
                                    setPracticeImageAnswers((prev) => ({
                                      ...prev,
                                      [idx]: typeof next === 'function' ? next(prev[idx] || '') : next,
                                    })),
                                  practiceCanvasRef as React.RefObject<SignatureCanvas>
                                )}
                            </>
                          )}
                          {q.correctAnswer && (stuckClicksPerPracticeQuestion[idx] ?? 0) >= 5 && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => setShowPracticeSolutions((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                                className="text-xs text-slate-700 border border-slate-300 rounded-full px-3 py-1 bg-white hover:bg-slate-100"
                              >
                                {showPracticeSolutions[idx] ? '隐藏答案' : '查看答案'}
                              </button>
                              {showPracticeSolutions[idx] && (
                                <div className="text-xs text-emerald-700 mt-2 flex gap-1 items-start">
                                  <span>参考答案：</span>
                                  <MathTextPreview text={q.correctAnswer} className="text-xs text-emerald-700 [&_p]:mb-0 inline" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => setPracticeCurrentIndex((i) => Math.max(0, i - 1))}
                            disabled={practiceCurrentIndex === 0}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                          >
                            <ArrowLeft size={16} /> 上一题
                          </button>
                          <button
                            type="button"
                            onClick={() => setPracticeCurrentIndex((i) => Math.min(guidedPractice.length - 1, i + 1))}
                            disabled={practiceCurrentIndex === guidedPractice.length - 1}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                          >
                            下一题 <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {guidedStep === 5 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">{t('guidedStep5')}</h3>
                  {(guidedExitTickets.length > 0 ? guidedExitTickets : [{ question: '请用1-2句话总结本节课你最重要的收获。' }]).map((ticket, idx) => (
                    <div key={`exit-ticket-${idx}`} className="mb-4 last:mb-0">
                      <p className="text-xs text-slate-500 mb-1">题目 {idx + 1}</p>
                      {ticket.imageUrl && (
                        <img
                          src={ticket.imageUrl}
                          alt=""
                          className="mb-3 max-h-48 w-auto max-w-full rounded border object-contain bg-slate-50"
                        />
                      )}
                      <MathTextPreview text={ticket.question} className="text-sm text-slate-800 mb-2 [&_p]:mb-0" />
                      <textarea
                        value={exitTicketAnswers[idx] ?? (idx === 0 ? exitTicketAnswer : '')}
                        onChange={(e) => {
                          const value = e.target.value;
                          setExitTicketAnswers((prev) => ({ ...prev, [idx]: value }));
                          if (idx === 0) setExitTicketAnswer(value);
                        }}
                        placeholder={t('enterYourReviewAnswer')}
                        className="w-full min-h-[96px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
                      />
                    </div>
                  ))}
                  {guidedExitTickets.some((item) => item.correctAnswer) && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowExitTicketAnswer((prev) => !prev)}
                        className="text-xs text-slate-700 border border-slate-300 rounded-full px-3 py-1 bg-white hover:bg-slate-100"
                      >
                        {showExitTicketAnswer ? t('hideReferenceAnswer') : t('viewReferenceAnswer')}
                      </button>
                      {showExitTicketAnswer && (
                        <div className="text-xs text-emerald-700 mt-2 space-y-2">
                          {guidedExitTickets.map((item, idx) => item.correctAnswer ? (
                            <div key={`exit-answer-${idx}`} className="flex gap-1 items-start">
                              <span>参考答案{idx + 1}：</span>
                              <MathTextPreview text={item.correctAnswer} className="text-xs text-emerald-700 [&_p]:mb-0 inline" />
                            </div>
                          ) : null)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 1. TABLE EDITOR
    if (viewType === 'table_editor') {
        return (
             <div className="w-full h-full bg-white flex flex-col relative">
                 {currentTask.description && (
                   <div className="shrink-0 p-4 bg-slate-50 border-b border-slate-200">
                     <p className="text-sm text-slate-600 leading-relaxed">
                       <MathTextPreview text={currentTask.description} />
                     </p>
                   </div>
                 )}
                 <div className="flex-1 p-8 overflow-auto custom-scrollbar bg-slate-50/30">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
                                <tr>
                                    {tableData.columns.map((col, i) => (
                                        <th key={i} className="px-3 py-3 border-r border-slate-200 last:border-r-0">
                                            <input
                                                type="text"
                                                value={col}
                                                onChange={(e) => {
                                                    const newCols = [...tableData.columns];
                                                    newCols[i] = e.target.value;
                                                    setTableData({ ...tableData, columns: newCols });
                                                    setEditCounts(prev => ({ ...prev, table: prev.table + 1 }));
                                                    if (lastDoneClickTime !== null) setHasEditAfterDone(true);
                                                }}
                                                placeholder="列名"
                                                className="w-full min-w-[80px] px-2 py-1.5 font-bold bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-cyan-200 text-slate-700"
                                            />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.rows.map((row, rIndex) => (
                                    <tr key={rIndex} className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                        {row.map((cell, cIndex) => (
                                            <td key={cIndex} className="p-2 border-r border-slate-200 last:border-r-0">
                                                <textarea 
                                                    className="w-full h-24 p-3 bg-transparent resize-none focus:outline-none focus:bg-cyan-50/50 rounded transition-colors text-slate-800 leading-relaxed placeholder-slate-300"
                                                    placeholder="..."
                                                    value={cell}
                                                    onChange={(e) => {
                                                        const newRows = [...tableData.rows];
                                                        newRows[rIndex][cIndex] = e.target.value;
                                                        setTableData({ ...tableData, rows: newRows });
                                                        setEditCounts(prev => ({ ...prev, table: prev.table + 1 }));
                                                        // 标记在"我做完了"之后有编辑
                                                        if (lastDoneClickTime !== null) {
                                                          setHasEditAfterDone(true);
                                                        }
                                                    }}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="bg-slate-50 p-2 flex flex-wrap items-center justify-center gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    const newRow = Array(tableData.columns.length).fill('');
                                    setTableData({ ...tableData, rows: [...tableData.rows, newRow] });
                                    setEditCounts(prev => ({ ...prev, table: prev.table + 1 }));
                                }}
                                className="text-xs text-slate-600 hover:text-cyan-600 font-bold py-2 px-3 rounded border border-slate-300 hover:border-cyan-400 transition-colors"
                            >
                                + 添加行
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (tableData.rows.length <= 1) return;
                                    setTableData({ ...tableData, rows: tableData.rows.slice(0, -1) });
                                    setEditCounts(prev => ({ ...prev, table: prev.table + 1 }));
                                }}
                                disabled={tableData.rows.length <= 1}
                                className="text-xs text-slate-600 hover:text-cyan-600 font-bold py-2 px-3 rounded border border-slate-300 hover:border-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                - 删除行
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const newCols = [...tableData.columns, ''];
                                    const newRows = tableData.rows.map(row => [...row, '']);
                                    setTableData({ columns: newCols, rows: newRows });
                                    setEditCounts(prev => ({ ...prev, table: prev.table + 1 }));
                                }}
                                className="text-xs text-slate-600 hover:text-cyan-600 font-bold py-2 px-3 rounded border border-slate-300 hover:border-cyan-400 transition-colors"
                            >
                                + 添加列
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (tableData.columns.length <= 1) return;
                                    const newCols = tableData.columns.slice(0, -1);
                                    const newRows = tableData.rows.map(row => row.slice(0, -1));
                                    setTableData({ columns: newCols, rows: newRows });
                                    setEditCounts(prev => ({ ...prev, table: prev.table + 1 }));
                                }}
                                disabled={tableData.columns.length <= 1}
                                className="text-xs text-slate-600 hover:text-cyan-600 font-bold py-2 px-3 rounded border border-slate-300 hover:border-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                - 删除列
                            </button>
                        </div>
                    </div>
                 </div>
             </div>
        );
    }

    // 2. MINDMAP EDITOR (Photo/Handwrite Input)
    if (viewType === 'mindmap_editor') {
        return (
            <div className="w-full h-full bg-white flex flex-col relative border-r border-slate-200">
                {currentTask.description && (
                  <div className="shrink-0 p-4 bg-slate-50 border-b border-slate-200">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <MathTextPreview text={currentTask.description} />
                    </p>
                  </div>
                )}
                <div className="flex-1 p-6 overflow-auto custom-scrollbar bg-slate-50/20">
                    <div className="max-w-2xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-800">知识图谱作答</h3>
                        <p className="text-sm text-slate-600">
                          请通过拍照上传或屏幕手写提交你的知识图谱，提交后再点击「我做完了」让 AI 导师进行评价。
                        </p>
                        {renderPhotoHandwriteInput(
                          mindmapInputMode,
                          setMindmapInputMode,
                          mindmapImageAnswer,
                          setMindmapImageAnswer,
                          mindmapCanvasRef as React.RefObject<SignatureCanvas>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 3. TEXT EDITOR (Pure Text Writing Space - WYSIWYG with LaTeX support)
    if (viewType === 'text_editor') {
        return (
             <div className="w-full h-full flex flex-col bg-white shadow-inner">
                 {currentTask.description && (
                   <div className="shrink-0 p-4 bg-slate-50 border-b border-slate-200">
                     <p className="text-sm text-slate-600 leading-relaxed">
                       <MathTextPreview text={currentTask.description} />
                     </p>
                   </div>
                 )}
                 <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 flex items-center justify-between">
                     <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                         <FileText size={16}/> 写作空间
                     </div>
                     <button
                         onClick={() => setIsTextEditorPreview(!isTextEditorPreview)}
                         className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 flex items-center gap-1"
                     >
                         {isTextEditorPreview ? (
                             <>
                                 <Edit size={14} /> 编辑
                             </>
                         ) : (
                             <>
                                 <Eye size={14} /> 预览
                             </>
                         )}
                     </button>
                 </div>
                 <div className="flex-1 relative bg-white">
                     {isTextEditorPreview ? (
                         <div className="absolute inset-0 w-full h-full p-8 overflow-y-auto custom-scrollbar">
                             <MathTextPreview text={textEditorContent || t('noContent')} />
                         </div>
                     ) : (
                         <textarea 
                             className="absolute inset-0 w-full h-full p-8 resize-none focus:outline-none text-slate-900 bg-white leading-relaxed text-sm placeholder-slate-400 custom-scrollbar whitespace-pre-wrap"
                             placeholder={t('textEditorPlaceholder')}
                             value={textEditorContent}
                             onChange={(e) => {
                               setTextEditorContent(e.target.value);
                               if (e.target.value !== textEditorContent && e.target.value.length > 0) {
                                 setEditCounts(prev => ({ ...prev, text: prev.text + 1 }));
                                 // 标记在"我做完了"之后有编辑
                                 if (lastDoneClickTime !== null) {
                                   setHasEditAfterDone(true);
                                 }
                               }
                             }}
                         />
                     )}
                 </div>
             </div>
        );
    }

    // 4. MATH EDITOR (Simple Math Editor with LaTeX support)
    if (viewType === 'math_editor') {
        return (
            <div className="w-full h-full flex flex-col bg-white shadow-inner">
                {currentTask.description && (
                  <div className="shrink-0 p-4 bg-slate-50 border-b border-slate-200">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <MathTextPreview text={currentTask.description} />
                    </p>
                  </div>
                )}
                <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                        <Type size={16}/> 数学编辑器
                    </div>
                </div>
                <div className="flex-1 relative bg-white">
                    <textarea 
                        className="absolute inset-0 w-full h-full p-8 resize-none focus:outline-none text-slate-900 bg-white leading-relaxed text-sm placeholder-slate-400 custom-scrollbar font-mono"
                        placeholder={t('mathEditorPlaceholder')}
                        value={mathEditorContent}
                        onChange={(e) => {
                          setMathEditorContent(e.target.value);
                          if (e.target.value !== mathEditorContent && e.target.value.length > 0) {
                            setEditCounts(prev => ({ ...prev, math: prev.math + 1 }));
                            // 标记在"我做完了"之后有编辑
                            if (lastDoneClickTime !== null) {
                              setHasEditAfterDone(true);
                            }
                          }
                        }}
                    />
                </div>
            </div>
        );
    }

    // 5. INTERACTIVE EXPERIMENT (HTML/IFRAME)
    if (viewType === 'interactive_experiment') {
         return (
             <div className="w-full h-full flex flex-col items-center justify-center relative bg-white">
                 {isAssetLoading ? (
                     <div className="flex flex-col items-center gap-4">
                         <Loader2 size={48} className="animate-spin text-cyan-500"/>
                         <span className="text-sm font-bold text-slate-500">正在组装虚拟实验室...</span>
                     </div>
                ) : assetData ? (
                    <div className="w-full h-full flex flex-col relative">
                        {currentTask.description && (
                          <div className="shrink-0 p-4 bg-slate-50 border-b border-slate-200">
                            <p className="text-sm text-slate-600 leading-relaxed">
                              <MathTextPreview text={currentTask.description} />
                            </p>
                          </div>
                        )}
                        <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-4 text-[10px] text-slate-500 shrink-0">
                            <span className="font-bold flex items-center gap-1"><Sparkles size={12}/> 交互式实验室</span>
                            <div className="flex items-center gap-2">
                                {assetData.trim().startsWith('http') && (
                                   <span className="text-cyan-600 flex items-center gap-1"><Globe size={12}/> PhET 来源</span>
                                )}
                                <button
                                    onClick={() => setIsFullscreenExperiment(true)}
                                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-600 hover:text-slate-800"
                                    title={t('fullscreen')}
                                >
                                    <Maximize size={14} />
                                </button>
                            </div>
                        </div>
                        <iframe 
                           src={assetData.trim().startsWith('http') ? assetData : undefined}
                           srcDoc={assetData.trim().startsWith('http') ? undefined : assetData}
                           className="w-full flex-1 border-none"
                           sandbox="allow-scripts allow-same-origin allow-popups allow-forms" 
                           title={t('interactiveSimulation')}
                        />
                    </div>
                 ) : (
                     <div className="text-slate-400 flex flex-col items-center select-none">
                       <ImageIcon size={64} className="mb-4 opacity-20"/>
                       <span className="text-xs font-mono uppercase tracking-widest opacity-50">未找到实验资源</span>
                     </div>
                 )}
             </div>
         );
    }

    // 5. GENERIC MEDIA / WEB / STATIC ASSETS
    return (
        <div className="w-full min-h-[calc(100vh-10rem)] flex flex-col items-center justify-start relative group p-6 bg-slate-50/50">
             {isAssetLoading ? (
                 <div className="flex flex-col items-center gap-2">
                     <Loader2 size={32} className="animate-spin text-cyan-600"/>
                     <span className="text-xs font-bold text-slate-400">{t('loadingAsset')}</span>
                 </div>
             ) : assetData ? (
                <>
                    {viewType === 'image_gallery' && (
                       <div className="flex-1 flex flex-col min-h-0 rounded-xl overflow-hidden shadow-2xl border border-slate-200 bg-white w-full max-w-4xl">
                           {currentTask.description && (
                             <div className="shrink-0 p-4 bg-slate-50 border-b border-slate-200">
                               <p className="text-sm text-slate-600 leading-relaxed">
                                 <MathTextPreview text={currentTask.description} />
                               </p>
                             </div>
                           )}
                           <div className="relative flex-1 min-h-[120px] flex items-center justify-center bg-black/5">
                               <img src={assetData} alt="AI Generated" className="max-w-full max-h-[70vh] object-contain" />
                           </div>
                       </div>
                    )}
                    {viewType === 'video_player' && (
                        <div className="w-full max-w-3xl space-y-4 bg-black rounded-lg overflow-hidden shadow-2xl">
                             {currentTask.description && (
                               <div className="p-4 bg-slate-50 border-b border-slate-200 rounded-t-lg">
                                 <p className="text-sm text-slate-600 leading-relaxed">
                                   <MathTextPreview text={currentTask.description} />
                                 </p>
                               </div>
                             )}
                             <div className="flex items-center gap-2 p-3 bg-slate-900 text-cyan-400 border-b border-slate-800">
                                 <Video size={18}/>
                                <span className="font-bold text-xs uppercase tracking-wider">
                                  {guidedPayload?.customTextInstruction ? '学习指引' : guidedPayload?.resourceKind === 'document' ? '学习资料' : t('instructionalVideo')}
                                </span>
                             </div>
                            {(() => {
                                const source = (currentTask.externalResourceUrl || (typeof assetData === 'string' ? assetData : '')) || '';
                                const textInstruction = guidedPayload?.customTextInstruction?.trim();
                                const resourceKind = guidedPayload?.resourceKind;
                                const convertedHtml = guidedPayload?.convertedHtml?.trim();
                                const mimeType = (guidedPayload?.resourceMimeType || '').toLowerCase();

                                if (textInstruction && !source && !currentTask.externalResourceId) {
                                  return (
                                    <div className="p-6 bg-slate-100 text-slate-800 min-h-[200px]">
                                      <p className="text-base leading-relaxed whitespace-pre-wrap">
                                        <MathTextPreview text={textInstruction} />
                                      </p>
                                    </div>
                                  );
                                }

                                if (resourceKind === 'document' && convertedHtml) {
                                  return (
                                    <div
                                      className="p-6 bg-white text-slate-800 prose prose-sm max-w-none min-h-[200px] overflow-y-auto custom-scrollbar"
                                      dangerouslySetInnerHTML={{ __html: convertedHtml }}
                                    />
                                  );
                                }

                                if (resourceKind === 'document' && source) {
                                  const isOffice = mimeType.includes('document') || mimeType.includes('wordprocessing') || mimeType.includes('presentation') || mimeType.includes('powerpoint');
                                  const embedUrl = isOffice
                                    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(source)}`
                                    : source;
                                  return (
                                    <iframe
                                      src={embedUrl}
                                      title={t('instructionalVideo')}
                                      className="w-full min-h-[60vh] border-0"
                                      allowFullScreen
                                    />
                                  );
                                }

                                const platform = currentTask.videoPlatform;
                                const explicitId = currentTask.externalResourceId?.trim();
                                const youtubeId = (platform === 'youtube' && explicitId) ? explicitId : (platform !== 'bilibili' ? extractYouTubeVideoId(source) : null);
                                const bilibiliBvid = (platform === 'bilibili' && explicitId) ? explicitId : (platform !== 'youtube' ? extractBilibiliBvid(source) : null);
                                const useYoutube = (platform === 'youtube' && youtubeId) || (!platform && youtubeId);
                                const useBilibili = (platform === 'bilibili' && bilibiliBvid) || (!platform && bilibiliBvid && !youtubeId);
                                if (useYoutube) {
                                  return (
                                    <iframe
                                      src={`https://www.youtube.com/embed/${youtubeId}`}
                                      title={t('instructionalVideo')}
                                      className="w-full aspect-video"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                      allowFullScreen
                                    />
                                  );
                                }
                                if (useBilibili) {
                                  const bilibiliEmbedUrl = `https://player.bilibili.com/player.html?bvid=${bilibiliBvid}&p=1&danmaku=0&autoplay=0&high_quality=1`;
                                  const bilibiliDirectUrl = `https://www.bilibili.com/video/${bilibiliBvid}`;
                                  return (
                                    <div className="space-y-2">
                                      <iframe
                                        src={bilibiliEmbedUrl}
                                        title={t('instructionalVideo')}
                                        className="w-full aspect-video"
                                        scrolling="no"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen"
                                        allowFullScreen
                                      />
                                      <a
                                        href={bilibiliDirectUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:underline"
                                      >
                                        {t('openInBilibili')}
                                      </a>
                                    </div>
                                  );
                                }
                                if (source) {
                                  return (
                                    <video
                                      controls
                                      autoPlay
                                      loop
                                      muted
                                      className="w-full aspect-video"
                                      src={source}
                                    >
                                      {t('browserNoVideo')}
                                    </video>
                                  );
                                }

                                return (
                                  <video
                                    controls
                                    autoPlay
                                    loop
                                    muted
                                    className="w-full aspect-video"
                                    src={source}
                                  >
                                    {t('browserNoVideo')}
                                  </video>
                                );
                            })()}
                        </div>
                    )}
                </>
            ) : (
                 <div className="text-slate-400 flex flex-col items-center select-none">
                   <ImageIcon size={64} className="mb-4 opacity-20"/>
                   <span className="text-xs font-mono uppercase tracking-widest opacity-50">素材未就绪</span>
                 </div>
            )}
        </div>
    );
  };

  return (
    <div 
      ref={containerRef} 
      className="flex w-full bg-slate-50 text-slate-800 overflow-hidden font-sans selection:bg-cyan-200 student-console"
      style={{ minHeight: '100vh', height: '100vh' }}
    >
      
      {/* LEFT COLUMN: WORKSPACE (80%) */}
      <div 
        style={{ width: '80%' }}
        className="h-full flex flex-col bg-white relative shrink-0 border-r border-slate-200 min-h-0"
      >
        
        {/* ENHANCED TASK HEADER - Single Row */}
        <div className="bg-white border-b border-slate-200 p-3 shrink-0 z-20 shadow-sm">
            <div className="flex justify-between items-center gap-4 overflow-hidden">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200"
                    aria-label={t('back')}
                  >
                    <ArrowLeft size={16} />
                    <span className="hidden sm:inline">{t('back')}</span>
                  </button>
                )}
                <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                    {/* Title */}
                    <div className="flex flex-col shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('taskOrder', { n: currentTaskIndex + 1 })}</span>
                        <h2 className="text-lg font-bold text-slate-800 truncate" title={currentTask.title}>
                            {currentTask.title}
                        </h2>
                    </div>
                    <div className="h-6 w-px bg-slate-200 hidden md:block shrink-0" />
                    {/* Learning objective - plain text, no box */}
                    <span className="text-slate-600 text-xs font-medium line-clamp-2 min-w-0 flex-1" title={guidedPayload?.learningObjective || currentTask.outputGoal || ''}>
                        <span className="text-slate-500">{t('learningObjective')}: </span>
                        <MathTextPreview text={guidedPayload?.learningObjective || currentTask.outputGoal || t('noLearningObjective')} />
                    </span>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                    <FontSizeSelector />
                    {voiceServiceAvailable && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-slate-600 hidden sm:inline">{t('voiceBroadcast')}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !voiceEnabled;
                            setVoiceEnabled(next);
                            setAutoPlayVoice(next);
                            if (!next && isPlayingVoice) stopVoice();
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            voiceEnabled
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-red-50 border-red-300 text-red-700'
                          }`}
                          title={voiceEnabled ? t('voiceTurnOff') : t('voiceTurnOn')}
                        >
                          {voiceEnabled ? t('voiceOn') : t('voiceOff')}
                        </button>
                      </div>
                    )}
                    {/* Progress Dots - 可点击跳转 */}
                    <div className="flex gap-1.5 shrink-0">
                        {plan.tasks.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => switchToTaskIndex(idx)}
                                disabled={isTyping}
                                title={t('taskOrder', { n: idx + 1 })}
                                className={`h-1.5 rounded-full transition-all duration-500 disabled:cursor-not-allowed ${
                                    idx === currentTaskIndex ? 'bg-cyan-500 w-6' :
                                    idx < currentTaskIndex ? 'bg-cyan-200 w-2 hover:bg-cyan-300' :
                                    'bg-slate-200 w-2 hover:bg-slate-300'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Workspace Content */}
        <div className="student-console-content flex-1 overflow-y-auto overflow-x-hidden relative bg-slate-50/10 min-h-0 custom-scrollbar">
            {renderLeftWorkspace()}
        </div>

        {/* Fixed Bottom: 导航 + hint text + 我卡住了 / 我做完了 （z-50 高于气泡，确保气泡打开时仍可点击） */}
        <div className="relative z-50 bg-white border-t border-slate-200 p-4 shrink-0 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
                {plan.tasks.length > 1 && (
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handlePrevTask}
                            disabled={currentTaskIndex === 0 || isTyping}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200"
                        >
                            <ArrowLeft size={14} /> 上一个
                        </button>
                        <button
                            onClick={handleNextTask}
                            disabled={currentTaskIndex >= plan.tasks.length - 1 || isTyping}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200"
                        >
                            下一个 <ArrowRight size={14} />
                        </button>
                    </div>
                )}
                <p className="text-xs text-slate-500">
                    {t('hintClickDone')}
                </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {voiceServiceAvailable && (
                  <button
                    type="button"
                    onClick={() => {
                      const stripMath = (s: string) => s.replace(/\[[\s\S]*?\]|\$\$[\s\S]*?\$\$|\$[^$]*\$/g, ' ').replace(/\s+/g, ' ').trim();
                      let textToRead = '';
                      if (isGuidedVideoFlow) {
                        if (guidedStep === 1) {
                          const parts: string[] = [t('guidedStep1')];
                          const obj = guidedPayload?.learningObjective || currentTask.outputGoal || t('learnObjectivePlaceholder');
                          if (obj) parts.push(`${t('learningObjective')}：${stripMath(obj)}`);
                          if (guidedPayload?.whyItMatters?.meaning_anchor) {
                            parts.push(`${t('whyLearnThis')} ${stripMath(guidedPayload.whyItMatters.meaning_anchor)}`);
                          }
                          if (guidedPayload?.whyItMatters?.advance_organizer) {
                            parts.push(`${t('whatToLearn')} ${stripMath(guidedPayload.whyItMatters.advance_organizer)}`);
                          }
                          textToRead = parts.join('。');
                        } else if (guidedStep === 2) {
                          const inst = guidedPayload?.customTextInstruction?.trim();
                          const html = guidedPayload?.convertedHtml?.trim();
                          if (inst) textToRead = stripMath(inst);
                          else if (html) textToRead = stripMath(html.replace(/<[^>]+>/g, ' '));
                        } else if (guidedStep === 3 && guidedKeyIdeas.length > 0) {
                          textToRead = guidedKeyIdeas.map((i) => stripMath(i.text.replace(/__KEY__/g, '填空'))).filter(Boolean).join('。');
                        } else if (guidedStep === 4 && guidedPractice.length > 0) {
                          textToRead = guidedPractice.map((q) => stripMath(q.stem || q.question || '')).filter(Boolean).join('。');
                        } else if (guidedStep === 5 && guidedExitTickets.length > 0) {
                          textToRead = guidedExitTickets.map((q) => stripMath(q.question || q.stem || '')).filter(Boolean).join('。');
                        }
                      } else {
                        const desc = (currentTask.description || currentTask.contentPayload || '').trim();
                        textToRead = stripMath(desc);
                      }
                      if (textToRead) playVoice(textToRead).catch(() => {});
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 transition-colors shadow-sm"
                  >
                    <Volume2 size={16} /> {t('readTaskAloud')}
                  </button>
                )}
                <button
                    onClick={handleStuck}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 transition-colors shadow-sm"
                >
                    <HelpCircle size={16} /> {t('stuck')}
                </button>
                <button
                    onClick={handleDone}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 transition-colors shadow-sm"
                >
                    <CheckCircle size={16} /> {t('done')}
                </button>
            </div>
        </div>
      </div>

      {/* AI TUTOR BUBBLE - Floating */}
      <AITutorBubble
        isOpen={bubbleOpen}
        onOpenChange={setBubbleOpen}
        avatarState={avatarState}
        tutorName={tutorName || t('aiSystem')}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Chat Area */}
        <div 
          ref={chatContainerRef}
          className="student-console-chat flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar scroll-smooth min-h-0 bg-[#f7f7f7]"
        >
          {messages.map((msg, idx) => {
            const isCompletionMsg = msg.role === 'model' && isTaskCompletionMessage(msg.text);
            const hasStepPass = msg.role === 'model' && msg.text.includes('[STEP_PASS]');
            const isLastMessage = idx === messages.length - 1;

            // 引导流：当 AI 批准当前步骤时，显示"进入下一步"按钮（未被消费时才显示，点击后立即消失）
            const showGuidedAdvanceButton = hasStepPass && isLastMessage && isGuidedVideoFlow && !isTyping && lastConsumedStepPassMessageIndexRef.current !== idx;
            // 剥离 [STEP_PASS] 标记，不展示给学生
            const displayText = msg.text.replace(/\s*\[STEP_PASS\]\s*/g, '').trim();
            
            return (
              <div key={idx} className="space-y-3">
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2 animate-fade-in-up`}>
                  {msg.role === 'model' && (
                    <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-600">
                      {(tutorName || t('aiSystem')).slice(0, 1)}
                    </div>
                  )}
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-[#95ec69] text-slate-900 rounded-br-none' 
                      : 'bg-white text-slate-700 rounded-bl-none'
                  }`}>
                    <div className="opacity-60 text-[10px] uppercase font-bold tracking-wider mb-1">
                      {msg.role === 'user' ? studentName : (tutorName || t('aiSystem'))}
                    </div>
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({...props}: MarkdownComponentProps<'p'>) => <p className="mb-2 last:mb-0 text-slate-700" {...props} />,
                            strong: ({...props}: MarkdownComponentProps<'strong'>) => <strong className="font-semibold text-slate-800" {...props} />,
                            em: ({...props}: MarkdownComponentProps<'em'>) => <em className="italic" {...props} />,
                            code: ({inline, ...props}: MarkdownComponentProps<'code'> & { inline?: boolean }) => 
                              inline ? (
                                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-800" {...props} />
                              ) : (
                                <code className="block bg-slate-50 p-3 rounded text-xs font-mono text-slate-800 overflow-x-auto my-2" {...props} />
                              ),
                            ul: ({...props}: MarkdownComponentProps<'ul'>) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                            ol: ({...props}: MarkdownComponentProps<'ol'>) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                            li: ({...props}: MarkdownComponentProps<'li'>) => <li className="ml-2" {...props} />,
                            blockquote: ({...props}: MarkdownComponentProps<'blockquote'>) => <blockquote className="border-l-4 border-slate-300 pl-3 italic my-2 text-slate-600" {...props} />,
                          }}
                        >
                          {displayText}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-9 h-9 rounded-full bg-[#95ec69] flex items-center justify-center text-xs text-slate-900">
                      {studentName.slice(0, 1)}
                    </div>
                  )}
                </div>
                
                {/* 在完成消息下方显示"下一个任务"或两个完成按钮（非引导流） */}
                {isCompletionMsg && isLastMessage && !isGuidedVideoFlow && !isTyping && (
                  <div className="flex justify-start animate-fade-in-up ml-0 gap-3 flex-wrap">
                    {currentTaskIndex < plan.tasks.length - 1 ? (
                      <button 
                        onClick={handleNextTask}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
                      >
                        {t('next')} <ArrowRight size={16} />
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={handleEndLearning}
                          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 bg-slate-600 hover:bg-slate-500 text-white"
                        >
                          {t('endNow')}
                        </button>
                        <button 
                          onClick={handleFinishLearning}
                          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                        >
                          {t('scholarAnalysis')} <ArrowRight size={16} />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* 引导流：AI 批准步骤后显示"进入下一步"或两个完成按钮 */}
                {showGuidedAdvanceButton && (
                  <div className="flex justify-start animate-fade-in-up ml-0 gap-3 flex-wrap">
                    {guidedStep < 5 || currentTaskIndex < plan.tasks.length - 1 ? (
                      <button 
                        onClick={() => handleGuidedAdvance(idx)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                      >
                        {guidedStep < 5 ? t('nextStep') : t('nextTask')} <ArrowRight size={16} />
                      </button>
                    ) : (guidedStep === 5 && messages.length <= messagesCountAtStep5EntryRef.current) ? (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {contentLanguage === 'en'
                          ? 'Please complete all exit ticket questions and click "I\'m Done" for AI to evaluate. The completion buttons will appear after AI approval.'
                          : '请完成出门条题目后点击「我做完了」，AI 判定合理后才会显示「结束学习」和「能力分析」按钮。'}
                      </div>
                    ) : allExitTicketsCompleted && (guidedStep < 5 || messages.length > messagesCountAtStep5EntryRef.current) ? (
                      <>
                        <button 
                          onClick={handleEndLearning}
                          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 bg-slate-600 hover:bg-slate-500 text-white"
                        >
                          {t('endNow')}
                        </button>
                        <button 
                          onClick={handleFinishLearning}
                          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                        >
                          {t('scholarAnalysis')} <ArrowRight size={16} />
                        </button>
                      </>
                    ) : (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        请先完成出门条全部题目，完成后才会显示“结束/评估”按钮。
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {isTyping && (
             <div className="flex justify-start">
               <div className="bg-white px-4 py-2 rounded-full text-xs text-slate-500 flex items-center gap-2 border border-slate-200 shadow-sm">
                 <Loader2 size={12} className="animate-spin text-cyan-600"/> {t('aiProcessing')}
               </div>
             </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-[#f7f7f7] border-t border-slate-200 shrink-0">
           <div className="relative flex items-center gap-2">
             {inputMode === 'text' ? (
               <textarea
                 value={chatInput}
                 onChange={(e) => setChatInput(e.target.value)}
                 onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                 placeholder={t('inputPlaceholder')}
                 className="flex-1 bg-white border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#07c160] focus:ring-1 focus:ring-[#07c160]/20 transition-all resize-none h-10 text-slate-800 placeholder-slate-400"
               />
             ) : (
               <button
                 onPointerDown={(event) => {
                   event.preventDefault();
                   event.currentTarget.setPointerCapture(event.pointerId);
                   if (isProcessingSpeech || isTyping) return;
                   if (!isRecording) startRecording();
                 }}
                 onPointerUp={(event) => {
                   event.preventDefault();
                   if (isRecording) stopRecording();
                 }}
                 onPointerLeave={(event) => {
                   event.preventDefault();
                   if (!isRecording) return;
                   const el = event.currentTarget as HTMLElement;
                   const rect = el.getBoundingClientRect();
                   const margin = 24;
                   const { clientX, clientY } = event;
                   const outside =
                     clientX < rect.left - margin ||
                     clientX > rect.right + margin ||
                     clientY < rect.top - margin ||
                     clientY > rect.bottom + margin;
                   if (outside) cancelRecording();
                 }}
                 onPointerCancel={(event) => {
                   event.preventDefault();
                   if (isRecording) cancelRecording();
                 }}
                 disabled={!isRecording && (isProcessingSpeech || isTyping)}
                 style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                 className={`flex-1 h-10 rounded-full border transition-all text-sm ${
                   isRecording
                     ? 'bg-red-500 border-red-500 text-white animate-pulse'
                     : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                 }`}
               >
                 {isRecording ? t('releaseToSend') : t('holdToSpeak')}
               </button>
             )}
             <div className="flex items-center gap-2">
               {voiceServiceAvailable && (
                 <button
                   onClick={() => {
                     setInputMode(prev => (prev === 'text' ? 'voice' : 'text'));
                   }}
                   disabled={isProcessingSpeech || isTyping}
                   className={`w-10 h-10 rounded-full border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                     inputMode === 'text'
                       ? 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600'
                       : 'border-slate-300 bg-white text-slate-600'
                   }`}
                   title={inputMode === 'text' ? t('switchToVoice') : t('switchToKeyboard')}
                 >
                   {inputMode === 'text' ? (
                     <Mic size={16} className="mx-auto" />
                   ) : (
                     <Type size={16} className="mx-auto" />
                   )}
                 </button>
               )}
               
               {inputMode === 'text' && (
                 <button 
                   onClick={() => handleSendMessage()}
                   disabled={!chatInput.trim() || isTyping}
                   className="h-10 px-4 rounded-full bg-[#07c160] hover:bg-[#06ad56] text-white text-sm disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                 >
                   {t('send')}
                 </button>
               )}
             </div>
           </div>
           {/* Voice status indicators */}
           {(isRecording || isProcessingSpeech || speechError) && (
             <div className="mt-2 flex items-center gap-2 text-xs">
               {isRecording && (
                 <span className="text-red-600 flex items-center gap-1">
                   <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                   {t('recording')}
                 </span>
               )}
               {isProcessingSpeech && (
                 <span className="text-blue-600 flex items-center gap-1">
                   <Loader2 size={12} className="animate-spin" />
                   {t('recognizing')}
                 </span>
               )}
               {speechError && (
                 <span className="text-red-600 flex items-center gap-1">
                   <AlertCircle size={12} />
                   {t('speechError')}: {speechError}
                 </span>
               )}
             </div>
           )}
        </div>
        </div>
      </AITutorBubble>

      {/* RIGHT COLUMN: REAL-TIME PROGRESS (20%) */}
      <div 
        style={{ width: '20%' }}
        className="h-full flex flex-col bg-slate-50 relative shrink-0 border-l border-slate-200 min-h-0"
      >
        {/* 实时学习进度 */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <RealTimeProgressTracker
            messages={messages}
            studentLog={studentLog}
            currentTaskIndex={currentTaskIndex}
            totalTasks={plan.tasks.length}
            improvementCount={improvementCount}
            completedTasksCount={completedTasks.size}
          />
        </div>
      </div>

      {/* Fullscreen Modal for Interactive Experiment */}
      <FullscreenModal
        isOpen={isFullscreenExperiment}
        onClose={() => setIsFullscreenExperiment(false)}
        title={t('interactiveLab')}
      >
        {assetData && (
          <div className="w-full h-full flex flex-col">
            <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-4 text-[10px] text-slate-500 shrink-0">
              {assetData.trim().startsWith('http') && (
                 <span className="text-cyan-600 flex items-center gap-1"><Globe size={12}/> PhET 来源</span>
              )}
            </div>
            <iframe 
              src={assetData.trim().startsWith('http') ? assetData : undefined}
              srcDoc={assetData.trim().startsWith('http') ? undefined : assetData}
              className="w-full flex-1 border-none"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms" 
              title={t('interactiveSimulation')}
            />
          </div>
        )}
      </FullscreenModal>

      {/* Fullscreen Modal for Mindmap Editor */}
      <FullscreenModal
        isOpen={isFullscreenMindmap}
        onClose={() => setIsFullscreenMindmap(false)}
        title={t('mindMapEditor')}
      >
        {visualizationData ? (
          <VisualizationEditor
            initialData={visualizationData}
            onChange={handleVisualizationChange}
            editable={true}
            courseTopic={currentTask.title || currentTask.outputGoal || '本节课主题'}
            onGenerateFramework={handleGenerateFramework}
            onNodeCreated={handleNodeCreated}
            onNodeEdited={handleNodeEdited}
            onEdgeCreated={handleEdgeCreated}
            onConfusionMarked={handleConfusionMarked}
            onProgressUpdate={handleProgressUpdate}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            正在初始化可视化编辑器...
          </div>
        )}
      </FullscreenModal>
    </div>
  );
};

export default StudentConsole;

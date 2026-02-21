import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  SystemTaskPlan,
  ChatMessage,
  ExitTicketAnalysis,
  Characteristic,
  ObjectiveMetrics,
} from '@/types/backend';
import { sendChatMessage, generateTaskAsset, generateExitTicket, getSpeechVoices } from '@/lib/backendApi';
import { upsertStudentCourseProgress } from '@/lib/studentProgressApi';
import { useAuth } from '../AuthContext';
import { 
  BookOpen, 
  MessageCircle, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
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
  VolumeX
} from 'lucide-react';
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
}

interface GuidedKeyIdea {
  text: string;
  blanks?: string[];
}

interface GuidedQuestion {
  question: string;
  options?: string[];
  correctAnswer?: string;
}

interface GuidedPayload {
  learningObjective?: string;
  whyItMatters?: { meaning_anchor?: string; advance_organizer?: string };
  keyIdeas?: GuidedKeyIdea[];
  practiceQuestions?: GuidedQuestion[];
  exitTicket?: GuidedQuestion | null;
  taskDesignJson?: Record<string, unknown> | null;
}

function parseGuidedPayload(payload?: string): GuidedPayload | null {
  if (!payload?.trim()) return null;
  try {
    const json = JSON.parse(payload) as Record<string, unknown>;
    const td = (json.taskDesignJson as Record<string, unknown>) ?? null;
    const why = td?.why_it_matters as { meaning_anchor?: string; advance_organizer?: string } | undefined;
    return {
      learningObjective: typeof json.learningObjective === 'string' ? json.learningObjective : undefined,
      whyItMatters: why && (why.meaning_anchor || why.advance_organizer) ? why : undefined,
      keyIdeas: Array.isArray(json.keyIdeas) ? json.keyIdeas as GuidedKeyIdea[] : [],
      practiceQuestions: Array.isArray(json.practiceQuestions) ? json.practiceQuestions as GuidedQuestion[] : [],
      exitTicket: (json.exitTicket as GuidedQuestion | null) ?? null,
      taskDesignJson: td,
    };
  } catch {
    return null;
  }
}

function extractQuestionStemAndOptions(question: string, options?: string[]): { stem: string; options: string[] } {
  if (options && options.length > 0) {
    return { stem: question, options };
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

// Text Editor Preview Component for writing space
const TextEditorPreview = ({ content, onEditClick }: { content: string; onEditClick: () => void }) => {
  return (
    <div 
      className="h-full overflow-y-auto custom-scrollbar bg-white p-8 cursor-text hover:bg-slate-50/50 transition-colors"
      onClick={onEditClick}
      title="点击进入编辑模式"
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
          {content || '暂无内容，点击此处开始编辑...'}
        </ReactMarkdown>
      </div>
    </div>
  );
};

const StudentConsole: React.FC<StudentConsoleProps> = ({ plan, onComplete, onApiKeyError }) => {
  const { user } = useAuth();
  const params = useParams();
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

  // --- State ---
  // 从 localStorage 恢复当前任务索引，刷新后保持状态
  const [currentTaskIndex, setCurrentTaskIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currentTaskIndex');
      if (saved !== null) {
        const index = parseInt(saved, 10);
        // 确保索引在有效范围内
        if (!isNaN(index) && index >= 0 && index < plan.tasks.length) {
          return index;
        }
      }
    }
    return 0;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [studentLog, setStudentLog] = useState<string[]>([]);
  
  // Layout State (Resizable Split - Three Columns)
  const [leftPanelWidth, setLeftPanelWidth] = useState(60); // Default 60%
  const [middlePanelWidth, setMiddlePanelWidth] = useState(25); // Default 25% (right panel will be 15%)
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
  const [guidedStep, setGuidedStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [keywordAnswers, setKeywordAnswers] = useState<Record<string, string>>({});
  const [practiceTextAnswers, setPracticeTextAnswers] = useState<Record<number, string>>({});
  const [practiceChoiceAnswers, setPracticeChoiceAnswers] = useState<Record<number, number>>({});
  const [showPracticeSolutions, setShowPracticeSolutions] = useState<Record<number, boolean>>({});
  const [exitTicketAnswer, setExitTicketAnswer] = useState('');
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
  
  // Student Name State (from localStorage or default to "您")
  const [studentName, setStudentName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('studentName') || '您';
    }
    return '您';
  });
  
  // AI Tutor Personalization State
  const [tutorName, setTutorName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tutorName') || '';
    }
    return '';
  });
  
  const [tutorAvatar, setTutorAvatar] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tutorAvatar') || '🤖';
    }
    return '🤖';
  });
  
  // Avatar animation state
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const avatarStateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Voice features state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);
  const [voiceServiceAvailable, setVoiceServiceAvailable] = useState(true);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [ttsVoices, setTtsVoices] = useState<Array<{ name: string; ssmlGender?: string }>>([]);
  const [ttsVoicesLoaded, setTtsVoicesLoaded] = useState(false);
  const [ttsRecommended, setTtsRecommended] = useState<string | null>(null);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ttsVoiceName');
      if (saved) return saved;
    }
    return 'cmn-CN-Chirp3-HD-Despina';
  });
  const prevVoiceForDemoRef = useRef<string | null>(null);

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

  // Fetch TTS voices when voice service is available (via backend API)
  useEffect(() => {
    if (!voiceServiceAvailable) return;
    let cancelled = false;
    getSpeechVoices()
      .then((data) => {
        if (cancelled) return;
        const list = data.voices ?? [];
        setTtsVoices(list.filter((v) => v.name).map((v) => ({ name: v.name, ssmlGender: v.ssmlGender })));
        if (data.recommended) setTtsRecommended(data.recommended);
        setTtsVoicesLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setTtsVoices([]);
          setTtsVoicesLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [voiceServiceAvailable]);

  // Speech recognition hook
  const {
    isRecording,
    isProcessing: isProcessingSpeech,
    error: speechError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useSpeechRecognition({
    language: 'cmn-CN',
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
    language: 'cmn-CN',
    voiceName: selectedVoiceName,
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

  const TTS_DEMO_SENTENCE = '你好呀，我会用这个声音陪你学习，听听看喜不喜欢';

  useEffect(() => {
    prevVoiceForDemoRef.current = selectedVoiceName;
  }, []);

  useEffect(() => {
    if (prevVoiceForDemoRef.current === null) return;
    if (prevVoiceForDemoRef.current !== selectedVoiceName) {
      prevVoiceForDemoRef.current = selectedVoiceName;
      playVoice(TTS_DEMO_SENTENCE).catch((err) => console.warn('Voice demo failed:', err));
    }
  }, [selectedVoiceName, playVoice]);

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
  
  // Name Input Dialog State
  const [showNameDialog, setShowNameDialog] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('studentName');
    }
    return false;
  });
  const [nameInput, setNameInput] = useState<string>('');
  
  const handleSaveName = () => {
    const trimmedName = nameInput.trim();
    if (trimmedName) {
      setStudentName(trimmedName);
      if (typeof window !== 'undefined') {
        localStorage.setItem('studentName', trimmedName);
        // 保存AI导师设置
        if (tutorName) {
          localStorage.setItem('tutorName', tutorName);
        }
        if (tutorAvatar) {
          localStorage.setItem('tutorAvatar', tutorAvatar);
        }
      }
      setShowNameDialog(false);
    }
  };

  const mindMapRef = useRef<HTMLDivElement>(null);

  // Refs
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // 跟踪已发送问候消息的任务索引，避免重复发送
  const greetingSentRef = useRef<Set<number>>(new Set());
  const guidedDoneInFlight = useRef(false); // 防止引导流 handleDone 双击重复请求
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
  const isGuidedVideoFlow = viewType === 'video_player' && !!guidedPayload?.learningObjective;

  // Translations
  const t = {
    task: '任务',
    finish: '完成学习',
    next: '进入下一阶段',
    previous: '返回上一阶段',
    inputPlaceholder: '请输入你的回答...',
    aiProcessing: 'AI 导师思考中...',
    operator: '学生',
    aiSystem: 'AI 导师',
    missionObjective: '任务目标',
    systemInstructions: '操作指南',
    mindMapTip: '编辑上方代码，下方实时生成',
    readingTip: '请仔细阅读以下材料',
    syntaxError: '语法错误',
    stuck: '我卡住了',
    done: '我做完了',
    evaluate: '请求评价',
    stuckTip: '点击这里，让 AI 导师基于你目前的表格内容提供思路',
    myMap: '我的思维导图',
    optimizeMap: 'AI 优化结构',
    // Report translations
    sessionComplete: '学习旅程完成',
    ticketGenerated: '学习能力分析报告',
    masteryScore: '综合掌握评分',
    keyTakeaway: '核心收获',
    nextSteps: '下一步建议',
    restartLearning: '再学一遍',
    endLearning: '结束学习',
    processing: '正在生成分析报告...',
    processingTip: '系统正在根据您的互动频率、任务质量和思维深度生成"竹子学霸"能力模型...',
    neuralMap: '最终知识图谱',
    radarTitle: '学霸四特质模型',
    systemLog: '思维日志',
  };

  const getIconForTrait = (key: string) => {
      switch(key) {
          case 'self_drive': return <Target size={18} className="text-cyan-600"/>;
          case 'focus': return <Zap size={18} className="text-yellow-600"/>;
          case 'thinking': return <Search size={18} className="text-purple-600"/>;
          case 'improvement': return <TrendingUp size={18} className="text-emerald-600"/>;
          default: return <Activity size={18}/>;
      }
  };

  // --- Resizing Logic ---
  const startResizingLeft = useCallback(() => setIsResizingLeft(true), []);
  const startResizingRight = useCallback(() => setIsResizingRight(true), []);
  const stopResizing = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, []);

  const resizeLeft = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizingLeft && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = ((mouseMoveEvent.clientX - containerRect.left) / containerRect.width) * 100;
        // Limit left panel width between 25% and 60%
        if (newWidth >= 25 && newWidth <= 60) {
          const rightPanelWidth = 100 - leftPanelWidth - middlePanelWidth;
          const maxMiddleWidth = 100 - newWidth - 15; // Keep right panel at least 15%
          const adjustedMiddleWidth = Math.min(middlePanelWidth, maxMiddleWidth);
          setLeftPanelWidth(newWidth);
          if (adjustedMiddleWidth !== middlePanelWidth) {
            setMiddlePanelWidth(adjustedMiddleWidth);
          }
        }
      }
    },
    [isResizingLeft, leftPanelWidth, middlePanelWidth]
  );

  const resizeRight = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizingRight && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = ((mouseMoveEvent.clientX - containerRect.left) / containerRect.width) * 100;
        // Calculate middle panel width based on right resizer position
        const newMiddleWidth = newWidth - leftPanelWidth;
        // Limit middle panel width, keeping right panel between 15% and 35%
        const rightPanelWidth = 100 - leftPanelWidth - newMiddleWidth;
        if (rightPanelWidth >= 15 && rightPanelWidth <= 35 && newMiddleWidth >= 20) {
          setMiddlePanelWidth(newMiddleWidth);
        }
      }
    },
    [isResizingRight, leftPanelWidth]
  );

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    if (isResizingLeft) {
      window.addEventListener("mousemove", resizeLeft);
      window.addEventListener("mouseup", stopResizing);
    }
    if (isResizingRight) {
      window.addEventListener("mousemove", resizeRight);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resizeLeft);
      window.removeEventListener("mousemove", resizeRight);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizingLeft, isResizingRight, resizeLeft, resizeRight, stopResizing]);

  useEffect(() => {
    setGuidedStep(1);
    setMaxStepReached(1);
    setKeywordAnswers({});
    setPracticeTextAnswers({});
    setPracticeChoiceAnswers({});
    setShowPracticeSolutions({});
    setExitTicketAnswer('');
    setShowExitTicketAnswer(false);
  }, [currentTaskIndex]);

  // --- Effects ---

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is fully updated
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        // Scroll the container to bottom instead of using scrollIntoView
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });
  }, [messages]);

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
             if (preGenerated) {
                 try {
                     const data = JSON.parse(preGenerated);
                     if (data && data.columns && data.rows) {
                         const emptyRows = Array(data.rows).fill(null).map(() => Array(data.columns.length).fill(''));
                         setTableData({ columns: data.columns, rows: emptyRows });
                     } else {
                        throw new Error("无效的表格数据");
                     }
                 } catch (e) {
                     setTableData({ columns: ['列A', '列B'], rows: [['', ''], ['', '']] });
                 }
             } else {
                 // Simple Fallback
                 setTableData({ columns: ['概念', '定义', '举例'], rows: [['', '', ''], ['', '', '']] });
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
              {/* #region agent log */}
              {(() => {
                const rawContent = currentTask.contentPayload || currentTask.description || '';
                fetch('http://127.0.0.1:7242/ingest/3a151953-f974-4097-816e-92c7e205fad2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentConsole.tsx:453',message:'Initializing math_editor',data:{hasContentPayload:!!currentTask.contentPayload,hasDescription:!!currentTask.description,rawContentLength:rawContent?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
                return null;
              })()}
              {/* #endregion */}
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
                 generateTaskAsset(currentTask.assetType, currentTask.assetPrompt, courseId, currentTask.id).then(res => {
                     setAssetData(res);
                 }).finally(() => setIsAssetLoading(false));
             }
          }
      } catch (e) {
          console.error("Task Init Error", e);
      }

      // 检查是否已经为当前任务发送过问候消息，避免重复发送
      if (!greetingSentRef.current.has(currentTaskIndex)) {
        // 基于任务内容生成温暖的开场白
        const generateWarmGreeting = () => {
          const taskTitle = currentTask.title || '新任务';
          const taskDesc = currentTask.description || '';
          
          // 提取任务描述的前100个字符作为情境参考
          const scenarioHint = taskDesc.substring(0, 100).replace(/\n/g, ' ').trim();
          
          // 根据任务索引和内容生成个性化开场白
          if (currentTaskIndex === 0) {
            // 第一个任务：更热情的欢迎
            if (scenarioHint) {
              return `嘿，${studentName}！😊 准备好开始我们的第一个挑战了吗？\n\n${taskTitle}，听起来是不是有点意思？让我们一起来探索吧！我会一直陪在你身边，有任何问题随时问我。\n\n准备好了吗？我们开始吧！`;
            } else {
              return `嘿，${studentName}！😊 准备好开始我们的第一个挑战了吗？\n\n${taskTitle}，让我们一起来探索吧！我会一直陪在你身边，有任何问题随时问我。\n\n准备好了吗？我们开始吧！`;
            }
          } else {
            // 后续任务：简洁但温暖的引导
            if (scenarioHint) {
              return `${studentName}，我们又见面了！✨\n\n现在我们要开始：${taskTitle}。这次的任务会更有趣，让我们一起看看会发生什么吧！\n\n准备好了就告诉我，我们开始！`;
            } else {
              return `${studentName}，我们又见面了！✨\n\n现在我们要开始：${taskTitle}。这次的任务会更有趣，让我们一起看看会发生什么吧！\n\n准备好了就告诉我，我们开始！`;
            }
          }
        };
        
        const greeting = generateWarmGreeting();
        // Generate timestamp only on client side (this is in useEffect, so safe)
        const timestamp = Date.now();
        setMessages(prev => [...prev, { role: 'model', text: greeting, timestamp }]);
        greetingSentRef.current.add(currentTaskIndex);
        
        // 自动播放开场白语音（仅第一个任务且满足条件时）
        // 注意：浏览器会阻止首次用户交互前的 audio.play()，所以未解锁时先缓存，交互后再播放
        if (currentTaskIndex === 0 && autoPlayVoice && voiceEnabled && voiceServiceAvailable) {
          if (hasUserInteracted) {
            // 延迟一下确保消息已渲染
            setTimeout(() => {
              playVoice(greeting).catch(err => {
                console.warn('Auto-play greeting voice failed:', err);
              });
            }, 500);
          } else {
            pendingAutoSpeakRef.current = greeting;
          }
        }
      }
    };

    initTask();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTaskIndex, plan]);

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

      const mermaidCode = await generateTaskAsset('mindmap_code', prompt);
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
  }, []);

  const getTaskContext = () => {
      {/* #region agent log */}
      {(() => {
        fetch('http://127.0.0.1:7242/ingest/3a151953-f974-4097-816e-92c7e205fad2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentConsole.tsx:492',message:'getTaskContext called',data:{viewType,isMathEditor:viewType==='math_editor',hasMathEditorContent:!!mathEditorContent},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
        return null;
      })()}
      {/* #endregion */}
      let context = "";
      if (viewType === 'mindmap_editor') {
        // Use visualizationData if available, otherwise fall back to mindMapInput
        if (visualizationData) {
          if (visualizationData.type === 'mindmap') {
            // For mindmap, use Mermaid code if available
            context = `Student ${visualizationData.type === 'mindmap' ? 'Mindmap' : visualizationData.type === 'conceptmap' ? 'Concept Map' : 'Knowledge Graph'}: \n${mindMapInput || JSON.stringify(visualizationData, null, 2)}`;
          } else {
            // For conceptmap and knowledgegraph, use structured data
            context = `Student ${visualizationData.type === 'conceptmap' ? 'Concept Map' : 'Knowledge Graph'}: \nNodes: ${visualizationData.nodes.map(n => n.label).join(', ')}\nEdges: ${visualizationData.edges.length} connections\n${JSON.stringify(visualizationData, null, 2)}`;
          }
        } else {
          context = `Student Mindmap Code: \n${mindMapInput}`;
        }
      } else if (viewType === 'table_editor') context = `Student Table Data: \nColumns: ${tableData.columns.join(', ')}. \nCurrent Content: ${JSON.stringify(tableData.rows)}`;
      else if (viewType === 'text_editor') context = `Student Text Editor Content: \n${textEditorContent}`;
      else if (viewType === 'math_editor') context = `Student Math Editor Content: \n${mathEditorContent}`;
      else if (viewType === 'image_gallery') context = `Student is viewing an AI generated image.`;
      else if (viewType === 'video_player') context = `Student is watching a video.`;
      else if (viewType === 'interactive_experiment') context = `Student is performing an interactive experiment.`;
      else context = `Student is performing task type: ${viewType}`;
      return context;
  };

  const handleSendMessage = async (forcedInput?: string, hiddenContext?: string) => {
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

    const dynamicSystemInstruction = `
## 当前任务信息
- 任务标题：${currentTask.title}
- 学习目标：${currentTask.outputGoal}
- 学生当前状态：${viewContext}

## 教学策略
${currentTask.tutorConfig.systemInstruction || '引导学生自主思考，通过提问和讨论帮助学生理解。'}${imageFallbackContext}

## 语气要求
- 语气风格：${currentTask.tutorConfig.tone === 'Socratic' ? '苏格拉底式提问，但要用温暖、鼓励的方式提问，不要显得咄咄逼人' : currentTask.tutorConfig.tone}
- 语言：简体中文

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
- 不要使用Markdown格式（如**粗体**、#标题等），用自然的中文表达
- 可以适当使用表情符号（如😊、💡、👍），但每条最多1个
- **语言生动但简洁**：每次回复 2-4 句，总长度 60-120 字
- 如果涉及数学公式，使用LaTeX格式：$公式$
- **禁止重复**上一条消息中已说过的内容；禁止在同一条回复中出现重复段落
- **只聚焦当前步骤**，不要主动提及其他任务类型（学生做视频任务时不提思维导图等）
`;

    try {
        const responseText = await sendChatMessage(messages.concat(userMsg), userMsg.text, dynamicSystemInstruction, 'zh');
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
        setMessages(prev => [...prev, { role: 'model', text: "连接错误，请重试。", timestamp }]);
        setAvatarState('idle'); // Error occurred, return to idle
    } finally {
        setIsTyping(false);
        guidedDoneInFlight.current = false; // 释放引导流请求锁
        // Avatar state is managed by the useEffect hook above, which properly handles
        // state transitions based on isTyping, isPlayingVoice, messages, etc.
        // No need for additional setTimeout here as it would use stale closure values.
    }
  };

  const handleStuck = () => {
    const context = getTaskContext();
    const guidedCtx = isGuidedVideoFlow
      ? `\nGuided step ${guidedStep}/5: ${['我能明确目标','我能看懂视频','我能总结要点','我能练一练','我能完成复盘'][guidedStep - 1] || ''}\n${getGuidedStepProgress()}`
      : '';
    handleSendMessage(
        "AI 老师，我卡住了，能给我一些提示吗？", 
        `Student clicked 'I'm Stuck'. Context: ${context}${guidedCtx}

CRITICAL: Give hints STEP BY STEP, not all at once.
- Give ONLY ONE hint/guidance point in this response (2-3 sentences, max 100 chars)
- Wait for the student to respond or try before giving the next hint
- Only discuss the CURRENT step/task; do NOT mention other task types
- Do NOT give the answer directly
- Do NOT list multiple hints in one response - focus on ONE key point`
    );
  };

  const handleDone = () => {
    if (guidedDoneInFlight.current) return; // 防重复请求
    const now = Date.now();
    
    // 检查是否完成了一次改进循环：之前点击过"我做完了" + 之后有编辑 + 再次点击"我做完了"
    if (lastDoneClickTime !== null && hasEditAfterDone && (now - lastDoneClickTime) < 5 * 60 * 1000) {
      setImprovementCount(prev => prev + 1);
      setHasEditAfterDone(false);
    }
    setLastDoneClickTime(now);

    // ──── 引导流模式：按步骤验证 ────
    if (isGuidedVideoFlow) {
      guidedDoneInFlight.current = true;
      const stepTitles = ['我能明确目标', '我能看懂视频', '我能总结要点', '我能练一练', '我能完成复盘'];
      const currentStepTitle = stepTitles[guidedStep - 1] || `步骤${guidedStep}`;
      const stepProgress = getGuidedStepProgress();

      // 步骤 1/2 轻量放行
      const isLightStep = guidedStep <= 2;

      const hiddenCtx = `Student clicked 'I'm Done' for guided step ${guidedStep}: "${currentStepTitle}".
Task: ${currentTask.title}
Goal: ${currentTask.outputGoal}
${stepProgress}

STEP VERIFICATION PROTOCOL (guided flow):
- You are verifying step ${guidedStep}/5: "${currentStepTitle}".
- ${isLightStep
  ? 'This is a lightweight step (reading/watching). Acknowledge and approve directly.'
  : `Review the student's work for this step. Be encouraging but check completeness.`}
- Language: vivid but concise, 2-4 sentences, max 100 chars.
- Do NOT mention other steps, mindmaps, or unrelated concepts.
- Do NOT repeat content from previous messages.
- CRITICAL: If the step is satisfactorily completed, you MUST end your response with the EXACT marker: [STEP_PASS]
  This marker tells the system to show an "进入下一步" button.
- If the step is NOT complete, give ONE specific suggestion to improve, then encourage retry. Do NOT include [STEP_PASS].
- Do NOT include [STEP_PASS] unless you truly approve this step.`;

      handleSendMessage(
        `AI 老师，我完成了「${currentStepTitle}」这一步。`,
        hiddenCtx
      );
      return;
    }

    // ──── 非引导流（原有逻辑）────
    const context = getTaskContext();
    handleSendMessage(
        "AI 老师，我完成了这个任务，请评价我的成果。", 
        `Student clicked 'I'm Done'. Context: ${context}. 
Evaluation Criteria: ${currentTask.evaluationCriteria}. 
Output Goal: ${currentTask.outputGoal}

CRITICAL TASK COMPLETION PROTOCOL:
1. First, review their work against the outputGoal: "${currentTask.outputGoal}"
2. If their work meets the core requirements, give positive feedback
3. If there are gaps, provide 1-2 specific improvement suggestions (but don't be overly strict)
4. MOST IMPORTANT: After evaluation, if the task is substantially complete, you MUST explicitly tell the student:
   "很好！你已经完成了这个任务。你可以点击'下一个任务'按钮继续学习了。"
5. Do NOT continue asking questions or requesting more work if the core goal is met
6. Allow students to move forward even if their work isn't perfect - learning is iterative
7. Give immediate positive feedback on what they did well before any suggestions`
    );
  };

  const handleOptimizeMap = async () => {
      if (!mindMapInput) return;
      setIsAssetLoading(true);
      try {
          const improvedCode = await generateTaskAsset('mindmap_code', `Optimize and expand this Mermaid code: ${mindMapInput}. Keep it concise but add relevant branches.`);
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
        localStorage.setItem('currentTaskIndex', nextIndex.toString());
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
      const transitionInstruction = `
你是学生的学习导师。请基于以下上下文，输出一段“过渡反馈”：

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
`;

      try {
        setIsTyping(true);
        const transitionText = await sendChatMessage(
          messages,
          '系统事件：学生点击了“下一步”',
          transitionInstruction,
          'zh'
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

  // 引导流步骤进度描述（供 handleDone 使用）
  const getGuidedStepProgress = (): string => {
    const stepTitles = ['我能明确目标', '我能看懂视频', '我能总结要点', '我能练一练', '我能完成复盘'];
    const currentStepTitle = stepTitles[guidedStep - 1] || `步骤${guidedStep}`;

    if (guidedStep === 1) return `当前步骤「${currentStepTitle}」：学生已阅读学习目标。`;
    if (guidedStep === 2) return `当前步骤「${currentStepTitle}」：学生已观看视频。`;
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
        if (parsed.options.length > 0) return typeof practiceChoiceAnswers[idx] === 'number';
        return (practiceTextAnswers[idx] || '').trim().length > 0;
      }).length;
      const answers = guidedPractice.map((q, idx) => {
        const parsed = extractQuestionStemAndOptions(q.question || '', q.options);
        if (parsed.options.length > 0 && typeof practiceChoiceAnswers[idx] === 'number') {
          return `Q${idx + 1}: ${String.fromCharCode(65 + practiceChoiceAnswers[idx])}. ${parsed.options[practiceChoiceAnswers[idx]] || ''}`;
        }
        return `Q${idx + 1}: ${practiceTextAnswers[idx] || '(未答)'}`;
      });
      return `当前步骤「${currentStepTitle}」：完成 ${answered}/${totalQ}。${answers.join('；')}`;
    }
    if (guidedStep === 5) {
      return `当前步骤「${currentStepTitle}」：学生出门条回答：${exitTicketAnswer || '(空)'}`;
    }
    return `当前步骤「${currentStepTitle}」：学生已完成。`;
  };

  // 引导流：进入下一步（由聊天区 [STEP_PASS] 按钮触发）
  const handleGuidedAdvance = () => {
    if (guidedStep < 5) {
      const next = guidedStep + 1;
      setMaxStepReached(prev => Math.max(prev, next));
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
    const evaluateClicks = log.filter(entry => entry.includes('请求评价') || entry.includes('evaluate')).length;

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
    const finalMindMap = viewType === 'mindmap_editor' ? mindMapInput : undefined;
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
    setLearningLog(log);
    if (finalMindMap) {
      setFinalMindMapCode(finalMindMap);
    }
    setShowReport(true);
    setExitData(null); // Reset to show loading screen
    
    try {
      console.log('[StudentConsole] Calling generateExitTicket with:', {
        logLength: log.length,
        studentName,
        hasObjectiveMetrics: !!objectiveMetrics
      });
      const data = await generateExitTicket(log, 'zh', studentName, objectiveMetrics);
      console.log('[StudentConsole] Exit ticket generated successfully');
      setExitData(data);
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
    }
  };

  const handleRestartLearning = () => {
    // Reset all states to restart the course
    setShowReport(false);
    setExitData(null);
    setLearningLog('');
    setFinalMindMapCode(null);
    setCurrentTaskIndex(0);
    // 清除 localStorage 中的任务索引
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentTaskIndex');
    }
    setMessages([]);
    setStudentLog([]);
    setMindMapInput('');
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

  // 0. Name Input Dialog (shown before learning starts)
  if (showNameDialog) {
    return (
      <div className="relative min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full animate-fade-in-up">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-100 mb-4 border border-cyan-200">
              <BookOpen size={32} className="text-cyan-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">欢迎开始学习！</h2>
            <p className="text-slate-500 text-sm">请告诉我们您的名字或昵称，让我们更好地为您服务</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">您的名字或昵称</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nameInput.trim()) {
                    handleSaveName();
                  }
                }}
                placeholder="请输入您的名字或昵称..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                autoFocus
              />
            </div>
            
            {/* AI导师个性化设置 */}
            <div className="border-t border-slate-200 pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-purple-600" />
                <label className="block text-sm font-medium text-slate-700">个性化AI导师（可选）</label>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">AI导师的名字</label>
                  <input
                    type="text"
                    value={tutorName}
                    onChange={(e) => setTutorName(e.target.value)}
                    placeholder="例如：小助手、学习伙伴..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">AI导师头像（emoji）</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tutorAvatar}
                      onChange={(e) => setTutorAvatar(e.target.value || '🤖')}
                      placeholder="🤖"
                      maxLength={2}
                      className="w-16 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-lg text-center focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                    <div className="flex-1 text-xs text-slate-400">
                      输入一个emoji表情作为头像
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSaveName}
              disabled={!nameInput.trim()}
              className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-600/30 flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} /> 开始学习
            </button>
            
            <button
              onClick={() => {
                setStudentName('您');
                setShowNameDialog(false);
              }}
              className="w-full px-6 py-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
            >
              跳过，直接开始
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. Loading Screen (Report Generation)
  if (showReport && !exitData) {
    return (
      <div className="relative min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 font-sans overflow-hidden">
        <div className="z-10 text-center max-w-md animate-fade-in-up">
           <Loader2 className="w-16 h-16 text-cyan-600 animate-spin mx-auto mb-8" />
           <h2 className="text-2xl font-bold mb-4">{t.processing}</h2>
           <p className="text-slate-500 mb-8 leading-relaxed border-l-2 border-cyan-500 pl-4 text-left italic bg-white p-4 rounded-r-lg shadow-sm">
             {t.processingTip}
           </p>
           <div className="h-1 w-48 bg-slate-200 rounded-full mx-auto overflow-hidden">
             <div className="h-full bg-cyan-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] w-full origin-left"></div>
           </div>
        </div>
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t.sessionComplete}</h1>
            <p className="text-slate-500 uppercase tracking-widest text-xs">{t.ticketGenerated}</p>
          </div>
          
          {/* Section 1: Score & Summary Card */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl transition-all hover:shadow-2xl">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                 <div className="flex-none w-full md:w-auto md:min-w-[200px] text-center md:text-left md:border-r border-slate-100 md:pr-8 pb-6 md:pb-0 border-b md:border-b-0">
                      <h3 className="text-xs uppercase font-bold text-slate-400 mb-3">{t.masteryScore}</h3>
                      <div className="flex items-baseline justify-center md:justify-start gap-2">
                         <span className="text-7xl font-bold text-emerald-600 tracking-tighter">{exitData.overallScore}</span>
                         <span className="text-xl text-slate-400 font-medium">/100</span>
                      </div>
                 </div>
                 <div className="flex-1">
                    <h3 className="text-xs uppercase font-bold text-slate-400 mb-3 flex items-center gap-2">
                        <Star size={14} className="text-amber-500"/> {t.keyTakeaway}
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
               <List size={18}/> {t.nextSteps}
             </h3>
             <p className="text-slate-700 text-md leading-relaxed">
                {exitData.nextSteps}
             </p>
          </div>

          {/* Section 3: Xueba Four Characteristics (Interactive) */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
             <h4 className="text-sm font-bold text-slate-500 mb-8 uppercase w-full flex items-center gap-2 border-b border-slate-100 pb-4">
                <Activity size={18} className="text-purple-600"/> {t.radarTitle}
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

          {/* Section 4: Knowledge Graph */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <h4 className="text-sm font-bold text-slate-500 mb-6 uppercase w-full flex items-center gap-2 border-b border-slate-100 pb-4">
                <Brain size={18} className="text-cyan-600"/> {t.neuralMap}
              </h4>
              <div className="w-full h-[500px] bg-slate-50/50 rounded-2xl border border-slate-100 relative overflow-hidden">
                  {finalMindMapCode ? (
                      <MermaidPreview 
                        code={finalMindMapCode} 
                        idPrefix="mermaid-exit"
                        errorMessage="渲染思维导图时出错"
                      />
                  ) : (
                      <div className="flex items-center justify-center h-full text-sm text-slate-400">
                          本次学习未生成思维导图。
                      </div>
                  )}
              </div>
          </div>

          {/* Section 4.5: Learning Goals & Big Concept Review */}
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
              <List size={14}/> {t.systemLog}
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
               <RefreshCcw size={20} /> {t.restartLearning}
             </button>
             <button 
               onClick={handleEndLearning}
               className="px-8 py-4 bg-slate-600 hover:bg-slate-700 rounded-full text-white font-bold transition-all shadow-lg hover:shadow-slate-600/30 flex items-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
             >
               <CheckCircle size={20} /> {t.endLearning}
             </button>
          </div>
        </div>
      </div>
    );
  }

  const renderLeftWorkspace = () => {
    {/* #region agent log */}
    {(() => {
      fetch('http://127.0.0.1:7242/ingest/3a151953-f974-4097-816e-92c7e205fad2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentConsole.tsx:896',message:'renderLeftWorkspace called',data:{viewType,hasMathEditorContent:!!mathEditorContent,mathEditorContentLength:mathEditorContent?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
      return null;
    })()}
    {/* #endregion */}
    // Guided flow for teacher-generated JSON (video + worksheet)
    if (isGuidedVideoFlow) {
      const source = currentTask.externalResourceUrl || (typeof assetData === 'string' ? assetData : '') || '';
      const youtubeId = extractYouTubeVideoId(source);
      const stepTitles = ['我能明确目标', '我能看懂视频', '我能总结要点', '我能练一练', '我能完成复盘'];

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
                  <h3 className="text-lg font-bold text-slate-800 mb-3">我能明确目标</h3>
                  <div className="text-slate-700 leading-relaxed space-y-4">
                    <p>
                      <strong>学习目标：</strong>
                      {guidedPayload?.learningObjective || currentTask.outputGoal || '请先了解本节课学习目标。'}
                    </p>
                    {guidedPayload?.whyItMatters?.meaning_anchor && (
                      <p><strong>为什么学这个？</strong> {guidedPayload.whyItMatters.meaning_anchor}</p>
                    )}
                    {guidedPayload?.whyItMatters?.advance_organizer && (
                      <p><strong>学什么？</strong> {guidedPayload.whyItMatters.advance_organizer}</p>
                    )}
                  </div>
                </div>
              )}

              {guidedStep === 2 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-lg font-bold text-slate-800 mb-3 px-2">我能看懂视频</h3>
                  <div className="rounded-lg overflow-hidden bg-black/80">
                    {youtubeId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        title="教学视频"
                        className="w-full aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : source ? (
                      <video controls className="w-full aspect-video" src={source}>
                        您的浏览器不支持视频标签。
                      </video>
                    ) : (
                      <div className="aspect-video flex items-center justify-center text-slate-300 text-sm">
                        暂无可播放视频
                      </div>
                    )}
                  </div>
                </div>
              )}

              {guidedStep === 3 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">我能总结要点</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    请根据句意填写空格中的关键词。
                  </p>
                  <div className="space-y-5">
                    {guidedKeyIdeas.map((idea, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="mt-1 w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
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
                                  placeholder="填空"
                                  className="inline-block h-7 min-w-[72px] max-w-[120px] rounded-md border border-emerald-300 bg-emerald-50 px-2 text-xs text-emerald-700 align-middle focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                />
                              </div>
                            );
                          })()}
                          {idea.blanks && idea.blanks.length > 0 && (
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

              {guidedStep === 4 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">我能练一练</h3>
                  <div className="space-y-5">
                    {guidedPractice.map((q, idx) => {
                      const parsed = extractQuestionStemAndOptions(q.question || '', q.options);
                      return (
                        <div key={idx} className="rounded-lg border border-slate-200 p-4 bg-slate-50/60">
                          <div className="text-sm font-semibold text-slate-800 mb-3 flex gap-1">
                            <span>{idx + 1}.</span>
                            <MathTextPreview text={parsed.stem} className="text-sm font-semibold text-slate-800 [&_p]:mb-0" />
                          </div>
                          {parsed.options.length > 0 ? (
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
                            <textarea
                              value={practiceTextAnswers[idx] || ''}
                              onChange={(e) => setPracticeTextAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                              placeholder="请输入你的答案"
                              className="w-full min-h-[90px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
                            />
                          )}
                          {q.correctAnswer && (
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
                      );
                    })}
                  </div>
                </div>
              )}

              {guidedStep === 5 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">我能完成复盘</h3>
                  <MathTextPreview text={guidedExitTicket?.question || '请用1-2句话总结本节课你最重要的收获。'} className="text-sm text-slate-800 mb-3 [&_p]:mb-0" />
                  <textarea
                    value={exitTicketAnswer}
                    onChange={(e) => setExitTicketAnswer(e.target.value)}
                    placeholder="请输入你的复盘回答"
                    className="w-full min-h-[110px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
                  />
                  {guidedExitTicket?.correctAnswer && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowExitTicketAnswer((prev) => !prev)}
                        className="text-xs text-slate-700 border border-slate-300 rounded-full px-3 py-1 bg-white hover:bg-slate-100"
                      >
                        {showExitTicketAnswer ? '隐藏参考答案' : '查看参考答案'}
                      </button>
                      {showExitTicketAnswer && (
                        <div className="text-xs text-emerald-700 mt-2 flex gap-1 items-start">
                          <span>参考答案：</span>
                          <MathTextPreview text={guidedExitTicket.correctAnswer} className="text-xs text-emerald-700 [&_p]:mb-0 inline" />
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
                 <div className="flex-1 p-8 overflow-auto custom-scrollbar bg-slate-50/30">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
                                <tr>
                                    {tableData.columns.map((col, i) => (
                                        <th key={i} className="px-6 py-4 font-bold tracking-wider">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.rows.map((row, rIndex) => (
                                    <tr key={rIndex} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        {row.map((cell, cIndex) => (
                                            <td key={cIndex} className="p-2 border-r border-slate-100 last:border-r-0">
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
                        <div className="bg-slate-50 p-2 text-center">
                            <button 
                                onClick={() => {
                                    const newRow = Array(tableData.columns.length).fill('');
                                    setTableData({...tableData, rows: [...tableData.rows, newRow]});
                                }}
                                className="text-xs text-slate-500 hover:text-cyan-600 font-bold py-2 w-full flex items-center justify-center gap-1"
                            >
                                + 添加行
                            </button>
                        </div>
                    </div>
                 </div>
             </div>
        );
    }

    // 2. MINDMAP EDITOR (Using New VisualizationEditor)
    if (viewType === 'mindmap_editor') {
        // Note: All handler functions are defined at component level (above) for use in both embedded and fullscreen modes
        // 获取课程主题
        const courseTopic = currentTask.title || currentTask.outputGoal || '本节课主题';

        return (
            <div className="w-full h-full bg-white flex flex-col relative border-r border-slate-200">
                {/* Fullscreen button */}
                {visualizationData && (
                    <div className="absolute top-2 right-2 z-50">
                        <button
                            onClick={() => setIsFullscreenMindmap(true)}
                            className="p-2 rounded-lg bg-white/90 hover:bg-white border border-slate-200 shadow-md transition-all hover:shadow-lg text-slate-700 hover:text-slate-900"
                            title="全屏显示"
                        >
                            <Maximize size={16} />
                        </button>
                    </div>
                )}
                
                {isAssetLoading && (
                    <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center flex-col gap-2 animate-fade-in">
                        <Loader2 size={32} className="animate-spin text-purple-600"/>
                        <span className="text-xs font-bold text-slate-500">AI 正在生成思维导图框架...</span>
                    </div>
                )}
                
                {visualizationData ? (
                    <VisualizationEditor
                        initialData={visualizationData}
                        onChange={handleVisualizationChange}
                        editable={true}
                        courseTopic={courseTopic}
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
            </div>
        );
    }

    // 3. TEXT EDITOR (Pure Text Writing Space - WYSIWYG with LaTeX support)
    if (viewType === 'text_editor') {
        return (
             <div className="w-full h-full flex flex-col bg-white shadow-inner">
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
                             <MathTextPreview text={textEditorContent || '暂无内容'} />
                         </div>
                     ) : (
                         <textarea 
                             className="absolute inset-0 w-full h-full p-8 resize-none focus:outline-none text-slate-900 bg-white leading-relaxed text-sm placeholder-slate-400 custom-scrollbar whitespace-pre-wrap"
                             placeholder="在此输入文本内容...支持 LaTeX 公式，例如：$x^2 + y^2 = r^2$ 或 $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$"
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
        {/* #region agent log */}
        {(() => {
          fetch('http://127.0.0.1:7242/ingest/3a151953-f974-4097-816e-92c7e205fad2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentConsole.tsx:1062',message:'math_editor viewType detected',data:{mathEditorContent,mathEditorContentLength:mathEditorContent?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
          return null;
        })()}
        {/* #endregion */}
        return (
            <div className="w-full h-full flex flex-col bg-white shadow-inner">
                <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                        <Type size={16}/> 数学编辑器
                    </div>
                </div>
                <div className="flex-1 relative bg-white">
                    <textarea 
                        className="absolute inset-0 w-full h-full p-8 resize-none focus:outline-none text-slate-900 bg-white leading-relaxed text-sm placeholder-slate-400 custom-scrollbar font-mono"
                        placeholder="输入数学公式，使用 LaTeX 语法，例如：$x^2 + y^2 = r^2$ 或 $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$"
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
                        <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-4 text-[10px] text-slate-500 shrink-0">
                            <span className="font-bold flex items-center gap-1"><Sparkles size={12}/> 交互式实验室</span>
                            <div className="flex items-center gap-2">
                                {assetData.trim().startsWith('http') ? 
                                   <span className="text-cyan-600 flex items-center gap-1"><Globe size={12}/> PhET 来源</span> : 
                                   <span className="text-purple-600 flex items-center gap-1"><Brain size={12}/> AI 生成</span>
                                }
                                <button
                                    onClick={() => setIsFullscreenExperiment(true)}
                                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-600 hover:text-slate-800"
                                    title="全屏显示"
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
                           title="交互式模拟"
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
        <div className="w-full h-full flex flex-col items-center justify-center relative group p-6 bg-slate-50/50">
             {isAssetLoading ? (
                 <div className="flex flex-col items-center gap-2">
                     <Loader2 size={32} className="animate-spin text-cyan-600"/>
                     <span className="text-xs font-bold text-slate-400">正在加载素材...</span>
                 </div>
             ) : assetData ? (
                <>
                    {viewType === 'image_gallery' && (
                       <div className="flex flex-col rounded-xl overflow-hidden shadow-2xl border border-slate-200 max-h-full bg-white">
                           {/* #region agent log */}
                           {(() => {
                               fetch('http://127.0.0.1:7242/ingest/3a151953-f974-4097-816e-92c7e205fad2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentConsole.tsx:1000',message:'Rendering image gallery',data:{hasDescription:!!currentTask.description,descriptionLength:currentTask.description?.length||0,taskId:currentTask.id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
                               return null;
                           })()}
                           {/* #endregion */}
                           <div className="relative flex-1 flex items-center justify-center bg-black/5 min-h-[200px]">
                               <img src={assetData} alt="AI Generated" className="max-w-full max-h-[70vh] object-contain" />
                           </div>
                           <div className="bg-white/90 backdrop-blur-sm p-2 text-[10px] text-slate-500 px-4 border-t border-slate-100">
                               由 Gemini Imagen 3 生成
                           </div>
                       </div>
                    )}
                    {viewType === 'video_player' && (
                        <div className="w-full max-w-3xl space-y-4 bg-black rounded-lg overflow-hidden shadow-2xl">
                             <div className="flex items-center gap-2 p-3 bg-slate-900 text-cyan-400 border-b border-slate-800">
                                 <Video size={18}/>
                                <span className="font-bold text-xs uppercase tracking-wider">教学视频</span>
                             </div>
                            {(() => {
                                const source = typeof assetData === 'string' ? assetData : '';
                                const youtubeId = extractYouTubeVideoId(source);
                                if (youtubeId) {
                                  return (
                                    <iframe
                                      src={`https://www.youtube.com/embed/${youtubeId}`}
                                      title="教学视频"
                                      className="w-full aspect-video"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                      allowFullScreen
                                    />
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
                                    您的浏览器不支持视频标签。
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
      className="flex w-full bg-slate-50 text-slate-800 overflow-hidden font-sans selection:bg-cyan-200"
      style={{ minHeight: '100vh', height: '100vh' }}
    >
      
      {/* LEFT COLUMN: WORKSPACE */}
      <div 
        style={{ width: `${leftPanelWidth}%` }}
        className="h-full flex flex-col bg-white relative shrink-0 border-r border-slate-200 min-h-0"
      >
        {(isResizingLeft || isResizingRight) && <div className="absolute inset-0 z-50 bg-transparent" />} {/* Shield to prevent iframe capturing mouse */}
        
        {/* ENHANCED TASK HEADER - Single Row */}
        <div className="bg-white border-b border-slate-200 p-5 shrink-0 z-20 shadow-sm">
            <div className="flex justify-between items-center gap-4 overflow-hidden">
                <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                    {/* Title */}
                    <div className="flex flex-col shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">任务 {currentTaskIndex + 1}</span>
                        <h2 className="text-lg font-bold text-slate-800 truncate" title={currentTask.title}>
                            {currentTask.title}
                        </h2>
                    </div>
                    <div className="h-8 w-px bg-slate-200 hidden md:block shrink-0" />
                    {/* Learning Objective - moved here */}
                    <div className="bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="bg-cyan-100 text-cyan-800 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">学习目标</span>
                            <span className="text-slate-600 text-xs font-medium truncate">
                                <MathTextPreview text={guidedPayload?.learningObjective || currentTask.outputGoal || '暂无学习目标'} />
                            </span>
                        </div>
                    </div>
                </div>
                {/* Progress Dots */}
                <div className="flex gap-1.5 shrink-0 ml-4">
                    {plan.tasks.map((_, idx) => (
                        <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentTaskIndex ? 'bg-cyan-500 w-6' : idx < currentTaskIndex ? 'bg-cyan-200 w-2' : 'bg-slate-200 w-2'}`} />
                    ))}
                </div>
            </div>
        </div>

        {/* Workspace Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-slate-50/10 min-h-0 custom-scrollbar">
            {renderLeftWorkspace()}
        </div>

        {/* Fixed Bottom: hint text + 我卡住了 / 我做完了 */}
        <div className="bg-white border-t border-slate-200 p-4 shrink-0 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
                完成后请点击 <span className="font-bold text-green-700">&quot;我做完了&quot;</span> ，遇到困难请点击 <span className="font-bold text-amber-700">&quot;我卡住了&quot;</span>
            </p>
            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={handleStuck}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 transition-colors shadow-sm"
                >
                    <HelpCircle size={16} /> {t.stuck}
                </button>
                <button
                    onClick={handleDone}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 transition-colors shadow-sm"
                >
                    <CheckCircle size={16} /> {t.done}
                </button>
            </div>
        </div>
      </div>

      {/* LEFT RESIZER HANDLE */}
      <div
        className={`w-1.5 hover:w-2 bg-slate-200 hover:bg-cyan-400 cursor-col-resize transition-all z-30 flex items-center justify-center group shrink-0 relative ${isResizingLeft ? 'bg-cyan-500 w-2' : ''}`}
        onMouseDown={startResizingLeft}
      >
          <div className={`h-8 w-1 rounded-full transition-colors ${isResizingLeft ? 'bg-white' : 'bg-slate-300 group-hover:bg-white'}`} />
      </div>

      {/* MIDDLE COLUMN: AI TUTOR */}
      <div 
        style={{ width: `${middlePanelWidth}%` }}
        className="h-full flex flex-col bg-slate-50 relative shrink-0 min-h-0"
      >
        {(isResizingLeft || isResizingRight) && <div className="absolute inset-0 z-50 bg-transparent" />}

        {/* Header */}
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white/90 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <AnimatedAvatar state={avatarState} size={40} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse_2s_infinite]" />
                <span className="text-xs font-mono text-emerald-600 tracking-wider">导师在线</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {tutorName || t.aiSystem}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded uppercase bg-slate-100">
              {currentTask.tutorConfig.tone}
            </span>
          </div>
        </div>

        {/* TTS Global Toggle + Voice Selector */}
        {voiceServiceAvailable && (
          <div className="px-4 py-2 border-b border-slate-200 bg-white/95 backdrop-blur-sm shrink-0 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-slate-500">语音播报</span>
            <div className="flex items-center gap-2">
              <label htmlFor="tts-voice-select" className="sr-only">选择语音</label>
              <select
                id="tts-voice-select"
                value={selectedVoiceName}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedVoiceName(next);
                  if (typeof window !== 'undefined') localStorage.setItem('ttsVoiceName', next);
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-200 max-w-[180px]"
                title="选择朗读语音"
              >
                {!ttsVoicesLoaded ? (
                  <option value={selectedVoiceName}>加载中…</option>
                ) : ttsVoices.length === 0 ? (
                  <option value={selectedVoiceName}>暂无可用语音</option>
                ) : (
                  (() => {
                    const hasCurrent = ttsVoices.some((v) => v.name === selectedVoiceName);
                    const options = hasCurrent ? ttsVoices : [{ name: selectedVoiceName }, ...ttsVoices];
                    return options.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name.replace(/^cmn-CN-/, '')}{v.ssmlGender === 'FEMALE' ? ' (女)' : v.ssmlGender === 'MALE' ? ' (男)' : ''}
                      </option>
                    ));
                  })()
                )}
              </select>
              <button
                type="button"
                onClick={() => {
                  const next = !voiceEnabled;
                  setVoiceEnabled(next);
                  setAutoPlayVoice(next);
                  if (!next && isPlayingVoice) stopVoice();
                }}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  voiceEnabled
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-slate-300 text-slate-600'
                }`}
                title={voiceEnabled ? '关闭语音播报' : '开启语音播报'}
              >
                {voiceEnabled ? '已开启' : '已关闭'}
              </button>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar scroll-smooth min-h-0 bg-[#f7f7f7]"
        >
          {messages.map((msg, idx) => {
            const isCompletionMsg = msg.role === 'model' && isTaskCompletionMessage(msg.text);
            const hasStepPass = msg.role === 'model' && msg.text.includes('[STEP_PASS]');
            const isLastMessage = idx === messages.length - 1;

            // 引导流：当 AI 批准当前步骤时，显示"进入下一步"按钮
            const showGuidedAdvanceButton = hasStepPass && isLastMessage && isGuidedVideoFlow && !isTyping;
            // 剥离 [STEP_PASS] 标记，不展示给学生
            const displayText = msg.text.replace(/\s*\[STEP_PASS\]\s*/g, '').trim();
            
            return (
              <div key={idx} className="space-y-3">
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2 animate-fade-in-up`}>
                  {msg.role === 'model' && (
                    <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-600">
                      {(tutorName || t.aiSystem).slice(0, 1)}
                    </div>
                  )}
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-[#95ec69] text-slate-900 rounded-br-none' 
                      : 'bg-white text-slate-700 rounded-bl-none'
                  }`}>
                    <div className="opacity-60 text-[10px] uppercase font-bold tracking-wider mb-1">
                      {msg.role === 'user' ? studentName : (tutorName || t.aiSystem)}
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
                
                {/* 在完成消息下方显示"下一个任务"或"完成学习"按钮（非引导流） */}
                {isCompletionMsg && isLastMessage && !isGuidedVideoFlow && !isTyping && (
                  <div className="flex justify-start animate-fade-in-up ml-0">
                    {currentTaskIndex < plan.tasks.length - 1 ? (
                      <button 
                        onClick={handleNextTask}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
                      >
                        {t.next} <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button 
                        onClick={handleFinishLearning}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                      >
                        完成学习 <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                )}

                {/* 引导流：AI 批准步骤后显示"进入下一步"按钮 */}
                {showGuidedAdvanceButton && (
                  <div className="flex justify-start animate-fade-in-up ml-0">
                    <button 
                      onClick={handleGuidedAdvance}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                    >
                      {guidedStep < 5 ? '进入下一步' : currentTaskIndex < plan.tasks.length - 1 ? '进入下一个任务' : '完成学习'} <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {isTyping && (
             <div className="flex justify-start">
               <div className="bg-white px-4 py-2 rounded-full text-xs text-slate-500 flex items-center gap-2 border border-slate-200 shadow-sm">
                 <Loader2 size={12} className="animate-spin text-cyan-600"/> {t.aiProcessing}
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
                 placeholder={t.inputPlaceholder}
                 className="flex-1 bg-white border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#07c160] focus:ring-1 focus:ring-[#07c160]/20 transition-all resize-none h-10 text-slate-800 placeholder-slate-400"
               />
             ) : (
               <button
                 onPointerDown={(event) => {
                   event.preventDefault();
                   if (isProcessingSpeech || isTyping) return;
                   if (!isRecording) startRecording();
                 }}
                 onPointerUp={(event) => {
                   event.preventDefault();
                   if (isRecording) stopRecording();
                 }}
                 onPointerLeave={(event) => {
                   event.preventDefault();
                   if (isRecording) cancelRecording();
                 }}
                 onPointerCancel={(event) => {
                   event.preventDefault();
                   if (isRecording) cancelRecording();
                 }}
                 disabled={isProcessingSpeech || isTyping}
                 className={`flex-1 h-10 rounded-full border transition-all text-sm ${
                   isRecording
                     ? 'bg-red-500 border-red-500 text-white animate-pulse'
                     : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                 }`}
               >
                 {isRecording ? '松开发送' : '按住说话'}
               </button>
             )}
             <div className="flex items-center gap-2">
               {voiceServiceAvailable && (
                 <button
                   onClick={() => {
                     setInputMode(prev => (prev === 'text' ? 'voice' : 'text'));
                   }}
                   disabled={isProcessingSpeech || isTyping}
                   className="w-10 h-10 rounded-full border border-slate-300 bg-white text-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                   title={inputMode === 'text' ? '切换语音' : '切换键盘'}
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
                   发送
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
                   正在录音...
                 </span>
               )}
               {isProcessingSpeech && (
                 <span className="text-blue-600 flex items-center gap-1">
                   <Loader2 size={12} className="animate-spin" />
                   正在识别语音...
                 </span>
               )}
               {speechError && (
                 <span className="text-red-600 flex items-center gap-1">
                   <AlertCircle size={12} />
                   语音识别错误: {speechError}
                 </span>
               )}
             </div>
           )}
        </div>
      </div>

      {/* RIGHT RESIZER HANDLE */}
      <div
        className={`w-1.5 hover:w-2 bg-slate-200 hover:bg-cyan-400 cursor-col-resize transition-all z-30 flex items-center justify-center group shrink-0 relative ${isResizingRight ? 'bg-cyan-500 w-2' : ''}`}
        onMouseDown={startResizingRight}
      >
          <div className={`h-8 w-1 rounded-full transition-colors ${isResizingRight ? 'bg-white' : 'bg-slate-300 group-hover:bg-white'}`} />
      </div>

      {/* RIGHT COLUMN: REAL-TIME PROGRESS */}
      <div 
        style={{ width: `${100 - leftPanelWidth - middlePanelWidth}%` }}
        className="h-full flex flex-col bg-slate-50 relative shrink-0 border-l border-slate-200 min-h-0"
      >
        {/* AI动画头像 - 正方形框 */}
        <div className="p-4 border-b border-slate-200 bg-gradient-to-br from-white to-cyan-50/30 shrink-0">
          <div className="w-full aspect-square bg-white rounded-xl border-2 border-cyan-300 shadow-lg ring-2 ring-cyan-100 relative overflow-hidden">
            {/* 背景光晕效果 */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-200/20 to-blue-200/20"></div>
            {/* 头像 - 充满整个容器 */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <AnimatedAvatar state={avatarState} size={1000} className="w-full h-full" />
            </div>
          </div>
        </div>

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
        title="交互式实验室"
      >
        {assetData && (
          <div className="w-full h-full flex flex-col">
            <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-4 text-[10px] text-slate-500 shrink-0">
              {assetData.trim().startsWith('http') ? 
                 <span className="text-cyan-600 flex items-center gap-1"><Globe size={12}/> PhET 来源</span> : 
                 <span className="text-purple-600 flex items-center gap-1"><Brain size={12}/> AI 生成</span>
              }
            </div>
            <iframe 
              src={assetData.trim().startsWith('http') ? assetData : undefined}
              srcDoc={assetData.trim().startsWith('http') ? undefined : assetData}
              className="w-full flex-1 border-none"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms" 
              title="交互式模拟"
            />
          </div>
        )}
      </FullscreenModal>

      {/* Fullscreen Modal for Mindmap Editor */}
      <FullscreenModal
        isOpen={isFullscreenMindmap}
        onClose={() => setIsFullscreenMindmap(false)}
        title="思维导图编辑器"
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

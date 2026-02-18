/**
 * Types for self-learning-system backend API (course design flow).
 * Kept in sync with self-learning-system/types.ts.
 */

export type Language = 'en' | 'zh';

export interface TeacherInputData {
  subject: string;
  grade: string;
  topic: string;
  textbookVersion?: string;
  classPeriod?: string;
  additionalContext?: string;
}

export interface LearningGoal {
  id: string;
  text: string;
  level: 'retrieval' | 'comprehension' | 'analysis' | 'utilization';
}

export interface CurriculumDesign {
  coreLiteracies: string[];
  bigConcept: string;
  essentialQuestions: string[];
  learningGoals: LearningGoal[];
  logicChain: string;
}

export interface TaskDocuments {
  studentTaskSheet: string;
  teacherGuide: string;
}

export type ViewType =
  | 'image_gallery'
  | 'video_player'
  | 'mindmap_editor'
  | 'table_editor'
  | 'text_editor'
  | 'math_editor'
  | 'interactive_experiment';

export type AssetType =
  | 'image_gen'
  | 'video_gen'
  | 'mindmap_code'
  | 'table_json'
  | 'editable_text'
  | 'math_editable'
  | 'html_webpage';

export interface SystemTask {
  id: string;
  title: string;
  viewType: ViewType;
  assetType: AssetType;
  contentPayload?: string;
  generatedAssetContent?: string;
  externalResourceUrl?: string;
  assetPrompt: string;
  description: string;
  outputGoal: string;
  learningGoalId?: string;
  tutorConfig: {
    systemInstruction: string;
    tone: string;
  };
  evaluationCriteria: string;
}

export interface SystemTaskPlan {
  tasks: SystemTask[];
  learningGoals?: LearningGoal[];
  bigConcept?: string;
}

// --- Materials (teaching resources: video search, content, questions) ---
export interface VideoSearchItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  url: string;
}

export interface VideoContentResult {
  title: string;
  transcript?: string;
  summary?: string;
  /** 需用户手动粘贴视频要点时为 true */
  fallbackToManual?: boolean;
  source?: 'transcript' | 'description' | 'video_understanding' | 'manual';
}

export interface GeneratedQuestion {
  question: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation?: string;
}

/** Key idea for guided notes (fill-in-the-blank). */
export interface KeyIdea {
  text: string;
  blanks: string[];
}

// --- StudentConsole: Chat, Exit Ticket, Visualization ---
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  'image_gallery': 'AI 图像画廊',
  'video_player': 'AI 视频生成',
  'mindmap_editor': '思维导图编辑器',
  'table_editor': '交互式表格',
  'text_editor': '文本写作编辑器',
  'math_editor': '数学编辑器',
  'interactive_experiment': '互动实验',
};

export type VisualizationType = 'mindmap' | 'conceptmap' | 'knowledgegraph';
export type CreationMode = 'simple-input' | 'click-create' | 'drag-drop';

export interface VisualizationNode {
  id: string;
  label: string;
  type?: 'concept' | 'question' | 'confusion' | 'example';
  position?: { x: number; y: number };
  color?: string;
  size?: number;
}

export interface VisualizationEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'hierarchical' | 'related' | 'causes' | 'example';
}

export interface VisualizationData {
  type: VisualizationType;
  mode?: CreationMode;
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  metadata?: {
    centralConcept?: string;
    confusionPoints?: string[];
  };
}

export interface VisualizationProgress {
  totalNodes: number;
  totalEdges: number;
  confusionPoints: number;
  completionRate: number;
}

export interface ObjectiveMetrics {
  averageInputLength: number;
  totalInputs: number;
  shortInputs: number;
  longInputs: number;
  totalQuestions: number;
  stuckClicks: number;
  doneClicks: number;
  evaluateClicks: number;
  totalSessionTime: number;
  averageTimeBetweenActions: number;
  longGaps: number;
  shortGaps: number;
  totalEdits: number;
  mindMapEdits: number;
  tableEdits: number;
  textEdits: number;
  mathEdits: number;
  tasksCompleted: number;
  tasksSkipped: number;
  taskSwitchCount: number;
}

export interface SubDimension {
  name: string;
  score: number;
  comment: string;
}

export interface Characteristic {
  key: string;
  name: string;
  score: number;
  dimensions: SubDimension[];
}

export interface ExitTicketAnalysis {
  summary: string;
  nextSteps: string;
  overallScore: number;
  characteristics: Characteristic[];
}

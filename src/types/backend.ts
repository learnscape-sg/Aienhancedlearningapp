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

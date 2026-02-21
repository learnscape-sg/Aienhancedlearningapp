/**
 * 从 profiles.preferences 提取教师偏好，供任务设计页等使用。
 */
import type { ProfilePreferences } from '../types/preferences';

/** 年级选项（TeacherSettingsPage、TeachingResourcesPage、AICourseDesignPage 统一使用） */
export const GRADE_OPTIONS = [
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '初一', '初二', '初三', '高一', '高二', '高三',
] as const;

export interface TeacherPreferences {
  defaultGrade: string;
  defaultSubject: string;
  notifications: {
    studentJoinedClass: boolean;
    taskSubmission: boolean;
  };
}

export const defaultTeacherPreferences: TeacherPreferences = {
  defaultGrade: '',
  defaultSubject: '',
  notifications: {
    studentJoinedClass: true,
    taskSubmission: false,
  },
};

/** 旧格式（grade1–grade12）→ 显示名，用于兼容已保存的偏好 */
const OLD_GRADE_ID_TO_DISPLAY: Record<string, string> = {
  grade1: '一年级', grade2: '二年级', grade3: '三年级', grade4: '四年级',
  grade5: '五年级', grade6: '六年级',
  grade7: '初一', grade8: '初二', grade9: '初三',
  grade10: '高一', grade11: '高二', grade12: '高三',
};

/** TeacherSettingsPage 科目 ID → 显示名 */
const PREF_SUBJECT_ID_TO_DISPLAY: Record<string, string> = {
  math: '数学', chinese: '语文', english: '英语', physics: '物理',
  chemistry: '化学', biology: '生物', history: '历史', geography: '地理',
  other: '其他',
};

/** 将偏好中的科目 ID 转为任务/课程页可用的显示名 */
export function prefSubjectIdToDisplay(id: string | null | undefined): string {
  if (!id) return '';
  return PREF_SUBJECT_ID_TO_DISPLAY[id] ?? '';
}

/** 从 ProfilePreferences 提取教师相关字段（年级兼容旧格式 grade1–grade12） */
export function getTeacherPreferencesFromProfile(prefs: ProfilePreferences | null | undefined): TeacherPreferences {
  if (!prefs) return defaultTeacherPreferences;
  const rawGrade = prefs.defaultGrade ?? defaultTeacherPreferences.defaultGrade;
  const defaultGrade = rawGrade ? (OLD_GRADE_ID_TO_DISPLAY[rawGrade] ?? rawGrade) : '';
  return {
    defaultGrade,
    defaultSubject: prefs.defaultSubject ?? defaultTeacherPreferences.defaultSubject,
    notifications: {
      studentJoinedClass: prefs.notifications?.studentJoinedClass ?? defaultTeacherPreferences.notifications.studentJoinedClass,
      taskSubmission: prefs.notifications?.taskSubmission ?? defaultTeacherPreferences.notifications.taskSubmission,
    },
  };
}

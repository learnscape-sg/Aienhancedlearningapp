/**
 * 从 profiles.preferences 提取教师偏好，供任务设计页等使用。
 */
import type { ProfilePreferences } from '../types/preferences';

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

/** 从 ProfilePreferences 提取教师相关字段 */
export function getTeacherPreferencesFromProfile(prefs: ProfilePreferences | null | undefined): TeacherPreferences {
  if (!prefs) return defaultTeacherPreferences;
  return {
    defaultGrade: prefs.defaultGrade ?? defaultTeacherPreferences.defaultGrade,
    defaultSubject: prefs.defaultSubject ?? defaultTeacherPreferences.defaultSubject,
    notifications: {
      studentJoinedClass: prefs.notifications?.studentJoinedClass ?? defaultTeacherPreferences.notifications.studentJoinedClass,
      taskSubmission: prefs.notifications?.taskSubmission ?? defaultTeacherPreferences.notifications.taskSubmission,
    },
  };
}

export const BASE_SUBJECT_OPTIONS = [
  '语文',
  '数学',
  '英语',
  '物理',
  '化学',
  '生物',
  '历史',
  '地理',
  '政治',
] as const;

export const CUSTOM_SUBJECT_OPTION = '自定义';

export const SUBJECT_OPTIONS: string[] = [...BASE_SUBJECT_OPTIONS, CUSTOM_SUBJECT_OPTION];

export function resolveSubjectValue(subject: string, customSubject?: string): string {
  if (subject === CUSTOM_SUBJECT_OPTION && customSubject?.trim()) {
    return customSubject.trim();
  }
  return subject.trim();
}

export function splitSubjectValue(subject: string): {
  subject: string;
  subjectCustom?: string;
  subjectIsCustom: boolean;
} {
  const normalized = subject.trim();
  const isBuiltIn = BASE_SUBJECT_OPTIONS.includes(normalized as (typeof BASE_SUBJECT_OPTIONS)[number]);
  if (!normalized || isBuiltIn) {
    return { subject: normalized, subjectIsCustom: false };
  }
  return {
    subject: CUSTOM_SUBJECT_OPTION,
    subjectCustom: normalized,
    subjectIsCustom: true,
  };
}


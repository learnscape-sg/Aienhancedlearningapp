type FeatureKey =
  | 'enableParentWorkspace'
  | 'enableTeacherCourseShare'
  | 'enableLanguageSpaceSwitcher'
  | 'enableTenantScoping';

const DEFAULT_FLAGS: Record<FeatureKey, boolean> = {
  enableParentWorkspace: true,
  enableTeacherCourseShare: true,
  enableLanguageSpaceSwitcher: true,
  enableTenantScoping: true,
};

export function isFeatureEnabled(key: FeatureKey, overrides?: Partial<Record<FeatureKey, boolean>>): boolean {
  if (overrides && key in overrides) {
    return Boolean(overrides[key]);
  }
  return DEFAULT_FLAGS[key];
}

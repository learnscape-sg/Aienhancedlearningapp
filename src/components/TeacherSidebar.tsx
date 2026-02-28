import React from 'react';
import { useAuth } from './AuthContext';
import { ConfigurableSidebar } from './shared/ConfigurableSidebar';
import { getNavigationByRole, type NavigationPolicyConfig } from '@/config/navigationConfig';
import type { LanguageSpace } from '@/config/entryConfig';
import { resolveRuntimeExperienceConfig } from '@/lib/entryDetector';

interface TeacherSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  languageSpace: LanguageSpace;
  onLanguageSpaceChange: (space: LanguageSpace) => void;
  navPolicy?: NavigationPolicyConfig;
}

export function TeacherSidebar({
  activeSection,
  onSectionChange,
  languageSpace,
  onLanguageSpaceChange,
  navPolicy,
}: TeacherSidebarProps) {
  const { user, logout } = useAuth();
  const experience = resolveRuntimeExperienceConfig();

  return (
    <ConfigurableSidebar
      appName={experience.brand.labels.teacherWorkspaceName}
      subtitle={experience.brand.labels.appName}
      userName={user?.name || (languageSpace === 'zh' ? '教师' : 'Teacher')}
      userMeta={languageSpace === 'zh' ? '教师账户' : 'Teacher Account'}
      userFallback={user?.name?.charAt(0) || 'T'}
      activeSection={activeSection}
      navigationItems={getNavigationByRole('teacher', navPolicy)}
      languageSpace={languageSpace}
      onSectionChange={onSectionChange}
      onLanguageSpaceChange={onLanguageSpaceChange}
      onLogout={logout}
    />
  );
}

import React from 'react';
import { useAuth } from './AuthContext';
import { ConfigurableSidebar } from './shared/ConfigurableSidebar';
import { resolveRuntimeExperienceConfig } from '@/lib/entryDetector';
import { getNavigationByRole, type NavigationPolicyConfig } from '@/config/navigationConfig';
import type { LanguageSpace } from '@/config/entryConfig';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  languageSpace: LanguageSpace;
  onLanguageSpaceChange: (space: LanguageSpace) => void;
  navPolicy?: NavigationPolicyConfig;
}

export function Sidebar({ activeSection, onSectionChange, languageSpace, onLanguageSpaceChange, navPolicy }: SidebarProps) {
  const { user, logout } = useAuth();
  const experience = resolveRuntimeExperienceConfig();

  return (
    <ConfigurableSidebar
      appName={experience.brand.labels.appName}
      subtitle={experience.brand.labels.studentWorkspaceName}
      userName={user?.name || (languageSpace === 'zh' ? '用户' : 'User')}
      userMeta={user?.grade ? `${user.grade.replace('grade', '')}${languageSpace === 'zh' ? '年级' : ''}` : (languageSpace === 'zh' ? '学生' : 'Student')}
      userFallback={user?.name?.charAt(0) || 'U'}
      activeSection={activeSection}
      navigationItems={getNavigationByRole('student', navPolicy)}
      languageSpace={languageSpace}
      onSectionChange={onSectionChange}
      onLanguageSpaceChange={onLanguageSpaceChange}
      onLogout={logout}
    />
  );
}
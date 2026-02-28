import React from 'react';
import { useAuth } from './AuthContext';
import { ConfigurableSidebar } from './shared/ConfigurableSidebar';
import { getNavigationByRole, type NavigationPolicyConfig } from '@/config/navigationConfig';
import type { LanguageSpace } from '@/config/entryConfig';
import { resolveRuntimeExperienceConfig } from '@/lib/entryDetector';

interface ParentSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  languageSpace: LanguageSpace;
  onLanguageSpaceChange: (space: LanguageSpace) => void;
  navPolicy?: NavigationPolicyConfig;
}

export function ParentSidebar({
  activeSection,
  onSectionChange,
  languageSpace,
  onLanguageSpaceChange,
  navPolicy,
}: ParentSidebarProps) {
  const { user, logout } = useAuth();
  const experience = resolveRuntimeExperienceConfig();

  return (
    <ConfigurableSidebar
      appName={experience.brand.labels.parentWorkspaceName}
      subtitle={experience.brand.labels.appName}
      userName={user?.name || (languageSpace === 'zh' ? '家长' : 'Parent')}
      userMeta={languageSpace === 'zh' ? '家长账户' : 'Parent Account'}
      userFallback={user?.name?.charAt(0) || 'P'}
      activeSection={activeSection}
      navigationItems={getNavigationByRole('parent', navPolicy)}
      languageSpace={languageSpace}
      onSectionChange={onSectionChange}
      onLanguageSpaceChange={onLanguageSpaceChange}
      onLogout={logout}
    />
  );
}

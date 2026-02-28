import React from 'react';
import { BaseLayout } from './BaseLayout';

interface RoleBasedLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
}

export function RoleBasedLayout({ sidebar, content }: RoleBasedLayoutProps) {
  return <BaseLayout sidebar={sidebar}>{content}</BaseLayout>;
}

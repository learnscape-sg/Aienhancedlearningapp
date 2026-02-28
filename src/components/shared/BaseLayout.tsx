import React from 'react';

interface BaseLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function BaseLayout({ sidebar, children }: BaseLayoutProps) {
  return (
    <div className="flex h-screen bg-muted">
      {sidebar}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

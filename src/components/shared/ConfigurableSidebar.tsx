import React from 'react';
import { Globe, GraduationCap, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FontSizeSelector } from './FontSizeSelector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { NavigationItem } from '@/config/navigationConfig';
import type { LanguageSpace } from '@/config/entryConfig';

interface ConfigurableSidebarProps {
  appName: string;
  subtitle: string;
  userName: string;
  userMeta: string;
  userFallback: string;
  activeSection: string;
  navigationItems: NavigationItem[];
  languageSpace: LanguageSpace;
  onSectionChange: (section: string) => void;
  onLanguageSpaceChange: (space: LanguageSpace) => void;
  onLogout: () => Promise<void>;
}

export function ConfigurableSidebar({
  appName,
  subtitle,
  userName,
  userMeta,
  userFallback,
  activeSection,
  navigationItems,
  languageSpace,
  onSectionChange,
  onLanguageSpaceChange,
  onLogout,
}: ConfigurableSidebarProps) {
  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg text-sidebar-primary">{appName}</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                {userFallback}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">{userMeta}</p>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-3 w-full justify-between text-muted-foreground hover:text-sidebar-foreground"
          onClick={() => onLanguageSpaceChange(languageSpace === 'zh' ? 'en' : 'zh')}
          title={languageSpace === 'zh' ? 'Switch to English space' : '切换到中文空间'}
        >
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {languageSpace === 'zh' ? '中文空间' : 'English Space'}
          </span>
          <span>{languageSpace === 'zh' ? 'EN' : '中'}</span>
        </Button>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">{languageSpace === 'zh' ? '字体' : 'Font'}</span>
          <FontSizeSelector />
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${
                isActive
                  ? 'bg-sidebar-primary/10 text-sidebar-primary hover:bg-sidebar-primary/20'
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
              onClick={() => onSectionChange(item.id)}
            >
              <Icon className="w-5 h-5 mr-3" />
              {languageSpace === 'zh' ? item.nameZh : item.nameEn}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          {languageSpace === 'zh' ? '退出登录' : 'Sign out'}
        </Button>
      </div>
    </div>
  );
}

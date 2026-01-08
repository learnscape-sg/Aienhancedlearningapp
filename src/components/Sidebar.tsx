import React from 'react';
import { 
  Home, 
  BookOpen, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  User, 
  LogOut,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from './AuthContext';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navigationItems = [
  { id: 'home', name: '学习任务', icon: Home },
  { id: 'learn-your-way', name: 'AI随心学', icon: Sparkles },
  { id: 'paths', name: '推荐路径', icon: TrendingUp },
  { id: 'reports', name: '学习报告', icon: BarChart3 },
  { id: 'settings', name: '设置', icon: Settings },
];

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg text-sidebar-primary">AI随心学</h1>
            <p className="text-xs text-muted-foreground">AI智能自学平台</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src="" />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
              {user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || '用户'}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.grade ? `${user.grade.replace('grade', '')}年级` : '学生'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                isActive 
                  ? 'bg-sidebar-primary/10 text-sidebar-primary hover:bg-sidebar-primary/20' 
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
              onClick={() => onSectionChange(item.id)}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={logout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          退出登录
        </Button>
      </div>
    </div>
  );
}
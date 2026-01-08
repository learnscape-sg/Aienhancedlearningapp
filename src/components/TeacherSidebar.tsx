import React from 'react';
import { 
  LayoutDashboard,
  BookOpen, 
  Users, 
  FileText,
  Settings, 
  LogOut,
  GraduationCap,
  PlusCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from './AuthContext';

interface TeacherSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navigationItems = [
  { id: 'overview', name: '概览', icon: LayoutDashboard },
  { id: 'course-design', name: '课程设计', icon: PlusCircle },
  { id: 'courses', name: '课程管理', icon: BookOpen },
  { id: 'classes', name: '班级管理', icon: Users },
  { id: 'materials', name: '教学资源', icon: FileText },
  { id: 'settings', name: '设置', icon: Settings },
];

export function TeacherSidebar({ activeSection, onSectionChange }: TeacherSidebarProps) {
  const { user, logout } = useAuth();

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg text-blue-600 font-semibold">教师平台</h1>
            <p className="text-xs text-muted-foreground">AI随心学</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src="" />
            <AvatarFallback className="bg-blue-600 text-white">
              {user?.name?.charAt(0) || 'T'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || '教师'}
            </p>
            <p className="text-xs text-muted-foreground">
              教师账户
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
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
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

import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Home, 
  BookOpen, 
  TrendingUp, 
  FileText, 
  Settings, 
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from './AuthContext';

interface TopNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function TopNavigation({ activeSection, onSectionChange }: TopNavigationProps) {
  const { user, logout } = useAuth();

  const navigationItems = [
    {
      id: 'home',
      label: '学习进度',
      icon: Home,
    },
    {
      id: 'paths',
      label: '推荐路径',
      icon: TrendingUp,
    },
    {
      id: 'learn-your-way',
      label: '随心学',
      icon: BookOpen,
    },
    {
      id: 'reports',
      label: '学习报告',
      icon: FileText,
    },
    {
      id: 'settings',
      label: '设置',
      icon: Settings,
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <div className="text-xl font-medium text-[#1A73E8]">
              Capybara AI
            </div>
            
            {/* Navigation Items */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[#1A73E8] bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right side - User info and logout */}
          <div className="flex items-center space-x-4">
            {/* User info */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#1A73E8] rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user?.name || '学生'}</p>
                  <p className="text-gray-500">{user?.grade || '未设置年级'}</p>
                </div>
              </div>
              
              {/* Interests badges */}
              {user?.interests && user.interests.length > 0 && (
                <div className="hidden lg:flex items-center space-x-1">
                  {user.interests.slice(0, 2).map((interest, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                  {user.interests.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{user.interests.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Logout button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">退出</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between space-x-4 overflow-x-auto">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-md text-xs font-medium transition-colors min-w-max ${
                    isActive
                      ? 'text-[#1A73E8] bg-blue-50'
                      : 'text-gray-600'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
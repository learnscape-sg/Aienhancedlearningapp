import {
  Home,
  Sparkles,
  TrendingUp,
  BarChart3,
  Settings,
  LayoutDashboard,
  FileText,
  PlusCircle,
  BookOpen,
  Users,
  HeartHandshake,
  UserRound,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { UserRole } from '@/types/experience';

export interface NavigationItem {
  id: string;
  nameZh: string;
  nameEn: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavigationPolicyConfig {
  hiddenSectionsByRole?: Record<string, string[]>;
  sectionOrderByRole?: Record<string, string[]>;
  labelOverrides?: Record<string, { zh?: string; en?: string }>;
}

const studentNavigation: NavigationItem[] = [
  { id: 'home', nameZh: '学习任务', nameEn: 'Tasks', icon: Home },
  { id: 'learn-your-way', nameZh: 'AI随心学', nameEn: 'LearnYourWay', icon: Sparkles },
  { id: 'paths', nameZh: '推荐路径', nameEn: 'Recommended Paths', icon: TrendingUp },
  { id: 'reports', nameZh: '学习报告', nameEn: 'Reports', icon: BarChart3 },
  { id: 'settings', nameZh: '设置', nameEn: 'Settings', icon: Settings },
];

const teacherNavigation: NavigationItem[] = [
  { id: 'overview', nameZh: '概览', nameEn: 'Overview', icon: LayoutDashboard },
  { id: 'materials', nameZh: '任务设计', nameEn: 'Task Design', icon: FileText },
  { id: 'course-design', nameZh: '课程设计', nameEn: 'Course Design', icon: PlusCircle },
  { id: 'courses', nameZh: '课程管理', nameEn: 'Courses', icon: BookOpen },
  { id: 'classes', nameZh: '班级管理', nameEn: 'Classes', icon: Users },
  { id: 'settings', nameZh: '设置', nameEn: 'Settings', icon: Settings },
];

const parentNavigation: NavigationItem[] = [
  { id: 'overview', nameZh: '孩子概览', nameEn: 'Child Overview', icon: UserRound },
  { id: 'progress', nameZh: '学习进度', nameEn: 'Progress', icon: BarChart3 },
  { id: 'rewards', nameZh: '积分奖励', nameEn: 'Rewards', icon: HeartHandshake },
  { id: 'settings', nameZh: '设置', nameEn: 'Settings', icon: Settings },
];

function roleBaseNavigation(role: UserRole): NavigationItem[] {
  if (role === 'teacher') return teacherNavigation;
  if (role === 'parent') return parentNavigation;
  return studentNavigation;
}

export function getNavigationByRole(role: UserRole, policy?: NavigationPolicyConfig): NavigationItem[] {
  let items = [...roleBaseNavigation(role)];
  const hidden = policy?.hiddenSectionsByRole?.[role] ?? [];
  if (hidden.length > 0) {
    const hiddenSet = new Set(hidden);
    items = items.filter((item) => !hiddenSet.has(item.id));
  }

  const sectionOrder = policy?.sectionOrderByRole?.[role] ?? [];
  if (sectionOrder.length > 0) {
    const indexMap = new Map(sectionOrder.map((id, index) => [id, index]));
    items.sort((a, b) => {
      const ai = indexMap.has(a.id) ? (indexMap.get(a.id) as number) : 1_000;
      const bi = indexMap.has(b.id) ? (indexMap.get(b.id) as number) : 1_000;
      return ai - bi;
    });
  }

  const labelOverrides = policy?.labelOverrides ?? {};
  items = items.map((item) => {
    const override = labelOverrides[item.id];
    if (!override) return item;
    return {
      ...item,
      nameZh: override.zh ?? item.nameZh,
      nameEn: override.en ?? item.nameEn,
    };
  });

  return items;
}

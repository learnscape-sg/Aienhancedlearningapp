import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BookOpen, Users, FileText, TrendingUp, Clock, Award } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getTeacherStats, listTeacherCoursesWithStats, getTeacherActivities, type TeacherActivity } from '@/lib/backendApi';

const ACTION_LABELS: Record<string, string> = {
  course_created: '课程创建',
  course_published: '新课程发布',
  course_assigned: '课程分配',
  class_created: '班级创建',
  student_completed: '学生完成课程',
};

function formatRelativeTime(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 2) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  return d.toLocaleDateString();
}

export function TeacherOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ totalCourses: number; assignedCount?: number; publishedCount: number; totalStudents: number; avgCompletion: number } | null>(null);
  const [topCourses, setTopCourses] = useState<{ name: string; students: number; completion: number }[]>([]);
  const [recentActivities, setRecentActivities] = useState<TeacherActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || user.role !== 'teacher') {
      setLoading(false);
      return;
    }
    Promise.all([
      getTeacherStats(user.id),
      listTeacherCoursesWithStats(user.id),
      getTeacherActivities(user.id, 8),
    ])
      .then(([statsData, coursesData, activitiesData]) => {
        setStats(statsData);
        const courses = coursesData.courses
          .filter((c) => c.assignmentStatus === 'assigned' || c.status === 'published')
          .sort((a, b) => b.students - a.students)
          .slice(0, 4)
          .map((c) => ({ name: c.title, students: c.students, completion: c.completion }));
        setTopCourses(courses);
        setRecentActivities(activitiesData.activities);
      })
      .catch((err) => console.error('[TeacherOverview] Failed to load:', err))
      .finally(() => setLoading(false));
  }, [user?.id, user?.role]);

  const statsDisplay = stats
    ? [
        { title: '已分配课程', value: String(stats.assignedCount ?? stats.publishedCount), icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { title: '活跃学生', value: String(stats.totalStudents), icon: Users, color: 'text-green-600', bgColor: 'bg-green-50' },
        { title: '任务设计', value: String(stats.totalCourses), icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50' },
        { title: '平均完成率', value: `${stats.avgCompletion}%`, icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-50' },
      ]
    : [
        { title: '已分配课程', value: '—', icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { title: '活跃学生', value: '—', icon: Users, color: 'text-green-600', bgColor: 'bg-green-50' },
        { title: '任务设计', value: '—', icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50' },
        { title: '平均完成率', value: '—', icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-50' },
      ];

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">教师工作台</h1>
        <p className="text-muted-foreground mt-2">欢迎回来！这里是您的教学概览</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsDisplay.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{loading ? '…' : stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              最近活动
            </CardTitle>
            <CardDescription>您的最新教学动态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">加载中…</p>
              ) : recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无活动记录</p>
              ) : (
                recentActivities.map((activity, index) => (
                  <div key={`${activity.occurred_at}-${index}`} className="flex items-start space-x-3 pb-4 border-b last:border-0">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ACTION_LABELS[activity.action_type] ?? activity.action_type}</p>
                      <p className="text-sm text-muted-foreground">{activity.target_title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(activity.occurred_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2" />
              热门课程
            </CardTitle>
            <CardDescription>学生参与度最高的课程</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(topCourses.length > 0 ? topCourses : [
                { name: '暂无数据', students: 0, completion: 0 },
              ]).map((course, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{course.name}</p>
                    <span className="text-xs text-muted-foreground">{course.students}人</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${course.completion}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium">{course.completion}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BookOpen, Users, FileText, TrendingUp, Clock, Award } from 'lucide-react';
import { Button } from './ui/button';

export function TeacherOverview() {
  const stats = [
    { 
      title: '已发布课程', 
      value: '12', 
      icon: BookOpen, 
      trend: '+2 本月',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      title: '活跃学生', 
      value: '248', 
      icon: Users, 
      trend: '+15 本周',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      title: '教学资源', 
      value: '86', 
      icon: FileText, 
      trend: '+8 本月',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      title: '平均完成率', 
      value: '87%', 
      icon: TrendingUp, 
      trend: '+5% 本月',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
  ];

  const recentActivities = [
    { action: '新课程发布', course: '高中物理 - 牛顿定律', time: '2小时前' },
    { action: '学生完成课程', course: '初中数学 - 代数基础', time: '4小时前' },
    { action: '资源上传', course: 'PDF: 光学实验指南', time: '昨天' },
    { action: '班级创建', course: '高一3班', time: '2天前' },
  ];

  const topCourses = [
    { name: '高中物理 - 力学', students: 45, completion: 92 },
    { name: '初中数学 - 几何', students: 38, completion: 88 },
    { name: '高中化学 - 有机化学', students: 32, completion: 85 },
    { name: '初中生物 - 细胞结构', students: 28, completion: 90 },
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
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    <p className="text-xs text-green-600 mt-1">{stat.trend}</p>
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
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 pb-4 border-b last:border-0">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.course}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
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
              {topCourses.map((course, index) => (
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>常用功能快速入口</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-auto py-4 flex-col space-y-2" variant="outline">
              <BookOpen className="w-6 h-6" />
              <span>创建新课程</span>
            </Button>
            <Button className="h-auto py-4 flex-col space-y-2" variant="outline">
              <Users className="w-6 h-6" />
              <span>添加班级</span>
            </Button>
            <Button className="h-auto py-4 flex-col space-y-2" variant="outline">
              <FileText className="w-6 h-6" />
              <span>上传资源</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

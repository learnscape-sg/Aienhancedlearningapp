import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BookOpen, Users, TrendingUp, MoreVertical, Search, Edit, Trash2, Eye, Copy } from 'lucide-react';
import { Badge } from './ui/badge';

interface Course {
  id: string;
  title: string;
  subject: string;
  grade: string;
  students: number;
  completion: number;
  status: 'published' | 'draft';
  lastUpdated: string;
}

export function CourseManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const courses: Course[] = [
    {
      id: '1',
      title: '高中物理 - 牛顿定律',
      subject: '物理',
      grade: '高一',
      students: 45,
      completion: 92,
      status: 'published',
      lastUpdated: '2天前'
    },
    {
      id: '2',
      title: '初中数学 - 几何基础',
      subject: '数学',
      grade: '初二',
      students: 38,
      completion: 88,
      status: 'published',
      lastUpdated: '5天前'
    },
    {
      id: '3',
      title: '高中化学 - 有机化学入门',
      subject: '化学',
      grade: '高二',
      students: 32,
      completion: 85,
      status: 'published',
      lastUpdated: '1周前'
    },
    {
      id: '4',
      title: '初中生物 - 细胞结构',
      subject: '生物',
      grade: '初一',
      students: 28,
      completion: 90,
      status: 'published',
      lastUpdated: '3天前'
    },
    {
      id: '5',
      title: '高中物理 - 电磁学',
      subject: '物理',
      grade: '高二',
      students: 0,
      completion: 0,
      status: 'draft',
      lastUpdated: '今天'
    },
  ];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'published' && course.status === 'published') ||
                         (selectedFilter === 'draft' && course.status === 'draft');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">课程管理</h1>
        <p className="text-muted-foreground mt-2">管理您已发布和草稿状态的课程</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总课程数</p>
                <p className="text-2xl font-bold">{courses.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已发布</p>
                <p className="text-2xl font-bold">{courses.filter(c => c.status === 'published').length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总学生数</p>
                <p className="text-2xl font-bold">{courses.reduce((sum, c) => sum + c.students, 0)}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均完成率</p>
                <p className="text-2xl font-bold">
                  {Math.round(courses.filter(c => c.status === 'published').reduce((sum, c) => sum + c.completion, 0) / courses.filter(c => c.status === 'published').length)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div className="flex space-x-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
              >
                全部
              </Button>
              <Button
                variant={selectedFilter === 'published' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('published')}
              >
                已发布
              </Button>
              <Button
                variant={selectedFilter === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('draft')}
              >
                草稿
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索课程..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full md:w-64"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle>课程列表</CardTitle>
          <CardDescription>点击课程查看详情或进行编辑</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{course.title}</h3>
                      <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                        {course.status === 'published' ? '已发布' : '草稿'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <span>{course.subject} • {course.grade}</span>
                      <span>•</span>
                      <span>{course.students} 名学生</span>
                      {course.status === 'published' && (
                        <>
                          <span>•</span>
                          <span>完成率 {course.completion}%</span>
                        </>
                      )}
                      <span>•</span>
                      <span>更新于 {course.lastUpdated}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    查看
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="w-4 h-4 mr-1" />
                    复制
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

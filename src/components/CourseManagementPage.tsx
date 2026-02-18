import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BookOpen, Users, TrendingUp, MoreVertical, Search, Edit, Trash2, Eye, UserPlus, X, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { usePublishedCourses } from './PublishedCoursesContext';
import { assignCourseToClasses } from '@/lib/backendApi';

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

interface Class {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
}

export function CourseManagementPage() {
  const { publishedCourses } = usePublishedCourses();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Mock class data - in real app, this would come from a context or API
  const classes: Class[] = [
    { id: '1', name: '高一3班', grade: '高一', studentCount: 42 },
    { id: '2', name: '高二1班', grade: '高二', studentCount: 38 },
    { id: '3', name: '高一5班', grade: '高一', studentCount: 40 },
    { id: '4', name: '初三2班', grade: '初三', studentCount: 35 },
    { id: '5', name: '高二3班', grade: '高二', studentCount: 36 },
  ];

  const handleAssignClick = (course: Course) => {
    setSelectedCourse(course);
    setSelectedClasses([]);
    setAssignDialogOpen(true);
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleConfirmAssign = async () => {
    if (!selectedCourse || selectedClasses.length === 0) return;
    setAssigning(true);
    try {
      await assignCourseToClasses(selectedCourse.id, selectedClasses);
      const classNames = classes
        .filter(c => selectedClasses.includes(c.id))
        .map(c => c.name)
        .join('、');
      alert(`成功将课程"${selectedCourse.title}"分配给：${classNames}`);
      setAssignDialogOpen(false);
      setSelectedCourse(null);
      setSelectedClasses([]);
    } catch (err) {
      console.error('Assign failed:', err);
      alert(err instanceof Error ? err.message : '分配失败，请重试');
    } finally {
      setAssigning(false);
    }
  };

  const filteredCourses = publishedCourses.filter(course => {
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
                <p className="text-2xl font-bold">{publishedCourses.length}</p>
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
                <p className="text-2xl font-bold">{publishedCourses.filter(c => c.status === 'published').length}</p>
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
                <p className="text-2xl font-bold">{publishedCourses.reduce((sum, c) => sum + c.students, 0)}</p>
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
                  {Math.round(publishedCourses.filter(c => c.status === 'published').reduce((sum, c) => sum + c.completion, 0) / publishedCourses.filter(c => c.status === 'published').length)}%
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
                  <Button variant="ghost" size="sm" onClick={() => handleAssignClick(course)}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    分配
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

      {/* Assign Dialog */}
      {assignDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-[500px] max-h-[80vh] flex flex-col overflow-hidden">
            <CardHeader className="border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>分配课程自学任务</CardTitle>
                  <CardDescription className="mt-1">
                    课程：{selectedCourse?.title}
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setAssignDialogOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-4">
                选择要分配此课程的班级（可多选）
              </p>
              <div className="space-y-2">
                {classes.map(c => (
                  <div 
                    key={c.id} 
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedClasses.includes(c.id) ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                    onClick={() => handleClassToggle(c.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(c.id)}
                      onChange={() => handleClassToggle(c.id)}
                      className="mr-3 w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{c.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {c.grade}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {c.studentCount} 名学生
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedClasses.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    已选择 <span className="font-semibold">{selectedClasses.length}</span> 个班级，
                    共 <span className="font-semibold">
                      {classes.filter(c => selectedClasses.includes(c.id)).reduce((sum, c) => sum + c.studentCount, 0)}
                    </span> 名学生
                  </p>
                </div>
              )}
            </CardContent>
            <div className="border-t p-4 flex justify-end space-x-3 bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmAssign}
                disabled={selectedClasses.length === 0 || assigning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {assigning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                确认分配
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
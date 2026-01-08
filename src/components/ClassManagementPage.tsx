import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Users, UserPlus, Search, MoreVertical, Mail, TrendingUp, Award } from 'lucide-react';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface Class {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
  courses: number;
  avgProgress: number;
  createdAt: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  progress: number;
  coursesCompleted: number;
  lastActive: string;
}

export function ClassManagementPage() {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const classes: Class[] = [
    {
      id: '1',
      name: '高一3班',
      grade: '高一',
      studentCount: 42,
      courses: 5,
      avgProgress: 78,
      createdAt: '2023-09-01'
    },
    {
      id: '2',
      name: '高二1班',
      grade: '高二',
      studentCount: 38,
      courses: 6,
      avgProgress: 85,
      createdAt: '2023-09-01'
    },
    {
      id: '3',
      name: '初二4班',
      grade: '初二',
      studentCount: 45,
      courses: 4,
      avgProgress: 72,
      createdAt: '2023-09-01'
    },
  ];

  const students: Student[] = [
    {
      id: '1',
      name: '张三',
      email: 'zhangsan@example.com',
      progress: 92,
      coursesCompleted: 4,
      lastActive: '2小时前'
    },
    {
      id: '2',
      name: '李四',
      email: 'lisi@example.com',
      progress: 85,
      coursesCompleted: 3,
      lastActive: '5小时前'
    },
    {
      id: '3',
      name: '王五',
      email: 'wangwu@example.com',
      progress: 78,
      coursesCompleted: 3,
      lastActive: '1天前'
    },
    {
      id: '4',
      name: '赵六',
      email: 'zhaoliu@example.com',
      progress: 65,
      coursesCompleted: 2,
      lastActive: '2天前'
    },
  ];

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">班级管理</h1>
        <p className="text-muted-foreground mt-2">管理您的班级和学生</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">班级总数</p>
                <p className="text-2xl font-bold">{classes.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">学生总数</p>
                <p className="text-2xl font-bold">{classes.reduce((sum, c) => sum + c.studentCount, 0)}</p>
              </div>
              <UserPlus className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均进度</p>
                <p className="text-2xl font-bold">
                  {Math.round(classes.reduce((sum, c) => sum + c.avgProgress, 0) / classes.length)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">活跃学生</p>
                <p className="text-2xl font-bold">248</p>
              </div>
              <Award className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>班级列表</CardTitle>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-1" />
                新建
              </Button>
            </div>
            <CardDescription>选择一个班级查看详情</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  onClick={() => setSelectedClass(classItem.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedClass === classItem.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{classItem.name}</h3>
                    <Badge variant="secondary">{classItem.grade}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{classItem.studentCount} 名学生</span>
                    <span>{classItem.courses} 门课程</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">班级平均进度</span>
                      <span className="font-medium">{classItem.avgProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${classItem.avgProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>学生列表</CardTitle>
                <CardDescription>
                  {selectedClass ? `${classes.find(c => c.id === selectedClass)?.name} 的学生` : '选择班级查看学生'}
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-1" />
                  批量邀请
                </Button>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-1" />
                  添加学生
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索学生姓名或邮箱..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Students Table */}
            {selectedClass ? (
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-blue-600 text-white">
                          {student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">{student.name}</h4>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-sm font-medium">学习进度 {student.progress}%</span>
                        <div className="w-32 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${student.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="hidden md:block text-sm text-muted-foreground">
                        完成 {student.coursesCompleted} 门课程
                      </div>
                      <div className="hidden md:block text-sm text-muted-foreground">
                        {student.lastActive}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>请从左侧选择一个班级查看学生列表</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

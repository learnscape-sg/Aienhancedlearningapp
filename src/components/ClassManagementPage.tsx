import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Users, UserPlus, Search, MoreVertical, Loader2, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useAuth } from './AuthContext';
import {
  listTeacherClasses,
  createClass,
  getClass,
  addStudentToClassByEmail,
  removeStudentFromClass,
  deleteClass,
  type ClassItem,
} from '@/lib/backendApi';

interface ClassWithCount extends ClassItem {
  studentCount: number;
}

interface Student {
  id: string;
  name?: string;
  email?: string;
}

export function ClassManagementPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classDetail, setClassDetail] = useState<{
    id: string;
    name: string;
    grade?: string;
    students: Student[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [newClassOpen, setNewClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addStudentEmail, setAddStudentEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState('');

  const loadClasses = async () => {
    if (!user?.id) return;
    setClassesLoading(true);
    try {
      const res = await listTeacherClasses(user.id);
      setClasses(
        (res.classes ?? []).map((c) => ({
          ...c,
          studentCount: c.studentCount ?? 0,
        }))
      );
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setClassesLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [user?.id]);

  useEffect(() => {
    if (selectedClassId && user?.id) {
      setDetailLoading(true);
      getClass(selectedClassId)
        .then((res) =>
          setClassDetail({
            id: res.id,
            name: res.name,
            grade: res.grade,
            students: res.students ?? [],
          })
        )
        .catch((err) => {
          console.error('Failed to load class:', err);
          setClassDetail(null);
        })
        .finally(() => setDetailLoading(false));
    } else {
      setClassDetail(null);
    }
  }, [selectedClassId]);

  const handleCreateClass = async () => {
    if (!user?.id || !newClassName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await createClass(user.id, newClassName.trim(), newClassGrade.trim() || undefined);
      setNewClassOpen(false);
      setNewClassName('');
      setNewClassGrade('');
      loadClasses();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedClassId || !addStudentEmail.trim()) return;
    setAddingStudent(true);
    setAddStudentError('');
    try {
      await addStudentToClassByEmail(selectedClassId, addStudentEmail.trim());
      setAddStudentOpen(false);
      setAddStudentEmail('');
      if (selectedClassId) {
        const res = await getClass(selectedClassId);
        setClassDetail({
          id: res.id,
          name: res.name,
          grade: res.grade,
          students: res.students ?? [],
        });
      }
      loadClasses();
    } catch (err) {
      setAddStudentError(
        err instanceof Error ? err.message : '添加失败，请确认学生已注册为学生账号'
      );
    } finally {
      setAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClassId) return;
    if (!window.confirm('确定移出该学生？')) return;
    try {
      await removeStudentFromClass(selectedClassId, studentId);
      if (classDetail) {
        setClassDetail({
          ...classDetail,
          students: classDetail.students.filter((s) => s.id !== studentId),
        });
      }
      loadClasses();
    } catch (err) {
      console.error('Failed to remove student:', err);
      alert(err instanceof Error ? err.message : '移出失败');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!window.confirm('确定删除该班级？此操作不可恢复。')) return;
    try {
      await deleteClass(classId);
      if (selectedClassId === classId) {
        setSelectedClassId(null);
        setClassDetail(null);
      }
      loadClasses();
    } catch (err) {
      console.error('Failed to delete class:', err);
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const filteredStudents = (classDetail?.students ?? []).filter(
    (s) =>
      (s.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">班级管理</h1>
        <p className="text-muted-foreground mt-2">管理您的班级和学生</p>
      </div>

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
                <p className="text-2xl font-bold">
                  {classes.reduce((sum, c) => sum + (c.studentCount ?? 0), 0)}
                </p>
              </div>
              <UserPlus className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>班级列表</CardTitle>
              <Button size="sm" onClick={() => setNewClassOpen(true)}>
                <UserPlus className="w-4 h-4 mr-1" />
                新建
              </Button>
            </div>
            <CardDescription>选择一个班级查看详情</CardDescription>
          </CardHeader>
          <CardContent>
            {classesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : classes.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">暂无班级，点击新建创建</p>
            ) : (
              <div className="space-y-2">
                {classes.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClassId(c.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors flex justify-between items-center ${
                      selectedClassId === c.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{c.name}</h3>
                        {c.grade && <Badge variant="secondary">{c.grade}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(c.studentCount ?? 0)} 名学生
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(c.id);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>学生列表</CardTitle>
                <CardDescription>
                  {selectedClass ? `${selectedClass.name} 的学生` : '选择班级查看学生'}
                </CardDescription>
              </div>
              {selectedClassId && (
                <Button size="sm" onClick={() => setAddStudentOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-1" />
                  添加学生
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedClassId ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>请从左侧选择一个班级查看学生列表</p>
              </div>
            ) : detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索学生姓名或邮箱..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredStudents.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-center">暂无学生，点击添加学生通过邮箱邀请</p>
                  ) : (
                    filteredStudents.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback className="bg-blue-600 text-white">
                              {(s.name ?? s.email ?? '?').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{s.name || '未设置姓名'}</h4>
                            <p className="text-sm text-muted-foreground">{s.email || s.id}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleRemoveStudent(s.id)}
                        >
                          移出
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Class Dialog */}
      <Dialog open={newClassOpen} onOpenChange={setNewClassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建班级</DialogTitle>
            <DialogDescription>输入班级名称和年级</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">班级名称</Label>
              <Input
                id="class-name"
                placeholder="如：高一3班"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-grade">年级（选填）</Label>
              <Input
                id="class-grade"
                placeholder="如：高一"
                value={newClassGrade}
                onChange={(e) => setNewClassGrade(e.target.value)}
              />
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewClassOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateClass} disabled={!newClassName.trim() || creating}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加学生</DialogTitle>
            <DialogDescription>
              输入学生注册时使用的邮箱，系统将查找该学生并加入班级
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="student-email">学生邮箱</Label>
              <Input
                id="student-email"
                type="email"
                placeholder="student@example.com"
                value={addStudentEmail}
                onChange={(e) => setAddStudentEmail(e.target.value)}
              />
            </div>
            {addStudentError && (
              <p className="text-sm text-destructive">{addStudentError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStudentOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddStudent} disabled={!addStudentEmail.trim() || addingStudent}>
              {addingStudent && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

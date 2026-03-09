import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

function parseNameIdentifierLines(text: string): Array<{ name: string; identifier: string }> {
  return text
    .split(/\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const sep = trimmed.match(/[,\t]/);
      if (!sep) return null;
      const idx = trimmed.indexOf(sep[0]);
      const name = trimmed.slice(0, idx).trim();
      const identifier = trimmed.slice(idx + 1).trim();
      if (!identifier) return null;
      return { name, identifier };
    })
    .filter((e): e is { name: string; identifier: string } => e != null);
}
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
import { Users, UserPlus, Search, MoreVertical, Loader2, X, UsersRound } from 'lucide-react';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useAuth } from './AuthContext';
import {
  listTeacherClasses,
  addExistingClassForTeacher,
  createClass,
  getClass,
  searchStudents,
  addStudentToClass,
  teacherBatchCreateStudents,
  removeStudentFromClass,
  deleteClass,
  listClassGroups,
  createClassGroup,
  updateClassGroup,
  deleteClassGroup,
  addStudentsToGroup,
  removeStudentFromGroup,
  getGroupStudents,
  type ClassItem,
  type ClassGroup,
} from '@/lib/backendApi';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

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
  const [tenantClasses, setTenantClasses] = useState<ClassWithCount[]>([]);
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
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [existingGrade, setExistingGrade] = useState('');
  const [existingClassId, setExistingClassId] = useState('');
  const [addingExisting, setAddingExisting] = useState(false);
  const [addExistingError, setAddExistingError] = useState('');

  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addStudentSearchQuery, setAddStudentSearchQuery] = useState('');
  const [addStudentSearchResults, setAddStudentSearchResults] = useState<Student[]>([]);
  const [addStudentSearching, setAddStudentSearching] = useState(false);
  const [addStudentSelected, setAddStudentSelected] = useState<Student | null>(null);
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState('');
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('');
  const [bulkIdentifiersInput, setBulkIdentifiersInput] = useState('');
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkCreateError, setBulkCreateError] = useState('');
  type BulkCreateResult = Awaited<ReturnType<typeof teacherBatchCreateStudents>>;
  const [bulkCreateResult, setBulkCreateResult] = useState<BulkCreateResult | null>(null);

  const [detailTab, setDetailTab] = useState<'students' | 'groups'>('students');
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupStudents, setGroupStudents] = useState<Record<string, Student[]>>({});
  const [addToGroupOpen, setAddToGroupOpen] = useState(false);
  const [addToGroupId, setAddToGroupId] = useState<string | null>(null);
  const [selectedStudentsForGroup, setSelectedStudentsForGroup] = useState<string[]>([]);
  const [addingToGroup, setAddingToGroup] = useState(false);

  const loadClasses = async () => {
    if (!user?.id) return;
    setClassesLoading(true);
    try {
      const [managedRes, tenantRes] = await Promise.all([
        listTeacherClasses(user.id),
        listTeacherClasses(user.id, { scope: 'tenant' }),
      ]);
      setClasses(
        (managedRes.classes ?? []).map((c) => ({
          ...c,
          studentCount: c.studentCount ?? 0,
        }))
      );
      setTenantClasses(
        (tenantRes.classes ?? []).map((c) => ({
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

  useEffect(() => {
    if (selectedClassId && user?.id && detailTab === 'groups') {
      setGroupsLoading(true);
      listClassGroups(selectedClassId, user.id)
        .then((res) => setGroups(res.groups ?? []))
        .catch((err) => {
          console.error('Failed to load groups:', err);
          setGroups([]);
        })
        .finally(() => setGroupsLoading(false));
    } else {
      setGroups([]);
      setGroupStudents({});
      setExpandedGroupId(null);
    }
  }, [selectedClassId, user?.id, detailTab]);

  const addStudentSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!addStudentOpen) return;
    const q = addStudentSearchQuery.trim();
    if (!q) {
      setAddStudentSearchResults([]);
      return;
    }
    if (addStudentSearchTimerRef.current) clearTimeout(addStudentSearchTimerRef.current);
    addStudentSearchTimerRef.current = setTimeout(async () => {
      setAddStudentSearching(true);
      try {
        const { students } = await searchStudents(q);
        setAddStudentSearchResults(students ?? []);
      } catch {
        setAddStudentSearchResults([]);
      } finally {
        setAddStudentSearching(false);
      }
    }, 300);
    return () => {
      if (addStudentSearchTimerRef.current) clearTimeout(addStudentSearchTimerRef.current);
    };
  }, [addStudentOpen, addStudentSearchQuery]);

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
    if (!selectedClassId) return;
    const toAdd = addStudentSelected;
    if (!toAdd?.id) {
      setAddStudentError('请先搜索并选择要添加的学生');
      return;
    }
    setAddingStudent(true);
    setAddStudentError('');
    try {
      await addStudentToClass(selectedClassId, { studentId: toAdd.id });
      setAddStudentOpen(false);
      setAddStudentSearchQuery('');
      setAddStudentSearchResults([]);
      setAddStudentSelected(null);
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
      setAddStudentError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleBulkCreateStudents = async () => {
    if (!selectedClassId) return;
    if (!bulkDefaultPassword || bulkDefaultPassword.length < 6) {
      setBulkCreateError('请输入至少 6 位默认密码');
      return;
    }

    const entries = parseNameIdentifierLines(bulkIdentifiersInput);
    if (entries.length === 0) {
      setBulkCreateError('请输入至少一行，格式：姓名,账号（如 张三,zhangsan@example.com）');
      return;
    }
    if (entries.some((e) => !e.name)) {
      setBulkCreateError('每行需同时提供姓名和账号，格式：姓名,账号');
      return;
    }

    setBulkCreating(true);
    setBulkCreateError('');
    setBulkCreateResult(null);
    try {
      const result = await teacherBatchCreateStudents({
        classId: selectedClassId,
        defaultPassword: bulkDefaultPassword,
        entries,
      });
      setBulkCreateResult(result);
      const res = await getClass(selectedClassId);
      setClassDetail({
        id: res.id,
        name: res.name,
        grade: res.grade,
        students: res.students ?? [],
      });
      loadClasses();
    } catch (err) {
      setBulkCreateError(err instanceof Error ? err.message : '批量创建失败');
    } finally {
      setBulkCreating(false);
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
    if (!window.confirm('确定删除该班级？此操作不可恢复。\n\n学生账号不会被删除，仅会从该班级中移出。此操作相当于「解散班级」，而不是「删除学生」。')) return;
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

  const handleCreateGroup = async () => {
    if (!selectedClassId || !user?.id || !newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      await createClassGroup(selectedClassId, newGroupName.trim());
      setNewGroupOpen(false);
      setNewGroupName('');
      const res = await listClassGroups(selectedClassId, user.id);
      setGroups(res.groups ?? []);
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建分组失败');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!selectedClassId || !window.confirm('确定删除该分组？分组内学生不会被移出班级。')) return;
    try {
      await deleteClassGroup(selectedClassId, groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setExpandedGroupId((id) => (id === groupId ? null : id));
      setGroupStudents((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除分组失败');
    }
  };

  const handleExpandGroup = async (groupId: string) => {
    if (!selectedClassId || !user?.id) return;
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    setExpandedGroupId(groupId);
    if (!groupStudents[groupId]) {
      try {
        const res = await getGroupStudents(selectedClassId, groupId, user.id);
        setGroupStudents((prev) => ({ ...prev, [groupId]: res.students ?? [] }));
      } catch (err) {
        console.error('Failed to load group students:', err);
        setGroupStudents((prev) => ({ ...prev, [groupId]: [] }));
      }
    }
  };

  const handleRemoveFromGroup = async (groupId: string, studentId: string) => {
    if (!selectedClassId) return;
    if (!window.confirm('确定将该学生移出分组？')) return;
    try {
      await removeStudentFromGroup(selectedClassId, groupId, studentId);
      setGroupStudents((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] ?? []).filter((s) => s.id !== studentId),
      }));
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, studentCount: (g.studentCount ?? 1) - 1 } : g))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '移出失败');
    }
  };

  const openAddToGroup = (groupId: string) => {
    setAddToGroupId(groupId);
    setSelectedStudentsForGroup([]);
    setAddToGroupOpen(true);
  };

  const handleAddStudentsToGroup = async () => {
    if (!selectedClassId || !addToGroupId || selectedStudentsForGroup.length === 0) return;
    setAddingToGroup(true);
    try {
      await addStudentsToGroup(selectedClassId, addToGroupId, selectedStudentsForGroup);
      const res = await getGroupStudents(selectedClassId, addToGroupId, user!.id);
      setGroupStudents((prev) => ({ ...prev, [addToGroupId]: res.students ?? [] }));
      setGroups((prev) =>
        prev.map((g) =>
          g.id === addToGroupId ? { ...g, studentCount: (res.students ?? []).length } : g
        )
      );
      setAddToGroupOpen(false);
      setAddToGroupId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加失败');
    } finally {
      setAddingToGroup(false);
    }
  };

  const studentsNotInGroup = (groupId: string): Student[] => {
    const inGroup = new Set((groupStudents[groupId] ?? []).map((s) => s.id));
    return (classDetail?.students ?? []).filter((s) => !inGroup.has(s.id));
  };

  const filteredStudents = (classDetail?.students ?? []).filter(
    (s) =>
      (s.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  // 仅自建班级可管理学生；已添加班级只能分配课程和任务
  const canManageSelectedClass = !!selectedClass && selectedClass.teacherId === user?.id;
  const gradeOptions = Array.from(
    new Set(
      tenantClasses
        .map((c) => (c.grade ?? '').trim())
        .filter((grade) => grade.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  const classesForSelectedGrade = tenantClasses.filter((c) => (c.grade ?? '').trim() === existingGrade);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">班级管理</h1>
        <p className="text-muted-foreground mt-2">管理我的班级（自建 + 已添加）</p>
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
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setAddExistingOpen(true);
                    setExistingGrade('');
                    setExistingClassId('');
                  }}
                >
                  从全校选班
                </Button>
                <Button size="sm" onClick={() => setNewClassOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-1" />
                  新建
                </Button>
              </div>
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
                        {c.teacherId === user?.id ? (
                          <Badge variant="outline">我创建</Badge>
                        ) : (
                          <Badge variant="outline">已添加</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(c.studentCount ?? 0)} 名学生
                      </p>
                    </div>
                    {c.teacherId === user?.id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white text-destructive border-destructive/30 hover:bg-red-50 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClass(c.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    ) : null}
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
                <CardTitle>{selectedClass ? selectedClass.name : '班级详情'}</CardTitle>
                <CardDescription>
                  {selectedClass ? (detailTab === 'students' ? '学生列表' : '分组管理') : '选择班级查看详情'}
                </CardDescription>
              </div>
              {selectedClassId && canManageSelectedClass && detailTab === 'students' && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setBulkCreateOpen(true);
                      setBulkCreateError('');
                      setBulkCreateResult(null);
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    创建新账号
                  </Button>
                  <Button size="sm" onClick={() => setAddStudentOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    搜索已有账号
                  </Button>
                </div>
              )}
              {selectedClassId && canManageSelectedClass && detailTab === 'groups' && (
                <Button size="sm" onClick={() => setNewGroupOpen(true)}>
                  <UsersRound className="w-4 h-4 mr-1" />
                  新建分组
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedClassId ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>请从左侧选择一个班级查看学生列表或分组管理</p>
              </div>
            ) : detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as 'students' | 'groups')}>
                <TabsList className="mb-4">
                  <TabsTrigger value="students">学生列表</TabsTrigger>
                  <TabsTrigger value="groups">分组管理</TabsTrigger>
                </TabsList>
                <TabsContent value="students">
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
                          {canManageSelectedClass ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveStudent(s.id)}
                            >
                              移出
                            </Button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="groups">
                  {groupsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : groups.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-center">暂无分组，点击右上角「新建分组」创建</p>
                  ) : (
                    <div className="space-y-3">
                      {groups.map((g) => (
                        <div key={g.id} className="border rounded-lg overflow-hidden">
                          <div
                            className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleExpandGroup(g.id)}
                          >
                            <div className="flex items-center gap-2">
                              <UsersRound className="w-5 h-5 text-muted-foreground" />
                              <span className="font-medium">{g.name}</span>
                              <Badge variant="secondary">{g.studentCount ?? 0} 人</Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              {canManageSelectedClass && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAddToGroup(g.id);
                                    }}
                                  >
                                    添加
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteGroup(g.id);
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          {expandedGroupId === g.id && (
                            <div className="border-t bg-muted/20 p-4 space-y-2">
                              {(groupStudents[g.id] ?? []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">暂无学生，点击「添加」从班级学生中加入</p>
                              ) : (
                                (groupStudents[g.id] ?? []).map((s) => (
                                  <div
                                    key={s.id}
                                    className="flex items-center justify-between py-2 px-3 rounded bg-background"
                                  >
                                    <span className="text-sm">{s.name || s.email || s.id}</span>
                                    {canManageSelectedClass && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive h-7 text-xs"
                                        onClick={() => handleRemoveFromGroup(g.id, s.id)}
                                      >
                                        移出
                                      </Button>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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

      {/* Add Existing Class Dialog */}
      <Dialog
        open={addExistingOpen}
        onOpenChange={(open) => {
          setAddExistingOpen(open);
          if (!open) {
            setExistingGrade('');
            setExistingClassId('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>从全校选班</DialogTitle>
            <DialogDescription>先选择年级，再选择该年级下的班级</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="existing-grade">年级</Label>
              <select
                id="existing-grade"
                value={existingGrade}
                onChange={(e) => {
                  setExistingGrade(e.target.value);
                  setExistingClassId('');
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">请选择年级</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="existing-class">班级</Label>
              <select
                id="existing-class"
                value={existingClassId}
                disabled={!existingGrade}
                onChange={(e) => setExistingClassId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">请选择班级</option>
                {classesForSelectedGrade.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {addExistingError ? <p className="text-sm text-destructive">{addExistingError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddExistingOpen(false)}>
              取消
            </Button>
            <Button
              disabled={!existingClassId || addingExisting}
              onClick={async () => {
                setAddExistingError('');
                setAddingExisting(true);
                try {
                  await addExistingClassForTeacher(existingClassId);
                  await loadClasses();
                  setSelectedClassId(existingClassId);
                  setAddExistingOpen(false);
                } catch (err) {
                  setAddExistingError(err instanceof Error ? err.message : '从全校选班失败');
                } finally {
                  setAddingExisting(false);
                }
              }}
            >
              {addingExisting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              添加并查看
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog
        open={addStudentOpen}
        onOpenChange={(open) => {
          setAddStudentOpen(open);
          if (!open) {
            setAddStudentSearchQuery('');
            setAddStudentSearchResults([]);
            setAddStudentSelected(null);
            setAddStudentError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加学生</DialogTitle>
            <DialogDescription>
              输入邮箱、手机号、账号或学生姓名进行搜索，选择学生后加入班级
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="student-search">搜索学生</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="student-search"
                  type="text"
                  placeholder="邮箱 / 手机号 / 账号 / 学生姓名"
                  className="pl-9"
                  value={addStudentSearchQuery}
                  onChange={(e) => {
                    setAddStudentSearchQuery(e.target.value);
                    setAddStudentSelected(null);
                  }}
                />
              </div>
            </div>
            {addStudentSearching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                搜索中...
              </div>
            )}
            {addStudentSearchQuery.trim() && !addStudentSearching && (
              <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 divide-y">
                {addStudentSearchResults.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">未找到匹配的学生</p>
                ) : (
                  addStudentSearchResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 ${
                        addStudentSelected?.id === s.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                      }`}
                      onClick={() => setAddStudentSelected(s)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {(s.name ?? s.email ?? '?').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{s.name || '未设置姓名'}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.email || s.id}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            {addStudentError && (
              <p className="text-sm text-destructive">{addStudentError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStudentOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={!addStudentSelected?.id || addingStudent}
            >
              {addingStudent && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Students Dialog */}
      <Dialog
        open={bulkCreateOpen}
        onOpenChange={(open) => {
          setBulkCreateOpen(open);
          if (!open) {
            setBulkCreateError('');
            setBulkCreateResult(null);
            setBulkIdentifiersInput('');
            setBulkDefaultPassword('');
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>批量创建学生账号</DialogTitle>
            <DialogDescription>
              为当前班级批量创建学生账号，创建后自动加入班级。默认密码支持教师自定义（至少 6 位）。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-default-password">默认密码</Label>
              <Input
                id="bulk-default-password"
                type="password"
                minLength={6}
                autoComplete="new-password"
                placeholder="例如: ChangeMe123"
                value={bulkDefaultPassword}
                onChange={(e) => setBulkDefaultPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-identifiers">姓名,账号（每行一个，逗号或 Tab 分隔）</Label>
              <textarea
                id="bulk-identifiers"
                value={bulkIdentifiersInput}
                onChange={(e) => setBulkIdentifiersInput(e.target.value)}
                placeholder={'张三,zhangsan@example.com\n李四,13800138000\n王五,student001'}
                className="w-full min-h-[180px] rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            {bulkCreateError ? <p className="text-sm text-destructive">{bulkCreateError}</p> : null}

            {bulkCreateResult ? (
              <div className="rounded-md border border-slate-200 p-3 space-y-2">
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">新建: {bulkCreateResult.summary.created}</span>
                  <span className="text-blue-600">更新: {bulkCreateResult.summary.updated}</span>
                  <span className="text-indigo-600">加入班级: {bulkCreateResult.summary.enrolled ?? 0}</span>
                  <span className="text-slate-500">跳过: {bulkCreateResult.summary.skipped}</span>
                  {bulkCreateResult.summary.errors > 0 ? (
                    <span className="text-red-600">失败: {bulkCreateResult.summary.errors}</span>
                  ) : null}
                </div>
                {bulkCreateResult.results.some((r) => r.message) ? (
                  <div className="max-h-48 overflow-auto rounded border border-slate-100 bg-slate-50 p-2 text-xs space-y-1">
                    {bulkCreateResult.results
                      .filter((r) => r.message)
                      .map((r) => (
                        <p key={`${r.identifier}-${r.status}`}>
                          {r.identifier}: {r.message}
                        </p>
                      ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCreateOpen(false)}>
              关闭
            </Button>
            <Button onClick={handleBulkCreateStudents} disabled={bulkCreating}>
              {bulkCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              批量创建并加入班级
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Students to Group Dialog */}
      <Dialog
        open={addToGroupOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddToGroupOpen(false);
            setAddToGroupId(null);
            setSelectedStudentsForGroup([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加学生到分组</DialogTitle>
            <DialogDescription>从班级学生中选择要加入该分组的学生（可多选）</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {addToGroupId && (() => {
              const available = studentsNotInGroup(addToGroupId);
              return available.length === 0 ? (
                <p className="text-sm text-muted-foreground">班级内所有学生已在该分组中</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {available.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center p-2 rounded cursor-pointer ${selectedStudentsForGroup.includes(s.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}
                      onClick={() =>
                        setSelectedStudentsForGroup((prev) =>
                          prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                        )
                      }
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentsForGroup.includes(s.id)}
                        onChange={() => {}}
                        className="mr-2"
                      />
                      <span className="text-sm">{s.name || s.email || s.id}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToGroupOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAddStudentsToGroup}
              disabled={selectedStudentsForGroup.length === 0 || addingToGroup}
            >
              {addingToGroup && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              添加 {selectedStudentsForGroup.length > 0 ? `(${selectedStudentsForGroup.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Group Dialog */}
      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建分组</DialogTitle>
            <DialogDescription>为当前班级创建一个分组，用于个性化任务推荐</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">分组名称</Label>
              <Input
                id="group-name"
                placeholder="如：进阶组、巩固组"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewGroupOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim() || creatingGroup}>
              {creatingGroup && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

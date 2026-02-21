import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BookOpen, Users, TrendingUp, Search, Edit, Trash2, UserPlus, X, Loader2, ExternalLink, Globe, Share2, Link2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { useAuth } from './AuthContext';
import { usePublishedCourses } from './PublishedCoursesContext';
import {
  assignCourseToClasses,
  listTeacherClasses,
  listTeacherCoursesWithStats,
  getTeacherStats,
  deleteCourse,
  restoreCourse,
  updateCourseVisibility,
  getCourseAssignments,
  removeCourseAssignment,
  listCourseShares,
  createCourseShare,
  deleteCourseShare,
  type ClassItem,
  type TeacherStats,
} from '@/lib/backendApi';

interface Course {
  id: string;
  title: string;
  subject: string;
  grade: string;
  students: number;
  completion: number;
  assignmentStatus: 'assigned' | 'unassigned';
  visibilityStatus: 'public' | 'private';
  shareStatus: 'shared' | 'none';
  deletedAt?: string | null;
  canRestore?: boolean;
  lastUpdated: string;
}

interface Class extends ClassItem {
  studentCount: number;
}

interface CourseShareItem {
  id: string;
  target_teacher_id?: string;
  share_token?: string;
  permission: 'view' | 'edit';
  expires_at?: string;
}

import { getLearnYourWayOrigin } from '@/config/appConfig';

export function CourseManagementPage() {
  const { user } = useAuth();
  const { publishedCourses, refreshCourses } = usePublishedCourses();
  const [searchQuery, setSearchQuery] = useState('');
  const [courseView, setCourseView] = useState<'active' | 'recycle'>('active');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<Array<{ id: string; name: string; grade?: string; studentCount: number }>>([]);
  const [assigning, setAssigning] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [publishingCourseId, setPublishingCourseId] = useState<string | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [deletedCourses, setDeletedCourses] = useState<Course[]>([]);
  const [loadingDeletedCourses, setLoadingDeletedCourses] = useState(false);
  const [restoringCourseId, setRestoringCourseId] = useState<string | null>(null);

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingCourse, setSharingCourse] = useState<Course | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareTargetTeacherId, setShareTargetTeacherId] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [shareItems, setShareItems] = useState<CourseShareItem[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    getTeacherStats(user.id)
      .then(setTeacherStats)
      .catch((err) => console.error('Failed to load teacher stats:', err))
      .finally(() => setStatsLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !assignDialogOpen) return;
    setClassesLoading(true);
    listTeacherClasses(user.id)
      .then((res) =>
        setClasses(
          (res.classes ?? []).map((c) => ({
            ...c,
            studentCount: c.studentCount ?? 0,
          }))
        )
      )
      .catch((err) => console.error('Failed to load classes:', err))
      .finally(() => setClassesLoading(false));
  }, [user?.id, assignDialogOpen]);

  useEffect(() => {
    if (!user?.id || courseView !== 'recycle') return;
    setLoadingDeletedCourses(true);
    listTeacherCoursesWithStats(user.id, { deletedOnly: true })
      .then((res) => {
        const mapped = (res.courses ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          subject: row.subject,
          grade: row.grade,
          students: row.students,
          completion: row.completion,
          assignmentStatus: row.assignmentStatus ?? 'unassigned',
          visibilityStatus: row.visibilityStatus ?? 'private',
          shareStatus: row.shareStatus ?? 'none',
          deletedAt: row.deletedAt,
          canRestore: row.canRestore,
          lastUpdated: row.lastUpdated,
        }));
        setDeletedCourses(mapped);
      })
      .catch((err) => console.error('Failed to load deleted courses:', err))
      .finally(() => setLoadingDeletedCourses(false));
  }, [courseView, user?.id]);

  const courses: Course[] = publishedCourses.map((c) => ({
    id: c.id,
    title: c.title,
    subject: c.subject,
    grade: c.grade,
    students: c.students,
    completion: c.completion,
    assignmentStatus: c.assignmentStatus,
    visibilityStatus: c.visibilityStatus,
    shareStatus: c.shareStatus,
    deletedAt: null,
    canRestore: false,
    lastUpdated: c.lastUpdated,
  }));

  const sourceCourses = courseView === 'active' ? courses : deletedCourses;
  const filteredCourses = sourceCourses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      courseView === 'recycle' ||
      selectedFilter === 'all' ||
      (selectedFilter === 'assigned' && course.assignmentStatus === 'assigned') ||
      (selectedFilter === 'unassigned' && course.assignmentStatus === 'unassigned');
    return matchesSearch && matchesFilter;
  });

  const openCourseAssignDialog = async (course: Course) => {
    if (!user?.id) return;
    setSelectedCourse(course);
    setSelectedClasses([]);
    setAssignDialogOpen(true);
    try {
      const { classes: assigned } = await getCourseAssignments(course.id, user.id);
      setAssignedClasses(assigned.map((c) => ({ id: c.id, name: c.name, grade: c.grade, studentCount: c.studentCount })));
    } catch (err) {
      console.error('Failed to load assigned classes:', err);
      setAssignedClasses([]);
    }
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses((prev) => (prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]));
  };

  const handleRemoveAssignment = async (classId: string) => {
    if (!user?.id || !selectedCourse) return;
    try {
      await removeCourseAssignment(selectedCourse.id, classId, user.id);
      setAssignedClasses((prev) => prev.filter((c) => c.id !== classId));
      await refreshCourses();
      getTeacherStats(user.id).then(setTeacherStats).catch(() => {});
    } catch (err) {
      console.error('Remove assignment failed:', err);
      alert(err instanceof Error ? err.message : '移除分配失败，请重试');
    }
  };

  const handleConfirmAssign = async () => {
    if (!user?.id || !selectedCourse || selectedClasses.length === 0) return;
    setAssigning(true);
    try {
      const result = await assignCourseToClasses(selectedCourse.id, selectedClasses, user.id);
      const classNames = classes.filter((c) => selectedClasses.includes(c.id)).map((c) => c.name).join('、');
      const message =
        result.skippedCount && result.skippedCount > 0
          ? `成功将"${selectedCourse.title}"分配给 ${result.assignedCount} 个班级，${result.skippedCount} 个班级已分配过`
          : `成功将"${selectedCourse.title}"分配给：${classNames}`;
      alert(message);
      setAssignDialogOpen(false);
      setSelectedClasses([]);
      setSelectedCourse(null);
      setAssignedClasses([]);
      await refreshCourses();
      getTeacherStats(user.id).then(setTeacherStats).catch(() => {});
    } catch (err) {
      console.error('Assign failed:', err);
      alert(err instanceof Error ? err.message : '分配失败，请重试');
    } finally {
      setAssigning(false);
    }
  };

  const handleCourseDelete = async (course: Course) => {
    if (!user?.id) return;
    if (!window.confirm(`确定要删除课程"${course.title}"吗？课程将进入回收状态，90天内可恢复。`)) return;
    setDeletingCourseId(course.id);
    try {
      await deleteCourse(course.id, user.id);
      await refreshCourses();
      getTeacherStats(user.id).then(setTeacherStats).catch(() => {});
    } catch (err) {
      console.error('Delete course failed:', err);
      alert(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handleCoursePublicToggle = async (course: Course) => {
    if (!user?.id) return;
    setPublishingCourseId(course.id);
    try {
      const action = course.visibilityStatus === 'public' ? 'unpublish' : 'publish';
      await updateCourseVisibility(course.id, user.id, action);
      await refreshCourses();
    } catch (err) {
      console.error('Toggle course visibility failed:', err);
      alert(err instanceof Error ? err.message : '更新公开状态失败');
    } finally {
      setPublishingCourseId(null);
    }
  };

  const handleCoursePreview = (courseId: string) => {
    window.open(`${getLearnYourWayOrigin()}/course/${courseId}`, '_blank');
  };

  const handleCourseRestore = async (course: Course) => {
    if (!user?.id) return;
    setRestoringCourseId(course.id);
    try {
      await restoreCourse(course.id, user.id);
      setDeletedCourses((prev) => prev.filter((item) => item.id !== course.id));
      await refreshCourses();
      getTeacherStats(user.id).then(setTeacherStats).catch(() => {});
      alert('课程已恢复');
    } catch (err) {
      console.error('Restore course failed:', err);
      alert(err instanceof Error ? err.message : '恢复失败，请重试');
    } finally {
      setRestoringCourseId(null);
    }
  };

  const openShareDialog = async (course: Course) => {
    if (!user?.id) return;
    setSharingCourse(course);
    setShareDialogOpen(true);
    setShareLoading(true);
    try {
      const { shares } = await listCourseShares(course.id, user.id);
      setShareItems(shares as CourseShareItem[]);
    } catch (err) {
      console.error('Load shares failed:', err);
      setShareItems([]);
    } finally {
      setShareLoading(false);
    }
  };

  const handleCreateAccountShare = async () => {
    if (!user?.id || !sharingCourse || !shareTargetTeacherId.trim()) return;
    try {
      await createCourseShare({
        courseId: sharingCourse.id,
        ownerTeacherId: user.id,
        targetTeacherId: shareTargetTeacherId.trim(),
        permission: sharePermission,
      });
      const { shares } = await listCourseShares(sharingCourse.id, user.id);
      setShareItems(shares as CourseShareItem[]);
      setShareTargetTeacherId('');
    } catch (err) {
      console.error('Create share failed:', err);
      alert(err instanceof Error ? err.message : '创建分享失败');
    }
  };

  const handleCreateLinkShare = async () => {
    if (!user?.id || !sharingCourse) return;
    try {
      const created = await createCourseShare({
        courseId: sharingCourse.id,
        ownerTeacherId: user.id,
        permission: sharePermission,
        createLinkShare: true,
      });
      const link = `${window.location.origin}/shared-course/${created.shareToken}`;
      await navigator.clipboard.writeText(link);
      alert(`已生成分享链接并复制到剪贴板：${link}`);
      const { shares } = await listCourseShares(sharingCourse.id, user.id);
      setShareItems(shares as CourseShareItem[]);
    } catch (err) {
      console.error('Create link share failed:', err);
      alert(err instanceof Error ? err.message : '创建链接分享失败');
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!user?.id || !sharingCourse) return;
    try {
      await deleteCourseShare(shareId, user.id);
      const { shares } = await listCourseShares(sharingCourse.id, user.id);
      setShareItems(shares as CourseShareItem[]);
    } catch (err) {
      console.error('Revoke share failed:', err);
      alert(err instanceof Error ? err.message : '撤销分享失败');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">课程管理</h1>
        <p className="text-muted-foreground mt-2">管理课程的分配、公开、分享与删除</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总课程数</p>
                <p className="text-2xl font-bold">{statsLoading ? '—' : (teacherStats?.totalCourses ?? courses.length)}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已分配</p>
                <p className="text-2xl font-bold">{statsLoading ? '—' : (teacherStats?.assignedCount ?? teacherStats?.publishedCount ?? courses.filter((c) => c.assignmentStatus === 'assigned').length)}</p>
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
                <p className="text-2xl font-bold">{statsLoading ? '—' : (teacherStats?.totalStudents ?? courses.reduce((sum, c) => sum + c.students, 0))}</p>
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
                <p className="text-2xl font-bold">{statsLoading ? '—' : `${teacherStats?.avgCompletion ?? 0}%`}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex space-x-2">
              <Button variant={courseView === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setCourseView('active')}>在用课程</Button>
              <Button variant={courseView === 'recycle' ? 'default' : 'outline'} size="sm" onClick={() => setCourseView('recycle')}>回收站</Button>
              {courseView === 'active' ? (
                <>
                  <Button variant={selectedFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedFilter('all')}>全部</Button>
                  <Button variant={selectedFilter === 'assigned' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedFilter('assigned')}>已分配</Button>
                  <Button variant={selectedFilter === 'unassigned' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedFilter('unassigned')}>未分配</Button>
                </>
              ) : null}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索课程..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-full md:w-64" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>课程列表</CardTitle>
          <CardDescription>
            {courseView === 'active' ? '支持预览、编辑占位、分配、公开、分享与删除' : '回收站（90天内可恢复）'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {courseView === 'recycle' && loadingDeletedCourses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
            {filteredCourses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{course.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>{course.subject} · {course.grade}</span>
                      <Badge variant={course.assignmentStatus === 'assigned' ? 'default' : 'secondary'}>
                        {course.assignmentStatus === 'assigned' ? '已分配' : '未分配'}
                      </Badge>
                      <Badge variant={course.visibilityStatus === 'public' ? 'default' : 'secondary'}>
                        {course.visibilityStatus === 'public' ? '已公开' : '未公开'}
                      </Badge>
                      <Badge variant={course.shareStatus === 'shared' ? 'default' : 'secondary'}>
                        {course.shareStatus === 'shared' ? '已分享' : '未分享'}
                      </Badge>
                      <span>{course.students} 名学生</span>
                      <span>完成率 {course.completion}%</span>
                      {courseView === 'recycle' && course.deletedAt ? <span>删除于 {new Date(course.deletedAt).toLocaleDateString()}</span> : null}
                      <span>更新于 {course.lastUpdated}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {courseView === 'active' ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleCoursePreview(course.id)}>
                        <ExternalLink className="w-4 h-4 mr-1" />
                        预览
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => alert('课程编辑模块开发中，后续开放。')}>
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openCourseAssignDialog(course)}>
                        <UserPlus className="w-4 h-4 mr-1" />
                        分配
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCoursePublicToggle(course)} disabled={publishingCourseId === course.id}>
                        <Globe className="w-4 h-4 mr-1" />
                        {course.visibilityStatus === 'public' ? '取消公开' : '公开'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openShareDialog(course)}>
                        <Share2 className="w-4 h-4 mr-1" />
                        分享
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCourseDelete(course)}
                        disabled={deletingCourseId === course.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingCourseId === course.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                        删除
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCourseRestore(course)}
                      disabled={!course.canRestore || restoringCourseId === course.id}
                    >
                      {restoringCourseId === course.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                      恢复
                    </Button>
                  )}
                </div>
              </div>
            ))}
            </div>
          )}
        </CardContent>
      </Card>

      {assignDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-[640px] max-h-[85vh] flex flex-col overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>分配课程自学任务</CardTitle>
                  <CardDescription className="mt-1">课程：{selectedCourse?.title}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setAssignDialogOpen(false)} className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 overflow-y-auto">
              <div>
                <p className="text-sm font-medium mb-2">已分配班级（可移除）</p>
                {assignedClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">当前暂无已分配班级</p>
                ) : (
                  <div className="space-y-2">
                    {assignedClasses.map((c) => (
                      <div key={c.id} className="flex items-center justify-between border rounded-md p-2">
                        <div className="text-sm">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground ml-2">{c.grade || '未设年级'} · {c.studentCount} 人</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAssignment(c.id)} className="text-red-600 hover:text-red-700">
                          移除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">选择要新增分配的班级（可多选）</p>
                {classesLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : classes.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center">暂无班级，请先在班级管理页创建</p>
                ) : (
                  <div className="space-y-2">
                    {classes.map((c) => {
                      const alreadyAssigned = assignedClasses.some((a) => a.id === c.id);
                      return (
                        <div
                          key={c.id}
                          className={`flex items-center p-3 border rounded-lg transition-colors ${alreadyAssigned ? 'bg-gray-50 opacity-70' : 'cursor-pointer hover:bg-gray-50'} ${selectedClasses.includes(c.id) ? 'bg-blue-50 border-blue-300' : ''}`}
                          onClick={() => !alreadyAssigned && handleClassToggle(c.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedClasses.includes(c.id)}
                            disabled={alreadyAssigned}
                            onChange={() => !alreadyAssigned && handleClassToggle(c.id)}
                            className="mr-3 w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{c.name}</span>
                              <Badge variant="secondary" className="text-xs">{c.grade || '未设年级'}</Badge>
                              {alreadyAssigned && <Badge variant="outline" className="text-xs">已分配</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{c.studentCount} 名学生</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
            <div className="border-t p-4 flex justify-end gap-3 bg-gray-50">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>取消</Button>
              <Button onClick={handleConfirmAssign} disabled={selectedClasses.length === 0 || assigning}>
                {assigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                确认分配
              </Button>
            </div>
          </Card>
        </div>
      )}

      {shareDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-[720px] max-h-[85vh] flex flex-col overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>课程分享</CardTitle>
                  <CardDescription className="mt-1">课程：{sharingCourse?.title}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShareDialogOpen(false)} className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  placeholder="目标教师ID"
                  value={shareTargetTeacherId}
                  onChange={(e) => setShareTargetTeacherId(e.target.value)}
                />
                <select
                  className="border rounded-md px-3 py-2 text-sm"
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value as 'view' | 'edit')}
                >
                  <option value="view">view（可预览/分配）</option>
                  <option value="edit">edit（可编辑）</option>
                </select>
                <Button onClick={handleCreateAccountShare}>按账号分享</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCreateLinkShare}>
                  <Link2 className="w-4 h-4 mr-1" />
                  生成链接分享
                </Button>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">已分享记录</p>
                {shareLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : shareItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无分享记录</p>
                ) : (
                  <div className="space-y-2">
                    {shareItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border rounded-md p-3">
                        <div className="text-sm">
                          <div>
                            {item.target_teacher_id ? `教师：${item.target_teacher_id}` : `链接：${item.share_token}`}
                          </div>
                          <div className="text-muted-foreground">权限：{item.permission}{item.expires_at ? ` · 过期：${item.expires_at}` : ''}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRevokeShare(item.id)} className="text-red-600 hover:text-red-700">
                          撤销
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
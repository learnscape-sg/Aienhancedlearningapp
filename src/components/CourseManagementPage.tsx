import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  BookOpen,
  FileText,
  Search,
  Trash2,
  UserPlus,
  X,
  Loader2,
  ExternalLink,
  Share2,
  Link2,
  Pencil,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { usePublishedCourses } from './PublishedCoursesContext';
import { useTasks, type TaskItem } from './TasksContext';
import { getLearnYourWayOrigin } from '@/config/appConfig';
import {
  assignCourseToClasses,
  createCourse,
  createScheduledAssignment,
  deleteTask,
  listTeacherClasses,
  listTeacherTasks,
  restoreTask,
  listTeacherCoursesWithStats,
  updateCourseVisibility,
  updateCoursePlan,
  updateTask,
  updateTaskVisibility,
  getTask,
  getCourse,
  listSharedCourses,
  deleteCourse,
  restoreCourse,
  listClassGroups,
  getCourseAssignments,
  removeCourseAssignment,
  listCourseShares,
  createCourseShare,
  deleteCourseShare,
  searchTeachers,
  generateTaskAsset,
  type ClassItem,
  type TeacherSearchItem,
} from '@/lib/backendApi';
import type { SystemTask, SystemTaskPlan } from '@/types/backend';
import { TaskPreviewEdit } from './TaskPreviewEdit';

const TASK_TYPE_LABELS: Record<string, string> = {
  mastery: '掌握型任务',
  guided: '引导型任务',
  autonomous: '自主型任务',
};

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
  ownerTeacherId?: string;
  ownerTeacherName?: string;
}

interface Class extends ClassItem {
  studentCount: number;
}

interface CourseShareItem {
  id: string;
  target_teacher_id?: string;
  target_teacher_name?: string;
  share_token?: string;
  permission: 'view' | 'edit';
  expires_at?: string;
}

export function CourseManagementPage({ initialCourseTab }: { initialCourseTab?: 'active' | 'shared' | 'recycle' } = {}) {
  const { user } = useAuth();
  const { publishedCourses, refreshCourses } = usePublishedCourses();
  const { tasks: myTasks, refreshTasks } = useTasks();

  // --- Task state ---
  const [myTaskView, setMyTaskView] = useState<'active' | 'recycle'>('active');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [deletedTasks, setDeletedTasks] = useState<TaskItem[]>([]);
  const [loadingDeletedTasks, setLoadingDeletedTasks] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [restoringTaskId, setRestoringTaskId] = useState<string | null>(null);
  const [taskAssignDialogOpen, setTaskAssignDialogOpen] = useState(false);
  const [selectedTaskIdsForAssign, setSelectedTaskIdsForAssign] = useState<string[]>([]);

  // --- Course state ---
  const [courseView, setCourseView] = useState<'active' | 'shared' | 'recycle'>(
    initialCourseTab ?? 'active'
  );
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [courseAssignDialogOpen, setCourseAssignDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [deletedCourses, setDeletedCourses] = useState<Course[]>([]);
  const [sharedCourses, setSharedCourses] = useState<Course[]>([]);
  const [loadingDeletedCourses, setLoadingDeletedCourses] = useState(false);
  const [loadingSharedCourses, setLoadingSharedCourses] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [restoringCourseId, setRestoringCourseId] = useState<string | null>(null);
  const [publishingCourseId, setPublishingCourseId] = useState<string | null>(null);
  const [publishingTaskId, setPublishingTaskId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingCourse, setSharingCourse] = useState<Course | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [selectedTeacherForShare, setSelectedTeacherForShare] = useState<TeacherSearchItem | null>(null);
  const [shareTeacherSearchQuery, setShareTeacherSearchQuery] = useState('');
  const [shareTeacherSearchResults, setShareTeacherSearchResults] = useState<TeacherSearchItem[]>([]);
  const [shareTeacherSearchLoading, setShareTeacherSearchLoading] = useState(false);
  const shareTeacherSearchRef = useRef<HTMLDivElement>(null);
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [shareItems, setShareItems] = useState<CourseShareItem[]>([]);

  // --- Edit task/course state ---
  const [editMode, setEditMode] = useState<'task' | 'course' | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<SystemTaskPlan | null>(null);
  const [editPreviewTaskIndex, setEditPreviewTaskIndex] = useState(0);
  const [editRegeneratingTaskId, setEditRegeneratingTaskId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // --- Shared dialog state ---
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<Array<{ id: string; name: string; grade?: string; studentCount: number }>>([]);
  const [assignedGroups, setAssignedGroups] = useState<Array<{ id: string; name: string; classId: string; studentCount: number }>>([]);
  const [allGroupsByClass, setAllGroupsByClass] = useState<Record<string, Array<{ id: string; name: string; studentCount: number }>>>({});
  const [assigning, setAssigning] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduledPublishAt, setScheduledPublishAt] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);

  useEffect(() => {
    if (myTaskView === 'recycle') setSelectedTaskIds([]);
  }, [myTaskView]);

  useEffect(() => {
    if (!user?.id || myTaskView !== 'recycle') return;
    setLoadingDeletedTasks(true);
    listTeacherTasks(user.id, { deletedOnly: true })
      .then((res) => setDeletedTasks(res.tasks ?? []))
      .catch((err) => console.error('Failed to load deleted tasks:', err))
      .finally(() => setLoadingDeletedTasks(false));
  }, [user?.id, myTaskView]);

  useEffect(() => {
    const dialogOpen = taskAssignDialogOpen || courseAssignDialogOpen;
    if (!user?.id || !dialogOpen) return;
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
  }, [user?.id, taskAssignDialogOpen, courseAssignDialogOpen]);

  useEffect(() => {
    if (!user?.id || !courseAssignDialogOpen || classes.length === 0) return;
    const loadGroups = async () => {
      const byClass: Record<string, Array<{ id: string; name: string; studentCount: number }>> = {};
      await Promise.all(
        classes.map(async (c) => {
          try {
            const res = await listClassGroups(c.id, user!.id);
            byClass[c.id] = (res.groups ?? []).map((g) => ({
              id: g.id,
              name: g.name,
              studentCount: g.studentCount ?? 0,
            }));
          } catch {
            byClass[c.id] = [];
          }
        })
      );
      setAllGroupsByClass(byClass);
    };
    loadGroups();
  }, [user?.id, courseAssignDialogOpen, classes]);

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

  useEffect(() => {
    if (!user?.id || courseView !== 'shared') return;
    setLoadingSharedCourses(true);
    listSharedCourses(user.id)
      .then((res) => {
        const mapped: Course[] = (res.courses ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          subject: row.subject,
          grade: row.grade,
          students: row.students,
          completion: row.completion,
          assignmentStatus: (row.assignmentStatus ?? 'unassigned') as 'assigned' | 'unassigned',
          visibilityStatus: (row.visibilityStatus ?? 'private') as 'public' | 'private',
          shareStatus: (row.shareStatus ?? 'none') as 'shared' | 'none',
          deletedAt: null,
          canRestore: false,
          lastUpdated: row.lastUpdated,
          ownerTeacherId: row.ownerTeacherId,
          ownerTeacherName: row.ownerTeacherName,
        }));
        setSharedCourses(mapped);
      })
      .catch((err) => console.error('Failed to load shared courses:', err))
      .finally(() => setLoadingSharedCourses(false));
  }, [courseView, user?.id]);

  const activeTasks = myTaskView === 'active' ? myTasks : [];
  const recycleTaskList = myTaskView === 'recycle' ? deletedTasks : [];
  const filteredMyTasks = useMemo(
    () =>
      (myTaskView === 'active' ? activeTasks : recycleTaskList).filter((task) =>
        `${task.topic || ''} ${task.subject || ''}`.toLowerCase().includes(taskSearchQuery.toLowerCase())
      ),
    [myTaskView, activeTasks, recycleTaskList, taskSearchQuery]
  );

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

  const sourceCourses =
    courseView === 'active' ? courses : courseView === 'shared' ? sharedCourses : deletedCourses;
  const filteredCourses = sourceCourses.filter((course) => {
    return (
      course.title.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
      course.subject.toLowerCase().includes(courseSearchQuery.toLowerCase())
    );
  });

  const taskDisplayName = (task: TaskItem) => {
    const grade = task.grade?.trim() || '';
    const subject = task.subject?.trim() || '';
    const topic = task.topic?.trim() || task.subject || '未命名任务';
    const taskTypeLabel = task.taskType ? (TASK_TYPE_LABELS[task.taskType] ?? task.taskType) : null;
    const base = grade && subject ? `${grade} - ${subject} - ${topic}` : topic;
    return taskTypeLabel ? `${base} - ${taskTypeLabel}` : base;
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  };

  const openTaskAssignDialog = (taskIds: string[]) => {
    if (!taskIds.length) return;
    setSelectedTaskIdsForAssign(taskIds);
    setSelectedClasses([]);
    setPublishMode('now');
    setScheduledPublishAt('');
    setTaskAssignDialogOpen(true);
  };

  const handleTaskPreview = async (taskId: string) => {
    if (!user?.id) return;
    try {
      const result = await createCourse({ taskIds: [taskId] }, user.id);
      window.open(`${getLearnYourWayOrigin()}/course/${result.courseId}`, '_blank');
    } catch (err) {
      console.error('Failed to preview task:', err);
      alert(err instanceof Error ? err.message : '生成预览失败');
    }
  };

  const handleTaskDelete = async (task: TaskItem) => {
    if (!user?.id) return;
    if (!window.confirm(`确定要删除"${task.topic || task.subject || '此任务'}"吗？`)) return;
    setDeletingTaskId(task.taskId);
    try {
      await deleteTask(task.taskId, user.id);
      await refreshTasks();
      setSelectedTaskIds((prev) => prev.filter((id) => id !== task.taskId));
    } catch (err) {
      console.error('Delete task failed:', err);
      alert(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleTaskPublish = async (task: TaskItem) => {
    if (!user?.id) return;
    setPublishingTaskId(task.taskId);
    try {
      const action = task.isPublic ? 'unpublish' : 'publish';
      await updateTaskVisibility(task.taskId, user.id, action);
      await refreshTasks();
    } catch (err) {
      console.error('Task publish failed:', err);
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setPublishingTaskId(null);
    }
  };

  const handleTaskRestore = async (task: TaskItem) => {
    if (!user?.id) return;
    setRestoringTaskId(task.taskId);
    try {
      await restoreTask(task.taskId, user.id);
      setDeletedTasks((prev) => prev.filter((t) => t.taskId !== task.taskId));
      await refreshTasks();
      alert('任务已恢复');
    } catch (err) {
      console.error('Restore task failed:', err);
      alert(err instanceof Error ? err.message : '恢复失败，请重试');
    } finally {
      setRestoringTaskId(null);
    }
  };

  const handleTaskConfirmAssign = async () => {
    if (!user?.id || selectedTaskIdsForAssign.length === 0 || selectedClasses.length === 0) return;
    if (publishMode === 'schedule') {
      if (!scheduledPublishAt) {
        alert('请选择定时发布时间');
        return;
      }
      setAssigning(true);
      try {
        await createScheduledAssignment({
          type: 'task_package',
          taskIds: selectedTaskIdsForAssign,
          classIds: selectedClasses,
          teacherId: user.id,
          scheduledAt: new Date(scheduledPublishAt).toISOString(),
        });
        alert(`已设置定时发送，将在 ${new Date(scheduledPublishAt).toLocaleString()} 自动分配`);
        setTaskAssignDialogOpen(false);
        setSelectedClasses([]);
        setSelectedTaskIdsForAssign([]);
        setSelectedTaskIds([]);
      } catch (err) {
        console.error('Scheduled assign failed:', err);
        alert(err instanceof Error ? err.message : '定时发送设置失败');
      } finally {
        setAssigning(false);
      }
      return;
    }
    setAssigning(true);
    try {
      const created = await createCourse({ taskIds: selectedTaskIdsForAssign }, user.id);
      const result = await assignCourseToClasses(created.courseId, selectedClasses, user.id);
      const message =
        result.skippedCount && result.skippedCount > 0
          ? `成功分配 ${result.assignedCount} 个班级，${result.skippedCount} 个班级已分配过`
          : `成功分配 ${result.assignedCount} 个班级`;
      alert(message);
      setTaskAssignDialogOpen(false);
      setSelectedClasses([]);
      setSelectedTaskIdsForAssign([]);
      setSelectedTaskIds([]);
    } catch (err) {
      console.error('Assign task failed:', err);
      alert(err instanceof Error ? err.message : '分配失败，请重试');
    } finally {
      setAssigning(false);
    }
  };

  const openCourseAssignDialog = async (course: Course) => {
    if (!user?.id) return;
    setSelectedCourse(course);
    setSelectedClasses([]);
    setSelectedGroups([]);
    setPublishMode('now');
    setScheduledPublishAt('');
    setCourseAssignDialogOpen(true);
    try {
      const res = await getCourseAssignments(course.id, user.id);
      setAssignedClasses((res.classes ?? []).map((c) => ({ id: c.id, name: c.name, grade: c.grade, studentCount: c.studentCount })));
      setAssignedGroups((res.groups ?? []).map((g) => ({ id: g.id, name: g.name, classId: g.classId, studentCount: g.studentCount })));
    } catch (err) {
      console.error('Failed to load assigned classes:', err);
      setAssignedClasses([]);
      setAssignedGroups([]);
    }
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses((prev) => (prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]));
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]));
  };

  const handleRemoveAssignment = async (options: { classId?: string; groupId?: string }) => {
    if (!user?.id || !selectedCourse) return;
    try {
      await removeCourseAssignment(selectedCourse.id, user.id, options);
      if (options.classId) {
        setAssignedClasses((prev) => prev.filter((c) => c.id !== options.classId));
      }
      if (options.groupId) {
        setAssignedGroups((prev) => prev.filter((g) => g.id !== options.groupId));
      }
      await refreshCourses();
    } catch (err) {
      console.error('Remove assignment failed:', err);
      alert(err instanceof Error ? err.message : '移除分配失败，请重试');
    }
  };

  const handleCourseConfirmAssign = async () => {
    if (!user?.id || !selectedCourse || (selectedClasses.length === 0 && selectedGroups.length === 0)) return;
    if (publishMode === 'schedule') {
      if (!scheduledPublishAt) {
        alert('请选择定时发布时间');
        return;
      }
      setAssigning(true);
      try {
        await createScheduledAssignment({
          type: 'course',
          courseId: selectedCourse.id,
          classIds: selectedClasses,
          groupIds: selectedGroups.length > 0 ? selectedGroups : undefined,
          teacherId: user.id,
          scheduledAt: new Date(scheduledPublishAt).toISOString(),
        });
        alert(`已设置定时发送，将在 ${new Date(scheduledPublishAt).toLocaleString()} 自动分配`);
        setCourseAssignDialogOpen(false);
        setSelectedClasses([]);
        setSelectedGroups([]);
        setSelectedCourse(null);
        setAssignedClasses([]);
        setAssignedGroups([]);
        await refreshCourses();
      } catch (err) {
        console.error('Scheduled assign failed:', err);
        alert(err instanceof Error ? err.message : '定时发送设置失败');
      } finally {
        setAssigning(false);
      }
      return;
    }
    setAssigning(true);
    try {
      const result = await assignCourseToClasses(
        selectedCourse.id,
        selectedClasses,
        user.id,
        selectedGroups.length > 0 ? selectedGroups : undefined
      );
      const parts: string[] = [];
      if (result.assignedClassCount && result.assignedClassCount > 0) {
        const classNames = classes.filter((c) => selectedClasses.includes(c.id)).map((c) => c.name).join('、');
        parts.push(`${classNames}`);
      }
      if (result.assignedGroupCount && result.assignedGroupCount > 0) {
        const groupNames = selectedGroups
          .map((gid) => {
            for (const groups of Object.values(allGroupsByClass)) {
              const g = groups.find((x) => x.id === gid);
              if (g) return g.name;
            }
            return gid;
          })
          .join('、');
        parts.push(`分组：${groupNames}`);
      }
      alert(`成功将"${selectedCourse.title}"分配给：${parts.join('；')}`);
      setCourseAssignDialogOpen(false);
      setSelectedClasses([]);
      setSelectedGroups([]);
      setSelectedCourse(null);
      setAssignedClasses([]);
      setAssignedGroups([]);
      await refreshCourses();
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
    } catch (err) {
      console.error('Delete course failed:', err);
      alert(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handleCoursePreview = (courseId: string) => {
    window.open(`${getLearnYourWayOrigin()}/course/${courseId}`, '_blank');
  };

  const handleCoursePublish = async (course: Course) => {
    if (!user?.id) return;
    const isOwner = !course.ownerTeacherId || course.ownerTeacherId === user.id;
    if (!isOwner) return;
    setPublishingCourseId(course.id);
    try {
      const action = course.visibilityStatus === 'public' ? 'unpublish' : 'publish';
      await updateCourseVisibility(course.id, user.id, action);
      await refreshCourses();
    } catch (err) {
      console.error('Course publish failed:', err);
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setPublishingCourseId(null);
    }
  };

  const handleCourseRestore = async (course: Course) => {
    if (!user?.id) return;
    setRestoringCourseId(course.id);
    try {
      await restoreCourse(course.id, user.id);
      setDeletedCourses((prev) => prev.filter((item) => item.id !== course.id));
      await refreshCourses();
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
    setSelectedTeacherForShare(null);
    setShareTeacherSearchQuery('');
    setShareTeacherSearchResults([]);
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

  useEffect(() => {
    if (!shareDialogOpen || !shareTeacherSearchQuery.trim()) {
      setShareTeacherSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setShareTeacherSearchLoading(true);
      try {
        const { teachers } = await searchTeachers(shareTeacherSearchQuery.trim());
        setShareTeacherSearchResults(
          teachers.filter((t) => t.id !== user?.id)
        );
      } catch {
        setShareTeacherSearchResults([]);
      } finally {
        setShareTeacherSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [shareDialogOpen, shareTeacherSearchQuery, user?.id]);

  useEffect(() => {
    if (!shareDialogOpen || shareTeacherSearchResults.length === 0) return;
    const handler = (e: MouseEvent) => {
      if (shareTeacherSearchRef.current && !shareTeacherSearchRef.current.contains(e.target as Node)) {
        setShareTeacherSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareDialogOpen, shareTeacherSearchResults.length]);

  const handleCreateAccountShare = async () => {
    if (!user?.id || !sharingCourse || !selectedTeacherForShare?.id) return;
    try {
      await createCourseShare({
        courseId: sharingCourse.id,
        ownerTeacherId: user.id,
        targetTeacherId: selectedTeacherForShare.id,
        permission: sharePermission,
      });
      const { shares } = await listCourseShares(sharingCourse.id, user.id);
      setShareItems(shares as CourseShareItem[]);
      setSelectedTeacherForShare(null);
      setShareTeacherSearchQuery('');
      setShareTeacherSearchResults([]);
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

  const handleTaskEdit = async (taskId: string) => {
    if (!user?.id) return;
    setEditMode('task');
    setEditTaskId(taskId);
    setEditPlan(null);
    setEditError(null);
    setEditLoading(true);
    try {
      const { task } = await getTask(taskId);
      setEditPlan({ tasks: [task] });
      setEditPreviewTaskIndex(0);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '加载任务失败');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCourseEdit = async (courseId: string) => {
    if (!user?.id) return;
    setEditMode('course');
    setEditCourseId(courseId);
    setEditTaskId(null);
    setEditPlan(null);
    setEditError(null);
    setEditLoading(true);
    try {
      const { plan } = await getCourse(courseId);
      setEditPlan(plan);
      setEditPreviewTaskIndex(0);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '加载课程失败');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseEdit = () => {
    setEditMode(null);
    setEditTaskId(null);
    setEditCourseId(null);
    setEditPlan(null);
    setEditPreviewTaskIndex(0);
    setEditRegeneratingTaskId(null);
    setEditError(null);
    refreshTasks();
    refreshCourses();
  };

  const handleEditUpdateTask = (taskIndex: number, updates: Partial<SystemTask>) => {
    if (!editPlan) return;
    const newTasks = [...editPlan.tasks];
    if (!newTasks[taskIndex]) return;
    newTasks[taskIndex] = { ...newTasks[taskIndex], ...updates };
    setEditPlan({ ...editPlan, tasks: newTasks });
  };

  const handleEditRegenerateAsset = async (taskIndex: number) => {
    if (!editPlan || !user?.id) return;
    const task = editPlan.tasks[taskIndex];
    if (!task || (task.assetType === 'editable_text') || (task.assetType === 'math_editable') || !task.assetPrompt?.trim()) return;
    setEditRegeneratingTaskId(task.id);
    try {
      const assetResult = await generateTaskAsset(
        task.assetType,
        task.assetPrompt,
        editCourseId ?? undefined,
        task.id,
        'zh'
      );
      if (assetResult != null) {
        handleEditUpdateTask(taskIndex, {
          generatedAssetContent:
            typeof assetResult === 'object' ? JSON.stringify(assetResult) : String(assetResult),
        });
      }
    } catch (e) {
      console.error('Regenerate asset failed:', e);
    } finally {
      setEditRegeneratingTaskId(null);
    }
  };

  const handleEditNavigate = (index: number) => {
    if (!editPlan) return;
    const clamped = Math.max(0, Math.min(index, editPlan.tasks.length - 1));
    setEditPreviewTaskIndex(clamped);
  };

  const handleEditDeleteTask = () => {
    if (!editPlan || editPlan.tasks.length <= 1) return;
    const nextTasks = editPlan.tasks.filter((_, i) => i !== editPreviewTaskIndex);
    setEditPlan({ ...editPlan, tasks: nextTasks });
    setEditPreviewTaskIndex((prev) => Math.min(prev, nextTasks.length - 1));
  };

  const handleSaveEdit = async () => {
    if (!editPlan || !user?.id || editPlan.tasks.length === 0) return;
    setEditSaving(true);
    setEditError(null);
    try {
      if (editMode === 'task' && editTaskId) {
        await updateTask(editTaskId, user.id, editPlan.tasks[0]);
        handleCloseEdit();
      } else if (editMode === 'course' && editCourseId) {
        await updateCoursePlan(editCourseId, user.id, editPlan);
        handleCloseEdit();
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setEditSaving(false);
    }
  };

  const renderTaskRow = (task: TaskItem, opts: { canManage: boolean; selectable: boolean; assignable: boolean }) => {
    const selected = selectedTaskIds.includes(task.taskId);
    return (
      <div
        key={task.taskId}
        className={`flex items-center justify-between p-4 border rounded-lg ${
          selected ? 'border-blue-300 bg-blue-50/40' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {opts.selectable ? (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleTaskSelection(task.taskId)}
                  className="w-4 h-4"
                />
              ) : null}
              <p className="font-medium">{taskDisplayName(task)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{[task.subject, task.grade].filter(Boolean).join(' · ') || task.taskId.slice(0, 8)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => handleTaskPreview(task.taskId)}>
            <ExternalLink className="w-4 h-4 mr-1" />
            预览
          </Button>
          {opts.canManage && myTaskView === 'active' && (
            <Button variant="outline" size="sm" onClick={() => handleTaskEdit(task.taskId)}>
              <Pencil className="w-4 h-4 mr-1" />
              编辑
            </Button>
          )}
          {opts.assignable ? (
            <Button variant="ghost" size="sm" onClick={() => openTaskAssignDialog([task.taskId])}>
              <UserPlus className="w-4 h-4 mr-1" />
              分配
            </Button>
          ) : null}
          {opts.canManage && myTaskView === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTaskPublish(task)}
              disabled={publishingTaskId === task.taskId}
            >
              {publishingTaskId === task.taskId ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : null}
              {task.isPublic ? '取消发布' : '发布'}
            </Button>
          )}
          {opts.canManage ? (
            <>
              {myTaskView === 'active' ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTaskDelete(task)}
                    disabled={deletingTaskId === task.taskId}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deletingTaskId === task.taskId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1" />
                    )}
                    删除
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTaskRestore(task)}
                  disabled={restoringTaskId === task.taskId}
                >
                  {restoringTaskId === task.taskId ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  恢复
                </Button>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  };

  const renderCourseRow = (course: Course, canManage: boolean) => (
    <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium">{course.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{course.subject} · {course.grade}</span>
            <Badge variant={course.assignmentStatus === 'assigned' ? 'default' : 'secondary'}>
              {course.assignmentStatus === 'assigned' ? '已分配' : '未分配'}
            </Badge>
            {courseView === 'shared' && course.ownerTeacherId ? (
              <Badge variant="outline">分享自 {course.ownerTeacherName ?? course.ownerTeacherId}</Badge>
            ) : null}
            {canManage && courseView === 'active' && (
              <Badge variant={course.shareStatus === 'shared' ? 'default' : 'secondary'}>
                {course.shareStatus === 'shared' ? '已分享' : '未分享'}
              </Badge>
            )}
            <span>{course.students} 名学生</span>
            <span>完成率 {course.completion}%</span>
            {courseView === 'recycle' && course.deletedAt ? (
              <span>删除于 {new Date(course.deletedAt).toLocaleDateString()}</span>
            ) : null}
            <span>更新于 {course.lastUpdated}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={() => handleCoursePreview(course.id)}>
          <ExternalLink className="w-4 h-4 mr-1" />
          预览
        </Button>
        {canManage && courseView === 'active' && (
          <Button variant="outline" size="sm" onClick={() => handleCourseEdit(course.id)}>
            <Pencil className="w-4 h-4 mr-1" />
            编辑
          </Button>
        )}
        {courseView === 'shared' ? (
          <Button variant="ghost" size="sm" onClick={() => openCourseAssignDialog(course)}>
            <UserPlus className="w-4 h-4 mr-1" />
            分配
          </Button>
        ) : canManage ? (
          courseView === 'active' ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => openCourseAssignDialog(course)}>
                <UserPlus className="w-4 h-4 mr-1" />
                分配
              </Button>
              {(!course.ownerTeacherId || course.ownerTeacherId === user?.id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCoursePublish(course)}
                  disabled={publishingCourseId === course.id}
                >
                  {publishingCourseId === course.id ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  {course.visibilityStatus === 'public' ? '取消发布' : '发布'}
                </Button>
              )}
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
                {deletingCourseId === course.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
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
          )
        ) : (
          <Button variant="ghost" size="sm" onClick={() => openCourseAssignDialog(course)}>
            <UserPlus className="w-4 h-4 mr-1" />
            分配
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">课程管理</h1>
        <p className="text-muted-foreground mt-2">管理任务与课程，支持打包任务成课程、分配、分享课程</p>
      </div>

      {/* ========== 任务管理 ========== */}
      <Card>
        <CardHeader>
          <CardTitle>任务管理</CardTitle>
          <CardDescription>支持选择单个或者多个任务打包成课程</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant={myTaskView === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setMyTaskView('active')}>
                    我的任务
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="按任务主题或学科搜索..."
                      value={taskSearchQuery}
                      onChange={(e) => setTaskSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                  <Button variant={myTaskView === 'recycle' ? 'default' : 'outline'} size="sm" onClick={() => setMyTaskView('recycle')}>
                    回收站
                  </Button>
                </div>
              </div>
              {myTaskView === 'recycle' && loadingDeletedTasks ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMyTasks.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  {myTaskView === 'active' ? '暂无任务' : '回收站暂无任务'}
                </p>
              ) : (
                <>
                  {myTaskView === 'active' && (
                    <div className="flex items-center justify-between gap-4 py-3 px-4 bg-primary/10 border border-primary/20 rounded-lg">
                      <span className="text-sm font-medium">已选 {selectedTaskIds.length} 个任务</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTaskIds([])}
                          disabled={selectedTaskIds.length === 0}
                        >
                          取消选择
                        </Button>
                        <Button
                          onClick={() => openTaskAssignDialog(selectedTaskIds)}
                          disabled={selectedTaskIds.length === 0}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          打包课程并分配
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {filteredMyTasks.map((task) =>
                      renderTaskRow(task, { canManage: true, selectable: myTaskView === 'active', assignable: myTaskView === 'active' })
                    )}
                  </div>
                </>
              )}
          </div>
        </CardContent>
      </Card>

      {/* ========== 课程管理 ========== */}
      <Card>
        <CardHeader>
          <CardTitle>课程管理</CardTitle>
          <CardDescription>管理课程的分配、分享与删除</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant={courseView === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setCourseView('active')}>
                    我的课程
                  </Button>
                  <Button variant={courseView === 'shared' ? 'default' : 'outline'} size="sm" onClick={() => setCourseView('shared')}>
                    分享给我的
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索课程..."
                    value={courseSearchQuery}
                      onChange={(e) => setCourseSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                  <Button variant={courseView === 'recycle' ? 'default' : 'outline'} size="sm" onClick={() => setCourseView('recycle')}>
                    回收站
                  </Button>
                </div>
              </div>
              {(courseView === 'recycle' && loadingDeletedCourses) || (courseView === 'shared' && loadingSharedCourses) ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCourses.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  {courseView === 'active' ? '暂无课程' : courseView === 'shared' ? '暂无分享给我的课程' : '回收站暂无课程'}
                </p>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto">
                  {filteredCourses.map((course) => renderCourseRow(course, true))}
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* 任务分配弹窗 */}
      {taskAssignDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-[640px] max-h-[85vh] flex flex-col overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>打包课程并分配</CardTitle>
                  <CardDescription className="mt-1">已选任务：{selectedTaskIdsForAssign.length} 个</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setTaskAssignDialogOpen(false)} className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                <p className="text-sm font-medium">发布方式</p>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={publishMode === 'now'} onChange={() => setPublishMode('now')} />
                    立即发送
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={publishMode === 'schedule'} onChange={() => setPublishMode('schedule')} />
                    定时发送
                  </label>
                </div>
                {publishMode === 'schedule' && (
                  <Input
                    type="datetime-local"
                    value={scheduledPublishAt}
                    onChange={(e) => setScheduledPublishAt(e.target.value)}
                  />
                )}
              </div>
              <p className="text-sm font-medium mb-2">选择要分配的班级（可多选）</p>
              {classesLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : classes.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center">暂无班级，请先在班级管理页创建</p>
              ) : (
                <div className="space-y-2">
                  {classes.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${selectedClasses.includes(c.id) ? 'bg-blue-50 border-blue-300' : ''}`}
                      onClick={() => handleClassToggle(c.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClasses.includes(c.id)}
                        onChange={() => handleClassToggle(c.id)}
                        className="mr-3 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          <Badge variant="secondary" className="text-xs">{c.grade || '未设年级'}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{c.studentCount} 名学生</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="border-t p-4 flex justify-end gap-3 bg-gray-50">
              <Button variant="outline" onClick={() => setTaskAssignDialogOpen(false)}>取消</Button>
              <Button
                onClick={handleTaskConfirmAssign}
                disabled={selectedClasses.length === 0 || assigning || (publishMode === 'schedule' && !scheduledPublishAt)}
              >
                {assigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                确认分配
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 课程分配弹窗 */}
      {courseAssignDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-[640px] max-h-[85vh] flex flex-col overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>分配课程自学任务</CardTitle>
                  <CardDescription className="mt-1">课程：{selectedCourse?.title}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCourseAssignDialogOpen(false)} className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                <p className="text-sm font-medium">发布方式</p>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={publishMode === 'now'} onChange={() => setPublishMode('now')} />
                    立即发送
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={publishMode === 'schedule'} onChange={() => setPublishMode('schedule')} />
                    定时发送
                  </label>
                </div>
                {publishMode === 'schedule' && (
                  <Input
                    type="datetime-local"
                    value={scheduledPublishAt}
                    onChange={(e) => setScheduledPublishAt(e.target.value)}
                  />
                )}
              </div>
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
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAssignment({ classId: c.id })} className="text-red-600 hover:text-red-700">
                          移除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">已推荐分组（可移除）</p>
                {assignedGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">当前暂无已推荐分组</p>
                ) : (
                  <div className="space-y-2">
                    {assignedGroups.map((g) => (
                      <div key={g.id} className="flex items-center justify-between border rounded-md p-2">
                        <div className="text-sm">
                          <span className="font-medium">{g.name}</span>
                          <span className="text-muted-foreground ml-2">· {g.studentCount} 人</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAssignment({ groupId: g.id })} className="text-red-600 hover:text-red-700">
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
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
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
              <div>
                <p className="text-sm font-medium mb-2">或推荐给分组（可多选）</p>
                {Object.keys(allGroupsByClass).length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无分组，请先在班级管理页创建分组</p>
                ) : (
                  <div className="space-y-2">
                    {classes.map((c) => {
                      const classGroups = allGroupsByClass[c.id] ?? [];
                      if (classGroups.length === 0) return null;
                      return (
                        <div key={c.id} className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">{c.name}</p>
                          <div className="flex flex-wrap gap-2">
                            {classGroups.map((g) => {
                              const alreadyAssigned = assignedGroups.some((a) => a.id === g.id);
                              return (
                                <div
                                  key={g.id}
                                  className={`flex items-center gap-1 px-2 py-1 rounded border cursor-pointer text-sm ${alreadyAssigned ? 'bg-gray-50 opacity-70' : 'hover:bg-gray-50'} ${selectedGroups.includes(g.id) ? 'bg-blue-50 border-blue-300' : ''}`}
                                  onClick={() => !alreadyAssigned && handleGroupToggle(g.id)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedGroups.includes(g.id)}
                                    disabled={alreadyAssigned}
                                    onChange={() => !alreadyAssigned && handleGroupToggle(g.id)}
                                    className="w-3 h-3"
                                  />
                                  <span>{g.name}</span>
                                  <span className="text-muted-foreground">({g.studentCount})</span>
                                  {alreadyAssigned && <Badge variant="outline" className="text-xs ml-1">已推荐</Badge>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
            <div className="border-t p-4 flex justify-end gap-3 bg-gray-50">
              <Button variant="outline" onClick={() => setCourseAssignDialogOpen(false)}>取消</Button>
              <Button
                onClick={handleCourseConfirmAssign}
                disabled={(selectedClasses.length === 0 && selectedGroups.length === 0) || assigning || (publishMode === 'schedule' && !scheduledPublishAt)}
              >
                {assigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                确认分配
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 课程分享弹窗 */}
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
              <div className="flex flex-wrap items-end gap-2">
                <div className="relative flex-1 min-w-[200px]" ref={shareTeacherSearchRef}>
                  {selectedTeacherForShare ? (
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
                      <span className="text-sm">已选择：{selectedTeacherForShare.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTeacherForShare(null)} className="h-6 px-2 text-muted-foreground">
                        清除
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Input
                        placeholder="搜索教师姓名或邮箱..."
                        value={shareTeacherSearchQuery}
                        onChange={(e) => setShareTeacherSearchQuery(e.target.value)}
                        className="pr-8"
                      />
                      {shareTeacherSearchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {shareTeacherSearchResults.length > 0 && !shareTeacherSearchLoading && (
                        <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-background shadow-lg z-10 max-h-48 overflow-y-auto">
                          {shareTeacherSearchResults.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                              onClick={() => {
                                setSelectedTeacherForShare(t);
                                setShareTeacherSearchQuery('');
                                setShareTeacherSearchResults([]);
                              }}
                            >
                              {t.name}{t.email ? ` (${t.email})` : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <select
                  className="border rounded-md px-3 py-2 text-sm h-10"
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value as 'view' | 'edit')}
                >
                  <option value="view">view（可预览/分配）</option>
                  <option value="edit">edit（可编辑）</option>
                </select>
                <Button onClick={handleCreateAccountShare} disabled={!selectedTeacherForShare}>
                  按账号分享
                </Button>
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
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : shareItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无分享记录</p>
                ) : (
                  <div className="space-y-2">
                    {shareItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border rounded-md p-3">
                        <div className="text-sm">
                          <div>
                            {item.target_teacher_id ? `教师：${item.target_teacher_name ?? item.target_teacher_id}` : `链接：${item.share_token}`}
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

      {/* 任务/课程编辑层 */}
      {editMode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <CardHeader className="border-b shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editMode === 'task' ? '编辑任务' : '编辑课程'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCloseEdit} className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto flex-1 min-h-0">
              {editLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">加载中…</p>
                </div>
              ) : editError ? (
                <div className="py-8 text-center">
                  <p className="text-red-600 mb-4">{editError}</p>
                  <Button variant="outline" onClick={handleCloseEdit}>关闭</Button>
                </div>
              ) : editPlan && editPlan.tasks.length > 0 ? (
                <TaskPreviewEdit
                  key={editPlan.tasks[editPreviewTaskIndex]?.id}
                  task={editPlan.tasks[editPreviewTaskIndex]}
                  taskIndex={editPreviewTaskIndex}
                  totalTasks={editPlan.tasks.length}
                  onUpdate={(updates) => handleEditUpdateTask(editPreviewTaskIndex, updates)}
                  onNavigate={editPlan.tasks.length > 1 ? handleEditNavigate : undefined}
                  onDelete={editMode === 'course' && editPlan.tasks.length > 1 ? handleEditDeleteTask : undefined}
                  mode="edit"
                  regeneratingTaskId={editRegeneratingTaskId}
                  onRegenerate={() => handleEditRegenerateAsset(editPreviewTaskIndex)}
                  language="zh"
                />
              ) : null}
            </CardContent>
            {editPlan && editPlan.tasks.length > 0 && !editLoading && !editError && (
              <div className="border-t p-4 flex justify-end gap-3 bg-gray-50 shrink-0">
                <Button variant="outline" onClick={handleCloseEdit}>
                  取消
                </Button>
                <Button onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  保存
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { ExternalLink, FileText, Globe, Loader2, Search, Trash2, UserPlus, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import {
  assignCourseToClasses,
  createCourse,
  deleteTask,
  listPublicTasks,
  listTeacherClasses,
  listTeacherTasks,
  restoreTask,
  type ClassItem,
  updateTaskVisibility,
} from '@/lib/backendApi';

interface TaskItem {
  taskId: string;
  subject?: string;
  grade?: string;
  topic?: string;
  taskType?: string;
  durationMin?: number;
  isPublic?: boolean;
  teacherId?: string;
}

interface Class extends ClassItem {
  studentCount: number;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  mastery: '掌握型任务',
  guided: '引导型任务',
  autonomous: '自主型任务',
};

export function TaskManagementPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'my' | 'public'>('my');
  const [myTaskView, setMyTaskView] = useState<'active' | 'recycle'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [myTasks, setMyTasks] = useState<TaskItem[]>([]);
  const [publicTasks, setPublicTasks] = useState<TaskItem[]>([]);
  const [loadingMyTasks, setLoadingMyTasks] = useState(false);
  const [loadingPublicTasks, setLoadingPublicTasks] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [publishingTaskId, setPublishingTaskId] = useState<string | null>(null);
  const [restoringTaskId, setRestoringTaskId] = useState<string | null>(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTaskIdsForAssign, setSelectedTaskIdsForAssign] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoadingMyTasks(true);
    listTeacherTasks(user.id, { deletedOnly: myTaskView === 'recycle' })
      .then((res) => setMyTasks(res.tasks ?? []))
      .catch((err) => console.error('Failed to load my tasks:', err))
      .finally(() => setLoadingMyTasks(false));
  }, [user?.id, myTaskView]);

  useEffect(() => {
    if (myTaskView === 'recycle') {
      setSelectedTaskIds([]);
    }
  }, [myTaskView]);

  useEffect(() => {
    if (!user?.id || tab !== 'public') return;
    setLoadingPublicTasks(true);
    listPublicTasks()
      .then((res) => {
        const others = (res.tasks ?? []).filter((task) => task.teacherId !== user.id);
        setPublicTasks(others);
      })
      .catch((err) => console.error('Failed to load public tasks:', err))
      .finally(() => setLoadingPublicTasks(false));
  }, [tab, user?.id]);

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
  }, [assignDialogOpen, user?.id]);

  const filteredMyTasks = useMemo(
    () =>
      myTasks.filter((task) =>
        `${task.topic || ''} ${task.subject || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [myTasks, searchQuery]
  );

  const filteredPublicTasks = useMemo(
    () =>
      publicTasks.filter((task) =>
        `${task.topic || ''} ${task.subject || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [publicTasks, searchQuery]
  );

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  };

  const taskDisplayName = (task: TaskItem) =>
    [
      task.topic || task.subject || '未命名任务',
      task.taskType ? (TASK_TYPE_LABELS[task.taskType] ?? task.taskType) : null,
      task.durationMin ? `${task.durationMin}分钟` : null,
    ]
      .filter(Boolean)
      .join(' - ');

  const openTaskAssignDialog = (taskIds: string[]) => {
    if (!taskIds.length) return;
    setSelectedTaskIdsForAssign(taskIds);
    setSelectedClasses([]);
    setAssignDialogOpen(true);
  };

  const handleTaskPreview = async (taskId: string) => {
    if (!user?.id) return;
    try {
      const result = await createCourse({ taskIds: [taskId] }, user.id);
      window.open(result.url, '_blank');
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
      setMyTasks((prev) => prev.filter((t) => t.taskId !== task.taskId));
      setSelectedTaskIds((prev) => prev.filter((id) => id !== task.taskId));
    } catch (err) {
      console.error('Delete task failed:', err);
      alert(err instanceof Error ? err.message : '删除失败，请重试');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleTaskPublicToggle = async (task: TaskItem) => {
    if (!user?.id) return;
    setPublishingTaskId(task.taskId);
    try {
      const action = task.isPublic ? 'unpublish' : 'publish';
      await updateTaskVisibility(task.taskId, user.id, action);
      setMyTasks((prev) =>
        prev.map((item) => (item.taskId === task.taskId ? { ...item, isPublic: !task.isPublic } : item))
      );
    } catch (err) {
      console.error('Toggle task visibility failed:', err);
      alert(err instanceof Error ? err.message : '更新公开状态失败');
    } finally {
      setPublishingTaskId(null);
    }
  };

  const handleTaskRestore = async (task: TaskItem) => {
    if (!user?.id) return;
    setRestoringTaskId(task.taskId);
    try {
      await restoreTask(task.taskId, user.id);
      setMyTasks((prev) => prev.filter((t) => t.taskId !== task.taskId));
      alert('任务已恢复');
    } catch (err) {
      console.error('Restore task failed:', err);
      alert(err instanceof Error ? err.message : '恢复失败，请重试');
    } finally {
      setRestoringTaskId(null);
    }
  };

  const handleConfirmAssign = async () => {
    if (!user?.id || selectedTaskIdsForAssign.length === 0 || selectedClasses.length === 0) return;
    setAssigning(true);
    try {
      const created = await createCourse({ taskIds: selectedTaskIdsForAssign }, user.id);
      const result = await assignCourseToClasses(created.courseId, selectedClasses, user.id);
      const message =
        result.skippedCount && result.skippedCount > 0
          ? `成功分配 ${result.assignedCount} 个班级，${result.skippedCount} 个班级已分配过`
          : `成功分配 ${result.assignedCount} 个班级`;
      alert(message);
      setAssignDialogOpen(false);
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

  const handleClassToggle = (classId: string) => {
    setSelectedClasses((prev) => (prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]));
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
        <div className="flex items-center gap-3">
          {opts.selectable ? (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => toggleTaskSelection(task.taskId)}
              className="w-4 h-4"
            />
          ) : null}
          <FileText className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{taskDisplayName(task)}</p>
            <p className="text-sm text-muted-foreground">{[task.subject, task.grade].filter(Boolean).join(' · ') || task.taskId.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={task.isPublic ? 'default' : 'secondary'}>{task.isPublic ? '已公开' : '未公开'}</Badge>
          <Button variant="outline" size="sm" onClick={() => handleTaskPreview(task.taskId)}>
            <ExternalLink className="w-4 h-4 mr-1" />
            预览
          </Button>
          {opts.assignable ? (
            <Button variant="ghost" size="sm" onClick={() => openTaskAssignDialog([task.taskId])}>
              <UserPlus className="w-4 h-4 mr-1" />
              分配
            </Button>
          ) : null}
          {opts.canManage ? (
            <>
              {myTaskView === 'active' ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTaskPublicToggle(task)}
                    disabled={publishingTaskId === task.taskId}
                  >
                    <Globe className="w-4 h-4 mr-1" />
                    {task.isPublic ? '取消公开' : '公开'}
                  </Button>
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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">任务管理</h1>
        <p className="text-muted-foreground mt-2">管理自建任务与公开任务，并支持打包课程后分配</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="按任务主题或学科搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'my' | 'public')}>
        <TabsList>
          <TabsTrigger value="my">自建任务</TabsTrigger>
          <TabsTrigger value="public">公开任务</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>我创建的任务（含已公开/未公开）</CardTitle>
              <CardDescription>
                {myTaskView === 'active' ? '可选择一个或者多个任务后，“打包课程并分配”' : '回收站（90天内可恢复）'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant={myTaskView === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMyTaskView('active')}
                  >
                    在用任务
                  </Button>
                  <Button
                    variant={myTaskView === 'recycle' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMyTaskView('recycle')}
                  >
                    回收站
                  </Button>
                </div>
                <Button
                  onClick={() => openTaskAssignDialog(selectedTaskIds)}
                  disabled={myTaskView !== 'active' || selectedTaskIds.length === 0}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  打包课程并分配（{selectedTaskIds.length}）
                </Button>
              </div>
              {loadingMyTasks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMyTasks.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">暂无任务</p>
              ) : (
                <div className="space-y-2">
                  {filteredMyTasks.map((task) =>
                    renderTaskRow(task, {
                      canManage: true,
                      selectable: myTaskView === 'active',
                      assignable: myTaskView === 'active',
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="public" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>他人公开任务</CardTitle>
              <CardDescription>仅支持预览或分配，不可编辑/删除</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPublicTasks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPublicTasks.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">暂无他人公开任务</p>
              ) : (
                <div className="space-y-2">
                  {filteredPublicTasks.map((task) =>
                    renderTaskRow(
                      { ...task, isPublic: true },
                      { canManage: false, selectable: false, assignable: true }
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {assignDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-[640px] max-h-[85vh] flex flex-col overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>打包课程并分配</CardTitle>
                  <CardDescription className="mt-1">已选任务：{selectedTaskIdsForAssign.length} 个</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setAssignDialogOpen(false)} className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 overflow-y-auto">
              <p className="text-sm font-medium mb-2">选择要分配的班级（可多选）</p>
              {classesLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
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
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>取消</Button>
              <Button onClick={handleConfirmAssign} disabled={selectedClasses.length === 0 || assigning}>
                {assigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                确认分配
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

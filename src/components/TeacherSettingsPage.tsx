import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { useAuth } from './AuthContext';
import {
  Settings,
  User,
  GraduationCap,
  Save,
  AlertCircle,
  Bell,
} from 'lucide-react';
import { AccountInfoCard } from './settings/AccountInfoCard';
import { ChangePasswordCard } from './settings/ChangePasswordCard';
import {
  type TeacherPreferences,
  defaultTeacherPreferences,
  getTeacherPreferencesFromProfile,
  GRADE_OPTIONS,
} from '../hooks/useTeacherPreferences';

const subjects = [
  { id: 'math', name: '数学' },
  { id: 'chinese', name: '语文' },
  { id: 'english', name: '英语' },
  { id: 'physics', name: '物理' },
  { id: 'chemistry', name: '化学' },
  { id: 'biology', name: '生物' },
  { id: 'history', name: '历史' },
  { id: 'geography', name: '地理' },
  { id: 'other', name: '其他' },
];

export function TeacherSettingsPage() {
  const { user, preferences, updateProfilePreferences, changePassword } = useAuth();
  const [prefs, setPrefs] = useState<TeacherPreferences>(defaultTeacherPreferences);
  const [lastSavedPrefs, setLastSavedPrefs] = useState<TeacherPreferences>(defaultTeacherPreferences);
  const [isPrefsSaved, setIsPrefsSaved] = useState(false);
  const [prefsError, setPrefsError] = useState('');
  const [isPrefsLoading, setIsPrefsLoading] = useState(false);

  useEffect(() => {
    const fromProfile = getTeacherPreferencesFromProfile(preferences);
    setPrefs(fromProfile);
    setLastSavedPrefs(fromProfile);
  }, [
    preferences.defaultGrade,
    preferences.defaultSubject,
    preferences.notifications?.studentJoinedClass,
    preferences.notifications?.taskSubmission,
  ]);

  const handleSavePrefs = async () => {
    if (!user?.id) return;
    setIsPrefsLoading(true);
    setPrefsError('');
    try {
      await updateProfilePreferences({
        defaultGrade: prefs.defaultGrade,
        defaultSubject: prefs.defaultSubject,
        notifications: {
          ...preferences.notifications,
          studentJoinedClass: prefs.notifications.studentJoinedClass,
          taskSubmission: prefs.notifications.taskSubmission,
        },
      });
      setLastSavedPrefs(prefs);
      setIsPrefsSaved(true);
      setTimeout(() => setIsPrefsSaved(false), 3000);
    } catch (e: any) {
      setPrefsError(e.message || '保存失败');
    } finally {
      setIsPrefsLoading(false);
    }
  };

  const hasPrefsChanges =
    prefs.defaultGrade !== lastSavedPrefs.defaultGrade ||
    prefs.defaultSubject !== lastSavedPrefs.defaultSubject ||
    prefs.notifications.studentJoinedClass !== lastSavedPrefs.notifications.studentJoinedClass ||
    prefs.notifications.taskSubmission !== lastSavedPrefs.notifications.taskSubmission;

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>请先登录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">教师设置</h1>
          </div>
          <p className="text-muted-foreground">管理您的个人资料、教学偏好与账户安全</p>
        </div>

        <div className="space-y-6">
          {/* 个人资料 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                个人资料
              </CardTitle>
              <CardDescription>您的账户基本信息（仅展示）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">姓名</Label>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">邮箱</Label>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">角色</Label>
                <Badge variant="outline">教师</Badge>
              </div>
            </CardContent>
          </Card>

          {/* 教学偏好 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                教学偏好
              </CardTitle>
              <CardDescription>创建任务或课程时自动预填的默认值</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>默认年级</Label>
                <Select
                  value={prefs.defaultGrade}
                  onValueChange={(v) => setPrefs((p) => ({ ...p, defaultGrade: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>默认科目</Label>
                <Select
                  value={prefs.defaultSubject}
                  onValueChange={(v) => setPrefs((p) => ({ ...p, defaultSubject: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {prefsError && <p className="text-sm text-destructive">{prefsError}</p>}
              {isPrefsSaved && <p className="text-sm text-green-600">偏好已保存</p>}
              <Button onClick={handleSavePrefs} disabled={!hasPrefsChanges || isPrefsLoading}>
                {isPrefsLoading ? (
                  '保存中…'
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存偏好
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 通知设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                通知设置
              </CardTitle>
              <CardDescription>选择您希望收到的通知类型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>学生加入班级</Label>
                  <p className="text-sm text-muted-foreground">当学生被添加到您的班级时通知</p>
                </div>
                <Switch
                  checked={prefs.notifications.studentJoinedClass}
                  onCheckedChange={(v) =>
                    setPrefs((p) => ({
                      ...p,
                      notifications: { ...p.notifications, studentJoinedClass: v },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>任务提交</Label>
                  <p className="text-sm text-muted-foreground">当学生提交任务时通知</p>
                </div>
                <Switch
                  checked={prefs.notifications.taskSubmission}
                  onCheckedChange={(v) =>
                    setPrefs((p) => ({
                      ...p,
                      notifications: { ...p.notifications, taskSubmission: v },
                    }))
                  }
                />
              </div>
              <Button onClick={handleSavePrefs} disabled={!hasPrefsChanges || isPrefsLoading}>
                保存通知设置
              </Button>
            </CardContent>
          </Card>

          {/* 账户信息 */}
          <AccountInfoCard userId={user.id} roleLabel="教师" />

          {/* 修改密码 */}
          <ChangePasswordCard onChangePassword={changePassword} />
        </div>
      </div>
    </div>
  );
}

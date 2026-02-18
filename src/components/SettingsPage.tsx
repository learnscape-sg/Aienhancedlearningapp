import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { useAuth } from './AuthContext';
import { Settings, User, Heart, GraduationCap, Save, AlertCircle, Bell } from 'lucide-react';
import { AccountInfoCard } from './settings/AccountInfoCard';
import { ChangePasswordCard } from './settings/ChangePasswordCard';
import { defaultNotifications } from '../types/preferences';

const interests = [
  { id: 'basketball', name: '篮球', icon: '🏀' },
  { id: 'music', name: '音乐', icon: '🎵' },
  { id: 'art', name: '美术', icon: '🎨' },
  { id: 'reading', name: '阅读', icon: '📚' },
  { id: 'games', name: '游戏', icon: '🎮' },
  { id: 'photography', name: '摄影', icon: '📸' },
  { id: 'science', name: '科学', icon: '🔬' },
  { id: 'geography', name: '地理', icon: '🌍' },
  { id: 'math', name: '数学', icon: '🧮' },
];

const grades = [
  { id: 'grade1', name: '一年级' },
  { id: 'grade2', name: '二年级' },
  { id: 'grade3', name: '三年级' },
  { id: 'grade4', name: '四年级' },
  { id: 'grade5', name: '五年级' },
  { id: 'grade6', name: '六年级' },
  { id: 'grade7', name: '七年级' },
  { id: 'grade8', name: '八年级' },
  { id: 'grade9', name: '九年级' },
  { id: 'grade10', name: '十年级' },
  { id: 'grade11', name: '十一年级' },
  { id: 'grade12', name: '十二年级' },
];

export function SettingsPage() {
  const { user, preferences, updateProfilePreferences, changePassword } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState(user?.grade || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);
  const [notifications, setNotifications] = useState({
    newCourseAssigned: defaultNotifications.newCourseAssigned,
    deadlineReminder: defaultNotifications.deadlineReminder,
  });

  useEffect(() => {
    setNotifications({
      newCourseAssigned: preferences.notifications?.newCourseAssigned ?? defaultNotifications.newCourseAssigned,
      deadlineReminder: preferences.notifications?.deadlineReminder ?? defaultNotifications.deadlineReminder,
    });
  }, [preferences.notifications?.newCourseAssigned, preferences.notifications?.deadlineReminder]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId]
    );
  };

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    setError('');
    try {
      await updateProfilePreferences({
        grade: selectedGrade,
        interests: selectedInterests,
        notifications: {
          ...preferences.notifications,
          newCourseAssigned: notifications.newCourseAssigned,
          deadlineReminder: notifications.deadlineReminder,
        },
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || '保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges =
    selectedGrade !== user?.grade ||
    JSON.stringify([...selectedInterests].sort()) !== JSON.stringify([...(user?.interests || [])].sort()) ||
    notifications.newCourseAssigned !== (preferences.notifications?.newCourseAssigned ?? defaultNotifications.newCourseAssigned) ||
    notifications.deadlineReminder !== (preferences.notifications?.deadlineReminder ?? defaultNotifications.deadlineReminder);

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

  const roleLabel = user.role === 'student' ? '学生' : user.role === 'teacher' ? '教师' : '家长';

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">学习偏好设置</h1>
          </div>
          <p className="text-muted-foreground">修改您的年级和兴趣设置，以获得更个性化的学习体验</p>
        </div>

        <div className="space-y-6">
          {/* 个人资料 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                个人资料
              </CardTitle>
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
                <Badge variant="outline">{roleLabel}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* 年级设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                年级设置
              </CardTitle>
              <CardDescription>选择您当前的年级，我们会为您推荐适合的学习内容</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedGrade} onValueChange={handleGradeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择年级" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* 兴趣爱好 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                兴趣爱好
              </CardTitle>
              <CardDescription>选择您感兴趣的领域，我们会据此个性化您的学习内容（可多选）</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {interests.map((interest) => (
                  <Card
                    key={interest.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedInterests.includes(interest.id)
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleInterest(interest.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">{interest.icon}</div>
                      <p className="text-sm font-medium">{interest.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {selectedInterests.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm text-muted-foreground mb-2 block">已选择的兴趣：</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedInterests.map((interestId) => {
                      const interest = interests.find((i) => i.id === interestId);
                      return interest ? (
                        <Badge key={interestId} variant="secondary">
                          {interest.icon} {interest.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
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
                  <Label>新课程/任务分配</Label>
                  <p className="text-sm text-muted-foreground">当教师为您分配新课程或任务时通知</p>
                </div>
                <Switch
                  checked={notifications.newCourseAssigned}
                  onCheckedChange={(v) => setNotifications((n) => ({ ...n, newCourseAssigned: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>截止日期提醒</Label>
                  <p className="text-sm text-muted-foreground">任务截止日期临近时通知</p>
                </div>
                <Switch
                  checked={notifications.deadlineReminder}
                  onCheckedChange={(v) => setNotifications((n) => ({ ...n, deadlineReminder: v }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* 保存按钮 */}
          <Card>
            <CardContent className="pt-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              {isSaved && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-700 dark:text-green-400">设置已保存！</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {hasChanges ? '您有未保存的更改' : '所有更改已保存'}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isLoading || selectedInterests.length === 0 || !selectedGrade}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存设置
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 账户信息 */}
          <AccountInfoCard userId={user.id} roleLabel={roleLabel} />

          {/* 修改密码 */}
          <ChangePasswordCard onChangePassword={changePassword} />
        </div>
      </div>
    </div>
  );
}

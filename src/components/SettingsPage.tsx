import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useAuth } from './AuthContext';
import { Settings, User, Heart, GraduationCap, Save, AlertCircle } from 'lucide-react';

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
  const { user, updateUserPreferences } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState(user?.grade || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
    setIsSaved(false);
  };

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    setIsSaved(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    try {
      await updateUserPreferences(selectedGrade, selectedInterests);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000); // Hide success message after 3 seconds
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      setError(error.message || '保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = selectedGrade !== user?.grade || 
                    JSON.stringify(selectedInterests.sort()) !== JSON.stringify(user?.interests?.sort() || []);

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>请先登录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="w-8 h-8 text-[#4F46E5]" />
            <h1 className="text-3xl text-[#4F46E5]">学习偏好设置</h1>
          </div>
          <p className="text-gray-600">修改您的年级和兴趣设置，以获得更个性化的学习体验</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>个人资料</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">姓名</Label>
                  <p className="font-medium">{user.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">邮箱</Label>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">角色</Label>
                  <Badge variant="outline">{user.role === 'student' ? '学生' : user.role}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Grade Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5" />
                  <span>年级设置</span>
                </CardTitle>
                <CardDescription>
                  选择您当前的年级，我们会为您推荐适合的学习内容
                </CardDescription>
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

            {/* Interests Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="w-5 h-5" />
                  <span>兴趣爱好</span>
                </CardTitle>
                <CardDescription>
                  选择您感兴趣的领域，我们会据此个性化您的学习内容（可多选）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {interests.map((interest) => (
                    <Card
                      key={interest.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedInterests.includes(interest.id)
                          ? 'ring-2 ring-[#4F46E5] bg-[#4F46E5]/5'
                          : 'hover:bg-gray-50'
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

                {/* Selected Interests Summary */}
                {selectedInterests.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm text-gray-600 mb-2 block">已选择的兴趣：</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedInterests.map(interestId => {
                        const interest = interests.find(i => i.id === interestId);
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

            {/* Save Button */}
            <Card>
              <CardContent className="pt-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {isSaved && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Save className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-green-600">设置已保存！</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {hasChanges ? '您有未保存的更改' : '所有更改已保存'}
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isLoading || selectedInterests.length === 0 || !selectedGrade}
                    className="px-6"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>保存中...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Save className="w-4 h-4" />
                        <span>保存设置</span>
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
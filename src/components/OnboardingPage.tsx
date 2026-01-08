import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from './AuthContext';
import { BookOpen, Music, Palette, Gamepad2, Camera, Microscope, Globe, Calculator } from 'lucide-react';

interface OnboardingPageProps {
  onComplete: () => void;
}

const interests = [
  { id: 'basketball', name: '篮球', icon: '🏀', image: 'https://images.unsplash.com/photo-1743105351315-540bce258f1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwc3BvcnRzJTIwaWNvbnxlbnwxfHx8fDE3NTg2ODYzOTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 'music', name: '音乐', icon: '🎵', image: 'https://images.unsplash.com/photo-1705045206911-3599644d4d09?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGluc3RydW1lbnRzJTIwYXJ0c3xlbnwxfHx8fDE3NTg2ODY0MDN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 'art', name: '美术', icon: '🎨', image: 'https://images.unsplash.com/photo-1692859532235-c93fa73bd5d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjBwYWludGluZyUyMGNyZWF0aXZlfGVufDF8fHx8MTc1ODY4NjQwNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
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

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { updateUserPreferences } = useAuth();

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError('');
    try {
      await updateUserPreferences(selectedGrade, selectedInterests);
      onComplete();
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      setError(error.message || 'Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = selectedGrade && selectedInterests.length > 0;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-[#4F46E5]">个性化设置</CardTitle>
            <CardDescription className="text-lg">
              让我们了解您的年级和兴趣，为您推荐最合适的学习内容
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Grade Selection */}
            <div className="space-y-4">
              <Label className="text-lg">选择您的年级</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
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
            </div>

            {/* Interest Selection */}
            <div className="space-y-4">
              <Label className="text-lg">选择您的兴趣爱好（可多选）</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                      {interest.image ? (
                        <ImageWithFallback
                          src={interest.image}
                          alt={interest.name}
                          className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                        />
                      ) : (
                        <div className="text-4xl mb-2">{interest.icon}</div>
                      )}
                      <p className="text-sm">{interest.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Selected Summary */}
            {(selectedGrade || selectedInterests.length > 0) && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="mb-2">您的选择：</h3>
                {selectedGrade && (
                  <p className="text-sm text-gray-600">
                    年级：{grades.find(g => g.id === selectedGrade)?.name}
                  </p>
                )}
                {selectedInterests.length > 0 && (
                  <p className="text-sm text-gray-600">
                    兴趣：{selectedInterests.map(id => 
                      interests.find(i => i.id === id)?.name
                    ).join('、')}
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* CTA Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleComplete}
                disabled={!canProceed || isLoading}
                className="px-8 py-2 bg-[#4F46E5] hover:bg-[#4338CA]"
                size="lg"
              >
                {isLoading ? '保存中...' : '开始学习之旅'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
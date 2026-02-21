import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  BookOpen, 
  Trophy, 
  Play, 
  Target,
  Loader2
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useProgressTracker } from './ProgressTracker';
import { getStudentCourses } from '@/lib/backendApi';

interface HomePageProps {
  onStartChapter: (chapterId: string) => void;
}

const COURSE_COLORS = ['#34A853', '#FBBC05', '#1A73E8', '#EA4335'];

const achievements = [
  { name: '连续学习7天', icon: '🔥', earned: true },
  { name: '完成10个章节', icon: '📚', earned: true },
  { name: '测验满分', icon: '🏆', earned: false },
  { name: '学习达人', icon: '⭐', earned: false }
];

export function HomePage({ onStartChapter }: HomePageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { progressData } = useProgressTracker();
  const [assignedCourses, setAssignedCourses] = useState<{ courseId: string; topic?: string; teacherName?: string }[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setCoursesLoading(false);
      return;
    }
    getStudentCourses(user.id)
      .then((data) => setAssignedCourses(data.courses || []))
      .catch(() => setAssignedCourses([]))
      .finally(() => setCoursesLoading(false));
  }, [user?.id]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg p-6">
        <h1 className="text-2xl mb-2">
          {getGreeting()}，{user?.name}！
        </h1>
        <p className="text-primary-foreground/80">
          继续您的学习之旅，今天也要加油哦！
        </p>
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span className="text-sm">今日目标：完成2个章节</span>
          </div>
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span className="text-sm">学习积分：1,250</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Courses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Learning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span>继续学习</span>
              </CardTitle>
              <CardDescription>
                从上次学习的地方继续
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {coursesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : assignedCourses.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">暂无分配课程，等待老师分配后即可在此学习</p>
              ) : (
                assignedCourses.map((course, idx) => {
                  const courseProgress = progressData[course.courseId];
                  const actualProgress = courseProgress?.progress || 0;
                  const isCompleted = courseProgress?.completed || false;
                  const color = COURSE_COLORS[idx % COURSE_COLORS.length];
                  return (
                    <Card key={course.courseId} className="border-l-4" style={{ borderLeftColor: color }}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-medium">{course.topic || course.courseId}</h3>
                            <p className="text-sm text-muted-foreground">
                              {course.teacherName ? `来自 ${course.teacherName} 的分配` : '分配给我的自学任务'}
                            </p>
                            {isCompleted && (
                              <Badge variant="secondary" className="mt-1 bg-google-green/10 text-google-green">
                                已完成
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>学习进度</span>
                            <span>{Math.round(actualProgress)}%</span>
                          </div>
                          <Progress value={actualProgress} className="h-2" />
                          <div className="flex items-center justify-between">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/course/${course.courseId}`)}
                              className="bg-primary hover:bg-primary-hover text-primary-foreground"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              {isCompleted ? '复习' : '开始学习'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Achievements & Stats */}
        <div className="space-y-6">
          {/* Weekly Progress */}
          <Card>
            <CardHeader>
              <CardTitle>本周进度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>学习时长</span>
                  <span>12.5小时</span>
                </div>
                <Progress value={70} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>目标：18小时</span>
                  <span>70%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>成就徽章</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className={`text-center p-3 rounded-lg border ${
                      achievement.earned
                        ? 'bg-[#22C55E]/10 border-[#22C55E]/30'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className={`text-2xl mb-1 ${!achievement.earned && 'grayscale'}`}>
                      {achievement.icon}
                    </div>
                    <p className={`text-xs ${achievement.earned ? 'text-[#22C55E]' : 'text-gray-500'}`}>
                      {achievement.name}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Study Streak */}
          <Card>
            <CardHeader>
              <CardTitle>学习打卡</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl text-[#FACC15] mb-2">🔥</div>
                <p className="text-lg font-medium">连续 7 天</p>
                <p className="text-sm text-gray-600">继续保持！</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
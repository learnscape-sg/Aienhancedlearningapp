import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  TrendingUp, 
  Play, 
  ChevronRight,
  Star,
  Target
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useProgressTracker } from './ProgressTracker';

interface HomePageProps {
  onStartChapter: (chapterId: string) => void;
}

// Mock data - in real app this would come from API
const recentCourses = [
  {
    id: '1',
    title: '数学 - 分数运算',
    chapter: '第三章：分数的加法和减法',
    progress: 75,
    timeLeft: '15分钟',
    subject: '数学',
    color: '#34A853' // Google Green
  },
  {
    id: '2',
    title: '语文 - 古诗词鉴赏',
    chapter: '第五章：唐诗三百首',
    progress: 45,
    timeLeft: '25分钟',
    subject: '语文',
    color: '#FBBC05' // Google Yellow
  },
  {
    id: '3',
    title: '英语 - 日常对话',
    chapter: '第二章：购物场景对话',
    progress: 90,
    timeLeft: '5分钟',
    subject: '英语',
    color: '#1A73E8' // Primary Blue
  }
];

const recommendedPaths = [
  {
    id: '1',
    title: '篮球运动中的数学',
    description: '通过篮球比赛学习统计和概率',
    difficulty: '中等',
    duration: '3小时',
    rating: 4.8,
    thumbnail: 'https://images.unsplash.com/photo-1743105351315-540bce258f1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwc3BvcnRzJTIwaWNvbnxlbnwxfHx8fDE3NTg2ODYzOTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: '2',
    title: '音乐中的物理原理',
    description: '探索声波、频率和音乐的科学',
    difficulty: '简单',
    duration: '2小时',
    rating: 4.6,
    thumbnail: 'https://images.unsplash.com/photo-1705045206911-3599644d4d09?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxtdXNpYyUyMGluc3RydW1lbnRzJTIwYXJ0c3xlbnwxfHx8fDE3NTg2ODY0MDN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: '3',
    title: '艺术中的几何美学',
    description: '在绘画和设计中发现几何之美',
    difficulty: '中等',
    duration: '4小时',
    rating: 4.9,
    thumbnail: 'https://images.unsplash.com/photo-1692859532235-c93fa73bd5d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxhcnQlMjBwYWludGluZyUyMGNyZWF0aXZlfGVufDF8fHx8MTc1ODY4NjQwNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  }
];

const achievements = [
  { name: '连续学习7天', icon: '🔥', earned: true },
  { name: '完成10个章节', icon: '📚', earned: true },
  { name: '测验满分', icon: '🏆', earned: false },
  { name: '学习达人', icon: '⭐', earned: false }
];

export function HomePage({ onStartChapter }: HomePageProps) {
  const { user } = useAuth();
  const { progressData } = useProgressTracker();

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
              {recentCourses.map((course) => {
                const courseProgress = progressData[course.id];
                const actualProgress = courseProgress?.progress || course.progress;
                const isCompleted = courseProgress?.completed || false;
                
                return (
                  <Card key={course.id} className="border-l-4" style={{ borderLeftColor: course.color }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{course.title}</h3>
                          <p className="text-sm text-muted-foreground">{course.chapter}</p>
                          {isCompleted && (
                            <Badge variant="secondary" className="mt-1 bg-google-green/10 text-google-green">
                              已完成
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary" style={{ backgroundColor: `${course.color}20`, color: course.color }}>
                          {course.subject}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>学习进度</span>
                          <span>{Math.round(actualProgress)}%</span>
                        </div>
                        <Progress value={actualProgress} className="h-2" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>
                              {courseProgress?.timeSpent 
                                ? `已学习 ${Math.round(courseProgress.timeSpent / 60)}分钟`
                                : `剩余 ${course.timeLeft}`
                              }
                            </span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => onStartChapter(course.id)}
                            className="bg-primary hover:bg-primary-hover text-primary-foreground"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            {isCompleted ? '复习' : '继续'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>

          {/* Recommended Learning Paths */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-google-green" />
                <span>个性化推荐</span>
              </CardTitle>
              <CardDescription>
                基于您的兴趣爱好推荐的学习路径
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendedPaths.map((path) => (
                  <Card key={path.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex space-x-4">
                        <ImageWithFallback
                          src={path.thumbnail}
                          alt={path.title}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{path.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{path.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-google-yellow" />
                              <span>{path.rating}</span>
                            </div>
                            <span>难度：{path.difficulty}</span>
                            <span>时长：{path.duration}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
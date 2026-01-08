import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useAuth } from './AuthContext';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Star, 
  Users, 
  BookOpen, 
  CheckCircle, 
  ArrowRight,
  Brain,
  Zap,
  Award,
  MapPin,
  Filter,
  Sparkles
} from 'lucide-react';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  subjects: string[];
  chapters: number;
  enrollments: number;
  rating: number;
  completion: number;
  personalizedMatch: number;
  prerequisites: string[];
  outcomes: string[];
  badges: string[];
  type: 'recommended' | 'trending' | 'custom' | 'remedial';
}

const mockPaths: LearningPath[] = [
  {
    id: 'math-foundation',
    title: '数学基础强化',
    description: '根据你的测验结果，为你量身定制的数学基础强化路径，重点加强分数运算和方程解法',
    difficulty: 'intermediate',
    duration: '4-6周',
    subjects: ['数学', '代数'],
    chapters: 15,
    enrollments: 2341,
    rating: 4.8,
    completion: 35,
    personalizedMatch: 98,
    prerequisites: ['基础算术'],
    outcomes: ['掌握分数运算', '理解一元方程', '提升数学思维'],
    badges: ['分数专家', '方程求解者'],
    type: 'recommended'
  },
  {
    id: 'science-explorer',
    title: '科学探索之旅',
    description: '结合你对实验和观察的兴趣，通过动手实验学习物理和化学基础知识',
    difficulty: 'beginner',
    duration: '6-8周',
    subjects: ['物理', '化学', '科学'],
    chapters: 20,
    enrollments: 1876,
    rating: 4.7,
    completion: 0,
    personalizedMatch: 92,
    prerequisites: ['基础科学知识'],
    outcomes: ['理解物理现象', '掌握实验方法', '培养科学思维'],
    badges: ['小科学家', '实验达人'],
    type: 'recommended'
  },
  {
    id: 'language-skills',
    title: '英语阅读提升',
    description: '基于你的英语水平，通过分级阅读和语音练习提升语言能力',
    difficulty: 'intermediate',
    duration: '8-10周',
    subjects: ['英语', '语言'],
    chapters: 25,
    enrollments: 3210,
    rating: 4.6,
    completion: 12,
    personalizedMatch: 85,
    prerequisites: ['基础英语语法'],
    outcomes: ['提升阅读理解', '扩大词汇量', '改善发音'],
    badges: ['阅读达人', '词汇专家'],
    type: 'trending'
  },
  {
    id: 'creative-thinking',
    title: '创意思维训练',
    description: '发挥你的创造力，通过艺术和设计项目培养创新思维能力',
    difficulty: 'beginner',
    duration: '5-7周',
    subjects: ['艺术', '设计', '创新'],
    chapters: 18,
    enrollments: 1543,
    rating: 4.9,
    completion: 0,
    personalizedMatch: 78,
    prerequisites: ['无'],
    outcomes: ['培养创造力', '提升设计能力', '发展艺术鉴赏'],
    badges: ['创意大师', '设计新星'],
    type: 'custom'
  },
  {
    id: 'math-remedial',
    title: '数学弱项突破',
    description: '针对你在几何和统计方面的薄弱环节，专门设计的强化训练路径',
    difficulty: 'intermediate',
    duration: '3-4周',
    subjects: ['数学', '几何', '统计'],
    chapters: 12,
    enrollments: 892,
    rating: 4.5,
    completion: 0,
    personalizedMatch: 88,
    prerequisites: ['基础数学'],
    outcomes: ['掌握几何原理', '理解统计方法', '提升空间想象'],
    badges: ['几何高手', '数据分析师'],
    type: 'remedial'
  }
];

interface LearningPathsPageProps {
  onStartPath: (pathId: string) => void;
}

export function LearningPathsPage({ onStartPath }: LearningPathsPageProps) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const getFilteredPaths = () => {
    return mockPaths.filter(path => {
      const typeMatch = selectedType === 'all' || path.type === selectedType;
      const difficultyMatch = selectedDifficulty === 'all' || path.difficulty === selectedDifficulty;
      return typeMatch && difficultyMatch;
    }).sort((a, b) => b.personalizedMatch - a.personalizedMatch);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-[#34A853] text-white';
      case 'intermediate': return 'bg-[#FBBC05] text-[#202124]';
      case 'advanced': return 'bg-[#EA4335] text-white';
      default: return 'bg-[#5F6368] text-white';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'recommended': return 'bg-[#1A73E8] text-white';
      case 'trending': return 'bg-[#4285F4] text-white';
      case 'custom': return 'bg-[#34A853] text-white';
      case 'remedial': return 'bg-[#EA4335] text-white';
      default: return 'bg-[#5F6368] text-white';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'recommended': return 'AI推荐';
      case 'trending': return '热门路径';
      case 'custom': return '个性定制';
      case 'remedial': return '弱项强化';
      default: return type;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-[#202124] mb-2">个性化学习路径</h1>
        <p className="text-[#5F6368]">基于你的学习表现和兴趣偏好，AI为你推荐最适合的学习路径</p>
      </div>

      {/* User Learning Summary */}
      {user && (
        <Card className="mb-8 border-[#1A73E8]/20 bg-gradient-to-r from-[#1A73E8]/5 to-[#4285F4]/5">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-medium text-[#202124] mb-2 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#1A73E8]" />
                  学习画像分析
                </h2>
                <div className="grid gap-2 md:grid-cols-2">
                  <p className="text-[#5F6368]">
                    <span className="font-medium">年级水平：</span>
                    {user.grade?.replace('grade', '')}年级
                  </p>
                  <p className="text-[#5F6368]">
                    <span className="font-medium">兴趣领域：</span>
                    {user.interests?.join('、') || '待完善'}
                  </p>
                  <p className="text-[#5F6368]">
                    <span className="font-medium">学习风格：</span>
                    视觉型学习者
                  </p>
                  <p className="text-[#5F6368]">
                    <span className="font-medium">强项科目：</span>
                    数学、科学
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#1A73E8] rounded-full flex items-center justify-center text-white font-medium text-lg mb-2">
                  85
                </div>
                <p className="text-sm text-[#5F6368]">综合能力</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="mb-8 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#5F6368]" />
          <span className="text-sm text-[#5F6368]">筛选：</span>
        </div>
        
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm bg-white"
        >
          <option value="all">所有类型</option>
          <option value="recommended">AI推荐</option>
          <option value="trending">热门路径</option>
          <option value="custom">个性定制</option>
          <option value="remedial">弱项强化</option>
        </select>

        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm bg-white"
        >
          <option value="all">所有难度</option>
          <option value="beginner">初级</option>
          <option value="intermediate">中级</option>
          <option value="advanced">高级</option>
        </select>
      </div>

      {/* Learning Paths Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {getFilteredPaths().map((path) => (
          <Card key={path.id} className="hover:shadow-lg transition-shadow group">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2">
                  <Badge className={getTypeColor(path.type)}>
                    {getTypeLabel(path.type)}
                  </Badge>
                  <Badge className={getDifficultyColor(path.difficulty)}>
                    {path.difficulty === 'beginner' ? '初级' : 
                     path.difficulty === 'intermediate' ? '中级' : '高级'}
                  </Badge>
                  {path.personalizedMatch >= 90 && (
                    <Badge className="bg-[#FBBC05] text-[#202124]">
                      <Sparkles className="w-3 h-3 mr-1" />
                      最佳匹配
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-medium text-[#1A73E8]">
                    {path.personalizedMatch}%
                  </div>
                  <div className="text-xs text-[#5F6368]">匹配度</div>
                </div>
              </div>

              <CardTitle className="group-hover:text-[#1A73E8] transition-colors">
                {path.title}
              </CardTitle>
              
              <CardDescription className="text-[#5F6368] leading-relaxed">
                {path.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Path Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-[#5F6368]">
                  <Clock className="w-4 h-4" />
                  <span>{path.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-[#5F6368]">
                  <BookOpen className="w-4 h-4" />
                  <span>{path.chapters} 章节</span>
                </div>
                <div className="flex items-center gap-2 text-[#5F6368]">
                  <Star className="w-4 h-4 fill-[#FBBC05] text-[#FBBC05]" />
                  <span>{path.rating}</span>
                </div>
                <div className="flex items-center gap-2 text-[#5F6368]">
                  <Users className="w-4 h-4" />
                  <span>{path.enrollments.toLocaleString()}</span>
                </div>
              </div>

              {/* Progress Bar (if started) */}
              {path.completion > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5F6368]">学习进度</span>
                    <span className="text-[#1A73E8] font-medium">{path.completion}%</span>
                  </div>
                  <Progress value={path.completion} className="h-2" />
                </div>
              )}

              {/* Prerequisites */}
              {path.prerequisites.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#202124] mb-2">前置要求</h4>
                  <div className="flex flex-wrap gap-1">
                    {path.prerequisites.map((prereq, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {prereq}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Outcomes */}
              <div>
                <h4 className="text-sm font-medium text-[#202124] mb-2 flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  学习目标
                </h4>
                <ul className="space-y-1">
                  {path.outcomes.slice(0, 3).map((outcome, index) => (
                    <li key={index} className="text-sm text-[#5F6368] flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-[#34A853]" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Badges */}
              {path.badges.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#202124] mb-2 flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    可获得徽章
                  </h4>
                  <div className="flex gap-1">
                    {path.badges.map((badge, index) => (
                      <Badge key={index} className="bg-[#FBBC05] text-[#202124] text-xs">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <Button 
                onClick={() => onStartPath(path.id)}
                className="w-full bg-[#1A73E8] hover:bg-[#1557B0] text-white"
              >
                {path.completion > 0 ? '继续学习' : '开始路径'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Recommendations Section */}
      <Card className="mt-12 border-[#4285F4]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#4285F4]" />
            AI 智能推荐
          </CardTitle>
          <CardDescription>
            基于你的学习数据和表现，AI建议你优先关注以下路径
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-4 p-4 bg-[#E3F2FD] rounded-lg border border-[#1A73E8]/20">
              <div className="w-12 h-12 bg-[#1A73E8] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-[#202124] mb-1">优先推荐</h4>
                <p className="text-sm text-[#5F6368] mb-2">
                  数学基础强化路径最适合你当前的学习水平，建议优先完成
                </p>
                <Button size="sm" variant="outline">
                  立即开始
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-[#FFF3E0] rounded-lg border border-[#FBBC05]/20">
              <div className="w-12 h-12 bg-[#FBBC05] rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-[#202124]" />
              </div>
              <div>
                <h4 className="font-medium text-[#202124] mb-1">弱项提升</h4>
                <p className="text-sm text-[#5F6368] mb-2">
                  检测到几何和统计是你的薄弱环节，建议参加专项强化训练
                </p>
                <Button size="sm" variant="outline">
                  查看详情
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Path Creator */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#34A853]" />
            创建自定义路径
          </CardTitle>
          <CardDescription>
            根据你的特定需求和兴趣，创建专属的学习路径
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#5F6368] mb-2">
                告诉我们你想要学习的内容和目标，我们将为你量身定制学习路径
              </p>
              <div className="flex gap-2">
                <Badge variant="outline">自定义内容</Badge>
                <Badge variant="outline">灵活安排</Badge>
                <Badge variant="outline">个人导师</Badge>
              </div>
            </div>
            <Button className="bg-[#34A853] hover:bg-[#2E7D32] text-white">
              开始定制
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
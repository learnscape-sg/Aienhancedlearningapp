import React, { useState } from 'react';
import { Search, Clock, Users, Star, BookOpen, Filter, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useAuth } from '../AuthContext';

interface Course {
  id: string;
  title: string;
  description: string;
  grade: string[];
  subjects: string[];
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rating: number;
  enrollments: number;
  chapters: number;
  thumbnail: string;
  tags: string[];
  personalizedMatch: number; // 0-100 based on user interests and grade
}

const mockCourses: Course[] = [
  {
    id: '1',
    title: '数学基础：代数与几何',
    description: '通过互动式学习掌握代数和几何的核心概念，支持多种学习形式切换',
    grade: ['grade7', 'grade8'],
    subjects: ['数学'],
    duration: '6周',
    difficulty: 'intermediate',
    rating: 4.8,
    enrollments: 1234,
    chapters: 12,
    thumbnail: '',
    tags: ['逻辑思维', '问题解决'],
    personalizedMatch: 95
  },
  {
    id: '2', 
    title: '科学探索：物理世界',
    description: '探索物理现象，通过实验和可视化理解科学原理',
    grade: ['grade8', 'grade9'],
    subjects: ['物理', '科学'],
    duration: '8周',
    difficulty: 'intermediate',
    rating: 4.7,
    enrollments: 982,
    chapters: 16,
    thumbnail: '',
    tags: ['实验', '观察'],
    personalizedMatch: 88
  },
  {
    id: '3',
    title: '英语阅读理解',
    description: '提升英语阅读能力，支持音频朗读和思维导图分析',
    grade: ['grade6', 'grade7', 'grade8'],
    subjects: ['英语', '语言'],
    duration: '4周',
    difficulty: 'beginner',
    rating: 4.6,
    enrollments: 2156,
    chapters: 10,
    thumbnail: '',
    tags: ['阅读', '语言技能'],
    personalizedMatch: 72
  },
  {
    id: '4',
    title: '中国历史：古代文明',
    description: '通过时间线和思维导图学习中国古代历史',
    grade: ['grade7', 'grade8', 'grade9'],
    subjects: ['历史', '社会'],
    duration: '10周',
    difficulty: 'intermediate',
    rating: 4.9,
    enrollments: 1567,
    chapters: 20,
    thumbnail: '',
    tags: ['文化', '历史思维'],
    personalizedMatch: 65
  }
];

interface CoursesPageProps {
  onStartCourse: (courseId: string) => void;
}

export function CoursesPage({ onStartCourse }: CoursesPageProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'popular'>('recommended');

  // Filter courses based on user grade and interests
  const getFilteredCourses = () => {
    let filtered = mockCourses.filter(course => {
      // Grade filter
      const gradeMatch = !user?.grade || course.grade.includes(user.grade);
      
      // Search filter
      const searchMatch = !searchQuery || 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Subject filter
      const subjectMatch = selectedSubject === 'all' || 
        course.subjects.some(subject => subject.toLowerCase().includes(selectedSubject.toLowerCase()));
      
      // Difficulty filter
      const difficultyMatch = selectedDifficulty === 'all' || course.difficulty === selectedDifficulty;
      
      return gradeMatch && searchMatch && subjectMatch && difficultyMatch;
    });

    // Sort courses
    switch (sortBy) {
      case 'recommended':
        return filtered.sort((a, b) => b.personalizedMatch - a.personalizedMatch);
      case 'rating':
        return filtered.sort((a, b) => b.rating - a.rating);
      case 'popular':
        return filtered.sort((a, b) => b.enrollments - a.enrollments);
      default:
        return filtered;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-[#34A853] text-white';
      case 'intermediate': return 'bg-[#FBBC05] text-[#202124]';
      case 'advanced': return 'bg-[#EA4335] text-white';
      default: return 'bg-[#5F6368] text-white';
    }
  };

  const getPersonalizedRecommendation = (course: Course) => {
    if (!user?.interests) return null;
    
    const matchingInterests = course.tags.filter(tag => 
      user.interests.some(interest => 
        interest.toLowerCase().includes(tag.toLowerCase()) || 
        tag.toLowerCase().includes(interest.toLowerCase())
      )
    );

    if (matchingInterests.length > 0) {
      return `基于你的兴趣：${matchingInterests.join('、')}`;
    }
    return null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-[#202124] mb-2">探索课程</h1>
        <p className="text-[#5F6368]">根据你的年级和兴趣，为你推荐最适合的学习内容</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#5F6368]" />
          <Input
            placeholder="搜索课程、科目或关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#5F6368]" />
            <span className="text-sm text-[#5F6368]">筛选：</span>
          </div>
          
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm bg-white"
          >
            <option value="all">所有科目</option>
            <option value="数学">数学</option>
            <option value="科学">科学</option>
            <option value="英语">英语</option>
            <option value="历史">历史</option>
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

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm bg-white"
          >
            <option value="recommended">推荐度</option>
            <option value="rating">评分</option>
            <option value="popular">热门度</option>
          </select>
        </div>

        {/* Current filters display */}
        {user?.grade && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#5F6368]">当前筛选：</span>
            <Badge className="bg-[#1A73E8] text-white">
              {user.grade.replace('grade', '')}年级
            </Badge>
            {user.interests?.map((interest, index) => (
              <Badge key={index} variant="outline">
                {interest}兴趣
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Course Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {getFilteredCourses().map((course) => {
          const recommendation = getPersonalizedRecommendation(course);
          
          return (
            <Card key={course.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge className={getDifficultyColor(course.difficulty)}>
                    {course.difficulty === 'beginner' ? '初级' : 
                     course.difficulty === 'intermediate' ? '中级' : '高级'}
                  </Badge>
                  {course.personalizedMatch >= 80 && (
                    <Badge className="bg-[#34A853] text-white">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      推荐
                    </Badge>
                  )}
                </div>
                
                <CardTitle className="text-lg group-hover:text-[#1A73E8] transition-colors">
                  {course.title}
                </CardTitle>
                
                <p className="text-[#5F6368] text-sm line-clamp-2">
                  {course.description}
                </p>

                {recommendation && (
                  <div className="bg-[#E3F2FD] border border-[#1A73E8]/20 rounded-lg p-3 mt-2">
                    <p className="text-sm text-[#1A73E8]">💡 {recommendation}</p>
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Course Stats */}
                  <div className="flex items-center justify-between text-sm text-[#5F6368]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{course.chapters} 章节</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-[#5F6368]">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-[#FBBC05] text-[#FBBC05]" />
                      <span>{course.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{course.enrollments.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {course.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Action Button */}
                  <Button 
                    onClick={() => onStartCourse(course.id)}
                    className="w-full bg-[#1A73E8] hover:bg-[#1557B0] text-white"
                  >
                    开始学习
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {getFilteredCourses().length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-[#5F6368] mx-auto mb-4" />
          <h3 className="text-lg text-[#202124] mb-2">没有找到符合条件的课程</h3>
          <p className="text-[#5F6368] mb-4">尝试调整筛选条件或搜索其他关键词</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchQuery('');
              setSelectedSubject('all');
              setSelectedDifficulty('all');
            }}
          >
            清除筛选
          </Button>
        </div>
      )}

      {/* Personalized Recommendations Section */}
      {user?.interests && user.interests.length > 0 && (
        <div className="mt-12 p-6 bg-gradient-to-r from-[#1A73E8]/5 to-[#4285F4]/5 rounded-xl border border-[#1A73E8]/10">
          <h2 className="text-xl text-[#202124] mb-4">为你推荐</h2>
          <p className="text-[#5F6368] mb-4">
            基于你的兴趣（{user.interests.join('、')}）和{user.grade?.replace('grade', '')}年级水平，我们为你精选了这些课程
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {getFilteredCourses()
              .filter(course => course.personalizedMatch >= 80)
              .slice(0, 2)
              .map((course) => (
                <div key={course.id} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-[#E0E0E0]">
                  <div className="w-12 h-12 bg-[#1A73E8] rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-[#202124]">{course.title}</h4>
                    <p className="text-sm text-[#5F6368]">{course.personalizedMatch}% 匹配度</p>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => onStartCourse(course.id)}
                    className="bg-[#1A73E8] hover:bg-[#1557B0] text-white"
                  >
                    开始
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
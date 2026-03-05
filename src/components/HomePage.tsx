import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StudentCourseItem } from '@/lib/backendApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BookOpen, Trophy, Play, Target, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getStudentCourses } from '@/lib/backendApi';
import { useAnalytics } from './useAnalytics';
import { BASE_SUBJECT_OPTIONS } from '@/lib/subjects';

interface HomePageProps {
  onStartChapter: (chapterId: string) => void;
}

const COURSE_COLORS = ['#34A853', '#FBBC05', '#1A73E8', '#EA4335'];

function CourseListBySubject({
  groups,
  navigate,
  buttonLabel,
  showBadge,
}: {
  groups: Array<{ subject: string; courses: StudentCourseItem[] }>;
  navigate: (path: string) => void;
  buttonLabel: string;
  showBadge: boolean;
}) {
  if (groups.length === 0) return null;
  const defaultSubject = groups[0].subject;
  return (
    <Tabs defaultValue={defaultSubject} className="w-full">
      <TabsList className="mb-4 flex-wrap h-auto gap-1">
        {groups.map(({ subject, courses }) => (
          <TabsTrigger key={subject} value={subject} className="text-xs">
            {subject} ({courses.length})
          </TabsTrigger>
        ))}
      </TabsList>
      {groups.map(({ subject, courses }) => (
        <TabsContent key={subject} value={subject} className="mt-0 space-y-4">
          {courses.map((course, idx) => (
            <CourseCard
              key={course.courseId}
              course={course}
              color={COURSE_COLORS[idx % COURSE_COLORS.length]}
              navigate={navigate}
              buttonLabel={buttonLabel}
              showBadge={showBadge}
            />
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function CourseCard({
  course,
  color,
  navigate,
  buttonLabel,
  showBadge,
}: {
  course: StudentCourseItem;
  color: string;
  navigate: (path: string) => void;
  buttonLabel: string;
  showBadge: boolean;
}) {
  const actualProgress = course.progress ?? 0;
  const handleClick = () => {
    const params = new URLSearchParams();
    if (course.groupId) params.set('groupId', course.groupId);
    if (course.classId) params.set('classId', course.classId);
    if (course.assignmentSource) params.set('assignmentSource', course.assignmentSource);
    navigate(`/course/${course.courseId}${params.toString() ? `?${params.toString()}` : ''}`);
  };
  return (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-sm leading-tight">{course.topic || course.courseId}</h3>
              {course.subject && (
                <Badge variant="outline" className="text-xs font-normal shrink-0">
                  {course.subject}
                </Badge>
              )}
              {showBadge && (
                <Badge variant="secondary" className="text-xs shrink-0 bg-google-green/10 text-google-green">
                  已完成
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {course.teacherName ? `来自 ${course.teacherName} 的分配` : '分配给我的自学任务'}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Progress value={actualProgress} className="h-1.5 flex-1 min-w-0" />
              <span className="text-xs text-muted-foreground shrink-0 w-8 text-right">{Math.round(actualProgress)}%</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleClick}
            className="shrink-0 bg-primary hover:bg-primary-hover text-primary-foreground h-8 px-3 text-xs"
          >
            <Play className="w-3.5 h-3.5 mr-1" />
            {buttonLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function sortByLastOpened(courses: StudentCourseItem[]): StudentCourseItem[] {
  return [...courses].sort((a, b) => {
    const aVal = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
    const bVal = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;
    return bVal - aVal;
  });
}

const SUBJECT_ORDER = [...BASE_SUBJECT_OPTIONS, '其他'];

function groupCoursesBySubject(courses: StudentCourseItem[]): Array<{ subject: string; courses: StudentCourseItem[] }> {
  const bySubject = new Map<string, StudentCourseItem[]>();
  for (const c of courses) {
    const key = c.subject?.trim() || '其他';
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key)!.push(c);
  }
  const ordered = SUBJECT_ORDER.filter((s) => bySubject.has(s));
  const rest = [...bySubject.keys()].filter((s) => !SUBJECT_ORDER.includes(s)).sort();
  return [...ordered, ...rest].map((subject) => ({
    subject,
    courses: sortByLastOpened(bySubject.get(subject)!),
  }));
}

export function HomePage({ onStartChapter }: HomePageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { analytics } = useAnalytics();
  const [assignedCourses, setAssignedCourses] = useState<StudentCourseItem[]>([]);
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

  const { inProgressCourses, completedCourses } = useMemo(() => {
    const inProgress = assignedCourses.filter((c) => !(c.completed ?? false));
    const completed = assignedCourses.filter((c) => c.completed ?? false);
    return {
      inProgressCourses: sortByLastOpened(inProgress),
      completedCourses: sortByLastOpened(completed),
    };
  }, [assignedCourses]);

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
                按学科分组，按最近打开排序
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coursesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : assignedCourses.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">暂无分配课程，等待老师分配后即可在此学习</p>
              ) : (
                <Tabs defaultValue="in_progress" className="w-full">
                  <TabsList>
                    <TabsTrigger value="in_progress">
                      进行中 ({inProgressCourses.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                      已完成 ({completedCourses.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="in_progress" className="mt-4">
                    {inProgressCourses.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6">暂无进行中的课程</p>
                    ) : (
                      <CourseListBySubject
                        groups={groupCoursesBySubject(inProgressCourses)}
                        navigate={navigate}
                        buttonLabel="开始学习"
                        showBadge={false}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="completed" className="mt-4">
                    {completedCourses.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6">暂无已完成的课程</p>
                    ) : (
                      <CourseListBySubject
                        groups={groupCoursesBySubject(completedCourses)}
                        navigate={navigate}
                        buttonLabel="复习"
                        showBadge={true}
                      />
                    )}
                  </TabsContent>
                </Tabs>
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
                  <span>{analytics ? `${analytics.weeklyStudyMinutes ?? 0}分钟` : '--'}</span>
                </div>
                <Progress value={analytics?.weeklyProgressPercent ?? 0} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>目标：{analytics?.weeklyGoalMinutes ?? 70}分钟</span>
                  <span>{analytics?.weeklyProgressPercent ?? 0}%</span>
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
                {(analytics?.badges ?? []).map((achievement, index) => (
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
                    <p className={`text-xs font-medium ${achievement.earned ? 'text-[#22C55E]' : 'text-gray-500'}`}>
                      {achievement.name}
                    </p>
                    {achievement.condition && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{achievement.condition}</p>
                    )}
                  </div>
                ))}
                {(!analytics?.badges || analytics.badges.length === 0) && (
                  <p className="col-span-2 text-xs text-muted-foreground text-center py-2">暂无徽章数据</p>
                )}
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
                <p className="text-lg font-medium">连续 {analytics?.streakDays ?? 0} 天</p>
                <p className="text-sm text-gray-600">继续保持！</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
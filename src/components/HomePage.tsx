import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StudentCourseItem } from '@/lib/backendApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BookOpen, Play, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getStudentCourses } from '@/lib/backendApi';
import { useAnalytics } from './useAnalytics';
import { BASE_SUBJECT_OPTIONS } from '@/lib/subjects';

interface HomePageProps {
  onStartChapter: (chapterId: string) => void;
}

const COURSE_COLORS = ['#34A853', '#FBBC05', '#1A73E8', '#EA4335'];

const ALL_SUBJECTS = '全部';

function CourseListBySubject({
  groups,
  selectedSubject,
  navigate,
  buttonLabel,
  showBadge,
  buttonDisabled,
}: {
  groups: Array<{ subject: string; courses: StudentCourseItem[] }>;
  selectedSubject: string;
  navigate: (path: string) => void;
  buttonLabel: string;
  showBadge: boolean;
  buttonDisabled?: boolean;
}) {
  if (groups.length === 0) return null;
  const courses =
    selectedSubject === ALL_SUBJECTS
      ? sortByLastOpened(groups.flatMap((g) => g.courses))
      : (groups.find((g) => g.subject === selectedSubject) ?? groups[0])?.courses ?? [];
  return (
    <div className="space-y-4">
      {courses.map((course, idx) => (
        <CourseCard
          key={course.courseId}
          course={course}
          color={COURSE_COLORS[idx % COURSE_COLORS.length]}
          navigate={navigate}
          buttonLabel={buttonLabel}
          showBadge={showBadge}
          buttonDisabled={buttonDisabled}
        />
      ))}
    </div>
  );
}

function CourseCard({
  course,
  color,
  navigate,
  buttonLabel,
  showBadge,
  buttonDisabled,
}: {
  course: StudentCourseItem;
  color: string;
  navigate: (path: string) => void;
  buttonLabel: string;
  showBadge: boolean;
  buttonDisabled?: boolean;
}) {
  const actualProgress = course.progress ?? 0;
  const handleClick = () => {
    if (buttonDisabled) return;
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
            disabled={buttonDisabled}
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

  const [courseStatus, setCourseStatus] = useState<'in_progress' | 'completed'>('in_progress');
  const [courseSubject, setCourseSubject] = useState(ALL_SUBJECTS);

  const { inProgressCourses, completedCourses, inProgressGroups, completedGroups } = useMemo(() => {
    const inProgress = assignedCourses.filter((c) => !(c.completed ?? false));
    const completed = assignedCourses.filter((c) => c.completed ?? false);
    return {
      inProgressCourses: sortByLastOpened(inProgress),
      completedCourses: sortByLastOpened(completed),
      inProgressGroups: groupCoursesBySubject(sortByLastOpened(inProgress)),
      completedGroups: groupCoursesBySubject(sortByLastOpened(completed)),
    };
  }, [assignedCourses]);

  useEffect(() => {
    const groups = courseStatus === 'in_progress' ? inProgressGroups : completedGroups;
    if (groups.length > 0 && courseSubject !== ALL_SUBJECTS && !groups.some((g) => g.subject === courseSubject)) {
      setCourseSubject(ALL_SUBJECTS);
    }
  }, [courseStatus, inProgressGroups, completedGroups, courseSubject]);

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
        <div className="mt-4 flex flex-wrap gap-6">
          <div className="flex items-center gap-3 min-w-[140px]">
            <div className="text-2xl">🔥</div>
            <div>
              <p className="font-medium">连续 {analytics?.streakDays ?? 0} 天</p>
              <p className="text-sm text-primary-foreground/80">继续保持！</p>
            </div>
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className="flex justify-between text-sm mb-1">
              <span>学习时长</span>
              <span>{analytics ? `${analytics.weeklyStudyMinutes ?? 0}分钟` : '--'}</span>
            </div>
            <Progress value={analytics?.weeklyProgressPercent ?? 0} className="h-2 bg-primary-foreground/20 border border-black/30" />
            <div className="flex justify-between text-sm text-primary-foreground/80 mt-1">
              <span>目标：{analytics?.weeklyGoalMinutes ?? 70}分钟</span>
              <span>{analytics?.weeklyProgressPercent ?? 0}%</span>
            </div>
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
              ) : (() => {
                const groups = courseStatus === 'in_progress' ? inProgressGroups : completedGroups;
                const effectiveSubject =
                  groups.length > 0 &&
                  (courseSubject === ALL_SUBJECTS || groups.some((g) => g.subject === courseSubject))
                    ? courseSubject
                    : ALL_SUBJECTS;
                return (
                  <Tabs
                    value={courseStatus}
                    onValueChange={(v) => setCourseStatus(v as 'in_progress' | 'completed')}
                    className="w-full"
                  >
                    <div className="flex flex-wrap gap-2 items-center mb-4 justify-between">
                      {groups.length > 0 && (
                        <div
                          role="tablist"
                          className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground gap-1 flex-wrap"
                        >
                          <button
                            key={ALL_SUBJECTS}
                            role="tab"
                            type="button"
                            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                              effectiveSubject === ALL_SUBJECTS
                                ? 'bg-primary text-primary-foreground shadow'
                                : 'hover:bg-muted-foreground/10'
                            }`}
                            onClick={() => setCourseSubject(ALL_SUBJECTS)}
                          >
                            {ALL_SUBJECTS} ({groups.reduce((sum, g) => sum + g.courses.length, 0)})
                          </button>
                          {groups.map(({ subject: s, courses }) => (
                            <button
                              key={s}
                              role="tab"
                              type="button"
                              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                                effectiveSubject === s
                                  ? 'bg-primary text-primary-foreground shadow'
                                  : 'hover:bg-muted-foreground/10'
                              }`}
                              onClick={() => setCourseSubject(s)}
                            >
                              {s} ({courses.length})
                            </button>
                          ))}
                        </div>
                      )}
                      <TabsList className="ml-auto">
                        <TabsTrigger value="in_progress">
                          进行中 ({inProgressCourses.length})
                        </TabsTrigger>
                        <TabsTrigger value="completed">
                          已完成 ({completedCourses.length})
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="in_progress" className="mt-0">
                      {inProgressCourses.length === 0 ? (
                        <p className="text-muted-foreground text-center py-6">暂无进行中的课程</p>
                      ) : (
                        <CourseListBySubject
                          groups={inProgressGroups}
                          selectedSubject={effectiveSubject}
                          navigate={navigate}
                          buttonLabel="开始学习"
                          showBadge={false}
                        />
                      )}
                    </TabsContent>
                    <TabsContent value="completed" className="mt-0">
                      {completedCourses.length === 0 ? (
                        <p className="text-muted-foreground text-center py-6">暂无已完成的课程</p>
                      ) : (
                        <CourseListBySubject
                          groups={completedGroups}
                          selectedSubject={effectiveSubject}
                          navigate={navigate}
                          buttonLabel="复习"
                          showBadge={true}
                          buttonDisabled={true}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Achievements & Stats */}
        <div className="space-y-6">
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
        </div>
      </div>
    </div>
  );
}
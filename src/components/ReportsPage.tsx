import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useAnalytics } from './useAnalytics';
import {
  getStudentReports,
  getStudentTraitsSummary,
  trackProductEvent,
  type StudentReportsData,
  type StudentTraitsSummary,
} from '@/lib/backendApi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Award,
  Target,
  BookOpen,
  Clock,
  Trophy,
  RefreshCw,
  Zap,
  Eye,
  Brain,
  TrendingDown,
  CheckCircle,
  Lightbulb,
  Repeat,
} from 'lucide-react';

type RangeValue = 'week' | 'month' | 'quarter';

export function ReportsPage() {
  const [timeRange, setTimeRange] = useState<RangeValue>('week');
  const { analytics, loading: analyticsLoading, refresh } = useAnalytics();

  const [traitsSummary, setTraitsSummary] = useState<StudentTraitsSummary | null>(null);
  const [reportsData, setReportsData] = useState<StudentReportsData | null>(null);
  const [reportsLoading, setReportsLoading] = useState(true);

  const hasTrackedViewRef = useRef(false);
  const previousRangeRef = useRef<RangeValue | null>(null);

  const loadTraits = useCallback(async (range: RangeValue) => {
    try {
      const data = await getStudentTraitsSummary(range);
      setTraitsSummary(data);
    } catch (error) {
      console.error('Failed to load student traits summary:', error);
      setTraitsSummary(null);
    }
  }, []);

  const loadReports = useCallback(async (range: RangeValue) => {
    setReportsLoading(true);
    try {
      const data = await getStudentReports(range);
      setReportsData(data);
    } catch (error) {
      console.error('Failed to load student reports:', error);
      setReportsData(null);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTraits(timeRange);
    void loadReports(timeRange);
  }, [loadReports, loadTraits, timeRange]);

  useEffect(() => {
    const prev = previousRangeRef.current;
    if (prev && prev !== timeRange) {
      void trackProductEvent({
        eventName: 'report_filter_changed',
        role: 'student',
        language: 'zh',
        properties: {
          reportType: 'student_progress',
          fromTimeRange: prev,
          toTimeRange: timeRange,
        },
      }).catch(() => undefined);
    }
    previousRangeRef.current = timeRange;
  }, [timeRange]);

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    if (analyticsLoading || reportsLoading) return;
    hasTrackedViewRef.current = true;
    void trackProductEvent({
      eventName: 'report_viewed',
      role: 'student',
      language: 'zh',
      properties: {
        reportType: 'student_progress',
        defaultTimeRange: timeRange,
        hasTraitsData: Boolean(traitsSummary?.latest),
        hasReportsData: Boolean(reportsData),
      },
    }).catch(() => undefined);
  }, [analyticsLoading, reportsLoading, reportsData, timeRange, traitsSummary?.latest]);

  const handleRefresh = async () => {
    void trackProductEvent({
      eventName: 'report_refresh_clicked',
      role: 'student',
      language: 'zh',
      properties: { reportType: 'student_progress', timeRange },
    }).catch(() => undefined);
    refresh();
    await Promise.all([loadTraits(timeRange), loadReports(timeRange)]);
  };

  const effectiveTraits = useMemo(() => {
    if (!traitsSummary?.latest?.traits?.length) return [];
    const iconByKey: Record<string, typeof Zap> = {
      self_drive: Zap,
      focus: Eye,
      thinking: Brain,
      improvement: Repeat,
    };
    const colorByKey: Record<string, string> = {
      self_drive: '#4285F4',
      focus: '#34A853',
      thinking: '#FBBC05',
      improvement: '#EA4335',
    };
    const descByKey: Record<string, string> = {
      self_drive: '主动设定目标并坚持完成',
      focus: '抵御干扰，保持注意力集中',
      thinking: '乐于动脑筋，喜欢提问和探讨',
      improvement: '对自身学习的反思与优化',
    };
    return traitsSummary.latest.traits.map((item) => ({
      trait: item.trait,
      score: item.score,
      fullMark: item.fullMark,
      icon: iconByKey[item.key] || Zap,
      color: colorByKey[item.key] || '#4285F4',
      description: descByKey[item.key] || '学习特质',
      metrics: (item.dimensions || []).map((d) => ({
        name: d.name,
        value: d.score,
        total: 100,
        unit: '%',
      })),
      strengths: item.strengths?.length ? item.strengths : ['持续保持当前优势表现'],
      improvements: item.improvements?.length ? item.improvements : ['继续通过刻意练习提升该特质'],
    }));
  }, [traitsSummary]);

  const effectiveTrendData = useMemo(() => {
    if (!traitsSummary?.trend?.length) return [];
    return traitsSummary.trend.map((item) => ({
      month: item.period,
      自驱力: item.self_drive,
      专注力: item.focus,
      享受思考: item.thinking,
      痴迷改进: item.improvement,
    }));
  }, [traitsSummary]);

  const radarData = useMemo(
    () =>
      effectiveTraits.map((item) => ({
        subject: item.trait,
        score: item.score,
        fullMark: item.fullMark,
      })),
    [effectiveTraits]
  );

  const weeklyProgressData = useMemo(() => reportsData?.weeklyProgress ?? [], [reportsData?.weeklyProgress]);
  const monthlyTrendData = useMemo(
    () => (reportsData?.monthlyTrend ?? []).map((item) => ({ month: item.period, score: item.score, time: item.time })),
    [reportsData?.monthlyTrend]
  );
  const subjectPerformanceData = useMemo(() => reportsData?.subjectPerformance ?? [], [reportsData?.subjectPerformance]);

  if (analyticsLoading || reportsLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">加载学习报告中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-medium">学习报告</h1>
          <p className="text-gray-600">查看您的学习进展和表现分析</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as RangeValue)}>
            <SelectTrigger className="w-28 md:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="quarter">本季度</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总学习时长</p>
                <p className="text-2xl font-medium">{analytics ? `${Math.round((analytics.totalTimeSpent / 3600) * 10) / 10}小时` : '0小时'}</p>
                <p className="text-sm text-[#22C55E]">持续学习中</p>
              </div>
              <div className="w-12 h-12 bg-[#4F46E5]/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#4F46E5]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">完成章节</p>
                <p className="text-2xl font-medium">{analytics ? `${analytics.completedChapters}/${analytics.totalChapters}章` : '0/0章'}</p>
                <p className="text-sm text-[#22C55E]">持续进步</p>
              </div>
              <div className="w-12 h-12 bg-[#22C55E]/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[#22C55E]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">平均正确率</p>
                <p className="text-2xl font-medium">{analytics ? `${Math.round(analytics.averageScore)}%` : '0%'}</p>
                <p className="text-sm text-[#22C55E]">持续提升</p>
              </div>
              <div className="w-12 h-12 bg-[#FACC15]/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-[#FACC15]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">获得徽章</p>
                <p className="text-2xl font-medium">{analytics?.earnedBadges ?? 0}个</p>
                <p className="text-sm text-[#22C55E]">
                  {(() => {
                    const delta = Number(analytics?.badgeDeltaVsLastWeek ?? 0);
                    return `${delta >= 0 ? '+' : ''}${delta}个 vs 上周`;
                  })()}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#EF4444]/10 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-[#EF4444]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">学习概览</TabsTrigger>
          <TabsTrigger value="xueba-traits">学霸特质</TabsTrigger>
          <TabsTrigger value="performance">学科表现</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>本周学习进度</CardTitle>
                <CardDescription>每日学习时长和完成步骤数</CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyProgressData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无可展示的周进度数据。</p>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <ResponsiveContainer width="100%" height={280} minWidth={280}>
                      <BarChart data={weeklyProgressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                        <XAxis dataKey="day" tick={{ fill: '#5F6368', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#5F6368', fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="hours" fill="#4285F4" name="学习时长(小时)" />
                        <Bar dataKey="completed" fill="#34A853" name="完成步骤" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>阶段趋势</CardTitle>
                <CardDescription>学习评分与投入时长变化</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyTrendData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无可展示的趋势数据。</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#4F46E5" name="阶段评分" />
                      <Line type="monotone" dataKey="time" stroke="#22C55E" name="学习时长(分钟)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="xueba-traits" className="space-y-6">
          {effectiveTraits.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>学霸四特质评估</CardTitle>
                <CardDescription>暂无评估数据。完成一次课程学习并生成评估后可查看。</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="w-6 h-6 text-primary" />
                    <span>学霸四特质评估</span>
                  </CardTitle>
                  <CardDescription>学霸的核心素养体现在自驱力、专注力、享受思考和痴迷改进四个方面</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {effectiveTraits.map((trait) => {
                      const Icon = trait.icon;
                      return (
                        <div key={trait.trait} className="text-center p-3 md:p-4 bg-background rounded-lg border">
                          <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                            <Icon className="w-5 h-5 md:w-6 md:h-6" />
                          </div>
                          <h3 className="font-medium mb-1 text-sm md:text-base">{trait.trait}</h3>
                          <div className="text-xl md:text-2xl font-medium mb-1">{trait.score}</div>
                          <p className="text-xs text-muted-foreground">满分 {trait.fullMark}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>四特质雷达图</CardTitle>
                    <CardDescription>全方位展示您的学霸特质分布</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#E0E0E0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#5F6368', fontSize: 12 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#5F6368', fontSize: 10 }} />
                        <Radar name="当前水平" dataKey="score" stroke="#1A73E8" fill="#1A73E8" fillOpacity={0.6} strokeWidth={2} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>特质发展趋势</CardTitle>
                    <CardDescription>按所选时间范围展示趋势</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {effectiveTrendData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">暂无特质趋势数据。</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={effectiveTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                          <XAxis dataKey="month" tick={{ fill: '#5F6368', fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#5F6368', fontSize: 12 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Line type="monotone" dataKey="自驱力" stroke="#4285F4" strokeWidth={2} />
                          <Line type="monotone" dataKey="专注力" stroke="#34A853" strokeWidth={2} />
                          <Line type="monotone" dataKey="享受思考" stroke="#FBBC05" strokeWidth={2} />
                          <Line type="monotone" dataKey="痴迷改进" stroke="#EA4335" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
                {effectiveTraits.map((trait) => {
                  const Icon = trait.icon;
                  return (
                    <Card key={trait.trait} className="border-l-4 border-l-primary/40">
                      <CardHeader>
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-2 md:space-x-3">
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                              <Icon className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base md:text-lg">{trait.trait}</CardTitle>
                              <CardDescription className="text-xs md:text-sm">{trait.description}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-base md:text-lg">
                            {trait.score}分
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 md:space-y-4">
                        <div className="space-y-2 md:space-y-3">
                          <h4 className="font-medium flex items-center space-x-2 text-sm md:text-base">
                            <Target className="w-3 h-3 md:w-4 md:h-4" />
                            <span>关键指标</span>
                          </h4>
                          {trait.metrics.map((metric, index) => (
                            <div key={index} className="space-y-1.5 md:space-y-2">
                              <div className="flex justify-between text-xs md:text-sm">
                                <span>{metric.name}</span>
                                <span className="text-muted-foreground">
                                  {metric.value}
                                  {metric.unit} / {metric.total}
                                  {metric.unit}
                                </span>
                              </div>
                              <Progress value={(metric.value / metric.total) * 100} className="h-1.5 md:h-2" />
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1.5 md:space-y-2">
                          <h4 className="font-medium flex items-center space-x-2 text-[#34A853] text-sm md:text-base">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                            <span>优势表现</span>
                          </h4>
                          <ul className="space-y-1">
                            {trait.strengths.map((strength, index) => (
                              <li key={index} className="text-xs md:text-sm text-muted-foreground flex items-start space-x-2">
                                <span className="text-[#34A853] mt-0.5 flex-shrink-0">✓</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5 md:space-y-2">
                          <h4 className="font-medium flex items-center space-x-2 text-[#FBBC05] text-sm md:text-base">
                            <Lightbulb className="w-3 h-3 md:w-4 md:h-4" />
                            <span>改进建议</span>
                          </h4>
                          <ul className="space-y-1">
                            {trait.improvements.map((improvement, index) => (
                              <li key={index} className="text-xs md:text-sm text-muted-foreground flex items-start space-x-2">
                                <span className="text-[#FBBC05] mt-0.5 flex-shrink-0">→</span>
                                <span>{improvement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
                    <Award className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <span>综合评价</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <h4 className="font-medium mb-2 md:mb-3 flex items-center space-x-2 text-sm md:text-base">
                        <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-[#34A853]" />
                        <span>突出特质</span>
                      </h4>
                      <div className="space-y-2">
                        {[...effectiveTraits]
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 2)
                          .map((trait) => (
                            <div key={trait.trait} className="p-2.5 md:p-3 rounded-lg border bg-background flex items-center space-x-2 md:space-x-3">
                              <p className="font-medium text-xs md:text-sm flex-1">{trait.trait}</p>
                              <div className="text-base md:text-lg font-medium">{trait.score}</div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 md:mb-3 flex items-center space-x-2 text-sm md:text-base">
                        <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-[#FBBC05]" />
                        <span>提升空间</span>
                      </h4>
                      <div className="space-y-2">
                        {[...effectiveTraits]
                          .sort((a, b) => a.score - b.score)
                          .slice(0, 2)
                          .map((trait) => (
                            <div key={trait.trait} className="p-2.5 md:p-3 rounded-lg border bg-background flex items-center space-x-2 md:space-x-3">
                              <p className="font-medium text-xs md:text-sm flex-1">{trait.trait}</p>
                              <div className="text-base md:text-lg font-medium">{trait.score}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 md:p-4 bg-background rounded-lg border">
                    <p className="text-xs md:text-sm leading-relaxed">
                      <span className="font-medium text-primary">总体评价：</span>
                      {traitsSummary?.latest?.summary?.trim()
                        ? traitsSummary.latest.summary
                        : '暂无评估总结。请至少完成一次课程学习并生成评估后查看。'}
                    </p>
                    {traitsSummary?.latest?.nextSteps?.trim() ? (
                      <p className="text-xs md:text-sm leading-relaxed mt-3 text-muted-foreground">
                        <span className="font-medium text-primary">下一步建议：</span>
                        {traitsSummary.latest.nextSteps}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>各科目表现</CardTitle>
              <CardDescription>基于已分配课程的真实学习进度统计</CardDescription>
            </CardHeader>
            <CardContent>
              {subjectPerformanceData.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无可展示的学科表现数据。</p>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  {subjectPerformanceData.map((subject) => (
                    <div key={subject.subject} className="space-y-2 md:space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="font-medium text-sm md:text-base">{subject.subject}</h3>
                        <div className="flex items-center gap-2 md:gap-4">
                          <Badge variant="secondary" className="text-xs md:text-sm">
                            掌握度 {subject.accuracy}%
                          </Badge>
                          <span className="text-xs md:text-sm text-gray-600">
                            {subject.completed}/{subject.total} 课程
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        <div className="flex justify-between text-xs md:text-sm">
                          <span>完成进度</span>
                          <span>{subject.total > 0 ? Math.round((subject.completed / subject.total) * 100) : 0}%</span>
                        </div>
                        <Progress value={subject.total > 0 ? (subject.completed / subject.total) * 100 : 0} className="h-1.5 md:h-2 [&>div]:bg-[#4285F4]" />
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        <div className="flex justify-between text-xs md:text-sm">
                          <span>掌握程度</span>
                          <span>{subject.accuracy}%</span>
                        </div>
                        <Progress
                          value={subject.accuracy}
                          className={`h-1.5 md:h-2 ${
                            subject.accuracy >= 85 ? '[&>div]:bg-[#34A853]' : subject.accuracy >= 70 ? '[&>div]:bg-[#FBBC05]' : '[&>div]:bg-[#EA4335]'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

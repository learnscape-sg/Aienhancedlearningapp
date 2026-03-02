import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useAnalytics } from './useAnalytics';
import { getStudentTraitsSummary, type StudentTraitsSummary } from '@/lib/backendApi';
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
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  Award, 
  Target, 
  BookOpen,
  Clock,
  Trophy,
  AlertCircle,
  RefreshCw,
  Zap,
  Eye,
  Brain,
  TrendingDown,
  CheckCircle,
  XCircle,
  Lightbulb,
  Repeat
} from 'lucide-react';

// Mock data
const weeklyProgressData = [
  { day: '周一', hours: 2.5, completed: 3 },
  { day: '周二', hours: 1.8, completed: 2 },
  { day: '周三', hours: 3.2, completed: 4 },
  { day: '周四', hours: 2.1, completed: 2 },
  { day: '周五', hours: 2.8, completed: 3 },
  { day: '周六', hours: 4.1, completed: 5 },
  { day: '周日', hours: 3.5, completed: 4 }
];

const subjectPerformanceData = [
  { subject: '数学', accuracy: 85, completed: 12, total: 15 },
  { subject: '语文', accuracy: 92, completed: 8, total: 10 },
  { subject: '英语', accuracy: 78, completed: 10, total: 12 },
  { subject: '科学', accuracy: 88, completed: 6, total: 8 }
];

const mistakeAnalysisData = [
  { category: '分数运算', mistakes: 8, color: '#EF4444' },
  { category: '几何图形', mistakes: 5, color: '#F59E0B' },
  { category: '代数基础', mistakes: 3, color: '#10B981' },
  { category: '应用题', mistakes: 12, color: '#3B82F6' }
];

const monthlyTrendData = [
  { month: '9月', score: 75, time: 45 },
  { month: '10月', score: 82, time: 52 },
  { month: '11月', score: 78, time: 48 },
  { month: '12月', score: 88, time: 58 },
  { month: '1月', score: 85, time: 55 }
];

const achievements = [
  { name: '连续学习7天', description: '保持学习习惯', earned: true, date: '2024-01-15' },
  { name: '数学小能手', description: '数学测验连续3次满分', earned: true, date: '2024-01-20' },
  { name: '阅读达人', description: '完成20篇阅读理解', earned: false, progress: 75 },
  { name: '全能学霸', description: '所有科目达到85分以上', earned: false, progress: 60 }
];

// 学霸四特质数据
const xuebaTraitsData = [
  { 
    trait: '自驱力', 
    score: 85, 
    fullMark: 100,
    icon: Zap,
    color: '#4285F4',
    description: '主动设定目标并坚持完成',
    metrics: [
      { name: '主动学习天数', value: 24, total: 30, unit: '天' },
      { name: '目标完成率', value: 88, total: 100, unit: '%' },
      { name: '自主规划频率', value: 15, total: 20, unit: '次' }
    ],
    strengths: ['能够自主设定学习目标', '学习习惯良好'],
    improvements: ['可以尝试设定更具挑战性的目标', '增加长期目标规划']
  },
  { 
    trait: '专注力', 
    score: 78, 
    fullMark: 100,
    icon: Eye,
    color: '#34A853',
    description: '抵御干扰，保持注意力集中',
    metrics: [
      { name: '平均专注时长', value: 35, total: 50, unit: '分钟' },
      { name: '心流状态次数', value: 12, total: 20, unit: '次' },
      { name: '干扰抵御率', value: 72, total: 100, unit: '%' }
    ],
    strengths: ['能够进入深度学习状态', '学习效率较高'],
    improvements: ['减少学习环境中的干扰因素', '尝试番茄工作法提升专注']
  },
  { 
    trait: '享受思考', 
    score: 92, 
    fullMark: 100,
    icon: Brain,
    color: '#FBBC05',
    description: '乐于动脑筋，喜欢提问和探讨',
    metrics: [
      { name: '主动提问次数', value: 28, total: 30, unit: '次' },
      { name: '深度思考题完成', value: 18, total: 20, unit: '题' },
      { name: '探索性学习', value: 85, total: 100, unit: '%' }
    ],
    strengths: ['善于提出问题', '思考深度优秀', '学习主动性强'],
    improvements: ['可以尝试更多跨学科思考']
  },
  { 
    trait: '痴迷改进', 
    score: 88, 
    fullMark: 100,
    icon: Repeat,
    color: '#EA4335',
    description: '对自身学习的反思与优化',
    metrics: [
      { name: '错题复习率', value: 92, total: 100, unit: '%' },
      { name: '学习反思次数', value: 16, total: 20, unit: '次' },
      { name: '方法优化频率', value: 14, total: 15, unit: '次' }
    ],
    strengths: ['善于从错误中学习', '持续优化学习方法', '反思能力强'],
    improvements: ['建立更系统的错题本', '定期总结学习方法']
  }
];

// 四特质趋势数据
const traitTrendData = [
  { month: '9月', 自驱力: 75, 专注力: 68, 享受思考: 85, 痴迷改进: 78 },
  { month: '10月', 自驱力: 78, 专注力: 72, 享受思考: 88, 痴迷改进: 82 },
  { month: '11月', 自驱力: 80, 专注力: 75, 享受思考: 90, 痴迷改进: 85 },
  { month: '12月', 自驱力: 82, 专注力: 76, 享受思考: 91, 痴迷改进: 86 },
  { month: '1月', 自驱力: 85, 专注力: 78, 享受思考: 92, 痴迷改进: 88 }
];

export function ReportsPage() {
  const [timeRange, setTimeRange] = useState('week');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const { analytics, loading, refresh } = useAnalytics();
  const [traitsSummary, setTraitsSummary] = useState<StudentTraitsSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadTraits = async () => {
      try {
        const data = await getStudentTraitsSummary(
          timeRange === 'week' || timeRange === 'month' || timeRange === 'quarter'
            ? (timeRange as 'week' | 'month' | 'quarter')
            : 'month'
        );
        if (!cancelled) setTraitsSummary(data);
      } catch (error) {
        console.error('Failed to load student traits summary:', error);
        if (!cancelled) setTraitsSummary(null);
      }
    };
    void loadTraits();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  const effectiveTraits = useMemo(() => {
    if (!traitsSummary?.latest?.traits || traitsSummary.latest.traits.length === 0) return xuebaTraitsData;
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
    if (!traitsSummary?.trend || traitsSummary.trend.length === 0) return traitTrendData;
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

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">加载学习报告中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-medium">学习报告</h1>
          <p className="text-gray-600">查看您的学习进展和表现分析</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-28 md:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="quarter">本季度</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-28 md:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部科目</SelectItem>
              <SelectItem value="math">数学</SelectItem>
              <SelectItem value="chinese">语文</SelectItem>
              <SelectItem value="english">英语</SelectItem>
              <SelectItem value="science">科学</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总学习时长</p>
                <p className="text-2xl font-medium">
                  {analytics ? `${Math.round(analytics.totalTimeSpent / 3600 * 10) / 10}小时` : '0小时'}
                </p>
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
                <p className="text-2xl font-medium">
                  {analytics ? `${analytics.completedChapters}/${analytics.totalChapters}章` : '0/5章'}
                </p>
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
                <p className="text-2xl font-medium">
                  {analytics ? `${Math.round(analytics.averageScore)}%` : '0%'}
                </p>
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
          <TabsTrigger value="mistakes">错题分析</TabsTrigger>
          <TabsTrigger value="achievements">成就徽章</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            {/* Weekly Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle>本周学习进度</CardTitle>
                <CardDescription>每日学习时长和完成章节数</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={280} minWidth={280}>
                    <BarChart data={weeklyProgressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                      <XAxis dataKey="day" tick={{ fill: '#5F6368', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#5F6368', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#FFFFFF', 
                          border: '1px solid #E0E0E0',
                          borderRadius: '8px',
                          color: '#202124'
                        }}
                      />
                      <Bar dataKey="hours" fill="#4285F4" name="学习时长(小时)" />
                      <Bar dataKey="completed" fill="#34A853" name="完成章节" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>月度趋势</CardTitle>
                <CardDescription>学习成绩和时长变化趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#4F46E5" name="平均分" />
                    <Line type="monotone" dataKey="time" stroke="#22C55E" name="学习���长" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="xueba-traits" className="space-y-6">
          {/* 学霸特质总览卡片 */}
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-6 h-6 text-primary" />
                <span>学霸四特质评估</span>
              </CardTitle>
              <CardDescription>
                学霸的核心素养体现在自驱力、专注力、享受思考和痴迷改进四个方面
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {effectiveTraits.map((trait) => {
                  const Icon = trait.icon;
                  const colorClass = 
                    trait.color === '#4285F4' ? 'bg-[#4285F4]/10 text-[#4285F4]' :
                    trait.color === '#34A853' ? 'bg-[#34A853]/10 text-[#34A853]' :
                    trait.color === '#FBBC05' ? 'bg-[#FBBC05]/10 text-[#FBBC05]' :
                    'bg-[#EA4335]/10 text-[#EA4335]';
                  
                  const scoreClass = 
                    trait.color === '#4285F4' ? 'text-[#4285F4]' :
                    trait.color === '#34A853' ? 'text-[#34A853]' :
                    trait.color === '#FBBC05' ? 'text-[#FBBC05]' :
                    'text-[#EA4335]';
                  
                  return (
                    <div key={trait.trait} className="text-center p-3 md:p-4 bg-background rounded-lg border">
                      <div className={`w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <h3 className="font-medium mb-1 text-sm md:text-base">{trait.trait}</h3>
                      <div className={`text-xl md:text-2xl font-medium mb-1 ${scoreClass}`}>
                        {trait.score}
                      </div>
                      <p className="text-xs text-muted-foreground">满分 {trait.fullMark}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            {/* 雷达图 */}
            <Card>
              <CardHeader>
                <CardTitle>四特质雷达图</CardTitle>
                <CardDescription>全方位展示您的学霸特质分布</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={280} minWidth={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#E0E0E0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#5F6368', fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#5F6368', fontSize: 10 }} />
                      <Radar 
                        name="当前水平" 
                        dataKey="score" 
                        stroke="#1A73E8" 
                        fill="#1A73E8" 
                        fillOpacity={0.6}
                        strokeWidth={2}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#FFFFFF', 
                          border: '1px solid #E0E0E0',
                          borderRadius: '8px',
                          color: '#202124'
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 趋势图 */}
            <Card>
              <CardHeader>
                <CardTitle>特质发展趋势</CardTitle>
                <CardDescription>过去5个月的四特质变化</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={280} minWidth={280}>
                    <LineChart data={effectiveTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                      <XAxis dataKey="month" tick={{ fill: '#5F6368', fontSize: 12 }} />
                      <YAxis domain={[60, 100]} tick={{ fill: '#5F6368', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#FFFFFF', 
                          border: '1px solid #E0E0E0',
                          borderRadius: '8px',
                          color: '#202124'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="自驱力" stroke="#4285F4" strokeWidth={2} dot={{ fill: '#4285F4', r: 4 }} />
                      <Line type="monotone" dataKey="专注力" stroke="#34A853" strokeWidth={2} dot={{ fill: '#34A853', r: 4 }} />
                      <Line type="monotone" dataKey="享受思考" stroke="#FBBC05" strokeWidth={2} dot={{ fill: '#FBBC05', r: 4 }} />
                      <Line type="monotone" dataKey="痴迷改进" stroke="#EA4335" strokeWidth={2} dot={{ fill: '#EA4335', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 四特质详细分析 */}
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            {effectiveTraits.map((trait) => {
              const Icon = trait.icon;
              const borderClass = 
                trait.color === '#4285F4' ? 'border-l-[#4285F4]' :
                trait.color === '#34A853' ? 'border-l-[#34A853]' :
                trait.color === '#FBBC05' ? 'border-l-[#FBBC05]' :
                'border-l-[#EA4335]';
              
              const bgClass = 
                trait.color === '#4285F4' ? 'bg-[#4285F4]/10 text-[#4285F4]' :
                trait.color === '#34A853' ? 'bg-[#34A853]/10 text-[#34A853]' :
                trait.color === '#FBBC05' ? 'bg-[#FBBC05]/10 text-[#FBBC05]' :
                'bg-[#EA4335]/10 text-[#EA4335]';
              
              const badgeClass = 
                trait.color === '#4285F4' ? 'bg-[#4285F4]/10 text-[#4285F4]' :
                trait.color === '#34A853' ? 'bg-[#34A853]/10 text-[#34A853]' :
                trait.color === '#FBBC05' ? 'bg-[#FBBC05]/10 text-[#FBBC05]' :
                'bg-[#EA4335]/10 text-[#EA4335]';
              
              return (
                <Card key={trait.trait} className={`border-l-4 ${borderClass}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2 md:space-x-3">
                        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${bgClass}`}>
                          <Icon className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base md:text-lg">{trait.trait}</CardTitle>
                          <CardDescription className="text-xs md:text-sm">{trait.description}</CardDescription>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={`text-base md:text-lg ${badgeClass}`}
                      >
                        {trait.score}分
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 md:space-y-4">
                    {/* 关键指标 */}
                    <div className="space-y-2 md:space-y-3">
                      <h4 className="font-medium flex items-center space-x-2 text-sm md:text-base">
                        <Target className="w-3 h-3 md:w-4 md:h-4" />
                        <span>关键指标</span>
                      </h4>
                      {trait.metrics.map((metric, index) => {
                        const progressClass = 
                          trait.color === '#4285F4' ? '[&>div]:bg-[#4285F4]' :
                          trait.color === '#34A853' ? '[&>div]:bg-[#34A853]' :
                          trait.color === '#FBBC05' ? '[&>div]:bg-[#FBBC05]' :
                          '[&>div]:bg-[#EA4335]';
                        
                        return (
                          <div key={index} className="space-y-1.5 md:space-y-2">
                            <div className="flex justify-between text-xs md:text-sm">
                              <span>{metric.name}</span>
                              <span className="text-muted-foreground">
                                {metric.value}{metric.unit} / {metric.total}{metric.unit}
                              </span>
                            </div>
                            <Progress 
                              value={(metric.value / metric.total) * 100} 
                              className={`h-1.5 md:h-2 ${progressClass}`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* 优势 */}
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

                    {/* 改进建议 */}
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

          {/* 综合评价 */}
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
                    {effectiveTraits
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 2)
                      .map((trait) => {
                        const Icon = trait.icon;
                        const iconBgClass = 
                          trait.color === '#4285F4' ? 'bg-[#4285F4]/10 text-[#4285F4]' :
                          trait.color === '#34A853' ? 'bg-[#34A853]/10 text-[#34A853]' :
                          trait.color === '#FBBC05' ? 'bg-[#FBBC05]/10 text-[#FBBC05]' :
                          'bg-[#EA4335]/10 text-[#EA4335]';
                        
                        const scoreClass = 
                          trait.color === '#4285F4' ? 'text-[#4285F4]' :
                          trait.color === '#34A853' ? 'text-[#34A853]' :
                          trait.color === '#FBBC05' ? 'text-[#FBBC05]' :
                          'text-[#EA4335]';
                        
                        return (
                          <div 
                            key={trait.trait} 
                            className="p-2.5 md:p-3 rounded-lg border bg-background flex items-center space-x-2 md:space-x-3"
                          >
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
                              <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs md:text-sm truncate">{trait.trait}</p>
                              <p className="text-[10px] md:text-xs text-muted-foreground truncate">{trait.description}</p>
                            </div>
                            <div className={`text-base md:text-lg font-medium flex-shrink-0 ${scoreClass}`}>
                              {trait.score}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 md:mb-3 flex items-center space-x-2 text-sm md:text-base">
                    <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-[#FBBC05]" />
                    <span>提升空间</span>
                  </h4>
                  <div className="space-y-2">
                    {effectiveTraits
                      .sort((a, b) => a.score - b.score)
                      .slice(0, 2)
                      .map((trait) => {
                        const Icon = trait.icon;
                        const iconBgClass = 
                          trait.color === '#4285F4' ? 'bg-[#4285F4]/10 text-[#4285F4]' :
                          trait.color === '#34A853' ? 'bg-[#34A853]/10 text-[#34A853]' :
                          trait.color === '#FBBC05' ? 'bg-[#FBBC05]/10 text-[#FBBC05]' :
                          'bg-[#EA4335]/10 text-[#EA4335]';
                        
                        const scoreClass = 
                          trait.color === '#4285F4' ? 'text-[#4285F4]' :
                          trait.color === '#34A853' ? 'text-[#34A853]' :
                          trait.color === '#FBBC05' ? 'text-[#FBBC05]' :
                          'text-[#EA4335]';
                        
                        return (
                          <div 
                            key={trait.trait} 
                            className="p-2.5 md:p-3 rounded-lg border bg-background flex items-center space-x-2 md:space-x-3"
                          >
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
                              <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs md:text-sm truncate">{trait.trait}</p>
                              <p className="text-[10px] md:text-xs text-muted-foreground">还有进步空间</p>
                            </div>
                            <div className={`text-base md:text-lg font-medium flex-shrink-0 ${scoreClass}`}>
                              {trait.score}
                            </div>
                          </div>
                        );
                      })}
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
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>各科目表现</CardTitle>
              <CardDescription>查看不同科目的学习进度和正确率</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 md:space-y-6">
                {subjectPerformanceData.map((subject) => (
                  <div key={subject.subject} className="space-y-2 md:space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-medium text-sm md:text-base">{subject.subject}</h3>
                      <div className="flex items-center gap-2 md:gap-4">
                        <Badge variant="secondary" className="text-xs md:text-sm">
                          正确率 {subject.accuracy}%
                        </Badge>
                        <span className="text-xs md:text-sm text-gray-600">
                          {subject.completed}/{subject.total} 章节
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex justify-between text-xs md:text-sm">
                        <span>完成进度</span>
                        <span>{Math.round((subject.completed / subject.total) * 100)}%</span>
                      </div>
                      <Progress value={(subject.completed / subject.total) * 100} className="h-1.5 md:h-2 [&>div]:bg-[#4285F4]" />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex justify-between text-xs md:text-sm">
                        <span>掌握程度</span>
                        <span>{subject.accuracy}%</span>
                      </div>
                      <Progress 
                        value={subject.accuracy} 
                        className={`h-1.5 md:h-2 ${
                          subject.accuracy >= 85 ? '[&>div]:bg-[#34A853]' : 
                          subject.accuracy >= 70 ? '[&>div]:bg-[#FBBC05]' : '[&>div]:bg-[#EA4335]'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mistakes" className="space-y-4 md:space-y-6">
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>错题分布</CardTitle>
                <CardDescription>按知识点分类的错题统计</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={280} minWidth={280}>
                    <PieChart>
                      <Pie
                        data={mistakeAnalysisData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="mistakes"
                      >
                        {mistakeAnalysisData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#FFFFFF', 
                          border: '1px solid #E0E0E0',
                          borderRadius: '8px',
                          color: '#202124'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>重点关注</CardTitle>
                <CardDescription>需要加强练习的知识点</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                {mistakeAnalysisData
                  .sort((a, b) => b.mistakes - a.mistakes)
                  .map((item) => (
                    <div key={item.category} className="flex items-center justify-between p-2.5 md:p-3 border rounded-lg gap-2">
                      <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                        <div 
                          className="w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-xs md:text-sm truncate">{item.category}</p>
                          <p className="text-[10px] md:text-sm text-gray-600">{item.mistakes} 道错题</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="flex-shrink-0 text-xs md:text-sm">
                        专项练习
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4 md:space-y-6">
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {achievements.map((achievement, index) => (
              <Card key={index} className={`${achievement.earned ? 'border-[#34A853]' : 'border-gray-200'}`}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 md:space-x-3 mb-2">
                        <div className={`text-xl md:text-2xl ${!achievement.earned && 'grayscale'}`}>
                          {achievement.earned ? '🏆' : '🎯'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm md:text-base">{achievement.name}</h3>
                          <p className="text-xs md:text-sm text-gray-600">{achievement.description}</p>
                        </div>
                      </div>
                      
                      {achievement.earned ? (
                        <div className="flex items-center space-x-2 text-xs md:text-sm text-[#34A853]">
                          <Award className="w-3 h-3 md:w-4 md:h-4" />
                          <span>已获得 - {achievement.date}</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5 md:space-y-2">
                          <div className="flex justify-between text-xs md:text-sm">
                            <span>进度</span>
                            <span>{achievement.progress}%</span>
                          </div>
                          <Progress value={achievement.progress} className="h-1.5 md:h-2 [&>div]:bg-[#4285F4]" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
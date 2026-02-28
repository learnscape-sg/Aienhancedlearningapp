import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { getAdminBusinessAnalytics, type AdminBusinessAnalyticsResponse } from '../../lib/backendApi';
import { AdminTopNav } from './AdminTopNav';
import { AdminFilterBar } from './shared/AdminFilterBar';
import { AdminChartCard } from './shared/AdminChartCard';
import { AdminStatCard, AdminStatGrid } from './shared/AdminStatGrid';
import { AdminTableCard } from './shared/AdminTableCard';

export function AdminBusinessPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminBusinessAnalyticsResponse | null>(null);
  const [startDate, setStartDate] = useState(() => new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [topN, setTopN] = useState(10);

  const rangeLabel = useMemo(() => `${startDate} ~ ${endDate}`, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        navigate('/admin/login', { replace: true });
        return;
      }
      const result = await getAdminBusinessAnalytics({ startDate, endDate, topN }, token);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <AdminTopNav />
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Business Dashboard</h2>
          <p className="text-sm text-slate-500">Growth, funnel and learning outcome overview ({rangeLabel})</p>
        </div>

        <AdminFilterBar
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          topN={topN}
          onTopNChange={setTopN}
          onRefresh={loadData}
        />

        {loading ? <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">加载中...</div> : null}
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {data ? (
          <>
            <AdminStatGrid columns={6}>
              <AdminStatCard label="老师总数" value={String(data.summary.teachersTotal)} />
              <AdminStatCard label="学生总数" value={String(data.summary.studentsTotal)} />
              <AdminStatCard label="活跃老师" value={String(data.summary.activeTeachers)} />
              <AdminStatCard label="活跃学生" value={String(data.summary.activeStudents)} />
              <AdminStatCard label="课程完成率" value={`${(data.summary.courseCompletionRate * 100).toFixed(1)}%`} />
              <AdminStatCard label="平均学习时长(分)" value={data.summary.avgTimeSpentMinutes.toFixed(1)} />
            </AdminStatGrid>
            <AdminStatGrid columns={5}>
              <AdminStatCard label="老师 D7 留存" value={`${(data.summary.teacherD7Retention * 100).toFixed(1)}%`} />
              <AdminStatCard label="学生 D7 留存" value={`${(data.summary.studentD7Retention * 100).toFixed(1)}%`} />
              <AdminStatCard label="老师激活中位时长(小时)" value={data.summary.teacherMedianActivationHours.toFixed(1)} />
              <AdminStatCard label="学生激活中位时长(小时)" value={data.summary.studentMedianActivationHours.toFixed(1)} />
              <AdminStatCard label="求助密度(每次开课)" value={data.summary.stuckPerCourseOpen.toFixed(2)} />
            </AdminStatGrid>

            <AdminChartCard title="业务漏斗（课程链路）">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={[
                    { stage: 'Created', value: data.funnel.courseCreated },
                    { stage: 'Published', value: data.funnel.coursePublished },
                    { stage: 'Assigned', value: data.funnel.courseAssigned },
                    { stage: 'Completed', value: data.funnel.courseCompleted },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </AdminChartCard>
            <AdminChartCard title="教师激活漏斗">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.teacherActivationFunnel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0284c7" />
                </BarChart>
              </ResponsiveContainer>
            </AdminChartCard>
            <AdminChartCard title="学生学习漏斗">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.studentLearningFunnel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </AdminChartCard>

            <AdminChartCard title="每日业务趋势">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="courseCreated" stroke="#0ea5e9" name="Course Created" />
                  <Line type="monotone" dataKey="courseCompleted" stroke="#16a34a" name="Course Completed" />
                  <Line type="monotone" dataKey="activeStudents" stroke="#f59e0b" name="Active Students" />
                </LineChart>
              </ResponsiveContainer>
            </AdminChartCard>
            <AdminChartCard title="留存趋势（D1/D7）">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.retention.byDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="teacherD1" stroke="#0ea5e9" name="Teacher D1" />
                  <Line type="monotone" dataKey="teacherD7" stroke="#0284c7" name="Teacher D7" />
                  <Line type="monotone" dataKey="studentD1" stroke="#22c55e" name="Student D1" />
                  <Line type="monotone" dataKey="studentD7" stroke="#15803d" name="Student D7" />
                </LineChart>
              </ResponsiveContainer>
            </AdminChartCard>

            <AdminTableCard
              title={`教师 Top ${topN}（按创建课程）`}
              headers={['Teacher', 'Course Count']}
              rows={data.topTeachersByCourses.map((x) => [x.teacherName, String(x.courseCount)])}
            />
            <AdminTableCard
              title={`学生 Top ${topN}（按完成课程）`}
              headers={['Student', 'Completed Courses', 'Avg Progress']}
              rows={data.topStudentsByCompletion.map((x) => [x.studentName, String(x.completedCourses), `${x.avgProgress.toFixed(1)}%`])}
            />
            <AdminTableCard
              title="热门学科"
              headers={['Subject', 'Course Count']}
              rows={data.topSubjects.map((x) => [x.subject, String(x.count)])}
            />
            <AdminTableCard
              title="热门年级"
              headers={['Grade', 'Course Count']}
              rows={data.topGrades.map((x) => [x.grade, String(x.count)])}
            />
            <AdminTableCard
              title="学习质量代理（卡点 Top）"
              headers={['Task Step', 'Stuck Count']}
              rows={data.learningQualityProxy.topStuckSteps.map((x) => [x.step, String(x.count)])}
            />
            <AdminTableCard
              title="发布阈值告警"
              headers={['Level', 'Metric', 'Value', 'Threshold', 'Message']}
              rows={data.releaseAlerts.map((x) => [x.level, x.metric, String(x.value), String(x.threshold), x.message])}
            />
            <AdminTableCard
              title="周度运营复盘（近 7 天 vs 前 7 天）"
              headers={['Metric', 'Current', 'Previous', 'Delta %']}
              rows={data.weeklyReview.map((x) => [x.metric, String(x.current), String(x.previous), `${x.deltaPct.toFixed(2)}%`])}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

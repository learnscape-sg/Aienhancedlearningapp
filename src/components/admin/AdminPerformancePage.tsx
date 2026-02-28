import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { AdminTopNav } from './AdminTopNav';
import { getAdminPerformanceAnalytics, type AdminPerformanceAnalyticsResponse } from '../../lib/backendApi';
import { AdminFilterBar } from './shared/AdminFilterBar';
import { AdminChartCard } from './shared/AdminChartCard';
import { AdminStatCard, AdminStatGrid } from './shared/AdminStatGrid';
import { AdminTableCard } from './shared/AdminTableCard';

export function AdminPerformancePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminPerformanceAnalyticsResponse | null>(null);
  const [startDate, setStartDate] = useState(() => new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10));
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
      const result = await getAdminPerformanceAnalytics({ startDate, endDate, topN }, token);
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
          <h2 className="text-lg font-semibold text-slate-900">Performance Dashboard</h2>
          <p className="text-sm text-slate-500">Runtime stability, latency and reliability ({rangeLabel})</p>
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
              <AdminStatCard label="请求数" value={String(data.summary.totalRequests)} />
              <AdminStatCard label="成功率" value={`${(data.summary.successRate * 100).toFixed(1)}%`} />
              <AdminStatCard label="失败率" value={`${(data.summary.failRate * 100).toFixed(1)}%`} />
              <AdminStatCard label="P95 延迟(ms)" value={String(data.summary.p95LatencyMs)} />
              <AdminStatCard label="P99 延迟(ms)" value={String(data.summary.p99LatencyMs)} />
              <AdminStatCard label="重试请求率" value={`${(data.summary.retriedRequestRate * 100).toFixed(1)}%`} />
            </AdminStatGrid>

            <AdminChartCard title="每日成功率趋势">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.dailyTrend.map((x) => ({ ...x, successRatePercent: Number((x.successRate * 100).toFixed(1)) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="successRatePercent" stroke="#0f766e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </AdminChartCard>

            <AdminChartCard title="接口 P95 延迟 Top">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data.endpointTop.map((x) => ({ ...x, endpoint: x.endpoint.length > 26 ? `${x.endpoint.slice(0, 26)}...` : x.endpoint }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="endpoint" interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="p95LatencyMs" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </AdminChartCard>

            <AdminTableCard
              title="接口性能 Top"
              headers={['Endpoint', 'Requests', 'Success Rate', 'Retry Rate', 'P95(ms)', 'Avg Retry']}
              rows={data.endpointTop.map((x) => [
                x.endpoint,
                String(x.requests),
                `${(x.successRate * 100).toFixed(1)}%`,
                `${(x.retriedRequestRate * 100).toFixed(1)}%`,
                String(x.p95LatencyMs),
                x.avgRetryCount.toFixed(2),
              ])}
            />
            <AdminTableCard
              title="模型性能 Top"
              headers={['Model', 'Requests', 'Success Rate', 'P95(ms)', 'Avg Retry']}
              rows={data.modelTop.map((x) => [
                x.model,
                String(x.requests),
                `${(x.successRate * 100).toFixed(1)}%`,
                String(x.p95LatencyMs),
                x.avgRetryCount.toFixed(2),
              ])}
            />
            <AdminTableCard
              title="高延迟异常请求"
              headers={['Run ID', 'Time', 'Endpoint', 'Model', 'Latency(ms)', 'Retry', 'Success']}
              rows={data.highLatencyAnomalies.map((x) => [
                x.runId,
                new Date(x.createdAt).toLocaleString(),
                x.endpoint,
                x.model,
                String(x.latencyMs),
                String(x.retryCount),
                x.success ? 'Y' : 'N',
              ])}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

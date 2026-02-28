import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import type { AdminCostAnalyticsResponse } from '../../lib/backendApi';
import { getAdminCostAnalytics } from '../../lib/backendApi';
import { AdminTopNav } from './AdminTopNav';
import { AdminFilterBar } from './shared/AdminFilterBar';
import { AdminStatCard, AdminStatGrid } from './shared/AdminStatGrid';
import { AdminTableCard } from './shared/AdminTableCard';

export function AdminCostPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminCostAnalyticsResponse | null>(null);
  const [startDate, setStartDate] = useState(() => new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [topN, setTopN] = useState(10);
  const [anomalyThresholdUsd, setAnomalyThresholdUsd] = useState(0.01);

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

      const result = await getAdminCostAnalytics(
        { startDate, endDate, topN },
        token
      );
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      if (message.includes('Admin access required') || message.includes('Missing bearer token') || message.includes('Invalid token')) {
        await supabase.auth.signOut();
        navigate('/admin/login', { replace: true });
        return;
      }
      setError(message);
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
          <h2 className="text-lg font-semibold text-slate-900">Cost Dashboard</h2>
          <p className="text-sm text-slate-500">LLM usage and token cost overview ({rangeLabel})</p>
        </div>

        <AdminFilterBar
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          topN={topN}
          onTopNChange={setTopN}
          onRefresh={loadData}
          extraControls={(
            <div>
              <label className="block text-xs text-slate-500 mb-1">异常阈值(USD)</label>
              <input
                type="number"
                min={0}
                step={0.0001}
                value={anomalyThresholdUsd}
                onChange={(event) => setAnomalyThresholdUsd(Math.max(0, Number(event.target.value || 0)))}
                className="rounded-md border px-3 py-2 text-sm w-28"
              />
            </div>
          )}
        />

        {loading ? <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">加载中...</div> : null}
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {data ? (
          <>
            <AdminStatGrid columns={6}>
              <AdminStatCard label="总请求数" value={String(data.summary.totalRequests)} />
              <AdminStatCard label="总 Tokens In" value={String(data.summary.totalTokensIn)} />
              <AdminStatCard label="总 Tokens Out" value={String(data.summary.totalTokensOut)} />
              <AdminStatCard label="总 Tokens" value={String(data.summary.totalTokens)} />
              <AdminStatCard label="总成本(USD)" value={data.summary.totalCostUsd.toFixed(4)} />
              <AdminStatCard label="单请求平均成本(USD)" value={data.summary.avgCostPerRequestUsd.toFixed(6)} />
            </AdminStatGrid>

            <AdminTableCard
              title="按模型"
              headers={['Model', 'Requests', 'Cost (USD)']}
              rows={data.byModel
                .sort((a, b) => b.costUsd - a.costUsd)
                .map((x) => [x.model, String(x.requests), x.costUsd.toFixed(4)])}
            />
            <AdminTableCard
              title="按接口/功能"
              headers={['Endpoint/Feature', 'Requests', 'Cost (USD)']}
              rows={data.byEndpoint
                .sort((a, b) => b.costUsd - a.costUsd)
                .map((x) => [x.endpoint, String(x.requests), x.costUsd.toFixed(4)])}
            />
            <AdminTableCard
              title="按日期"
              headers={['Day', 'Requests', 'Cost (USD)']}
              rows={data.byDay
                .sort((a, b) => a.day.localeCompare(b.day))
                .map((x) => [x.day, String(x.requests), x.costUsd.toFixed(4)])}
            />
            <AdminTableCard
              title={`教师 Top ${topN}`}
              headers={['Teacher', 'Requests', 'Tokens In', 'Tokens Out', 'Cost (USD)']}
              rows={data.teacherTopN.map((x) => [
                x.teacherName,
                String(x.requests),
                String(x.tokensIn),
                String(x.tokensOut),
                x.costUsd.toFixed(4),
              ])}
            />
            <AdminTableCard
              title={`学生 Top ${topN}`}
              headers={['Student', 'Requests', 'Tokens In', 'Tokens Out', 'Cost (USD)']}
              rows={data.studentTopN.map((x) => [
                x.studentName,
                String(x.requests),
                String(x.tokensIn),
                String(x.tokensOut),
                x.costUsd.toFixed(4),
              ])}
            />
            <AnomalyTable
              title="单次请求高成本异常榜"
              thresholdUsd={anomalyThresholdUsd}
              rows={data.highCostAnomalies.map((x) => ({
                runId: x.runId,
                time: new Date(x.createdAt).toLocaleString(),
                endpoint: x.endpoint,
                model: x.model,
                costUsd: x.costUsd,
                tokens: x.tokensTotal,
                retry: x.retryCount,
                latencyMs: x.latencyMs,
                success: x.success,
              }))}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function AnomalyTable({
  title,
  thresholdUsd,
  rows,
}: {
  title: string;
  thresholdUsd: number;
  rows: Array<{
    runId: string;
    time: string;
    endpoint: string;
    model: string;
    costUsd: number;
    tokens: number;
    retry: number;
    latencyMs: number;
    success: boolean;
  }>;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h2 className="text-base font-semibold text-slate-900 mb-3">
        {title}
        <span className="text-sm text-slate-500 ml-2">(高亮阈值: ${thresholdUsd.toFixed(4)})</span>
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              {['Run ID', 'Time', 'Endpoint', 'Model', 'Cost (USD)', 'Tokens', 'Retry', 'Latency(ms)', 'Success'].map((h) => (
                <th key={h} className="text-left font-medium text-slate-600 py-2 pr-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const isHigh = r.costUsd >= thresholdUsd;
              return (
                <tr
                  key={`${r.runId}-${idx}`}
                  className={`border-b last:border-0 ${isHigh ? 'bg-amber-50' : ''}`}
                >
                  <td className="py-2 pr-4 text-slate-800">{r.runId}</td>
                  <td className="py-2 pr-4 text-slate-800">{r.time}</td>
                  <td className="py-2 pr-4 text-slate-800">{r.endpoint}</td>
                  <td className="py-2 pr-4 text-slate-800">{r.model}</td>
                  <td className={`py-2 pr-4 font-medium ${isHigh ? 'text-amber-700' : 'text-slate-800'}`}>{r.costUsd.toFixed(6)}</td>
                  <td className="py-2 pr-4 text-slate-800">{r.tokens}</td>
                  <td className="py-2 pr-4 text-slate-800">{r.retry}</td>
                  <td className="py-2 pr-4 text-slate-800">{r.latencyMs}</td>
                  <td className="py-2 pr-4 text-slate-800">{r.success ? 'Y' : 'N'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { AdminTopNav } from './AdminTopNav';
import { getAdminFeedbacks, type AdminFeedbackResponse } from '../../lib/backendApi';
import { AdminFilterBar, AdminSelectControl, AdminTextControl } from './shared/AdminFilterBar';
import { AdminStatCard, AdminStatGrid } from './shared/AdminStatGrid';
import { AdminTableCard } from './shared/AdminTableCard';

export function AdminFeedbackPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminFeedbackResponse | null>(null);
  const [startDate, setStartDate] = useState(() => new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'other' | ''>('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(200);

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
      const result = await getAdminFeedbacks(
        { startDate, endDate, feedbackType, q: query.trim() || undefined, limit },
        token
      );
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
      <div className="max-w-7xl mx-auto space-y-4">
        <AdminTopNav />
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Feedback Dashboard</h2>
          <p className="text-sm text-slate-500">All feedback collected by FeedbackButton ({rangeLabel})</p>
        </div>

        <AdminFilterBar
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onRefresh={loadData}
          extraControls={(
            <>
              <AdminSelectControl
                label="类型"
                value={feedbackType}
                onChange={(value) => setFeedbackType(value as 'bug' | 'suggestion' | 'other' | '')}
                options={[
                  { value: '', label: '全部' },
                  { value: 'bug', label: 'Bug' },
                  { value: 'suggestion', label: 'Suggestion' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <AdminTextControl
                label="关键词"
                value={query}
                onChange={setQuery}
                placeholder="搜索反馈内容"
              />
              <div>
                <label className="block text-xs text-slate-500 mb-1">Limit</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={limit}
                  onChange={(event) => setLimit(Math.max(1, Math.min(500, Number(event.target.value || 200))))}
                  className="rounded-md border px-3 py-2 text-sm w-24"
                />
              </div>
            </>
          )}
        />

        {loading ? <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">加载中...</div> : null}
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {data ? (
          <>
            <AdminStatGrid columns={5}>
              <AdminStatCard label="反馈总数" value={String(data.summary.total)} />
              <AdminStatCard label="Bug" value={String(data.summary.bugCount)} />
              <AdminStatCard label="Suggestion" value={String(data.summary.suggestionCount)} />
              <AdminStatCard label="Other" value={String(data.summary.otherCount)} />
              <AdminStatCard label="平均评分" value={data.summary.avgRating > 0 ? data.summary.avgRating.toFixed(2) : '-'} />
            </AdminStatGrid>

            <AdminTableCard
              title="Feedback 列表"
              headers={['时间', '类型', '评分', '用户', '邮箱', 'User ID', '页面', '反馈内容', '用户标识']}
              rows={data.items.map((item) => [
                <span className="whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</span>,
                item.feedbackType,
                item.rating ?? '-',
                <span className="whitespace-nowrap">{item.userName || '匿名'}</span>,
                <span className="text-xs whitespace-nowrap">{item.userEmail || '-'}</span>,
                <span className="text-xs break-all">{item.userId || '-'}</span>,
                <div className="min-w-48">
                  <div className="font-medium">{item.pageName || '-'}</div>
                  <div className="text-xs text-slate-500 break-all">{item.pagePath || '-'}</div>
                </div>,
                <div className="min-w-96 whitespace-pre-wrap">{item.feedbackText}</div>,
                <span className="text-xs break-all">{item.userIdentifier || '-'}</span>,
              ])}
            />
            <AdminTableCard
              title="反馈主题分布（关键词）"
              headers={['Topic', 'Count']}
              rows={data.topicDistribution.map((x) => [x.topic, String(x.count)])}
            />
            <AdminTableCard
              title="高风险反馈队列（低评分 + Bug）"
              headers={['时间', '类型', '评分', '用户', '页面', '反馈内容']}
              rows={data.highRiskQueue.map((item) => [
                <span className="whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</span>,
                item.feedbackType,
                item.rating ?? '-',
                <span className="whitespace-nowrap">{item.userName || '匿名'}</span>,
                <span className="text-xs break-all">{item.pagePath || '-'}</span>,
                <div className="min-w-96 whitespace-pre-wrap">{item.feedbackText}</div>,
              ])}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { listAdminTenants, listAdminClasses, batchCreateAccounts, type AdminTenantRow, type BatchCreateAccountsResult } from '../../lib/backendApi';
import { AdminTopNav } from './AdminTopNav';

interface ClassItem {
  id: string;
  name: string;
  grade?: string;
  studentCount?: number;
}

export function AdminDataPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenants, setTenants] = useState<AdminTenantRow[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [role, setRole] = useState<'teacher' | 'student' | 'parent'>('student');
  const [defaultPassword, setDefaultPassword] = useState('');
  const [identifiersInput, setIdentifiersInput] = useState('');
  const [classIds, setClassIds] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    summary: { created: number; updated: number; skipped: number; errors: number };
    results: BatchCreateAccountsResult[];
  } | null>(null);

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      navigate('/admin/login', { replace: true });
      return null;
    }
    return token;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;
        const result = await listAdminTenants({ limit: 100 }, token);
        if (!cancelled) setTenants(result.tenants ?? []);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : '加载失败';
          if (message.includes('Admin access required') || message.includes('Invalid token')) {
            await supabase.auth.signOut();
            navigate('/admin/login', { replace: true });
            return;
          }
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (role !== 'student' || !tenantId.trim()) {
      setClasses([]);
      setClassIds([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setClassesLoading(true);
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;
        const result = await listAdminClasses(tenantId.trim(), token);
        if (!cancelled) setClasses(result.classes ?? []);
      } catch {
        if (!cancelled) setClasses([]);
      } finally {
        if (!cancelled) setClassesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [role, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLastResult(null);

    const token = await getAccessToken();
    if (!token) return;

    if (!tenantId.trim()) {
      setError('请选择 Tenant');
      return;
    }
    if (role === 'student' && classIds.length === 0) {
      setError('学生角色需要选择至少一个班级');
      return;
    }
    if (!defaultPassword || defaultPassword.length < 6) {
      setError('请输入至少 6 位默认密码');
      return;
    }

    const lines = identifiersInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError('请输入至少一个邮箱/手机号/账号名，每行一个');
      return;
    }

    setSubmitting(true);
    try {
      const data = await batchCreateAccounts(
        {
          tenantId: tenantId.trim(),
          role,
          defaultPassword,
          identifiers: lines,
          ...(role === 'student' && classIds.length > 0 ? { classIds } : {}),
        },
        token
      );
      setLastResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <AdminTopNav />
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">数据管理 · 批量生成账号</h2>
          <p className="text-sm text-slate-500 mt-1">
            支持邮箱、手机号或简单账号名；选择租户和角色后批量创建，学生需选择班级。
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tenant</label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">-- 选择租户 --</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.market_code ?? 'N/A'} / {t.name} ({t.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">角色 (Role)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'teacher' | 'student' | 'parent')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="teacher">教师 (teacher)</option>
                <option value="student">学生 (student)</option>
                <option value="parent">家长 (parent)</option>
              </select>
            </div>
          </div>

          {role === 'student' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">班级（学生必选，可多选）</label>
              {!tenantId.trim() ? (
                <p className="text-sm text-slate-500">请先选择 Tenant</p>
              ) : classesLoading ? (
                <p className="text-sm text-slate-500">加载班级中...</p>
              ) : classes.length === 0 ? (
                <p className="text-sm text-amber-600">该租户下暂无班级，请先在教师端创建班级</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => {
                    const checked = classIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer ${
                          checked ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setClassIds((prev) => [...prev, c.id]);
                            else setClassIds((prev) => prev.filter((id) => id !== c.id));
                          }}
                        />
                        {c.name}
                        {c.grade ? ` (${c.grade})` : ''}
                        {c.studentCount != null ? ` · ${c.studentCount}人` : ''}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">默认密码 (至少 6 位)</label>
            <input
              type="password"
              value={defaultPassword}
              onChange={(e) => setDefaultPassword(e.target.value)}
              placeholder="例如: ChangeMe123"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              minLength={6}
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              邮箱 / 手机号 / 账号名（每行一个，支持逗号分隔）
            </label>
            <textarea
              value={identifiersInput}
              onChange={(e) => setIdentifiersInput(e.target.value)}
              placeholder={'user1@example.com\n+8613800138000\nstudent001\nzhangsan'}
              className="w-full min-h-[180px] rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || loading}
              className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {submitting ? '生成中...' : '批量生成账号'}
            </button>
          </div>
        </form>

        {lastResult && (
          <div className="rounded-xl border bg-white p-6 space-y-3">
            <h3 className="text-base font-semibold">执行结果</h3>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600">新建: {lastResult.summary.created}</span>
              <span className="text-blue-600">更新: {lastResult.summary.updated}</span>
              <span className="text-slate-500">跳过: {lastResult.summary.skipped}</span>
              {lastResult.summary.errors > 0 && (
                <span className="text-red-600">失败: {lastResult.summary.errors}</span>
              )}
            </div>
            <div className="max-h-[240px] overflow-auto rounded-md border">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-3 py-2">邮箱/手机号/账号</th>
                    <th className="text-left px-3 py-2">状态</th>
                    <th className="text-left px-3 py-2">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {lastResult.results.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono">{r.identifier}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            r.status === 'created'
                              ? 'text-green-600'
                              : r.status === 'updated'
                                ? 'text-blue-600'
                                : r.status === 'error'
                                  ? 'text-red-600'
                                  : 'text-slate-500'
                          }
                        >
                          {r.status === 'created' ? '新建' : r.status === 'updated' ? '更新' : r.status === 'error' ? '失败' : '跳过'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.message ?? (r.userId ? r.userId.slice(0, 8) + '...' : '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

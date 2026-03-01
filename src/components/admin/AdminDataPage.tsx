import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import {
  listAdminTenants,
  listAdminClasses,
  createAdminClass,
  lookupAdminClasses,
  batchCreateAccounts,
  importAdminAccountsByFile,
  type AdminTenantRow,
  type BatchCreateAccountsResult,
  type AdminImportRowResult,
} from '../../lib/backendApi';
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
  const [creatingClass, setCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<ClassItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [importFileType, setImportFileType] = useState<'student_sheet' | 'teacher_sheet'>('student_sheet');
  const [importPassword, setImportPassword] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    summary: { total: number; created: number; updated: number; skipped: number; errors: number };
    rows: AdminImportRowResult[];
  } | null>(null);
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

  const addClassSelection = (classItem: ClassItem) => {
    setClasses((prev) => {
      if (prev.some((c) => c.id === classItem.id)) return prev;
      return [classItem, ...prev];
    });
    setClassIds((prev) => (prev.includes(classItem.id) ? prev : [...prev, classItem.id]));
  };

  const handleCreateClass = async () => {
    setError('');
    if (!tenantId.trim()) {
      setError('请先选择 Tenant');
      return;
    }
    if (!newClassName.trim()) {
      setError('请输入班级名称');
      return;
    }

    const token = await getAccessToken();
    if (!token) return;

    setCreatingClass(true);
    try {
      const created = await createAdminClass(tenantId.trim(), newClassName.trim(), newClassGrade || undefined, token);
      addClassSelection({
        id: created.id,
        name: created.name,
        grade: created.grade,
        studentCount: 0,
      });
      setNewClassName('');
      setNewClassGrade('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '新建班级失败');
    } finally {
      setCreatingClass(false);
    }
  };

  const handleLookupClasses = async () => {
    setError('');
    setLookupResults([]);
    if (!tenantId.trim()) {
      setError('请先选择 Tenant');
      return;
    }
    if (!lookupQuery.trim()) {
      setError('请输入班级 ID 或名称');
      return;
    }

    const token = await getAccessToken();
    if (!token) return;

    setLookupLoading(true);
    try {
      const result = await lookupAdminClasses(tenantId.trim(), lookupQuery.trim(), token);
      setLookupResults(result.classes ?? []);
      if (!result.classes || result.classes.length === 0) {
        setError('未找到匹配班级');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '查找班级失败');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setImportResult(null);

    if (!tenantId.trim()) {
      setError('请先选择 Tenant');
      return;
    }
    if (!importPassword || importPassword.length < 6) {
      setError('请填写导入默认密码（至少 6 位）');
      return;
    }
    if (!importFile) {
      setError('请上传 Excel 文件（.xlsx）');
      return;
    }

    const token = await getAccessToken();
    if (!token) return;

    setImporting(true);
    try {
      const roleForImport = importFileType === 'student_sheet' ? 'student' : 'teacher';
      const data = await importAdminAccountsByFile(
        {
          file: importFile,
          tenantId: tenantId.trim(),
          role: roleForImport,
          defaultPassword: importPassword,
          fileType: importFileType,
        },
        token
      );
      setImportResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

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
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-xs font-medium text-slate-600 mb-2">A. 手动新建班级</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="班级名称，例如：高一(1)班"
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={newClassGrade}
                        onChange={(e) => setNewClassGrade(e.target.value)}
                        placeholder="年级（可选）"
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleCreateClass}
                        disabled={creatingClass}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                      >
                        {creatingClass ? '创建中...' : '新建班级并选中'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-xs font-medium text-slate-600 mb-2">B. 添加已有班级（ID 或名称）</p>
                    <div className="flex gap-2">
                      <input
                        value={lookupQuery}
                        onChange={(e) => setLookupQuery(e.target.value)}
                        placeholder="输入班级 ID 或班级名称"
                        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleLookupClasses}
                        disabled={lookupLoading}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                      >
                        {lookupLoading ? '查找中...' : '查找并添加'}
                      </button>
                    </div>
                    {lookupResults.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {lookupResults.map((c) => (
                          <div key={`lookup-${c.id}`} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                            <span>
                              {c.name}
                              {c.grade ? ` (${c.grade})` : ''}
                              {c.studentCount != null ? ` · ${c.studentCount}人` : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => addClassSelection(c)}
                              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                            >
                              添加
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {classesLoading ? <p className="text-sm text-slate-500">加载班级中...</p> : null}
                  {classes.length === 0 ? (
                    <p className="text-sm text-amber-600">该租户下暂无班级，可使用上方「手动新建班级」。</p>
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

        <form onSubmit={handleImportSubmit} className="rounded-xl border bg-white p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Excel 导入账号（学生 / 教师）</h3>
            <p className="text-sm text-slate-500 mt-1">
              先手动选择文件类型，再上传 xlsx。支持按班级名称自动关联学生-班级-老师，教师 profile 支持预填。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">文件类型</label>
              <select
                value={importFileType}
                onChange={(e) => setImportFileType(e.target.value as 'student_sheet' | 'teacher_sheet')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="student_sheet">学生表 (student_sheet)</option>
                <option value="teacher_sheet">教师表 (teacher_sheet)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">导入默认密码</label>
              <input
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="至少 6 位"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">选择文件 (.xlsx)</label>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500 rounded-md bg-slate-50 border p-3">
            <p>字段建议：</p>
            <p>- 通用账号列：账号 / 用户名 / 邮箱 / 手机号</p>
            <p>- 学生表：学生姓名、班级、年级(可选)</p>
            <p>- 教师表：教师姓名、班级、学科(可选)、工号(可选)</p>
          </div>

          <div>
            <button
              type="submit"
              disabled={importing || loading}
              className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {importing ? '导入中...' : '上传并导入'}
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

        {importResult && (
          <div className="rounded-xl border bg-white p-6 space-y-3">
            <h3 className="text-base font-semibold">Excel 导入结果</h3>
            <div className="flex gap-4 text-sm">
              <span className="text-slate-700">总行数: {importResult.summary.total}</span>
              <span className="text-green-600">新建: {importResult.summary.created}</span>
              <span className="text-blue-600">更新: {importResult.summary.updated}</span>
              <span className="text-slate-500">跳过: {importResult.summary.skipped}</span>
              {importResult.summary.errors > 0 ? (
                <span className="text-red-600">失败: {importResult.summary.errors}</span>
              ) : null}
            </div>
            <div className="max-h-[260px] overflow-auto rounded-md border">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-2 py-2">行号</th>
                    <th className="text-left px-2 py-2">账号</th>
                    <th className="text-left px-2 py-2">姓名</th>
                    <th className="text-left px-2 py-2">班级</th>
                    <th className="text-left px-2 py-2">状态</th>
                    <th className="text-left px-2 py-2">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.rows.map((row, idx) => (
                    <tr key={`${row.rowNumber}-${idx}`} className="border-b last:border-0">
                      <td className="px-2 py-2">{row.rowNumber}</td>
                      <td className="px-2 py-2 font-mono">{row.identifier ?? '-'}</td>
                      <td className="px-2 py-2">{row.name ?? '-'}</td>
                      <td className="px-2 py-2">{row.className ?? '-'}</td>
                      <td className="px-2 py-2">
                        <span className={row.status === 'error' ? 'text-red-600' : row.status === 'created' ? 'text-green-600' : 'text-blue-600'}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-600">{row.message ?? ''}</td>
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

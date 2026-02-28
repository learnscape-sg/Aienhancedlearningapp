import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import {
  listAdminTenants,
  listAdminMarketPolicies,
  resolveAdminMarketPolicy,
  upsertAdminMarketPolicy,
  type AdminMarketPolicyRow,
  type AdminTenantRow,
  type RuntimeMarketPolicy,
} from '../../lib/backendApi';
import { AdminTopNav } from './AdminTopNav';

type PolicyKey = 'video_platform' | 'content_language_default' | 'feature_flags' | 'nav_landing';

const POLICY_TEMPLATES: Record<PolicyKey, Record<string, unknown>> = {
  video_platform: { platformDefault: 'bilibili', fallbackPlatforms: ['bilibili', 'youtube'] },
  content_language_default: { defaultLanguage: 'zh', allowOverride: true },
  feature_flags: { flags: { enableParentWorkspace: true, enableLanguageSpaceSwitcher: true } },
  nav_landing: {
    hiddenSectionsByRole: {},
    sectionOrderByRole: {},
    labelOverrides: {},
    landingVariantByRole: {},
  },
};

export function AdminSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [policies, setPolicies] = useState<AdminMarketPolicyRow[]>([]);
  const [tenants, setTenants] = useState<AdminTenantRow[]>([]);
  const [resolvedPolicy, setResolvedPolicy] = useState<RuntimeMarketPolicy | null>(null);

  const [policyKey, setPolicyKey] = useState<PolicyKey>('video_platform');
  const [tenantId, setTenantId] = useState('');
  const [marketCode, setMarketCode] = useState<'CN' | 'SG' | ''>('');
  const [space, setSpace] = useState<'zh' | 'en' | ''>('');
  const [role, setRole] = useState<'teacher' | 'student' | 'parent' | 'admin' | ''>('');
  const [enabled, setEnabled] = useState(true);
  const [jsonInput, setJsonInput] = useState(
    JSON.stringify(POLICY_TEMPLATES.video_platform, null, 2)
  );

  const scopePreview = useMemo(() => {
    const parts: string[] = [];
    if (tenantId.trim()) parts.push(`tenant:${tenantId.trim()}`);
    if (marketCode) parts.push(`market:${marketCode}`);
    if (space) parts.push(`space:${space}`);
    if (role) parts.push(`role:${role}`);
    return parts.length > 0 ? parts.join(' | ') : 'global';
  }, [tenantId, marketCode, space, role]);

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      navigate('/admin/login', { replace: true });
      return null;
    }
    return token;
  };

  const loadPolicies = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      if (!token) return;
      const result = await listAdminMarketPolicies({}, token);
      setPolicies(result.policies);
      const tenantResult = await listAdminTenants({ limit: 100 }, token);
      setTenants(tenantResult.tenants);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      if (message.includes('Admin access required') || message.includes('Invalid token')) {
        await supabase.auth.signOut();
        navigate('/admin/login', { replace: true });
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const previewResolve = async () => {
    setError('');
    try {
      const token = await getAccessToken();
      if (!token) return;
      const result = await resolveAdminMarketPolicy(
        {
          tenantId: tenantId.trim() || null,
          marketCode: marketCode || null,
          space: space || null,
          role: role || null,
        },
        token
      );
      setResolvedPolicy(result.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : '策略预览失败');
    }
  };

  const savePolicy = async () => {
    setSaving(true);
    setError('');
    try {
      const token = await getAccessToken();
      if (!token) return;
      let policyJson: Record<string, unknown>;
      try {
        policyJson = JSON.parse(jsonInput);
      } catch {
        setError('policy_json 不是合法 JSON');
        setSaving(false);
        return;
      }
      const normalizedTenantId = tenantId.trim();
      if (normalizedTenantId) {
        const tenantExists = tenants.some((t) => t.id === normalizedTenantId);
        if (!tenantExists) {
          setError(`Tenant ID "${normalizedTenantId}" 不存在，请先从租户列表选择有效值。`);
          setSaving(false);
          return;
        }
      }
      await upsertAdminMarketPolicy(
        {
          policyKey,
          tenantId: normalizedTenantId || null,
          marketCode: marketCode || null,
          space: space || null,
          role: role || null,
          policyJson,
          enabled,
        },
        token
      );
      await loadPolicies();
      await previewResolve();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setJsonInput(JSON.stringify(POLICY_TEMPLATES[policyKey], null, 2));
  }, [policyKey]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <AdminTopNav />
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Market Strategy Settings</h2>
          <p className="text-sm text-slate-500">Configure policy by scope: global / market / space / tenant.</p>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <h3 className="text-base font-semibold">Edit Policy</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Policy Key</label>
                <select
                  value={policyKey}
                  onChange={(e) => setPolicyKey(e.target.value as PolicyKey)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="video_platform">video_platform</option>
                  <option value="content_language_default">content_language_default</option>
                  <option value="feature_flags">feature_flags</option>
                  <option value="nav_landing">nav_landing</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tenant ID</label>
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">(none)</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.market_code ?? 'N/A'} / {tenant.name} ({tenant.id})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  从已配置租户中选择；为空表示不按 tenant 维度限制。
                </p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Market</label>
                <select value={marketCode} onChange={(e) => setMarketCode(e.target.value as 'CN' | 'SG' | '')} className="w-full rounded-md border px-3 py-2 text-sm">
                  <option value="">(none)</option>
                  <option value="CN">CN</option>
                  <option value="SG">SG</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Space</label>
                <select value={space} onChange={(e) => setSpace(e.target.value as 'zh' | 'en' | '')} className="w-full rounded-md border px-3 py-2 text-sm">
                  <option value="">(none)</option>
                  <option value="zh">zh</option>
                  <option value="en">en</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as 'teacher' | 'student' | 'parent' | 'admin' | '')} className="w-full rounded-md border px-3 py-2 text-sm">
                  <option value="">(none)</option>
                  <option value="teacher">teacher</option>
                  <option value="student">student</option>
                  <option value="parent">parent</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                  enabled
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Scope Preview</label>
              <div className="rounded-md bg-slate-100 px-3 py-2 text-sm">{scopePreview}</div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">policy_json</label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full min-h-[220px] rounded-md border px-3 py-2 text-xs font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={savePolicy}
                disabled={saving}
                className="rounded-md bg-slate-900 text-white px-3 py-2 text-sm disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Policy'}
              </button>
              <button
                onClick={previewResolve}
                className="rounded-md border px-3 py-2 text-sm hover:bg-slate-100"
              >
                Preview Effective Policy
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4 space-y-3">
            <h3 className="text-base font-semibold">Effective Policy Preview</h3>
            <pre className="rounded-md bg-slate-50 border p-3 text-xs overflow-auto min-h-[220px]">
              {resolvedPolicy ? JSON.stringify(resolvedPolicy, null, 2) : 'Click "Preview Effective Policy"'}
            </pre>
            <h4 className="text-sm font-semibold mt-2">Recent Policies</h4>
            <div className="max-h-[320px] overflow-auto rounded-md border">
              {loading ? (
                <div className="p-3 text-sm text-slate-500">Loading...</div>
              ) : policies.length === 0 ? (
                <div className="p-3 text-sm text-slate-500">No policies yet.</div>
              ) : (
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left px-2 py-2">Key</th>
                      <th className="text-left px-2 py-2">Scope</th>
                      <th className="text-left px-2 py-2">Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((p) => (
                      <tr key={`${p.id}`} className="border-b last:border-0">
                        <td className="px-2 py-2">{p.policy_key}</td>
                        <td className="px-2 py-2">{p.scope_key}</td>
                        <td className="px-2 py-2">{p.enabled ? 'Y' : 'N'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

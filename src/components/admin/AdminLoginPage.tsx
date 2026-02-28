import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;
      const { data: profile } = await supabase
        .from('admin_users')
        .select('active')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile?.active === true) {
        navigate('/admin/cost', { replace: true });
      }
    })();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr || !data.user) throw signErr || new Error('登录失败');

      const { data: profile, error: profileErr } = await supabase
        .from('admin_users')
        .select('active')
        .eq('user_id', data.user.id)
        .maybeSingle();
      if (profileErr || !profile || profile.active !== true) {
        await supabase.auth.signOut();
        throw new Error('当前账号不是管理员账号。');
      }

      navigate('/admin/cost', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-white shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
        <p className="text-sm text-slate-500 mt-1">登录后可查看 token 成本看板</p>
        <form onSubmit={onSubmit} className="space-y-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">邮箱</label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 text-white py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录 Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

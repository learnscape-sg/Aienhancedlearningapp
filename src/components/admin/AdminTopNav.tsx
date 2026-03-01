import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';

const TABS = [
  { to: '/admin/cost', label: 'Cost' },
  { to: '/admin/performance', label: 'Performance' },
  { to: '/admin/business', label: 'Business' },
  { to: '/admin/feedback', label: 'Feedback' },
  { to: '/admin/data', label: '数据管理' },
  { to: '/admin/settings', label: 'Settings' },
];

export function AdminTopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <>
      <div className="rounded-xl border bg-white p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin Portal</h1>
          <p className="text-sm text-slate-500 mt-1">Operational dashboards</p>
        </div>
        <div className="flex items-center gap-2">
          {TABS.map((tab) => {
            const active = location.pathname === tab.to;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`rounded-md px-3 py-2 text-sm border ${
                  active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
          <button onClick={logout} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-100">
            退出
          </button>
        </div>
      </div>
      <button
        onClick={logout}
        className="fixed bottom-6 left-6 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 shadow-sm"
      >
        退出登录
      </button>
    </>
  );
}

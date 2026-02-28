import React from 'react';

export function AdminChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h2 className="text-base font-semibold text-slate-900 mb-3">{title}</h2>
      {children}
    </div>
  );
}

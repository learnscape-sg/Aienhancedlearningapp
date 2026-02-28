import React from 'react';

export function AdminStatGrid({
  children,
  columns = 6,
}: {
  children: React.ReactNode;
  columns?: 4 | 5 | 6;
}) {
  const className =
    columns === 4
      ? 'grid grid-cols-1 md:grid-cols-4 gap-3'
      : columns === 5
        ? 'grid grid-cols-1 md:grid-cols-5 gap-3'
        : 'grid grid-cols-1 md:grid-cols-6 gap-3';
  return <div className={className}>{children}</div>;
}

export function AdminStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

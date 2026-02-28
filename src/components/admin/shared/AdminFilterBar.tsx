import React from 'react';

type FilterOption = {
  value: string;
  label: string;
};

type AdminFilterBarProps = {
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (value: string) => void;
  onEndDateChange?: (value: string) => void;
  topN?: number;
  onTopNChange?: (value: number) => void;
  topNMin?: number;
  topNMax?: number;
  extraControls?: React.ReactNode;
  onRefresh: () => void;
  refreshLabel?: string;
};

export function AdminFilterBar({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  topN,
  onTopNChange,
  topNMin = 1,
  topNMax = 100,
  extraControls,
  onRefresh,
  refreshLabel = '刷新',
}: AdminFilterBarProps) {
  return (
    <div className="rounded-xl border bg-white p-4 flex items-end gap-3 flex-wrap">
      {startDate != null && onStartDateChange ? (
        <div>
          <label className="block text-xs text-slate-500 mb-1">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      {endDate != null && onEndDateChange ? (
        <div>
          <label className="block text-xs text-slate-500 mb-1">结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      {topN != null && onTopNChange ? (
        <div>
          <label className="block text-xs text-slate-500 mb-1">Top N</label>
          <input
            type="number"
            min={topNMin}
            max={topNMax}
            value={topN}
            onChange={(event) => {
              const nextValue = Number(event.target.value || topN);
              onTopNChange(Math.max(topNMin, Math.min(topNMax, nextValue)));
            }}
            className="rounded-md border px-3 py-2 text-sm w-24"
          />
        </div>
      ) : null}

      {extraControls}

      <button onClick={onRefresh} className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm">
        {refreshLabel}
      </button>
    </div>
  );
}

export function AdminSelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AdminTextControl({
  label,
  value,
  onChange,
  placeholder,
  className = 'rounded-md border px-3 py-2 text-sm w-56',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}

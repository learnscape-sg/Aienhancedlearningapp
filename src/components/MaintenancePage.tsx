import React, { useEffect, useMemo, useState } from 'react';

const RECOVERY_AT = new Date('2026-03-08T12:00:00');

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (days > 0) {
    return `${days}天 ${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}:${ss}`;
}

export function MaintenancePage() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMs = useMemo(() => RECOVERY_AT.getTime() - now, [now]);
  const countdownLabel = useMemo(() => formatRemaining(remainingMs), [remainingMs]);
  const recovered = remainingMs <= 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-2xl text-center rounded-lg border bg-card p-10">
        <h1 className="text-3xl font-semibold text-foreground">系统正在升级中</h1>
        <p className="mt-4 text-lg text-muted-foreground">将在 3月8日 12:00 pm 恢复</p>
        <p className="mt-3 text-base font-medium text-primary">
          {recovered ? '系统已恢复' : `倒计时：${countdownLabel}`}
        </p>
        <p className="mt-2 text-sm text-muted-foreground/80">感谢你的理解与耐心等待。</p>
      </div>
    </div>
  );
}

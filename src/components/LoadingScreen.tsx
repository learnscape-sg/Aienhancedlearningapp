import React from 'react';
import { BookOpen } from 'lucide-react';

interface LoadingScreenProps {
  appName: string;
  loadingText?: string;
}

export function LoadingScreen({ appName, loadingText = '加载中' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.06] animate-fade-in">
      {/* 背景装饰：柔和光晕 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-[80%] h-[80%] rounded-full bg-primary/[0.08] blur-[100px]" />
        <div className="absolute -bottom-1/2 -left-1/2 w-[80%] h-[80%] rounded-full bg-accent/[0.08] blur-[100px]" />
        {/* 网格纹理 */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 px-6">
        {/* 图标：书本 + 光晕 + 轻微浮动 */}
        <div className="relative">
          <div
            className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl animate-pulse"
            aria-hidden
          />
          <div
            className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/30 ring-2 ring-primary/20"
            style={{
              animation: 'loading-float 2.5s ease-in-out infinite',
            }}
          >
            <BookOpen className="w-10 h-10 text-primary-foreground" strokeWidth={2} />
          </div>
        </div>

        {/* 应用名 */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{appName}</h1>
        </div>

        {/* 加载指示：波浪式圆点 */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2 items-end h-6" aria-hidden>
            <span
              className="w-2.5 h-2.5 rounded-full bg-primary/80"
              style={{
                animation: 'loading-dot 1.2s ease-in-out infinite both',
                animationDelay: '0ms',
              }}
            />
            <span
              className="w-2.5 h-2.5 rounded-full bg-primary/80"
              style={{
                animation: 'loading-dot 1.2s ease-in-out infinite both',
                animationDelay: '150ms',
              }}
            />
            <span
              className="w-2.5 h-2.5 rounded-full bg-primary/80"
              style={{
                animation: 'loading-dot 1.2s ease-in-out infinite both',
                animationDelay: '300ms',
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground font-medium">{loadingText}</p>
        </div>
      </div>

      <style>{`
        @keyframes loading-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes loading-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

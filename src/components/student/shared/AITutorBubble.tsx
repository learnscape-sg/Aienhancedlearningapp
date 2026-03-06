import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatedAvatar, type AvatarState } from './AnimatedAvatar';

const SIZE_SCALE = 1.5;
const AVATAR_SIZE = Math.round(72 * SIZE_SCALE);
const BUBBLE_WIDTH = Math.round(360 * SIZE_SCALE);
const BUBBLE_GAP = Math.round(8 * SIZE_SCALE);
const BUBBLE_MAX_VH = 0.8; // 50% × 1.6 ≈ 80%

/** 获取视口信息（优先 visualViewport，兼容平板/横竖屏/缩放） */
function getViewportBounds(): {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
} {
  const vv = window.visualViewport;
  if (vv) {
    return { width: vv.width, height: vv.height, offsetLeft: vv.offsetLeft, offsetTop: vv.offsetTop };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetLeft: 0,
    offsetTop: 0,
  };
}

/** 仅头像：可拖到屏幕最边缘，不超出 */
function clampAvatarOnly(pos: { top: number; left: number }): { top: number; left: number } {
  const { width, height, offsetLeft, offsetTop } = getViewportBounds();
  const maxLeft = offsetLeft + width - AVATAR_SIZE;
  const maxTop = offsetTop + height - AVATAR_SIZE;
  return {
    top: Math.max(offsetTop, Math.min(maxTop, pos.top)),
    left: Math.max(offsetLeft, Math.min(maxLeft, pos.left)),
  };
}

/** 气泡打开时：保证头像+气泡都在屏内 */
function clampWithBubble(pos: { top: number; left: number }): { top: number; left: number } {
  const { width, height, offsetLeft, offsetTop } = getViewportBounds();
  const bubbleMaxH = height * BUBBLE_MAX_VH;
  const containerMinH = bubbleMaxH + BUBBLE_GAP + AVATAR_SIZE;
  const maxLeft = offsetLeft + width - BUBBLE_WIDTH;
  const maxTop = offsetTop + height - containerMinH;
  return {
    top: Math.max(offsetTop, Math.min(maxTop, pos.top)),
    left: Math.max(offsetLeft, Math.min(maxLeft, pos.left)),
  };
}

interface AITutorBubbleProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  avatarState: AvatarState;
  tutorName: string;
  children: React.ReactNode;
}

export const AITutorBubble: React.FC<AITutorBubbleProps> = ({
  isOpen,
  onOpenChange,
  avatarState,
  tutorName,
  children,
}) => {
  const defaultBottom = 16;
  const defaultRight = 16;

  const [position, setPosition] = useState<{ top: number; left: number } | null>(null); // 刷新时复位到 default（右下角）
  const [, setViewportTick] = useState(0); // 触发重绘以响应 visualViewport 变化
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const lastDragPosRef = useRef<{ top: number; left: number } | null>(null);
  const dragMovedRef = useRef(false);
  const closedOnPointerDownRef = useRef(false); // 气泡打开时 pointer down 会先收起，避免 pointer up 时误触 toggle
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ top: number; left: number } | null>(null);
  const DRAG_THRESHOLD = 5;

  const getInitialStyle = useCallback((): React.CSSProperties => {
    if (position) {
      const clamped = isOpen ? clampWithBubble(position) : clampAvatarOnly(position);
      return { top: clamped.top, left: clamped.left, bottom: 'auto', right: 'auto' };
    }
    const { width, height, offsetLeft, offsetTop } = getViewportBounds();
    const containerH = isOpen ? height * BUBBLE_MAX_VH + BUBBLE_GAP + AVATAR_SIZE : AVATAR_SIZE;
    const containerW = isOpen ? BUBBLE_WIDTH : AVATAR_SIZE;
    return {
      top: offsetTop + height - defaultBottom - containerH,
      left: offsetLeft + width - defaultRight - containerW,
      bottom: 'auto',
      right: 'auto',
    };
  }, [position, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const { width, height, offsetLeft, offsetTop } = getViewportBounds();
    const bubbleMaxH = height * BUBBLE_MAX_VH;
    const containerH = bubbleMaxH + BUBBLE_GAP + AVATAR_SIZE;
    const pos = position ?? {
      left: offsetLeft + width - defaultRight - BUBBLE_WIDTH,
      top: offsetTop + height - defaultBottom - containerH,
    };
    const clamped = clampWithBubble(pos);
    if (clamped.top !== pos.top || clamped.left !== pos.left) {
      setPosition(clamped);
      const el = containerRef.current;
      if (el) {
        el.style.bottom = 'auto';
        el.style.right = 'auto';
        el.style.left = `${clamped.left}px`;
        el.style.top = `${clamped.top}px`;
      }
    }
  }, [isOpen, position]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDownOutside = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setPosition(null);
      onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDownOutside);
    return () => document.removeEventListener('pointerdown', onPointerDownOutside);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const onViewportChange = () => {
      if (dragStartRef.current) return;
      if (position) {
        const clamp = isOpen ? clampWithBubble : clampAvatarOnly;
        const clamped = clamp(position);
        if (clamped.top !== position.top || clamped.left !== position.left) {
          setPosition(clamped);
          const el = containerRef.current;
          if (el) {
            el.style.bottom = 'auto';
            el.style.left = `${clamped.left}px`;
            el.style.top = `${clamped.top}px`;
          }
        }
      } else {
        setViewportTick((t) => t + 1);
      }
    };
    window.addEventListener('resize', onViewportChange);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', onViewportChange);
      vv.addEventListener('scroll', onViewportChange);
    }
    return () => {
      window.removeEventListener('resize', onViewportChange);
      vv?.removeEventListener('resize', onViewportChange);
      vv?.removeEventListener('scroll', onViewportChange);
    };
  }, [position, isOpen]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-bubble-content]')) return;
      if (isOpen) {
        onOpenChange(false);
        closedOnPointerDownRef.current = true;
      } else {
        closedOnPointerDownRef.current = false;
      }
      const { width, height, offsetLeft, offsetTop } = getViewportBounds();
      const left = position?.left ?? offsetLeft + width - defaultRight - AVATAR_SIZE;
      const top = position?.top ?? offsetTop + height - defaultBottom - AVATAR_SIZE;
      dragStartRef.current = { x: e.clientX, y: e.clientY, left, top };
      dragMovedRef.current = false;
      pendingPosRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const el = containerRef.current;
      if (el) {
        el.style.willChange = 'transform';
        el.style.bottom = 'auto';
        el.style.right = 'auto';
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.transform = 'none';
      }
      setIsDragging(false);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [isOpen, onOpenChange, position]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const hasMoved = Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD;
    if (!dragMovedRef.current && hasMoved) {
      dragMovedRef.current = true;
      setIsDragging(true);
    }

    if (!hasMoved) return;

    const { top: newTop, left: newLeft } = clampAvatarOnly({
      top: start.top + dy,
      left: start.left + dx,
    });

    pendingPosRef.current = { top: newTop, left: newLeft };

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const start = dragStartRef.current;
        const pending = pendingPosRef.current;
        if (!start || !pending) return;
        lastDragPosRef.current = pending;
        const el = containerRef.current;
        if (el) {
          el.style.transform = `translate(${pending.left - start.left}px, ${pending.top - start.top}px)`;
        }
      });
    }
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      const wasDragging = dragMovedRef.current;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const toSave = pendingPosRef.current ?? lastDragPosRef.current ?? position;
      pendingPosRef.current = null;
      dragStartRef.current = null;

      const el = containerRef.current;
      if (el) el.style.willChange = '';
      if (wasDragging && toSave) {
        if (el) {
          el.style.transform = 'none';
          el.style.left = `${toSave.left}px`;
          el.style.top = `${toSave.top}px`;
        }
        setPosition(toSave);
        lastDragPosRef.current = null;
      } else if (!closedOnPointerDownRef.current) {
        onOpenChange(!isOpen);
      }
      closedOnPointerDownRef.current = false;
      setIsDragging(false);
    },
    [isOpen, onOpenChange, position]
  );

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPosRef.current = null;
    dragStartRef.current = null;
    const el = containerRef.current;
    if (el) el.style.willChange = '';
    closedOnPointerDownRef.current = false;
    setIsDragging(false);
  }, []);

  const style = getInitialStyle();

  return (
    <div
      ref={containerRef}
      className="fixed z-40 flex flex-col items-end gap-0"
      style={{
        top: style.top,
        left: style.left,
        bottom: style.bottom,
        right: style.right,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={tutorName}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="cursor-grab active:cursor-grabbing touch-none shrink-0 rounded-full border-2 border-cyan-300 bg-white shadow-lg ring-2 ring-cyan-100 transition-shadow hover:shadow-xl"
        style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
      >
        <AnimatedAvatar state={avatarState} size={AVATAR_SIZE} className="w-full h-full" />
      </div>

      {isOpen && (
        <div
          data-bubble-content
          className="mb-2 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden order-first"
          style={{ width: BUBBLE_WIDTH, maxHeight: `${Math.round(BUBBLE_MAX_VH * 100)}vh` }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

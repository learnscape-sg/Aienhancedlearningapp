import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatedAvatar, type AvatarState } from './AnimatedAvatar';

const AVATAR_SIZE = 144;
const BUBBLE_WIDTH = 360;
const BUBBLE_GAP = 8;
const BUBBLE_MAX_VH = 0.5;

/** 仅头像：可拖到屏幕最边缘，不超出 */
function clampAvatarOnly(pos: { top: number; left: number }): { top: number; left: number } {
  const maxLeft = window.innerWidth - AVATAR_SIZE;
  const maxTop = window.innerHeight - AVATAR_SIZE;
  return {
    top: Math.max(0, Math.min(maxTop, pos.top)),
    left: Math.max(0, Math.min(maxLeft, pos.left)),
  };
}

/** 气泡打开时：保证头像+气泡都在屏内 */
function clampWithBubble(pos: { top: number; left: number }): { top: number; left: number } {
  const bubbleMaxH = window.innerHeight * BUBBLE_MAX_VH;
  const containerMinH = bubbleMaxH + BUBBLE_GAP + AVATAR_SIZE;
  const maxLeft = Math.max(0, window.innerWidth - BUBBLE_WIDTH);
  const maxTop = Math.max(0, window.innerHeight - containerMinH);
  return {
    top: Math.max(0, Math.min(maxTop, pos.top)),
    left: Math.max(0, Math.min(maxLeft, pos.left)),
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
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const lastDragPosRef = useRef<{ top: number; left: number } | null>(null);
  const dragMovedRef = useRef(false);
  const closedOnPointerDownRef = useRef(false); // 气泡打开时 pointer down 会先收起，避免 pointer up 时误触 toggle
  const DRAG_THRESHOLD = 5;

  const getInitialStyle = useCallback((): React.CSSProperties => {
    if (position) {
      const clamped = isOpen ? clampWithBubble(position) : clampAvatarOnly(position);
      return { top: clamped.top, left: clamped.left, bottom: 'auto', right: 'auto' };
    }
    return { bottom: defaultBottom, right: defaultRight, top: 'auto', left: 'auto' };
  }, [position, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const bubbleMaxH = window.innerHeight * BUBBLE_MAX_VH;
    const containerH = bubbleMaxH + BUBBLE_GAP + AVATAR_SIZE;
    const pos = position ?? {
      left: window.innerWidth - defaultRight - BUBBLE_WIDTH,
      top: window.innerHeight - defaultBottom - containerH,
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
      onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDownOutside);
    return () => document.removeEventListener('pointerdown', onPointerDownOutside);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const onResize = () => {
      if (dragStartRef.current) return;
      if (!position) return;
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
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
      const left = position?.left ?? window.innerWidth - defaultRight - AVATAR_SIZE;
      const top = position?.top ?? window.innerHeight - defaultBottom - AVATAR_SIZE;
      dragStartRef.current = { x: e.clientX, y: e.clientY, left, top };
      dragMovedRef.current = false;
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

    lastDragPosRef.current = { top: newTop, left: newLeft };
    const el = containerRef.current;
    if (el) {
      el.style.bottom = 'auto';
      el.style.left = `${newLeft}px`;
      el.style.top = `${newTop}px`;
    }
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      const wasDragging = dragMovedRef.current;
      dragStartRef.current = null;

      if (wasDragging) {
        const toSave = lastDragPosRef.current || position;
        if (toSave) setPosition(toSave);
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
    dragStartRef.current = null;
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
          className="mb-2 w-[360px] max-h-[50vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden order-first"
        >
          {children}
        </div>
      )}
    </div>
  );
};

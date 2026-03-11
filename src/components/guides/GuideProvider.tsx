import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { trackProductEvent } from '@/lib/backendApi';

type GuideRole = 'teacher' | 'student' | 'parent' | 'admin' | 'anon';

interface GuideContextValue {
  activeTourId: string | null;
  startTour: (tourId: string) => void;
  completeTour: (tourId: string) => void;
  skipTour: (tourId: string, stepId?: string) => void;
  markSeen: (key: string) => void;
  shouldShow: (key: string) => boolean;
  trackGuideStepNext: (tourId: string, stepId: string) => void;
  trackHintShown: (hintId: string) => void;
  trackHintConfirmed: (hintId: string) => void;
}

const GuideContext = createContext<GuideContextValue | undefined>(undefined);

const GUIDE_STORAGE_PREFIX = 'guideSeen_v1_';

function resolveRole(role?: string): GuideRole {
  if (role === 'teacher' || role === 'student' || role === 'parent' || role === 'admin') return role;
  return 'anon';
}

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [seenMap, setSeenMap] = useState<Record<string, true>>({});
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const sessionTourLockRef = useRef<Set<string>>(new Set());
  const role = resolveRole(user?.role);
  const language = typeof window !== 'undefined' && (localStorage.getItem('i18nextLng') || '').startsWith('en') ? 'en' : 'zh';

  const storageKey = useMemo(() => `${GUIDE_STORAGE_PREFIX}${user?.id ?? 'anon'}`, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setSeenMap({});
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, true>;
      setSeenMap(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      setSeenMap({});
    }
  }, [storageKey]);

  const persistSeen = useCallback(
    (next: Record<string, true>) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey]
  );

  const markSeen = useCallback(
    (key: string) => {
      setSeenMap((prev) => {
        if (prev[key]) return prev;
        const next = { ...prev, [key]: true as const };
        persistSeen(next);
        return next;
      });
    },
    [persistSeen]
  );

  const shouldShow = useCallback(
    (key: string) => {
      if (seenMap[key]) return false;
      return true;
    },
    [seenMap]
  );

  const trackEvent = useCallback(
    (eventName: 'guide_shown' | 'guide_step_next' | 'guide_skipped' | 'guide_completed' | 'hint_confirmed' | 'hint_shown', properties?: Record<string, unknown>) => {
      void trackProductEvent({
        eventName,
        role,
        language,
        teacherId: role === 'teacher' ? user?.id : undefined,
        studentId: role === 'student' ? user?.id : undefined,
        properties,
      }).catch(() => undefined);
    },
    [language, role, user?.id]
  );

  const startTour = useCallback(
    (tourId: string) => {
      if (sessionTourLockRef.current.has(tourId)) return;
      sessionTourLockRef.current.add(tourId);
      setActiveTourId(tourId);
      trackEvent('guide_shown', { tourId });
    },
    [trackEvent]
  );

  const completeTour = useCallback(
    (tourId: string) => {
      markSeen(tourId);
      setActiveTourId((current) => (current === tourId ? null : current));
      trackEvent('guide_completed', { tourId });
    },
    [markSeen, trackEvent]
  );

  const skipTour = useCallback(
    (tourId: string, stepId?: string) => {
      markSeen(tourId);
      setActiveTourId((current) => (current === tourId ? null : current));
      trackEvent('guide_skipped', { tourId, stepId });
    },
    [markSeen, trackEvent]
  );

  const trackGuideStepNext = useCallback(
    (tourId: string, stepId: string) => {
      trackEvent('guide_step_next', { tourId, stepId });
    },
    [trackEvent]
  );

  const trackHintShown = useCallback(
    (hintId: string) => {
      trackEvent('hint_shown', { hintId });
    },
    [trackEvent]
  );

  const trackHintConfirmed = useCallback(
    (hintId: string) => {
      trackEvent('hint_confirmed', { hintId });
    },
    [trackEvent]
  );

  const value = useMemo<GuideContextValue>(
    () => ({
      activeTourId,
      startTour,
      completeTour,
      skipTour,
      markSeen,
      shouldShow,
      trackGuideStepNext,
      trackHintShown,
      trackHintConfirmed,
    }),
    [activeTourId, completeTour, markSeen, shouldShow, skipTour, startTour, trackGuideStepNext, trackHintConfirmed, trackHintShown]
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuide() {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error('useGuide must be used within GuideProvider');
  }
  return context;
}

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useGuide } from './GuideProvider';
import { guideCatalog, type GuideLanguage } from './guideCatalog';

interface RectState {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getPreferredLanguage(): GuideLanguage {
  if (typeof window === 'undefined') return 'zh';
  return (localStorage.getItem('i18nextLng') || '').startsWith('en') ? 'en' : 'zh';
}

export function GuideTourOverlay() {
  const { activeTourId, completeTour, skipTour, trackGuideStepNext } = useGuide();
  const { t } = useTranslation('common');
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectState | null>(null);
  const lang = getPreferredLanguage();

  const tour = useMemo(() => {
    if (!activeTourId) return null;
    return Object.values(guideCatalog).find((item) => item.id === activeTourId) ?? null;
  }, [activeTourId]);

  const currentStep = tour?.steps[stepIndex] ?? null;

  useEffect(() => {
    setStepIndex(0);
  }, [activeTourId]);

  useEffect(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(`[data-guide-id="${currentStep.targetId}"]`) as HTMLElement | null;
      if (!el) {
        setTargetRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [currentStep?.targetId]);

  if (!tour || !currentStep) return null;

  const bubbleTop = targetRect ? Math.min(targetRect.top + targetRect.height + 10, window.innerHeight - 190) : 100;
  const bubbleLeft = targetRect ? Math.min(targetRect.left, window.innerWidth - 360) : 80;

  const isLast = stepIndex >= tour.steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <div className="absolute inset-0 bg-black/20" />
      {targetRect ? (
        <div
          className="absolute rounded-lg ring-2 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.15)] transition-all"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      ) : null}
      <div
        className="absolute w-[340px] rounded-xl border bg-background p-4 shadow-xl pointer-events-auto"
        style={{ top: bubbleTop, left: bubbleLeft }}
      >
        <p className="text-xs text-muted-foreground mb-1">
          {t('guide.stepLabel', { current: stepIndex + 1, total: tour.steps.length })}
        </p>
        <h3 className="text-base font-semibold">{currentStep.title[lang]}</h3>
        <p className="text-sm text-muted-foreground mt-2">{currentStep.description[lang]}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => skipTour(tour.id, currentStep.id)}
          >
            {t('guide.skip')}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (isLast) {
                completeTour(tour.id);
                return;
              }
              trackGuideStepNext(tour.id, currentStep.id);
              setStepIndex((prev) => prev + 1);
            }}
          >
            {isLast ? t('guide.finish') : t('guide.next')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

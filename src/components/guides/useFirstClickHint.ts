import { useCallback, useRef, useState } from 'react';
import { firstClickHintCatalog, type GuideLanguage } from './guideCatalog';
import { useGuide } from './GuideProvider';

type PendingAction = (() => void) | null;

function getLanguage(): GuideLanguage {
  if (typeof window === 'undefined') return 'zh';
  return (localStorage.getItem('i18nextLng') || '').startsWith('en') ? 'en' : 'zh';
}

export function useFirstClickHint(hintCatalogKey: keyof typeof firstClickHintCatalog) {
  const hint = firstClickHintCatalog[hintCatalogKey];
  const { shouldShow, markSeen, trackHintShown, trackHintConfirmed } = useGuide();
  const [open, setOpen] = useState(false);
  const pendingActionRef = useRef<PendingAction>(null);
  const lang = getLanguage();

  const runWithHint = useCallback(
    (action: () => void) => {
      if (!shouldShow(hint.id)) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setOpen(true);
      trackHintShown(hint.id);
    },
    [hint.id, shouldShow, trackHintShown]
  );

  const handleConfirm = useCallback(() => {
    markSeen(hint.id);
    trackHintConfirmed(hint.id);
    setOpen(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, [hint.id, markSeen, trackHintConfirmed]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    pendingActionRef.current = null;
  }, []);

  return {
    hint,
    language: lang,
    open,
    setOpen,
    runWithHint,
    handleConfirm,
    handleCancel,
  };
}

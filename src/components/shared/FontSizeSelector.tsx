import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFontSize } from '@/contexts/FontSizeContext';

export function FontSizeSelector() {
  const { fontSize, setFontSize } = useFontSize();
  const { t } = useTranslation('studentConsole');

  return (
    <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
      {(['s', 'm', 'l'] as const).map((size) => (
        <button
          key={size}
          type="button"
          onClick={() => setFontSize(size)}
          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
            fontSize === size
              ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
          title={size === 's' ? t('fontSizeSmall') : size === 'm' ? t('fontSizeMedium') : t('fontSizeLarge')}
        >
          {size === 's' ? t('fontSizeSmall') : size === 'm' ? t('fontSizeMedium') : t('fontSizeLarge')}
        </button>
      ))}
    </div>
  );
}

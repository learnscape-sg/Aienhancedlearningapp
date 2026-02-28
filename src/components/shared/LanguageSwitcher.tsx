import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export interface LanguageSwitcherProps {
  /** Called after language change; use to sync URL (e.g. ?lang=en) on course page */
  onLanguageChange?: (lang: 'zh' | 'en') => void;
}

export function LanguageSwitcher(props?: LanguageSwitcherProps) {
  const { onLanguageChange } = props ?? {};
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const next = (i18n.language?.startsWith('zh') ? 'en' : 'zh') as 'zh' | 'en';
    i18n.changeLanguage(next);
    onLanguageChange?.(next);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
      title={i18n.language?.startsWith('zh') ? 'Switch to English' : '切换到中文'}
    >
      <Globe size={16} />
      <span>{i18n.language?.startsWith('zh') ? 'EN' : '中'}</span>
    </button>
  );
}

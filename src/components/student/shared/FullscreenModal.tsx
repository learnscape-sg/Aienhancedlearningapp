import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Minimize2 } from 'lucide-react';

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const { t } = useTranslation('common');
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 bg-white flex flex-col">
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white/95 backdrop-blur-sm shrink-0 z-10">
          <div className="flex items-center gap-3">
            {title && <h3 className="text-sm font-bold text-slate-800">{title}</h3>}
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            title={t('restoreTitle')}
          >
            <Minimize2 size={16} />
            <span>{t('restore')}</span>
          </button>
        </div>
        <div className="flex-1 overflow-hidden relative">{children}</div>
      </div>
    </div>
  );
};

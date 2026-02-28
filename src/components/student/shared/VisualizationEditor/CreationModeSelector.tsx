import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreationMode } from '@/types/backend';
import { Type, MousePointerClick, Move } from 'lucide-react';

interface CreationModeSelectorProps {
  selectedMode: CreationMode;
  onSelect: (mode: CreationMode) => void;
  disabled?: boolean;
}

export const CreationModeSelector: React.FC<CreationModeSelectorProps> = ({
  selectedMode,
  onSelect,
  disabled = false
}) => {
  const { t } = useTranslation('visualizationEditor');
  const modes: Array<{ mode: CreationMode; labelKey: string; descKey: string; icon: React.ReactNode }> = [
    { mode: 'simple-input', labelKey: 'simpleInput', descKey: 'simpleInputDesc', icon: <Type size={18} /> },
    { mode: 'click-create', labelKey: 'clickCreate', descKey: 'clickCreateDesc', icon: <MousePointerClick size={18} /> },
    { mode: 'drag-drop', labelKey: 'dragDrop', descKey: 'dragDropDesc', icon: <Move size={18} /> },
  ];

  return (
    <div className="flex gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
      {modes.map(({ mode, labelKey, descKey, icon }) => (
        <button
          key={mode}
          onClick={() => !disabled && onSelect(mode)}
          disabled={disabled}
          className={`
            flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-xs font-medium
            ${selectedMode === mode
              ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={t(descKey)}
        >
          {icon}
          <span>{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
};

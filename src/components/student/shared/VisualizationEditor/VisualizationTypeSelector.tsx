import React from 'react';
import { useTranslation } from 'react-i18next';
import { VisualizationType } from '@/types/backend';
import { Brain, Network, GitBranch } from 'lucide-react';

interface VisualizationTypeSelectorProps {
  selectedType: VisualizationType;
  onSelect: (type: VisualizationType) => void;
  disabled?: boolean;
}

export const VisualizationTypeSelector: React.FC<VisualizationTypeSelectorProps> = ({
  selectedType,
  onSelect,
  disabled = false
}) => {
  const { t } = useTranslation('visualizationEditor');
  const types: Array<{ type: VisualizationType; labelKey: string; descKey: string; icon: React.ReactNode }> = [
    { type: 'mindmap', labelKey: 'mindmap', descKey: 'mindmapDesc', icon: <Brain size={20} /> },
    { type: 'conceptmap', labelKey: 'conceptmap', descKey: 'conceptmapDesc', icon: <Network size={20} /> },
    { type: 'knowledgegraph', labelKey: 'knowledgegraph', descKey: 'knowledgegraphDesc', icon: <GitBranch size={20} /> },
  ];

  return (
    <div className="flex gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
      {types.map(({ type, labelKey, descKey, icon }) => (
        <button
          key={type}
          onClick={() => !disabled && onSelect(type)}
          disabled={disabled}
          className={`
            flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
            ${selectedType === type
              ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={t(descKey)}
        >
          {icon}
          <span className="text-xs font-medium">{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
};

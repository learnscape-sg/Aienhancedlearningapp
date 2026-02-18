import React from 'react';
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
  const types: Array<{ type: VisualizationType; label: string; icon: React.ReactNode; description: string }> = [
    {
      type: 'mindmap',
      label: '思维导图',
      icon: <Brain size={20} />,
      description: '树状结构，适合层级关系'
    },
    {
      type: 'conceptmap',
      label: '概念地图',
      icon: <Network size={20} />,
      description: '节点-关系-节点，适合概念连接'
    },
    {
      type: 'knowledgegraph',
      label: '知识图谱',
      icon: <GitBranch size={20} />,
      description: '图结构，适合复杂关系网络'
    }
  ];

  return (
    <div className="flex gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
      {types.map(({ type, label, icon, description }) => (
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
          title={description}
        >
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
};

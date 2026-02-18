import React from 'react';
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
  const modes: Array<{ mode: CreationMode; label: string; icon: React.ReactNode; description: string }> = [
    {
      mode: 'simple-input',
      label: '简单输入',
      icon: <Type size={18} />,
      description: '输入文本，自动解析'
    },
    {
      mode: 'click-create',
      label: '点击创建',
      icon: <MousePointerClick size={18} />,
      description: '点击画布创建节点'
    },
    {
      mode: 'drag-drop',
      label: '拖拽构建',
      icon: <Move size={18} />,
      description: '拖拽节点连接关系'
    }
  ];

  return (
    <div className="flex gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
      {modes.map(({ mode, label, icon, description }) => (
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
          title={description}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

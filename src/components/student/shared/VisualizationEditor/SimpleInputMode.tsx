import React, { useState, useEffect } from 'react';
import { VisualizationData, VisualizationType } from '@/types/backend';
import { parseTextToVisualizationData } from './utils/textParser';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface SimpleInputModeProps {
  type: VisualizationType;
  initialData?: VisualizationData;
  onChange: (data: VisualizationData) => void;
}

export const SimpleInputMode: React.FC<SimpleInputModeProps> = ({
  type,
  initialData,
  onChange
}) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 初始化输入文本
  useEffect(() => {
    if (initialData && initialData.nodes.length > 0) {
      // 将现有数据转换为文本格式（简化版）
      const textLines: string[] = [];
      initialData.edges.forEach(edge => {
        const sourceNode = initialData.nodes.find(n => n.id === edge.source);
        const targetNode = initialData.nodes.find(n => n.id === edge.target);
        if (sourceNode && targetNode) {
          const line = edge.label
            ? `${sourceNode.label} -> ${edge.label} -> ${targetNode.label}`
            : `${sourceNode.label} -> ${targetNode.label}`;
          textLines.push(line);
        }
      });
      // 如果没有边，列出所有节点
      if (textLines.length === 0) {
        initialData.nodes.forEach(node => {
          textLines.push(node.label);
        });
      }
      setInputText(textLines.join('\n'));
    }
  }, [initialData]);

  // 解析输入文本
  const handleInputChange = (text: string) => {
    setInputText(text);
    setError(null);

    if (!text.trim()) {
      onChange({
        type,
        nodes: [],
        edges: [],
        metadata: {}
      });
      return;
    }

    try {
      const parsedData = parseTextToVisualizationData(text, type);
      onChange(parsedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '解析错误';
      setError(errorMessage);
      console.error('Parse error:', err);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* 输入区域 */}
      <div className="flex-1 flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white">
        {/* 工具栏和帮助 */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700">文本输入</span>
            <div className="group relative">
              <HelpCircle size={14} className="text-slate-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                <p className="font-bold mb-1">语法示例：</p>
                <p>• 概念A → 概念B</p>
                <p>• 概念A → 关系 → 概念B</p>
                <p>• 概念A [困惑点] → 概念B</p>
                <p className="mt-1 text-slate-300">每行一个关系，自动解析</p>
              </div>
            </div>
          </div>
        </div>

        {/* 文本输入框 */}
        <textarea
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={`输入概念和关系，例如：\n概念A -> 概念B\n概念B -> 关系 -> 概念C\n概念D [困惑点] -> 概念E`}
          className="flex-1 w-full p-4 text-sm font-mono text-slate-700 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/20 border-0"
          spellCheck={false}
        />

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 border-t border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

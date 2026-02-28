import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { VisualizationData, VisualizationType, CreationMode, VisualizationNode, VisualizationEdge, VisualizationProgress } from '@/types/backend';
import { VisualizationTypeSelector } from './VisualizationTypeSelector';
import { CreationModeSelector } from './CreationModeSelector';
import { SimpleInputMode } from './SimpleInputMode';
import { ClickCreateMode } from './modes/ClickCreateMode';
import { X, Maximize2, Sparkles, Loader2 } from 'lucide-react';

const MindMapRenderer = lazy(() =>
  import('./renderers/MindMapRenderer').then((mod) => ({ default: mod.MindMapRenderer }))
);

interface VisualizationEditorProps {
  initialData?: VisualizationData;
  onChange?: (data: VisualizationData) => void;
  onClose?: () => void;
  editable?: boolean;
  courseTopic?: string;
  onGenerateFramework?: (topic: string) => Promise<VisualizationData>;
  // 事件回调接口
  onNodeCreated?: (node: VisualizationNode) => void;
  onNodeEdited?: (node: VisualizationNode) => void;
  onEdgeCreated?: (edge: VisualizationEdge) => void;
  onConfusionMarked?: (nodeId: string, label: string) => void;
  onProgressUpdate?: (progress: VisualizationProgress) => void;
}

export const VisualizationEditor: React.FC<VisualizationEditorProps> = ({
  initialData,
  onChange,
  onClose,
  editable = true,
  courseTopic,
  onGenerateFramework,
  onNodeCreated,
  onNodeEdited,
  onEdgeCreated,
  onConfusionMarked,
  onProgressUpdate
}) => {
  const { t } = useTranslation('visualizationEditor');
  const [data, setData] = useState<VisualizationData>(() => {
    if (initialData) {
      return initialData;
    }
    return {
      type: 'mindmap',
      mode: 'simple-input',
      nodes: [],
      edges: [],
      metadata: {}
    };
  });

  const [currentMode, setCurrentMode] = useState<CreationMode>(
    initialData?.mode || 'click-create'  // 默认使用 click-create 模式，直接显示 ReactFlow
  );

  const [isGenerating, setIsGenerating] = useState(false);

  // 当外部数据变化时更新
  useEffect(() => {
    if (initialData) {
      setData(initialData);
      if (initialData.mode) {
        setCurrentMode(initialData.mode);
      }
    }
  }, [initialData]);

  // 数据变化时通知父组件
  const handleDataChange = (newData: VisualizationData) => {
    const updatedData = { ...newData, mode: currentMode };
    setData(updatedData);
    onChange?.(updatedData);
    
    // 计算并发送进度更新
    const progress: VisualizationProgress = {
      totalNodes: updatedData.nodes.length,
      totalEdges: updatedData.edges.length,
      confusionPoints: updatedData.metadata?.confusionPoints?.length || 0,
      completionRate: calculateCompletionRate(updatedData)
    };
    onProgressUpdate?.(progress);
  };

  // 计算完成度
  const calculateCompletionRate = (data: VisualizationData): number => {
    // 基础完成度：至少3个节点，2个连接
    const minNodes = 3;
    const minEdges = 2;
    
    const nodeScore = Math.min(data.nodes.length / minNodes, 1) * 50;
    const edgeScore = Math.min(data.edges.length / minEdges, 1) * 50;
    
    return Math.round(nodeScore + edgeScore);
  };

  // 类型切换
  const handleTypeChange = (type: VisualizationType) => {
    const newData: VisualizationData = {
      ...data,
      type,
      // 切换类型时保留节点，但可能需要调整边的关系
      nodes: data.nodes,
      edges: data.edges
    };
    handleDataChange(newData);
  };

  // 模式切换
  const handleModeChange = (mode: CreationMode) => {
    setCurrentMode(mode);
    const newData = { ...data, mode };
    handleDataChange(newData);
  };

  // AI生成框架
  const handleGenerateFramework = async () => {
    if (!onGenerateFramework || !courseTopic) return;
    
    setIsGenerating(true);
    try {
      const generatedData = await onGenerateFramework(courseTopic);
      setData(generatedData);
      handleDataChange(generatedData);
    } catch (error) {
      console.error('Failed to generate framework:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm">
      {/* 头部工具栏 */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-cyan-50 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <h3 className="text-sm font-bold text-slate-800">可视化编辑器</h3>
          
          {editable && (
            <>
              <VisualizationTypeSelector
                selectedType={data.type}
                onSelect={handleTypeChange}
              />
              
              <CreationModeSelector
                selectedMode={currentMode}
                onSelect={handleModeChange}
              />

              {onGenerateFramework && courseTopic && (
                <button
                  onClick={handleGenerateFramework}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs font-bold rounded-lg hover:from-purple-600 hover:to-cyan-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('aiGenerateFrameworkTitle')}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{t('generating')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>{t('aiGenerateFramework')}</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/50 transition-colors text-slate-600 hover:text-slate-800"
            title={t('closeEditor')}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden relative">
        {currentMode === 'simple-input' && editable ? (
          <SimpleInputMode
            type={data.type}
            initialData={data}
            onChange={handleDataChange}
          />
        ) : currentMode === 'click-create' && editable ? (
          <ClickCreateMode
            initialData={data}
            onChange={handleDataChange}
            onNodeCreated={onNodeCreated}
            onNodeEdited={onNodeEdited}
            onEdgeCreated={onEdgeCreated}
            onConfusionMarked={onConfusionMarked}
          />
        ) : currentMode === 'drag-drop' && editable ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            拖拽构建模式（开发中）
          </div>
        ) : (
          <div className="w-full h-full">
            {data.type === 'mindmap' && (
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-slate-50">
                    <div className="text-sm text-slate-400">正在加载思维导图...</div>
                  </div>
                }
              >
                <MindMapRenderer
                  data={data}
                  onChange={editable ? handleDataChange : undefined}
                  editable={editable}
                />
              </Suspense>
            )}
            {data.type === 'conceptmap' && (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                概念地图编辑器（开发中）
              </div>
            )}
            {data.type === 'knowledgegraph' && (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                知识图谱编辑器（开发中）
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

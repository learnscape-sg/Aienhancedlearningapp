import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { VisualizationData, VisualizationNode, VisualizationEdge } from '@/types/backend';
import { Plus, X, HelpCircle, Edit2, Trash2 } from 'lucide-react';

interface ClickCreateModeProps {
  initialData?: VisualizationData;
  onChange: (data: VisualizationData) => void;
  onNodeCreated?: (node: VisualizationNode) => void;
  onNodeEdited?: (node: VisualizationNode) => void;
  onEdgeCreated?: (edge: VisualizationEdge) => void;
  onConfusionMarked?: (nodeId: string, label: string) => void;
}

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

// 自定义节点组件，包含连接点
const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as { label: string; isConfusion: boolean };
  return (
    <div
      className={`px-4 py-3 shadow-md rounded-lg border-2 transition-all ${
        nodeData.isConfusion
          ? 'bg-amber-50 border-amber-500'
          : 'bg-white border-indigo-500'
      } ${selected ? 'ring-2 ring-cyan-500 ring-offset-2' : ''}`}
      style={{ minWidth: '120px' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white"
        style={{ borderRadius: '50%' }}
      />
      <div className="text-sm font-medium text-slate-800 text-center">
        {nodeData.label}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white"
        style={{ borderRadius: '50%' }}
      />
    </div>
  );
};

const nodeTypes = {
  default: CustomNode,
};

export const ClickCreateMode: React.FC<ClickCreateModeProps> = ({
  initialData,
  onChange,
  onNodeCreated,
  onNodeEdited,
  onEdgeCreated,
  onConfusionMarked
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('visualizationEditorGuideShown');
    }
    return true;
  });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // 使用 ref 跟踪是否已经初始化，避免无限循环
  const isInitializedRef = useRef(false);
  const lastDataKeyRef = useRef<string>('');

  // 将 VisualizationData 转换为 ReactFlow 格式
  const convertToReactFlowNodes = useCallback((data: VisualizationData): Node[] => {
    if (!data.nodes || data.nodes.length === 0) {
      // 如果没有节点，返回空数组，让用户点击创建
      return [];
    }

    return data.nodes.map((node, index) => ({
      id: node.id,
      type: 'default',
      position: node.position || { 
        x: 300 + (index % 3) * 300, 
        y: 200 + Math.floor(index / 3) * 200 
      },
      data: { 
        label: node.label,
        isConfusion: node.type === 'confusion'
      },
    }));
  }, []);

  const convertToReactFlowEdges = useCallback((data: VisualizationData): Edge[] => {
    return (data?.edges || []).map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
      style: { strokeWidth: 2, stroke: '#6366f1' },
      labelStyle: { fill: '#64748b', fontWeight: 500, fontSize: '12px' },
    }));
  }, []);

  const initialNodes = convertToReactFlowNodes(initialData || {
    type: 'mindmap',
    nodes: [],
    edges: [],
    metadata: {}
  });
  const initialEdges = convertToReactFlowEdges(initialData || {
    type: 'mindmap',
    nodes: [],
    edges: [],
    metadata: {}
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // 节点双击编辑
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    const nodeData = node.data as { label: string; isConfusion: boolean };
    setEditingNodeId(node.id);
    setEditingLabel(nodeData.label);
  }, []);

  // 节点右键菜单
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      nodeId: node.id,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  // 内部组件，用于访问 useReactFlow hook
  const InnerFlow: React.FC = () => {
    const { screenToFlowPosition } = useReactFlow();
    
    // 点击空白处创建新节点 - 使用正确的坐标转换
    const onPaneClick = useCallback((event: React.MouseEvent) => {
      // 使用 ReactFlow 的坐标转换方法
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: 'default',
        position,
        data: { label: '新概念', isConfusion: false },
      };
      
      const newNodes = [...nodes, newNode];
      setNodes(newNodes);
      syncToVisualizationData(newNodes, edges, { newNodeId: newNode.id });
      setContextMenu(null);
    }, [nodes, edges, setNodes, setContextMenu, screenToFlowPosition, syncToVisualizationData]);
    
    // 连接节点
    const onConnect = useCallback((params: Connection) => {
      if (!params.source || !params.target) return;
      
      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      
      // 获取新创建的边的 ID（addEdge 会自动生成）
      const newEdge = newEdges[newEdges.length - 1];
      if (newEdge) {
        syncToVisualizationData(nodes, newEdges, { newEdgeId: newEdge.id });
      }
    }, [nodes, edges, setEdges, syncToVisualizationData]);
    
    return (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        fitView
        className="bg-slate-50"
        connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { strokeWidth: 2, stroke: '#6366f1' },
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        }}
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls className="bg-white border border-slate-200 rounded-lg shadow-sm" />
        <MiniMap 
          className="bg-white border border-slate-200 rounded-lg shadow-sm"
          nodeColor={(node) => (node.data as { isConfusion?: boolean }).isConfusion ? '#f59e0b' : '#6366f1'}
        />
      </ReactFlow>
    );
  };

  // 同步到 VisualizationData
  const syncToVisualizationData = useCallback((currentNodes: Node[], currentEdges: Edge[], triggerEvents: {
    newNodeId?: string;
    editedNodeId?: string;
    newEdgeId?: string;
    confusionNodeId?: string;
  } = {}) => {
    const visNodes: VisualizationNode[] = currentNodes.map(node => ({
      id: node.id,
      label: String((node.data as { label: string; isConfusion: boolean }).label || ''),
      type: ((node.data as { label: string; isConfusion: boolean }).isConfusion ? 'confusion' : 'concept') as 'concept' | 'confusion',
      position: node.position,
    }));

    const visEdges: VisualizationEdge[] = currentEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: typeof edge.label === 'string' ? edge.label : (edge.label ? String(edge.label) : undefined),
      type: 'hierarchical',
    }));

    const newData: VisualizationData = {
      type: 'mindmap',
      nodes: visNodes,
      edges: visEdges,
      metadata: {
        centralConcept: String(currentNodes[0]?.data.label || 'Root'),
        confusionPoints: currentNodes
          .filter(n => (n.data as { label: string; isConfusion: boolean }).isConfusion)
          .map(n => String((n.data as { label: string; isConfusion: boolean }).label || ''))
      }
    };

    // 生成数据键，用于比较是否真的变化了
    const dataKey = JSON.stringify({
      nodes: visNodes.map(n => ({ id: n.id, label: n.label, type: n.type })),
      edges: visEdges.map(e => ({ id: e.id, source: e.source, target: e.target }))
    });

    // 只在数据真正变化时才调用 onChange，避免无限循环
    if (lastDataKeyRef.current !== dataKey) {
      lastDataKeyRef.current = dataKey;
      onChange(newData);
    }

    // 触发事件回调
    if (triggerEvents.newNodeId) {
      const newNode = visNodes.find(n => n.id === triggerEvents.newNodeId);
      if (newNode) onNodeCreated?.(newNode);
    }
    if (triggerEvents.editedNodeId) {
      const editedNode = visNodes.find(n => n.id === triggerEvents.editedNodeId);
      if (editedNode) onNodeEdited?.(editedNode);
    }
    if (triggerEvents.newEdgeId) {
      const newEdge = visEdges.find(e => e.id === triggerEvents.newEdgeId);
      if (newEdge) onEdgeCreated?.(newEdge);
    }
    if (triggerEvents.confusionNodeId) {
      const confusionNode = visNodes.find(n => n.id === triggerEvents.confusionNodeId);
      if (confusionNode) onConfusionMarked?.(confusionNode.id, confusionNode.label);
    }
  }, [onChange, onNodeCreated, onNodeEdited, onEdgeCreated, onConfusionMarked]);

  // 当初始数据变化时更新节点和边（只在首次加载或数据真正变化时）
  useEffect(() => {
    if (initialData) {
      // 生成数据键用于比较
      const dataKey = JSON.stringify({
        nodes: initialData.nodes.map(n => ({ id: n.id, label: n.label, type: n.type })),
        edges: initialData.edges.map(e => ({ id: e.id, source: e.source, target: e.target }))
      });
      
      // 如果数据没有真正变化，跳过更新
      if (lastDataKeyRef.current === dataKey && isInitializedRef.current) {
        return;
      }
      
      // 只在首次加载或数据真正变化时更新
      const newNodes = convertToReactFlowNodes(initialData);
      const newEdges = convertToReactFlowEdges(initialData);
      
      setNodes(newNodes);
      setEdges(newEdges);
      lastDataKeyRef.current = dataKey;
      isInitializedRef.current = true;
    } else if (!isInitializedRef.current) {
      // 如果没有初始数据且未初始化，设置为空
      setNodes([]);
      setEdges([]);
      isInitializedRef.current = true;
    }
  }, [initialData, convertToReactFlowNodes, convertToReactFlowEdges, setNodes, setEdges]);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (editingNodeId && editingLabel.trim()) {
      const newNodes = nodes.map(n => 
        n.id === editingNodeId 
          ? { ...n, data: { ...(n.data as { label: string; isConfusion: boolean }), label: editingLabel.trim() } }
          : n
      );
      setNodes(newNodes);
      syncToVisualizationData(newNodes, edges, { editedNodeId: editingNodeId });
      setEditingNodeId(null);
      setEditingLabel('');
    }
  }, [editingNodeId, editingLabel, nodes, edges, setNodes, syncToVisualizationData]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null);
    setEditingLabel('');
  }, []);

  // 标记困惑点
  const toggleConfusion = useCallback((nodeId: string) => {
    const newNodes = nodes.map(n => {
      if (n.id === nodeId) {
        const nodeData = n.data as { label: string; isConfusion: boolean };
        const isConfusion = !nodeData.isConfusion;
        return {
          ...n,
          data: { ...nodeData, isConfusion } as { label: string; isConfusion: boolean },
          style: {
            ...n.style,
            background: isConfusion ? '#fef3c7' : '#fff',
            border: isConfusion ? '2px solid #f59e0b' : '2px solid #6366f1',
          }
        };
      }
      return n;
    });
    setNodes(newNodes);
    const nodeData = nodes.find(n => n.id === nodeId)?.data as { label: string; isConfusion: boolean } | undefined;
    const isMarkingConfusion = !nodeData?.isConfusion; // 如果之前不是困惑点，现在标记为困惑点
    syncToVisualizationData(newNodes, edges, isMarkingConfusion ? { confusionNodeId: nodeId } : {});
    setContextMenu(null);
  }, [nodes, edges, setNodes, syncToVisualizationData]);

  // 删除节点
  const handleDeleteNode = useCallback((nodeId: string) => {
    const newNodes = nodes.filter(n => n.id !== nodeId);
    const newEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    setNodes(newNodes);
    setEdges(newEdges);
    syncToVisualizationData(newNodes, newEdges);
    setContextMenu(null);
  }, [nodes, edges, setNodes, setEdges, syncToVisualizationData]);

  // 点击其他地方关闭菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleCloseGuide = () => {
    setShowFirstTimeGuide(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('visualizationEditorGuideShown', 'true');
    }
  };

  return (
    <ReactFlowProvider>
      <div ref={reactFlowWrapper} className="w-full h-full relative">
        {/* 首次使用引导 */}
        {showFirstTimeGuide && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">欢迎使用思维导图编辑器！</h3>
                <button
                  onClick={handleCloseGuide}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <ol className="space-y-3 text-sm text-slate-700 mb-6">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold">1</span>
                  <span>点击空白处创建第一个节点</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">2</span>
                  <span>双击节点编辑名称</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">3</span>
                  <span>拖拽节点边缘的连接点创建关系</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">4</span>
                  <span>右键节点可以标记困惑点或删除</span>
                </li>
              </ol>
              <button 
                onClick={handleCloseGuide} 
                className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:from-cyan-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                开始使用
              </button>
            </div>
          </div>
        )}
        <InnerFlow />

        {/* 编辑节点对话框 */}
        {editingNodeId && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 min-w-[300px] border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-4">编辑节点名称</h3>
              <input
                type="text"
                value={editingLabel}
                onChange={(e) => setEditingLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editingLabel.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 右键菜单 */}
        {contextMenu && (
          <div
            className="absolute bg-white border border-slate-200 rounded-lg shadow-lg p-1 z-50 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                const node = nodes.find(n => n.id === contextMenu.nodeId);
                if (node) {
                  const nodeData = node.data as { label: string; isConfusion: boolean };
                  setEditingNodeId(node.id);
                  setEditingLabel(nodeData.label);
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2"
            >
              <Edit2 size={14} className="text-slate-600" />
              <span>编辑名称</span>
            </button>
            <button
              onClick={() => toggleConfusion(contextMenu.nodeId)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded flex items-center gap-2"
            >
              <HelpCircle size={14} className="text-amber-600" />
              <span>标记困惑点</span>
            </button>
            <div className="border-t border-slate-200 my-1" />
            <button
              onClick={() => handleDeleteNode(contextMenu.nodeId)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 rounded flex items-center gap-2"
            >
              <Trash2 size={14} />
              <span>删除节点</span>
            </button>
          </div>
        )}

        {/* 操作提示 */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-3 text-xs text-slate-600 shadow-lg max-w-[280px]">
          <p className="font-bold mb-2 text-slate-800">💡 操作提示：</p>
          <ul className="space-y-1 text-slate-600">
            <li>• 点击空白处创建新节点</li>
            <li>• 双击节点编辑名称</li>
            <li>• 拖拽节点连接点创建关系</li>
            <li>• 右键节点查看更多操作</li>
            <li>• 拖拽节点调整位置</li>
          </ul>
        </div>
      </div>
    </ReactFlowProvider>
  );
};

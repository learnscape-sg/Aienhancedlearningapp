import React, { useCallback, useMemo } from 'react';
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
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { VisualizationData } from '@/types/backend';

interface MindMapRendererProps {
  data: VisualizationData;
  onChange?: (data: VisualizationData) => void;
  editable?: boolean;
}

// 自定义思维导图节点组件
const MindMapNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as { label: string; isConfusion?: boolean };
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
        {nodeData.isConfusion && '❓ '}
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
  default: MindMapNode,
};

// 内部组件，用于访问 ReactFlow hooks
const InnerMindMapRenderer: React.FC<{
  initialNodes: Node[];
  initialEdges: Edge[];
  onChange?: (data: VisualizationData) => void;
  editable?: boolean;
}> = ({ initialNodes, initialEdges, onChange, editable }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 同步到 VisualizationData
  const syncToVisualizationData = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      if (!onChange) return;

      const visNodes = currentNodes.map((node) => ({
        id: node.id,
        label: String((node.data as { label: string; isConfusion?: boolean }).label || ''),
        type: ((node.data as { label: string; isConfusion?: boolean }).isConfusion
          ? 'confusion'
          : 'concept') as 'concept' | 'confusion',
        position: node.position,
      }));

      const visEdges = currentEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: typeof edge.label === 'string' ? edge.label : edge.label ? String(edge.label) : undefined,
        type: 'hierarchical' as const,
      }));

      const newData: VisualizationData = {
        type: 'mindmap',
        nodes: visNodes,
        edges: visEdges,
        metadata: {
          centralConcept: String(currentNodes[0]?.data.label || 'Root'),
          confusionPoints: currentNodes
            .filter((n) => (n.data as { label: string; isConfusion?: boolean }).isConfusion)
            .map((n) => String((n.data as { label: string; isConfusion?: boolean }).label || '')),
        },
      };

      onChange(newData);
    },
    [onChange]
  );

  // 处理连接创建
  const onConnect = useCallback(
    (params: Connection) => {
      if (!editable || !params.source || !params.target) return;
      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      syncToVisualizationData(nodes, newEdges);
    },
    [editable, edges, nodes, setEdges, syncToVisualizationData]
  );

  // 处理节点位置变化
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      if (editable && onChange && typeof window !== 'undefined') {
        // 清除之前的定时器
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        // 延迟同步，避免频繁更新（仅在客户端执行）
        timeoutRef.current = setTimeout(() => {
          const updatedNodes = nodes.map((node) => {
            const change = changes.find((c: any) => c.id === node.id);
            if (change && change.type === 'position' && change.position) {
              return { ...node, position: change.position };
            }
            return node;
          });
          syncToVisualizationData(updatedNodes, edges);
          timeoutRef.current = null;
        }, 100);
      }
    },
    [onNodesChange, nodes, edges, editable, onChange, syncToVisualizationData]
  );

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
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
      {editable && (
        <MiniMap
          className="bg-white border border-slate-200 rounded-lg shadow-sm"
          nodeColor={(node) =>
            (node.data as { isConfusion?: boolean }).isConfusion ? '#f59e0b' : '#6366f1'
          }
        />
      )}
    </ReactFlow>
  );
};

export const MindMapRenderer: React.FC<MindMapRendererProps> = ({
  data,
  onChange,
  editable = false,
}) => {
  // 确保只在客户端渲染
  const [isMounted, setIsMounted] = React.useState(false);
  
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // 将 VisualizationData 转换为 ReactFlow 格式
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] =
      data.nodes.length > 0
        ? data.nodes.map((node, index) => ({
            id: node.id,
            type: 'default',
            position:
              node.position ||
              (index === 0
                ? { x: 400, y: 300 }
                : {
                    x: 400 + (index % 3) * 250,
                    y: 300 + Math.floor(index / 3) * 200,
                  }),
            data: {
              label: node.label,
              isConfusion: node.type === 'confusion',
            },
          }))
        : [
            {
              id: 'root',
              type: 'default',
              position: { x: 400, y: 300 },
              data: {
                label: data.metadata?.centralConcept || '中心概念',
                isConfusion: false,
              },
            },
          ];

    const edges: Edge[] = data.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
      style: { strokeWidth: 2, stroke: '#6366f1' },
      labelStyle: { fill: '#64748b', fontWeight: 500, fontSize: '12px' },
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [data]);

  // 在服务器端或未挂载时显示占位符
  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">正在加载思维导图...</div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="w-full h-full">
        <InnerMindMapRenderer
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onChange={onChange}
          editable={editable}
        />
      </div>
    </ReactFlowProvider>
  );
};

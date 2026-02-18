/**
 * Mermaid 转换器
 * 用于在 VisualizationData 和 Mermaid 代码之间转换
 */

import { VisualizationData, VisualizationNode, VisualizationEdge } from '@/types/backend';

/**
 * 将 VisualizationData 转换为 Mermaid 代码
 */
export function visualizationDataToMermaid(data: VisualizationData): string {
  if (data.type !== 'mindmap') {
    throw new Error('Only mindmap type can be converted to Mermaid');
  }

  const nodes = data.nodes;
  const edges = data.edges;
  
  // 找到中心节点（没有入边的节点，或者 metadata.centralConcept）
  const centralConcept = data.metadata?.centralConcept || 
    nodes.find(node => !edges.some(edge => edge.target === node.id))?.label ||
    nodes[0]?.label ||
    'Root';

  // 构建 Mermaid mindmap
  let mermaidCode = `mindmap\n  Root((${centralConcept}))\n`;

  // 按层级组织节点
  const nodeMap = new Map<string, VisualizationNode>();
  nodes.forEach(node => nodeMap.set(node.id, node));

  // 找到直接连接到根节点的节点
  const rootEdges = edges.filter(edge => {
    const sourceNode = nodeMap.get(edge.source);
    return sourceNode?.label === centralConcept || !edge.source;
  });

  // 递归构建子节点
  const buildSubtree = (parentId: string, indent: string): void => {
    const childEdges = edges.filter(edge => edge.source === parentId);
    childEdges.forEach(edge => {
      const childNode = nodeMap.get(edge.target);
      if (childNode) {
        const nodeLabel = childNode.type === 'confusion' 
          ? `❓ ${childNode.label}` 
          : childNode.label;
        mermaidCode += `${indent}    ${nodeLabel.replace(/[()]/g, '')}\n`;
        buildSubtree(edge.target, indent + '    ');
      }
    });
  };

  // 为每个根边构建子树
  rootEdges.forEach(edge => {
    const childNode = nodeMap.get(edge.target);
    if (childNode) {
      const nodeLabel = childNode.type === 'confusion' 
        ? `❓ ${childNode.label}` 
        : childNode.label;
      mermaidCode += `    ${nodeLabel.replace(/[()]/g, '')}\n`;
      buildSubtree(edge.target, '    ');
    }
  });

  // 如果没有边，直接列出所有节点
  if (edges.length === 0 && nodes.length > 1) {
    nodes.slice(1).forEach(node => {
      const nodeLabel = node.type === 'confusion' 
        ? `❓ ${node.label}` 
        : node.label;
      mermaidCode += `    ${nodeLabel.replace(/[()]/g, '')}\n`;
    });
  }

  return mermaidCode.trim();
}

/**
 * 将 Mermaid 代码转换为 VisualizationData
 * 支持 mindmap 和 graph TD 两种格式
 */
export function mermaidToVisualizationData(code: string): VisualizationData {
  const lines = code.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('%%'));
  
  if (lines.length === 0) {
    return {
      type: 'mindmap',
      nodes: [],
      edges: [],
      metadata: {}
    };
  }

  const firstLine = lines[0];
  const nodes: VisualizationNode[] = [];
  const edges: VisualizationEdge[] = [];
  let centralConcept = 'Root';

  // 处理 graph TD 格式
  if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
    const nodeMap = new Map<string, VisualizationNode>();
    let nodeIdCounter = 0;
    let rootNodeId: string | null = null;

    // 解析节点和边
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // 匹配节点定义：A[标签] 或 A((标签)) 或 A{标签}
      const nodeMatch = line.match(/^\s*(\w+)\s*[\[\(]\s*(.*?)\s*[\]\)]/);
      if (nodeMatch) {
        const nodeId = nodeMatch[1];
        const label = nodeMatch[2].replace(/^❓\s*/, '');
        const isConfusion = nodeMatch[2].includes('❓');
        
        if (!nodeMap.has(nodeId)) {
          const node: VisualizationNode = {
            id: `node_${nodeIdCounter++}`,
            label: label || nodeId,
            type: isConfusion ? 'confusion' : 'concept'
          };
          nodeMap.set(nodeId, node);
          nodes.push(node);
          
          // 第一个节点作为根节点
          if (rootNodeId === null) {
            rootNodeId = node.id;
            centralConcept = label || nodeId;
          }
        }
      }
      
      // 匹配边：A --> B 或 A -->|标签| B
      const edgeMatch = line.match(/^\s*(\w+)\s*(-->|--)\s*(?:[|"](.*?)[|"])?\s*(\w+)/);
      if (edgeMatch) {
        const sourceId = edgeMatch[1];
        const targetId = edgeMatch[4];
        const edgeLabel = edgeMatch[3];
        
        // 确保源节点和目标节点存在
        if (!nodeMap.has(sourceId)) {
          const node: VisualizationNode = {
            id: `node_${nodeIdCounter++}`,
            label: sourceId,
            type: 'concept'
          };
          nodeMap.set(sourceId, node);
          nodes.push(node);
          if (rootNodeId === null) {
            rootNodeId = node.id;
            centralConcept = sourceId;
          }
        }
        
        if (!nodeMap.has(targetId)) {
          const node: VisualizationNode = {
            id: `node_${nodeIdCounter++}`,
            label: targetId,
            type: 'concept'
          };
          nodeMap.set(targetId, node);
          nodes.push(node);
        }
        
        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);
        
        if (sourceNode && targetNode) {
          edges.push({
            id: `edge_${edges.length}`,
            source: sourceNode.id,
            target: targetNode.id,
            label: edgeLabel,
            type: 'hierarchical'
          });
        }
      }
    }

    // 如果没有找到根节点，使用第一个节点
    if (rootNodeId === null && nodes.length > 0) {
      rootNodeId = nodes[0].id;
      centralConcept = nodes[0].label;
    }

    return {
      type: 'conceptmap', // graph TD format should be conceptmap, not mindmap
      nodes,
      edges,
      metadata: {
        centralConcept,
        confusionPoints: nodes.filter(n => n.type === 'confusion').map(n => n.label)
      }
    };
  }

  // 处理 mindmap 格式
  if (firstLine.startsWith('mindmap')) {
    // 解析根节点
    const rootMatch = lines[1]?.match(/Root\(\((.*?)\)\)/);
    if (rootMatch) {
      centralConcept = rootMatch[1];
      nodes.push({
        id: 'root',
        label: centralConcept,
        type: 'concept'
      });
    }

    // 解析子节点（简化版：基于缩进层级）
    let nodeIdCounter = 1;
    const nodeMap = new Map<string, { node: VisualizationNode; level: number }>();
    if (nodes.length > 0) {
      nodeMap.set('root', { node: nodes[0], level: 0 });
    }

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      const indentMatch = line.match(/^(\s*)/);
      const indentLevel = indentMatch ? indentMatch[1].length / 4 : 0;
      
      // 移除缩进和特殊标记
      const label = line.trim().replace(/^❓\s*/, '');
      const isConfusion = line.includes('❓');
      
      const nodeId = `node_${nodeIdCounter++}`;
      const node: VisualizationNode = {
        id: nodeId,
        label,
        type: isConfusion ? 'confusion' : 'concept'
      };
      
      nodes.push(node);
      nodeMap.set(nodeId, { node, level: indentLevel });

      // 找到父节点（最近的上一级节点）
      let parentId = 'root';
      for (let j = i - 1; j >= 1; j--) {
        const prevLine = lines[j];
        const prevIndentMatch = prevLine.match(/^(\s*)/);
        const prevIndentLevel = prevIndentMatch ? prevIndentMatch[1].length / 4 : 0;
        
        if (prevIndentLevel < indentLevel) {
          // 找到父节点
          const prevLabel = prevLine.trim().replace(/^❓\s*/, '');
          for (const [id, { node: n }] of nodeMap.entries()) {
            if (n.label === prevLabel && nodeMap.get(id)!.level === prevIndentLevel) {
              parentId = id;
              break;
            }
          }
          break;
        }
      }

      edges.push({
        id: `edge_${edges.length}`,
        source: parentId,
        target: nodeId,
        type: 'hierarchical'
      });
    }

    return {
      type: 'mindmap',
      nodes,
      edges,
      metadata: {
        centralConcept,
        confusionPoints: nodes.filter(n => n.type === 'confusion').map(n => n.label)
      }
    };
  }

  // 如果不支持的类型，返回空数据
  console.warn(`Unsupported Mermaid format: ${firstLine}. Returning empty visualization data.`);
  return {
    type: 'mindmap',
    nodes: [],
    edges: [],
    metadata: {}
  };
}

/**
 * 文本解析器
 * 用于将简单文本输入转换为 VisualizationData
 */

import { VisualizationData, VisualizationNode, VisualizationEdge, VisualizationType } from '@/types/backend';

/**
 * 解析简单文本语法为 VisualizationData
 * 
 * 支持的语法：
 * - 概念A -> 概念B (简单连接)
 * - 概念A -> 关系 -> 概念B (带关系标签)
 * - 概念A --> 概念B (思维导图风格)
 * - 概念A [困惑点] -> 概念B (标记困惑点)
 */
export function parseTextToVisualizationData(
  text: string,
  type: VisualizationType = 'conceptmap'
): VisualizationData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length === 0) {
    return {
      type,
      nodes: [],
      edges: [],
      metadata: {}
    };
  }

  const nodes: VisualizationNode[] = [];
  const edges: VisualizationEdge[] = [];
  const nodeMap = new Map<string, VisualizationNode>();
  let nodeIdCounter = 0;

  // 创建或获取节点
  const getOrCreateNode = (label: string, isConfusion: boolean = false): VisualizationNode => {
    const normalizedLabel = label.trim();
    
    // 检查是否已存在
    for (const [id, node] of nodeMap.entries()) {
      if (node.label === normalizedLabel) {
        return node;
      }
    }

    // 创建新节点
    const nodeId = `node_${nodeIdCounter++}`;
    const node: VisualizationNode = {
      id: nodeId,
      label: normalizedLabel,
      type: isConfusion ? 'confusion' : 'concept'
    };
    
    nodes.push(node);
    nodeMap.set(nodeId, node);
    return node;
  };

  // 解析每一行
  lines.forEach((line, lineIndex) => {
    // 匹配模式：概念A -> 关系 -> 概念B 或 概念A -> 概念B
    const arrowPattern = /(.+?)\s*(->|-->)\s*(.+)/;
    const match = line.match(arrowPattern);

    if (!match) {
      // 如果没有箭头，可能是单个概念
      const confusionMatch = line.match(/^(.+?)\s*\[困惑点\]/);
      if (confusionMatch) {
        getOrCreateNode(confusionMatch[1], true);
      } else {
        getOrCreateNode(line);
      }
      return;
    }

    const [, sourcePart, arrow, targetPart] = match;
    
    // 检查源节点是否有困惑点标记
    const sourceConfusionMatch = sourcePart.match(/^(.+?)\s*\[困惑点\]/);
    const sourceLabel = sourceConfusionMatch ? sourceConfusionMatch[1] : sourcePart.trim();
    const sourceIsConfusion = !!sourceConfusionMatch;
    
    // 检查目标节点是否有困惑点标记
    const targetConfusionMatch = targetPart.match(/^(.+?)\s*\[困惑点\]/);
    const targetLabel = targetConfusionMatch ? targetConfusionMatch[1] : targetPart.trim();
    const targetIsConfusion = !!targetConfusionMatch;

    // 检查中间是否有关系标签
    const parts = targetPart.split(/\s*(->|-->)\s*/);
    let relationship: string | undefined;
    let finalTarget: string;

    if (parts.length >= 3 && parts[1] === '->' || parts[1] === '-->') {
      // 有中间关系：概念A -> 关系 -> 概念B
      relationship = parts[0].trim();
      finalTarget = parts.slice(2).join('').trim();
    } else {
      // 没有中间关系：概念A -> 概念B
      finalTarget = targetPart.trim();
    }

    // 移除最终目标中的困惑点标记
    const finalTargetConfusionMatch = finalTarget.match(/^(.+?)\s*\[困惑点\]/);
    if (finalTargetConfusionMatch) {
      finalTarget = finalTargetConfusionMatch[1];
      targetIsConfusion || finalTargetConfusionMatch;
    }

    const sourceNode = getOrCreateNode(sourceLabel, sourceIsConfusion);
    const targetNode = getOrCreateNode(finalTarget, targetIsConfusion);

    // 创建边
    edges.push({
      id: `edge_${edges.length}`,
      source: sourceNode.id,
      target: targetNode.id,
      label: relationship,
      type: relationship ? 'related' : 'hierarchical'
    });
  });

  // 确定中心概念（没有入边的节点，或第一个节点）
  const centralConcept = nodes.find(node => 
    !edges.some(edge => edge.target === node.id)
  )?.label || nodes[0]?.label || '';

  return {
    type,
    nodes,
    edges,
    metadata: {
      centralConcept,
      confusionPoints: nodes.filter(n => n.type === 'confusion').map(n => n.label)
    }
  };
}

/**
 * AI引导工具函数
 * 根据当前可视化状态生成AI引导提示
 */

import { VisualizationData, VisualizationType } from '@/types/backend';

export type VisualizationAction = 'node_created' | 'edge_created' | 'confusion_marked' | 'idle';

/**
 * 获取可视化类型的中文标签
 */
function getTypeLabel(type: VisualizationType): string {
  switch (type) {
    case 'mindmap':
      return '思维导图';
    case 'conceptmap':
      return '概念地图';
    case 'knowledgegraph':
      return '知识图谱';
    default:
      return '可视化';
  }
}

/**
 * 根据当前可视化状态生成AI引导提示
 */
export function generateGuidancePrompt(
  data: VisualizationData,
  lastAction: VisualizationAction,
  idleTime: number = 0
): string {
  const nodeCount = data.nodes.length;
  const edgeCount = data.edges.length;
  const confusionCount = data.metadata?.confusionPoints?.length || 0;
  
  let prompt = `学生正在构建${getTypeLabel(data.type)}：\n`;
  prompt += `- 当前节点数：${nodeCount}\n`;
  prompt += `- 当前连接数：${edgeCount}\n`;
  prompt += `- 困惑点：${confusionCount}\n\n`;
  
  if (lastAction === 'node_created') {
    const lastNode = data.nodes[data.nodes.length - 1];
    prompt += `学生刚刚创建了节点"${lastNode.label}"。`;
    if (nodeCount === 1) {
      prompt += `这是第一个节点。请鼓励学生，并引导他们思考："这个概念可以分成哪些方面？"`;
    } else if (nodeCount === 2) {
      prompt += `很好！你已经有了两个概念。现在想想，这两个概念之间有什么关系？`;
    } else {
      prompt += `请引导学生思考这个节点与其他节点的关系。`;
    }
  } else if (lastAction === 'edge_created') {
    const lastEdge = data.edges[data.edges.length - 1];
    const sourceNode = data.nodes.find(n => n.id === lastEdge.source);
    const targetNode = data.nodes.find(n => n.id === lastEdge.target);
    prompt += `学生刚刚创建了一个连接：${sourceNode?.label || '未知'} -> ${targetNode?.label || '未知'}。`;
    prompt += `请引导学生思考："这个关系说明了什么？还有哪些概念之间也有关系？"`;
  } else if (lastAction === 'confusion_marked') {
    prompt += `学生标记了困惑点。请给予鼓励，并询问："你觉得这个概念的哪个部分让你困惑？"`;
  } else if (lastAction === 'idle' && idleTime > 120000) {
    prompt += `学生已经${Math.round(idleTime / 60000)}分钟没有操作了。请主动询问："你在构建过程中遇到什么困难了吗？"`;
  } else if (lastAction === 'idle') {
    // 根据当前状态提供一般性引导
    if (nodeCount === 0) {
      prompt += `学生还没有开始构建。请引导他们思考："这节课的核心概念是什么？"`;
    } else if (nodeCount > 0 && edgeCount === 0) {
      prompt += `学生已经创建了${nodeCount}个节点，但还没有创建连接。请引导他们思考这些概念之间的关系。`;
    } else if (nodeCount >= 3 && edgeCount >= 2) {
      prompt += `学生的${getTypeLabel(data.type)}已经初具规模。可以引导他们检查是否还有重要的概念或关系需要补充。`;
    }
  }
  
  return prompt;
}

/**
 * 计算完成度（0-100）
 */
export function calculateCompletionRate(data: VisualizationData): number {
  // 基础完成度：至少3个节点，2个连接
  const minNodes = 3;
  const minEdges = 2;
  
  const nodeScore = Math.min(data.nodes.length / minNodes, 1) * 50;
  const edgeScore = Math.min(data.edges.length / minEdges, 1) * 50;
  
  return Math.round(nodeScore + edgeScore);
}

/**
 * 判断是否应该触发AI反馈
 */
export function shouldTriggerAIFeedback(
  lastAction: VisualizationAction,
  previousNodeCount: number,
  currentNodeCount: number,
  previousEdgeCount: number,
  currentEdgeCount: number,
  idleTime: number
): boolean {
  // 创建第一个节点
  if (lastAction === 'node_created' && previousNodeCount === 0 && currentNodeCount === 1) {
    return true;
  }
  
  // 创建第三个节点但还没有连接
  if (lastAction === 'node_created' && currentNodeCount === 3 && currentEdgeCount === 0) {
    return true;
  }
  
  // 创建第一个连接
  if (lastAction === 'edge_created' && previousEdgeCount === 0 && currentEdgeCount === 1) {
    return true;
  }
  
  // 标记困惑点
  if (lastAction === 'confusion_marked') {
    return true;
  }
  
  // 长时间无操作（2分钟）
  if (lastAction === 'idle' && idleTime > 120000) {
    return true;
  }
  
  return false;
}

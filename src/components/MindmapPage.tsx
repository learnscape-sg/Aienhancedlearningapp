import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Sparkles, Check, ChevronRight, Lightbulb, Plus } from 'lucide-react';
import { LearningHeader } from './LearningHeader';


interface MindmapPageProps {
  pdfData: {
    fileName: string;
    grade: string;
    interests: string[];
  };
  onBack: () => void;
  onSwitchMode?: (mode: string) => void;
  onAskTutor?: (selectedText: string, context: string) => void;
}

interface MindmapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  width?: number;
  height?: number;
  fontSize?: string;
  isVisible: boolean;
  isUserCreated: boolean;
}

interface MindmapConnection {
  from: string;
  to: string;
  color: string;
  isVisible: boolean;
}

interface AIGuideStep {
  id: string;
  question: string;
  hint?: string;
  expectedKeywords?: string[];
  nodeToReveal?: string;
  followUpQuestion?: string;
  completed: boolean;
}

export function MindmapPage({ pdfData, onBack, onSwitchMode, onAskTutor }: MindmapPageProps) {
  const [userInput, setUserInput] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [guideSteps, setGuideSteps] = useState<AIGuideStep[]>([
    {
      id: 'step1',
      question: '让我们一起探索牛顿第三定律！首先，你能用自己的话说说，什么是"作用力"吗？🤔',
      hint: '提示：想想你推门的时候，你的手对门做了什么？',
      expectedKeywords: ['力', '推', '施加', '作用'],
      nodeToReveal: 'action-force',
      followUpQuestion: '很好！那么，当你推门时，门会对你的手产生什么呢？',
      completed: false
    },
    {
      id: 'step2',
      question: '当你推门时，门会对你的手产生什么呢？这就是"反作用力"！你能描述一下吗？',
      hint: '提示：想想为什么推墙的时候手会感到疼？',
      expectedKeywords: ['反', '力', '推回', '相反'],
      nodeToReveal: 'reaction-force',
      followUpQuestion: '非常棒！那这两个力的大小关系是怎样的？',
      completed: false
    },
    {
      id: 'step3',
      question: '作用力和反作用力的大小有什么关系？方向呢？',
      hint: '提示：牛顿第三定律的核心就在这里！',
      expectedKeywords: ['相等', '相反', '大小', '方向'],
      nodeToReveal: 'equal-opposite',
      followUpQuestion: '太棒了！让我们通过一些生活中的例子来加深理解。',
      completed: false
    },
    {
      id: 'step4',
      question: '你能想到滑板运动中有哪些牛顿第三定律的例子吗？比如怎么让滑板动起来？🛹',
      hint: '提示：想想滑板手是怎么蹬地的...',
      expectedKeywords: ['蹬', '地', '推', '向前'],
      nodeToReveal: 'skateboarding',
      followUpQuestion: '说得很好！滑板手还可以怎么利用作用力和反作用力呢？',
      completed: false
    },
    {
      id: 'step5',
      question: '除了滑板，你还能想到其他运动中的例子吗？比如游泳、飞行、划船...',
      hint: '提示：想想直升机、鸟类、摩托艇是怎么移动的',
      expectedKeywords: ['游泳', '飞', '划', '推水', '推空气'],
      nodeToReveal: 'other-examples',
      followUpQuestion: '恭喜你！你已经掌握了牛顿第三定律的核心概念！',
      completed: false
    }
  ]);

  const [nodes, setNodes] = useState<MindmapNode[]>([
    // 中心节点 - 始终可见
    {
      id: 'center',
      text: '牛顿第三定律',
      x: 400,
      y: 250,
      color: 'bg-blue-500 text-white border-blue-600',
      width: 180,
      height: 70,
      fontSize: 'text-base',
      isVisible: true,
      isUserCreated: false
    },
    // 作用力节点
    {
      id: 'action-force',
      text: '作用力',
      x: 250,
      y: 150,
      color: 'bg-green-100 border-green-400 text-green-800',
      width: 120,
      height: 50,
      fontSize: 'text-sm',
      isVisible: false,
      isUserCreated: false
    },
    // 反作用力节点
    {
      id: 'reaction-force',
      text: '反作用力',
      x: 550,
      y: 150,
      color: 'bg-purple-100 border-purple-400 text-purple-800',
      width: 120,
      height: 50,
      fontSize: 'text-sm',
      isVisible: false,
      isUserCreated: false
    },
    // 大小相等方向相反
    {
      id: 'equal-opposite',
      text: '大小相等\n方向相反',
      x: 400,
      y: 80,
      color: 'bg-orange-100 border-orange-400 text-orange-800',
      width: 140,
      height: 60,
      fontSize: 'text-sm',
      isVisible: false,
      isUserCreated: false
    },
    // 滑板例子
    {
      id: 'skateboarding',
      text: '滑板运动',
      x: 200,
      y: 350,
      color: 'bg-yellow-100 border-yellow-400 text-yellow-800',
      width: 120,
      height: 50,
      fontSize: 'text-sm',
      isVisible: false,
      isUserCreated: false
    },
    // 其他例子
    {
      id: 'other-examples',
      text: '其他例子',
      x: 600,
      y: 350,
      color: 'bg-pink-100 border-pink-400 text-pink-800',
      width: 120,
      height: 50,
      fontSize: 'text-sm',
      isVisible: false,
      isUserCreated: false
    }
  ]);

  const [connections, setConnections] = useState<MindmapConnection[]>([
    { from: 'center', to: 'action-force', color: 'stroke-green-400', isVisible: false },
    { from: 'center', to: 'reaction-force', color: 'stroke-purple-400', isVisible: false },
    { from: 'center', to: 'equal-opposite', color: 'stroke-orange-400', isVisible: false },
    { from: 'center', to: 'skateboarding', color: 'stroke-yellow-400', isVisible: false },
    { from: 'center', to: 'other-examples', color: 'stroke-pink-400', isVisible: false }
  ]);

  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showNextButton, setShowNextButton] = useState(false);

  const currentStep = guideSteps[currentStepIndex];

  // 检查用户答案
  const checkAnswer = (answer: string) => {
    if (!currentStep) return false;

    const lowerAnswer = answer.toLowerCase();
    const hasKeyword = currentStep.expectedKeywords?.some(keyword => 
      lowerAnswer.includes(keyword)
    );

    return hasKeyword || answer.length > 10; // 允许较长的自由回答
  };

  // 处理用户提交答案
  const handleSubmitAnswer = () => {
    if (!userInput.trim()) return;

    const isCorrect = checkAnswer(userInput);
    setIsAnswerCorrect(isCorrect);
    setUserAnswers([...userAnswers, userInput]);

    if (isCorrect) {
      // 正确答案的反馈
      const encouragements = [
        '太棒了！你理解得很好！✨',
        '说得非常好！继续保持！🌟',
        '完全正确！你真聪明！👏',
        '很棒的思考！你掌握了！💡'
      ];
      setFeedbackMessage(encouragements[Math.floor(Math.random() * encouragements.length)]);

      // 显示对应的节点
      if (currentStep.nodeToReveal) {
        setTimeout(() => {
          revealNode(currentStep.nodeToReveal!);
        }, 500);
      }

      // 标记当前步骤完成并显示继续按钮
      setTimeout(() => {
        const updatedSteps = [...guideSteps];
        updatedSteps[currentStepIndex].completed = true;
        setGuideSteps(updatedSteps);
        
        // 如果还有下一步，显示继续按钮
        if (currentStepIndex < guideSteps.length - 1) {
          setShowNextButton(true);
          setFeedbackMessage(currentStep.followUpQuestion || '准备好继续了吗？点击下方按钮进入下一步！');
        } else {
          // 最后一步，2秒后自动完成
          setTimeout(() => {
            setCurrentStepIndex(currentStepIndex + 1);
          }, 2000);
        }
      }, 1500);
    } else {
      // 不完全正确的反馈
      setFeedbackMessage('再想想看，或者点击"💡 提示"按钮获得帮助！');
    }

    setUserInput('');
    setShowHint(false);
  };

  // 处理进入下一步
  const handleNextStep = () => {
    setShowNextButton(false);
    setIsAnswerCorrect(null);
    setFeedbackMessage('');
    setCurrentStepIndex(currentStepIndex + 1);
  };

  // 显示节点和连接
  const revealNode = (nodeId: string) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, isVisible: true } : node
    ));
    
    setConnections(prev => prev.map(conn => 
      conn.to === nodeId || conn.from === nodeId 
        ? { ...conn, isVisible: true } 
        : conn
    ));
  };

  // 获取连接路径
  const getConnectionPath = (from: MindmapNode, to: MindmapNode) => {
    const fromX = from.x + (from.width || 80) / 2;
    const fromY = from.y + (from.height || 40) / 2;
    const toX = to.x + (to.width || 80) / 2;
    const toY = to.y + (to.height || 40) / 2;
    
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    const controlX = midX + (fromY - toY) * 0.2;
    const controlY = midY + (toX - fromX) * 0.2;
    
    return `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
  };

  const handleOpenPDF = () => {
    console.log('Opening PDF:', pdfData.fileName);
    alert(`打开PDF文件: ${pdfData.fileName}`);
  };

  // 计算进度
  const progress = (guideSteps.filter(s => s.completed).length / guideSteps.length) * 100;
  const isCompleted = currentStepIndex >= guideSteps.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <LearningHeader 
        pdfData={pdfData}
        currentMode="mindmap"
        onModeSelect={onSwitchMode}
        onOpenPDF={handleOpenPDF}
        onBack={onBack}
      />

      {/* Main content container */}
      <div className="w-full max-w-7xl mx-auto p-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              思维导图构建进度
            </span>
            <span className="text-sm text-blue-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左侧：AI引导对话区 */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-2 border-blue-200 bg-white/80 backdrop-blur">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">AI导师引导</h3>
                    <p className="text-xs text-gray-500">跟我一起构建思维导图</p>
                  </div>
                </div>

                {!isCompleted ? (
                  <>
                    {/* 当前问题 */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {currentStep?.question}
                      </p>
                    </div>

                    {/* 输入区域 */}
                    <div className="space-y-3">
                      <Input
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                        placeholder="在这里输入你的想法..."
                        className="w-full border-2 border-gray-300 focus:border-blue-500"
                      />
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSubmitAnswer}
                          disabled={!userInput.trim()}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                        >
                          提交答案
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowHint(!showHint)}
                          className="border-orange-300 text-orange-600 hover:bg-orange-50"
                        >
                          <Lightbulb className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 提示信息 */}
                    {showHint && currentStep?.hint && (
                      <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded animate-in slide-in-from-top">
                        <p className="text-xs text-orange-800">
                          {currentStep.hint}
                        </p>
                      </div>
                    )}

                    {/* 反馈信息 */}
                    {feedbackMessage && (
                      <div className={`border-l-4 p-3 rounded animate-in slide-in-from-bottom ${
                        isAnswerCorrect 
                          ? 'bg-green-50 border-green-400' 
                          : 'bg-yellow-50 border-yellow-400'
                      }`}>
                        <p className={`text-sm ${
                          isAnswerCorrect ? 'text-green-800' : 'text-yellow-800'
                        }`}>
                          {feedbackMessage}
                        </p>
                      </div>
                    )}

                    {/* 继续按钮 */}
                    {showNextButton && (
                      <div className="mt-4">
                        <Button
                          onClick={handleNextStep}
                          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                        >
                          继续下一步
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-green-50 border-2 border-green-400 p-6 rounded-lg text-center space-y-3">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-green-800">
                      🎉 太棒了！
                    </h3>
                    <p className="text-sm text-green-700">
                      你已经成功构建了牛顿第三定律的思维导图！现在你可以查看完整的知识结构，或继续深入学习。
                    </p>
                  </div>
                )}

                {/* 步骤列表 */}
                <div className="mt-6 pt-6 border-t space-y-2">
                  <h4 className="text-xs text-gray-500 mb-3">学习步骤</h4>
                  {guideSteps.map((step, index) => (
                    <div 
                      key={step.id}
                      className={`flex items-center space-x-2 text-xs ${
                        index === currentStepIndex 
                          ? 'text-blue-600 font-medium' 
                          : step.completed 
                            ? 'text-green-600' 
                            : 'text-gray-400'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        step.completed 
                          ? 'bg-green-500' 
                          : index === currentStepIndex 
                            ? 'bg-blue-500 animate-pulse' 
                            : 'bg-gray-300'
                      }`}>
                        {step.completed ? (
                          <Check className="w-3 h-3 text-white" />
                        ) : (
                          <span className="text-white text-xs">{index + 1}</span>
                        )}
                      </div>
                      <span className="flex-1">
                        {step.completed ? '已完成' : index === currentStepIndex ? '进行中' : '待完成'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 你的回答记录 */}
            {userAnswers.length > 0 && (
              <Card className="border border-gray-200 bg-white/60">
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    你的思考记录
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userAnswers.map((answer, index) => (
                      <div key={index} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                        <span className="text-gray-500">#{index + 1}:</span> {answer}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：思维导图可视化区域 */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-purple-200 bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    你的思维导图
                  </h2>
                  <p className="text-sm text-gray-500">
                    回答问题解锁新的概念节点
                  </p>
                </div>

                {/* 思维导图画布 */}
                <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-dashed border-gray-300 rounded-xl p-8 min-h-[600px] relative overflow-hidden">
                  {/* SVG for connections */}
                  <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none" 
                    style={{ zIndex: 1 }}
                  >
                    {connections.filter(conn => conn.isVisible).map((conn, index) => {
                      const fromNode = nodes.find(n => n.id === conn.from);
                      const toNode = nodes.find(n => n.id === conn.to);
                      if (!fromNode || !toNode) return null;
                      
                      return (
                        <g key={index}>
                          <path
                            d={getConnectionPath(fromNode, toNode)}
                            className={`${conn.color} fill-none animate-in fade-in`}
                            strokeWidth="3"
                            strokeDasharray="5,5"
                          >
                            <animate
                              attributeName="stroke-dashoffset"
                              from="10"
                              to="0"
                              dur="1s"
                              repeatCount="indefinite"
                            />
                          </path>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Mindmap nodes */}
                  <div className="relative" style={{ zIndex: 2 }}>
                    {nodes.filter(node => node.isVisible).map((node) => (
                      <div
                        key={node.id}
                        className={`absolute border-3 rounded-xl p-3 shadow-lg transition-all duration-500 hover:scale-105 cursor-pointer ${node.color} ${node.fontSize || 'text-sm'} animate-in zoom-in`}
                        style={{
                          left: `${node.x}px`,
                          top: `${node.y}px`,
                          width: `${node.width || 120}px`,
                          height: `${node.height || 50}px`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          lineHeight: '1.3',
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {node.text}
                        {node.id === 'center' && (
                          <Badge className="absolute -top-2 -right-2 bg-blue-500">
                            核心
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 空状态提示 */}
                  {nodes.filter(n => n.isVisible).length <= 1 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center text-gray-400 space-y-2">
                        <Plus className="w-12 h-12 mx-auto opacity-30" />
                        <p className="text-sm">回答左侧问题，解锁思维导图节点</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 图例 */}
                <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-gray-600">核心概念</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-100 border-2 border-green-400 rounded"></div>
                    <span className="text-gray-600">作用力</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-purple-100 border-2 border-purple-400 rounded"></div>
                    <span className="text-gray-600">反作用力</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
                    <span className="text-gray-600">实例应用</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
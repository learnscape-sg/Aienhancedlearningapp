import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  MessageCircle,
  X,
  Send,
  Mic,
  Sparkles,
  RefreshCw,
  Eye,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import capybaraAvatar from 'figma:asset/94018c5955f97df26a866764d147f41da1b25ec2.png';

interface Message {
  id: string;
  type: 'student' | 'tutor';
  content: string;
  timestamp: Date;
  buttons?: Array<{
    label: string;
    action: string;
    variant?: 'default' | 'outline';
  }>;
}

interface AITutorProps {
  subject?: string;
  context?: string;
  onActionClick?: (action: string) => void;
  className?: string;
  isFixedSidebar?: boolean;
  onAskQuestion?: (selectedText: string, context: string) => void;
  tutorQuestionTrigger?: { selectedText: string; context: string; timestamp: number } | null;
}

export function AITutor({ subject = '物理', context, onActionClick, className = '', isFixedSidebar = false, onAskQuestion, tutorQuestionTrigger }: AITutorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'tutor',
      content: '你好！我是Capybara导师🐧，专门帮助你学习物理知识。有什么问题随时问我哦！',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理文本选择问题
  const handleTextSelectionQuestion = (selectedText: string, contextText: string) => {
    // 确保展开AI导师
    if (!isExpanded) {
      setIsExpanded(true);
    }
    
    // 添加学生提问（关于选中的文本）
    const studentMessage: Message = {
      id: Date.now().toString(),
      type: 'student',
      content: `关于"${selectedText}"，我想了解更多。`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, studentMessage]);
    
    // 生成导师回复
    setTimeout(() => {
      const tutorResponse = generateContextualTutorResponse(selectedText, contextText);
      setMessages(prev => [...prev, tutorResponse]);
    }, 1000);
  };

  // 监听外部触发的问题
  useEffect(() => {
    if (tutorQuestionTrigger) {
      handleTextSelectionQuestion(tutorQuestionTrigger.selectedText, tutorQuestionTrigger.context);
    }
  }, [tutorQuestionTrigger]);

  // 监听来自学习页面的提问事件
  useEffect(() => {
    const handleAskTutor = (event: CustomEvent) => {
      const { question, context } = event.detail;
      
      // 添加学生提问
      const studentMessage: Message = {
        id: Date.now().toString(),
        type: 'student',
        content: question,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, studentMessage]);
      
      // 生成导师回复
      setTimeout(() => {
        const tutorResponse = generateTutorResponse(question);
        setMessages(prev => [...prev, tutorResponse]);
      }, 1000);
    };

    const handleWrongAnswer = (event: CustomEvent) => {
      const tutorMessage: Message = {
        id: Date.now().toString(),
        type: 'tutor',
        content: '我注意到你答错了这道题。让我来帮你理解这个概念。',
        timestamp: new Date(),
        buttons: [
          { label: '重新解释', action: 'explain-again', variant: 'default' as const },
          { label: '看例子', action: 'show-example', variant: 'outline' as const }
        ]
      };
      
      setMessages(prev => [...prev, tutorMessage]);
      setHasNewMessage(true);
    };

    window.addEventListener('askTutor', handleAskTutor as EventListener);
    window.addEventListener('wrongAnswer', handleWrongAnswer as EventListener);
    
    return () => {
      window.removeEventListener('askTutor', handleAskTutor as EventListener);
      window.removeEventListener('wrongAnswer', handleWrongAnswer as EventListener);
    };
  }, []);

  // 当有新消息且侧栏未展开时显示提醒
  useEffect(() => {
    if (!isExpanded && messages.length > 1) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'tutor') {
        setHasNewMessage(true);
      }
    }
  }, [messages, isExpanded]);

  // 展开侧栏时清除新消息提醒
  useEffect(() => {
    if (isExpanded) {
      setHasNewMessage(false);
    }
  }, [isExpanded]);

  // 模拟AI回复
  const generateTutorResponse = (studentMessage: string): Message => {
    const responses = [
      {
        content: '很好的问题！让我来帮你解答。根据牛顿第三定律，作用力和反作用力总是成对出现的。',
        buttons: [
          { label: '看例子', action: 'show-example', variant: 'default' as const },
          { label: '再试一次', action: 'retry', variant: 'outline' as const }
        ]
      },
      {
        content: '我注意到你可能对这个概念还不太清楚。要不要我们换个角度来理解？',
        buttons: [
          { label: '换个方式', action: 'change-method', variant: 'default' as const },
          { label: '查看提示', action: 'show-hint', variant: 'outline' as const }
        ]
      },
      {
        content: '太棒了！你已经掌握了这个概念的核心。让我们继续深入学习吧！',
        buttons: [
          { label: '下一步', action: 'next-step', variant: 'default' as const }
        ]
      }
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      id: Date.now().toString(),
      type: 'tutor',
      content: randomResponse.content,
      timestamp: new Date(),
      buttons: randomResponse.buttons
    };
  };

  // 生成基于选中文本的上下文回复
  const generateContextualTutorResponse = (selectedText: string, contextText: string): Message => {
    // 根据选中的文本内容生成相关回复
    const contextualResponses: { [key: string]: any } = {
      '方向相反': {
        content: '这个可以想象一下，你推墙，墙也在推你。你能想到生活里类似的情况吗？',
        buttons: [
          { label: '举个例子', action: 'show-example', variant: 'default' as const },
          { label: '我想想', action: 'think-more', variant: 'outline' as const }
        ]
      },
      '作用力': {
        content: '作用力是物体对另一个物体施加的力。比如你用手推桌子，你的手对桌子的力就是作用力。',
        buttons: [
          { label: '反作用力呢？', action: 'explain-reaction', variant: 'default' as const },
          { label: '看动画演示', action: 'show-animation', variant: 'outline' as const }
        ]
      },
      '反作用力': {
        content: '反作用力是被推物体对施力物体的反向作用力。桌子也会对你的手产生一个向后的力！',
        buttons: [
          { label: '为什么感受不到？', action: 'why-not-feel', variant: 'default' as const },
          { label: '做个实验', action: 'do-experiment', variant: 'outline' as const }
        ]
      },
      '大小相等': {
        content: '对！作用力和反作用力大小总是相等的。这就像跷跷板两端的力一样平衡。',
        buttons: [
          { label: '那为什么物体会移动？', action: 'why-move', variant: 'default' as const },
          { label: '更多例子', action: 'more-examples', variant: 'outline' as const }
        ]
      }
    };

    // 寻找匹配的关键词
    let matchedResponse = null;
    for (const keyword in contextualResponses) {
      if (selectedText.includes(keyword)) {
        matchedResponse = contextualResponses[keyword];
        break;
      }
    }

    // 如果没有匹配的关键词，使用通用回复
    if (!matchedResponse) {
      matchedResponse = {
        content: `关于"${selectedText}"，这是一个很好的问题！让我来帮你理解这个概念。`,
        buttons: [
          { label: '详细解释', action: 'explain-detail', variant: 'default' as const },
          { label: '举例说明', action: 'show-example', variant: 'outline' as const }
        ]
      };
    }

    return {
      id: Date.now().toString(),
      type: 'tutor',
      content: matchedResponse.content,
      timestamp: new Date(),
      buttons: matchedResponse.buttons
    };
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // 添加学生消息
    const studentMessage: Message = {
      id: Date.now().toString(),
      type: 'student',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, studentMessage]);
    setInputValue('');

    // 模拟导师回复（延迟1秒）
    setTimeout(() => {
      const tutorResponse = generateTutorResponse(inputValue);
      setMessages(prev => [...prev, tutorResponse]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleButtonClick = (action: string) => {
    if (onActionClick) {
      onActionClick(action);
    }
    
    // 添加一个系统消息显示按钮被点击
    const systemMessage: Message = {
      id: Date.now().toString(),
      type: 'tutor',
      content: `好的，我来帮你${action === 'show-example' ? '展示例子' : action === 'retry' ? '重新开始' : action === 'change-method' ? '换个方式解释' : action === 'show-hint' ? '提供提示' : '继续学习'}！`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, systemMessage]);
  };

  // 如果是固定侧栏模式，直接显示展开状态
  if (isFixedSidebar) {
    // 强制展开状态
    if (!isExpanded) {
      setIsExpanded(true);
    }
  }

  // 收起状态的头像按钮（仅在非固定侧栏模式下显示）
  if (!isExpanded && !isFixedSidebar) {
    return (
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsExpanded(true)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg border-0 p-0 overflow-hidden"
        >
          <img 
            src={capybaraAvatar} 
            alt="Capybara导师" 
            className="w-12 h-12 object-contain"
          />
          {hasNewMessage && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full absolute top-1 left-1"></div>
            </div>
          )}
        </Button>
      </div>
    );
  }

  // 展开状态的侧栏
  return (
    <div className={`${isFixedSidebar ? 'h-full w-full' : 'fixed inset-y-0 right-0 w-[30%] min-w-[400px] z-40'} ${className}`}>
      {/* 背景遮罩（仅在非固定侧栏模式下显示） */}
      {!isFixedSidebar && (
        <div 
          className="absolute inset-0 bg-black/20 -left-[70%]"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* 侧栏内容 */}
      <Card className={`h-full ${isFixedSidebar ? 'rounded-none' : 'rounded-none rounded-l-2xl'} shadow-2xl bg-gradient-to-br from-blue-50 via-orange-50 to-blue-50 border-0 flex flex-col`}>
        {/* 头部 */}
        <div className={`flex items-center justify-between p-4 border-b border-blue-200/50 bg-white/60 backdrop-blur-sm ${isFixedSidebar ? 'rounded-none' : 'rounded-tl-2xl'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center p-1">
              <img 
                src={capybaraAvatar} 
                alt="Capybara导师" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Capybara导师</h3>
              <p className="text-sm text-gray-600">{subject}学习助手</p>
            </div>
          </div>
          {!isFixedSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="hover:bg-white/60"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* 对话区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'student' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[80%] ${message.type === 'student' ? 'order-2' : 'order-1'}`}>
                {/* 消息气泡 */}
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.type === 'student'
                      ? 'bg-blue-500 text-white rounded-bl-sm'
                      : 'bg-white/80 text-gray-900 rounded-br-sm shadow-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>

                {/* 导师消息的操作按钮 */}
                {message.type === 'tutor' && message.buttons && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.buttons.map((button, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={button.variant || 'default'}
                        onClick={() => handleButtonClick(button.action)}
                        className={`text-xs ${
                          button.variant === 'outline' 
                            ? 'border-blue-300 text-blue-700 hover:bg-blue-50' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {button.label}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    ))}
                  </div>
                )}

                {/* 头像 */}
                {message.type === 'tutor' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center mt-2 order-1 mr-3 p-1">
                    <img 
                      src={capybaraAvatar} 
                      alt="Capybara导师" 
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t border-blue-200/50 bg-white/60 backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="问导师问题..."
                className="w-full px-4 py-3 bg-white/80 rounded-2xl border border-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-sm"
              />
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRecording(!isRecording)}
              className={`w-10 h-10 rounded-full ${
                isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'hover:bg-white/60'
              }`}
            >
              <Mic className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            支持文字和语音输入 • 按Enter发送
          </p>
        </div>
      </Card>
    </div>
  );
}

// 导出一个用于其他组件调用的Hook
export function useAITutor() {
  const [tutorRef, setTutorRef] = useState<any>(null);

  const askTutor = (question: string, context?: string) => {
    // 这里可以触发AI导师的自动回复
    console.log('Ask tutor:', question, context);
  };

  const showHint = (hint: string) => {
    // 显示提示
    console.log('Show hint:', hint);
  };

  const triggerResponse = (type: 'wrong-answer' | 'selected-text' | 'ask-question', data?: any) => {
    // 根据不同的触发类型生成不同的回复
    console.log('Trigger response:', type, data);
  };

  return {
    askTutor,
    showHint,
    triggerResponse,
    tutorRef,
    setTutorRef
  };
}
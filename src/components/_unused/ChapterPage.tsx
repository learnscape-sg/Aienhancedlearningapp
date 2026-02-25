import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Slider } from '../ui/slider';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useProgressTracker } from '../ProgressTracker';
import { 
  BookOpen, 
  Presentation, 
  Volume2, 
  GitBranch, 
  HelpCircle, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Clock,
  Target,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Brain,
  Zap,
  RefreshCw
} from 'lucide-react';

interface ChapterPageProps {
  chapterId: string;
  onBack: () => void;
  onStartQuiz: () => void;
}

// Mock chapter data
const chapterData = {
  '1': {
    title: '分数的加法和减法',
    subject: '数学',
    description: '学习同分母和异分母分数的加减运算',
    progress: 75,
    estimatedTime: '15分钟',
    content: {
      text: `在日常生活中，我们经常会遇到需要进行分数运算的情况。比如你在做篮球训练时，如果上午练习了 1/3 小时，下午又练习了 1/4 小时，那么一天总共练习了多长时间呢？

这就需要我们学会分数的加法运算。让我们通过具体的例子来理解分数加法的规则。

## 同分母分数的加法

当两个分数的分母相同时，我们只需要将分子相加，分母保持不变。

例如：1/5 + 2/5 = 3/5

这就像是你有一个披萨，切成了5块，你吃了1块，朋友吃了2块，总共吃了3块，所以是 3/5 个披萨。`,
      
      questions: [
        {
          id: 'q1',
          question: '计算 2/7 + 3/7 = ?',
          options: ['4/7', '5/7', '6/7', '5/14'],
          correct: 1,
          explanation: '同分母分数相加，分子相加分母不变：2 + 3 = 5，所以答案是 5/7'
        },
        {
          id: 'q2',
          question: '在篮球训练中，如果投篮命中率是 3/10，罚球命中率是 2/10，总命中率是多少？',
          options: ['5/10', '5/20', '6/10', '1/2'],
          correct: 0,
          explanation: '这里是同分母分数相加：3/10 + 2/10 = 5/10'
        }
      ]
    }
  }
};

export function ChapterPage({ chapterId, onBack, onStartQuiz }: ChapterPageProps) {
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<{[key: string]: number}>({});
  const [showFeedback, setShowFeedback] = useState<{[key: string]: boolean}>({});
  const [startTime] = useState(Date.now());
  const [activeMode, setActiveMode] = useState<'text' | 'slides' | 'audio' | 'mindmap'>('text');
  
  // Slides state
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // AI personalization
  const [adaptiveContent, setAdaptiveContent] = useState<any>(null);
  const [learningStyle, setLearningStyle] = useState<'visual' | 'auditory' | 'kinesthetic'>('visual');
  
  const { progressData, updateProgress } = useProgressTracker();

  const chapter = chapterData[chapterId as keyof typeof chapterData];
  
  if (!chapter) {
    return <div>Chapter not found</div>;
  }

  const currentProgress = progressData[chapterId];
  const actualProgress = currentProgress?.progress || chapter.progress;

  useEffect(() => {
    // Update progress when chapter is opened
    updateProgress(chapterId, actualProgress, false, 0);
  }, [chapterId]);

  const handleAnswerQuestion = (questionId: string, answerIndex: number) => {
    setAnsweredQuestions(prev => ({ ...prev, [questionId]: answerIndex }));
    setShowFeedback(prev => ({ ...prev, [questionId]: true }));
    
    // Update progress for answering questions
    const questionsAnswered = Object.keys(answeredQuestions).length + 1;
    const totalQuestions = chapter.content.questions.length;
    const newProgress = Math.min(90, (questionsAnswered / totalQuestions) * 90);
    
    updateProgress(chapterId, newProgress, false, 0);
  };

  const handleCompleteChapter = () => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    updateProgress(chapterId, 100, true, timeSpent);
    onStartQuiz();
  };

  const renderTextContent = () => {
    const parts = chapter.content.text.split(/(\[Q\d+\])/);
    
    return (
      <div className="prose max-w-none">
        {parts.map((part, index) => {
          const questionMatch = part.match(/\[Q(\d+)\]/);
          if (questionMatch) {
            const questionIndex = parseInt(questionMatch[1]) - 1;
            const question = chapter.content.questions[questionIndex];
            if (!question) return null;
            
            return (
              <Popover key={index}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mx-2 my-1 bg-[#4F46E5]/10 border-[#4F46E5]/30 hover:bg-[#4F46E5]/20"
                  >
                    <HelpCircle className="w-4 h-4 mr-1" />
                    思考题
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  <QuestionPopover
                    question={question}
                    answered={answeredQuestions[question.id]}
                    showFeedback={showFeedback[question.id]}
                    onAnswer={(answerIndex) => handleAnswerQuestion(question.id, answerIndex)}
                  />
                </PopoverContent>
              </Popover>
            );
          }
          
          return (
            <div key={index} className="whitespace-pre-line leading-relaxed">
              {part}
            </div>
          );
        })}
        
        {/* Embedded Questions */}
        <div className="mt-8 space-y-6">
          {chapter.content.questions.map((question, index) => (
            <Card key={question.id} className="border-l-4 border-l-[#4F46E5]">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-[#4F46E5]" />
                  <span>练习题 {index + 1}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionCard
                  question={question}
                  answered={answeredQuestions[question.id]}
                  showFeedback={showFeedback[question.id]}
                  onAnswer={(answerIndex) => handleAnswerQuestion(question.id, answerIndex)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-medium">{chapter.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <Badge variant="secondary">{chapter.subject}</Badge>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>预计 {chapter.estimatedTime}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Target className="w-4 h-4" />
                <span>进度 {Math.round(actualProgress)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <Progress value={actualProgress} className="h-2" />
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="text" className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <span>沉浸式文本</span>
          </TabsTrigger>
          <TabsTrigger value="slides" className="flex items-center space-x-2">
            <Presentation className="w-4 h-4" />
            <span>幻灯片</span>
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4" />
            <span>音频课</span>
          </TabsTrigger>
          <TabsTrigger value="mindmap" className="flex items-center space-x-2">
            <GitBranch className="w-4 h-4" />
            <span>思维导图</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-6">
          <Card>
            <CardContent className="p-8">
              {renderTextContent()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slides" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="py-12">
                <Presentation className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">幻灯片模式正在开发中...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audio" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="py-12">
                <Volume2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">音频课程正在开发中...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mindmap" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="py-12">
                <GitBranch className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">思维导图正在开发中...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chapter Complete Action */}
      <div className="mt-8 text-center">
        <Button 
          onClick={handleCompleteChapter}
          className="px-8 py-3 bg-[#22C55E] hover:bg-[#16A34A]"
          size="lg"
        >
          完成章节，开始测验
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({ 
  question, 
  answered, 
  showFeedback, 
  onAnswer 
}: {
  question: any;
  answered?: number;
  showFeedback?: boolean;
  onAnswer: (answerIndex: number) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="font-medium">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((option: string, index: number) => {
          const isSelected = answered === index;
          const isCorrect = index === question.correct;
          const showResult = showFeedback && isSelected;
          
          return (
            <Button
              key={index}
              variant={isSelected ? "default" : "outline"}
              className={`w-full justify-start text-left h-auto py-3 px-4 ${
                showResult 
                  ? isCorrect 
                    ? 'bg-[#22C55E] hover:bg-[#22C55E] text-white' 
                    : 'bg-red-500 hover:bg-red-500 text-white'
                  : isSelected
                    ? 'bg-[#4F46E5] hover:bg-[#4F46E5]'
                    : ''
              }`}
              onClick={() => onAnswer(index)}
              disabled={showFeedback}
            >
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{option}</span>
                {showResult && (
                  <div className="ml-auto">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                )}
              </div>
            </Button>
          );
        })}
      </div>
      {showFeedback && answered !== undefined && (
        <div className={`p-4 rounded-lg ${
          answered === question.correct 
            ? 'bg-[#22C55E]/10 border border-[#22C55E]/30' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <p className="text-sm">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

function QuestionPopover({ 
  question, 
  answered, 
  showFeedback, 
  onAnswer 
}: {
  question: any;
  answered?: number;
  showFeedback?: boolean;
  onAnswer: (answerIndex: number) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">思考一下</h3>
      <QuestionCard
        question={question}
        answered={answered}
        showFeedback={showFeedback}
        onAnswer={onAnswer}
      />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Slider } from './ui/slider';
import { useProgressTracker } from './ProgressTracker';
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
  RefreshCw,
  Settings,
  Users,
  Star
} from 'lucide-react';

interface ChapterPageProps {
  chapterId: string;
  onBack: () => void;
  onStartQuiz: () => void;
}

// Enhanced chapter data with multiple formats
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

这就像是你有一个披萨，切成了5块，你吃了1块，朋友吃了2块，总共吃了3块，所以是 3/5 个披萨。

## 异分母分数的加法

当两个分数的分母不同时，我们需要先找到它们的最小公倍数，将分数化为同分母，然后再进行加法运算。

例如：1/3 + 1/4 = 4/12 + 3/12 = 7/12`,
      
      slides: [
        {
          title: '分数运算基础',
          content: '在日常生活中，分数无处不在',
          visual: '🍕 披萨切片演示',
          notes: '用实际例子引入分数概念'
        },
        {
          title: '同分母分数加法',
          content: '分母相同时，分子直接相加',
          visual: '1/5 + 2/5 = 3/5',
          notes: '强调分母保持不变的规则'
        },
        {
          title: '实际应用场景',
          content: '篮球训练时间计算',
          visual: '⏰ 上午1/3小时 + 下午1/4小时',
          notes: '联系生活实际，提高学习兴趣'
        },
        {
          title: '异分母分数加法',
          content: '先通分，再相加',
          visual: '1/3 + 1/4 → 4/12 + 3/12 = 7/12',
          notes: '分步骤演示通分过程'
        }
      ],
      
      audioScript: [
        { time: 0, text: "欢迎学习分数的加法和减法。今天我们要解决一个生活中的实际问题。", emphasis: "welcome" },
        { time: 5, text: "想象一下，你在进行篮球训练，上午练习了三分之一小时。", emphasis: "scenario" },
        { time: 12, text: "下午又练习了四分之一小时。那么，一天总共练习了多长时间呢？", emphasis: "question" },
        { time: 20, text: "这就需要我们掌握分数加法的技巧。让我们从简单的同分母分数开始。", emphasis: "transition" },
        { time: 28, text: "同分母分数相加很简单：分子相加，分母不变。", emphasis: "rule" },
        { time: 35, text: "比如五分之一加五分之二，等于五分之三。", emphasis: "example" },
        { time: 42, text: "就像切披萨一样，5块中吃了1块，又吃了2块，总共吃了3块。", emphasis: "analogy" }
      ],

      mindMap: {
        center: "分数运算",
        branches: [
          {
            name: "同分母加法",
            children: [
              "分子相加",
              "分母不变",
              "实例：1/5 + 2/5 = 3/5"
            ],
            color: "#4285F4"
          },
          {
            name: "异分母加法", 
            children: [
              "找最小公倍数",
              "通分",
              "分子相加",
              "实例：1/3 + 1/4 = 7/12"
            ],
            color: "#34A853"
          },
          {
            name: "生活应用",
            children: [
              "时间计算",
              "食物分配",
              "运动训练",
              "学习规划"
            ],
            color: "#FBBC05"
          },
          {
            name: "解题步骤",
            children: [
              "观察分母",
              "判断是否需要通分",
              "执行运算",
              "化简结果"
            ],
            color: "#EA4335"
          }
        ]
      },
      
      questions: [
        {
          id: 'q1',
          question: '计算 2/7 + 3/7 = ?',
          options: ['4/7', '5/7', '6/7', '5/14'],
          correct: 1,
          explanation: '同分母分数相加，分子相加分母不变：2 + 3 = 5，所以答案是 5/7',
          adaptiveHint: '记住：同分母分数加法的关键是"分子相加，分母不变"'
        },
        {
          id: 'q2',
          question: '在篮球训练中，如果投篮命中率是 3/10，罚球命中率是 2/10，总命中率是多少？',
          options: ['5/10', '5/20', '6/10', '1/2'],
          correct: 0,
          explanation: '这里是同分母分数相加：3/10 + 2/10 = 5/10',
          adaptiveHint: '将实际问题转化为数学运算：两个十分之几相加'
        },
        {
          id: 'q3',
          question: '计算 1/3 + 1/4 = ?',
          options: ['2/7', '7/12', '1/7', '4/12'],
          correct: 1,
          explanation: '异分母分数相加需要通分：1/3 = 4/12, 1/4 = 3/12, 所以 4/12 + 3/12 = 7/12',
          adaptiveHint: '异分母分数加法：先找最小公倍数12，然后通分'
        }
      ]
    }
  }
};

export function EnhancedChapterPage({ chapterId, onBack, onStartQuiz }: ChapterPageProps) {
  const [answeredQuestions, setAnsweredQuestions] = useState<{[key: string]: number}>({});
  const [showFeedback, setShowFeedback] = useState<{[key: string]: boolean}>({});
  const [startTime] = useState(Date.now());
  
  // Multi-modal states
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showPersonalization, setShowPersonalization] = useState(false);
  
  // AI personalization states
  const [learningStyle, setLearningStyle] = useState<'visual' | 'auditory' | 'kinesthetic'>('visual');
  const [difficultyLevel, setDifficultyLevel] = useState<'basic' | 'standard' | 'advanced'>('standard');
  const [adaptiveHints, setAdaptiveHints] = useState(true);
  
  const { progressData, updateProgress } = useProgressTracker();

  const chapter = chapterData[chapterId as keyof typeof chapterData];
  
  if (!chapter) {
    return <div>Chapter not found</div>;
  }

  const currentProgress = progressData[chapterId];
  const actualProgress = currentProgress?.progress || chapter.progress;

  useEffect(() => {
    updateProgress(chapterId, actualProgress, false, 0);
  }, [chapterId]);

  const handleAnswerQuestion = (questionId: string, answerIndex: number) => {
    setAnsweredQuestions(prev => ({ ...prev, [questionId]: answerIndex }));
    setShowFeedback(prev => ({ ...prev, [questionId]: true }));
    
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

  // Render immersive text with embedded questions
  const renderTextContent = () => {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Personalization Banner */}
        {adaptiveHints && learningStyle === 'visual' && (
          <div className="mb-6 p-4 bg-[#E3F2FD] border border-[#1A73E8]/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-[#1A73E8]" />
              <span className="font-medium text-[#1A73E8]">个性化提示</span>
            </div>
            <p className="text-[#5F6368]">根据你的视觉学习偏好，我们在文中加入了图表和视觉示例帮助理解。</p>
          </div>
        )}

        <div className="prose max-w-none space-y-6">
          {chapter.content.text.split('\n\n').map((paragraph, index) => (
            <div key={index} className="leading-relaxed text-[#202124]">
              {paragraph.includes('##') ? (
                <h2 className="text-xl font-medium text-[#1A73E8] mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  {paragraph.replace('## ', '')}
                </h2>
              ) : (
                <p className="mb-4">{paragraph}</p>
              )}
            </div>
          ))}
        </div>

        {/* Interactive Questions Section */}
        <div className="mt-8 space-y-6">
          <h3 className="text-xl font-medium text-[#202124] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FBBC05]" />
            互动练习
          </h3>
          
          {chapter.content.questions.map((question, index) => (
            <Card key={question.id} className="border-l-4 border-l-[#1A73E8] shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="w-5 h-5 text-[#1A73E8]" />
                    <span>练习题 {index + 1}</span>
                  </div>
                  {answeredQuestions[question.id] !== undefined && (
                    <Badge className={
                      answeredQuestions[question.id] === question.correct
                        ? "bg-[#34A853] text-white"
                        : "bg-[#EA4335] text-white"
                    }>
                      {answeredQuestions[question.id] === question.correct ? "正确" : "错误"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionCard
                  question={question}
                  answered={answeredQuestions[question.id]}
                  showFeedback={showFeedback[question.id]}
                  onAnswer={(answerIndex) => handleAnswerQuestion(question.id, answerIndex)}
                  showAdaptiveHint={adaptiveHints}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Render slides view
  const renderSlidesView = () => {
    const slides = chapter.content.slides;
    const currentSlideData = slides[currentSlide];

    return (
      <div className="max-w-4xl mx-auto">
        <Card className="min-h-[500px]">
          <CardContent className="p-8">
            <div className="text-center space-y-8">
              <div className="bg-gradient-to-r from-[#1A73E8]/10 to-[#4285F4]/10 rounded-xl p-8">
                <h2 className="text-2xl font-medium text-[#202124] mb-4">
                  {currentSlideData.title}
                </h2>
                <div className="text-4xl mb-4">{currentSlideData.visual}</div>
                <p className="text-lg text-[#5F6368]">{currentSlideData.content}</p>
              </div>
              
              {currentSlideData.notes && (
                <div className="bg-[#F8F9FA] rounded-lg p-4 text-left">
                  <p className="text-sm text-[#5F6368]">
                    <span className="font-medium">讲师提示：</span> {currentSlideData.notes}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Slide Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            上一页
          </Button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-[#5F6368]">
              {currentSlide + 1} / {slides.length}
            </span>
            <div className="flex space-x-1">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full ${
                    index === currentSlide ? 'bg-[#1A73E8]' : 'bg-[#E0E0E0]'
                  }`}
                />
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
            disabled={currentSlide === slides.length - 1}
          >
            下一页
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  };

  // Render audio player
  const renderAudioView = () => {
    const audioScript = chapter.content.audioScript;
    const currentSegment = audioScript[Math.floor(audioProgress / 100 * audioScript.length)];

    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8">
            {/* Audio Player Interface */}
            <div className="text-center space-y-6">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#1A73E8] to-[#4285F4] rounded-full flex items-center justify-center">
                <Volume2 className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-[#202124] mb-2">音频课程</h3>
                <p className="text-[#5F6368]">{chapter.title}</p>
              </div>

              {/* Current Text Display */}
              <div className="bg-[#F8F9FA] rounded-lg p-6 text-left">
                <p className="text-lg text-[#202124] leading-relaxed">
                  {currentSegment?.text || "点击播放按钮开始音频课程"}
                </p>
              </div>

              {/* Audio Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-4">
                  <Button variant="outline" size="sm">
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 rounded-full bg-[#1A73E8] hover:bg-[#1557B0]"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <Slider
                    value={[audioProgress]}
                    onValueChange={(value) => setAudioProgress(value[0])}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-[#5F6368]">
                    <span>{Math.floor(audioProgress / 100 * 7)}:00</span>
                    <span>7:00</span>
                  </div>
                </div>

                {/* Playback Speed */}
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm text-[#5F6368]">播放速度:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPlaybackSpeed(playbackSpeed === 2 ? 0.5 : playbackSpeed + 0.25)}
                  >
                    {playbackSpeed}x
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audio Script */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>课程文稿</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audioScript.map((segment, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    index === Math.floor(audioProgress / 100 * audioScript.length)
                      ? 'bg-[#1A73E8]/10 border border-[#1A73E8]/20'
                      : 'hover:bg-[#F8F9FA]'
                  }`}
                  onClick={() => setAudioProgress((index / audioScript.length) * 100)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-sm text-[#5F6368] font-mono">
                      {Math.floor(segment.time / 60)}:{(segment.time % 60).toString().padStart(2, '0')}
                    </span>
                    <p className="text-[#202124] flex-1">{segment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render mind map
  const renderMindMapView = () => {
    const mindMap = chapter.content.mindMap;

    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <div className="relative">
              {/* Central Node */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-32 h-32 bg-gradient-to-br from-[#1A73E8] to-[#4285F4] rounded-full flex items-center justify-center text-white text-lg font-medium shadow-lg">
                  {mindMap.center}
                </div>
              </div>

              {/* Branch Nodes */}
              {mindMap.branches.map((branch, index) => {
                const angle = (index * 360) / mindMap.branches.length;
                const radius = 200;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;

                return (
                  <div key={index} className="absolute top-1/2 left-1/2" style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                  }}>
                    {/* Connection Line */}
                    <svg className="absolute top-1/2 left-1/2 pointer-events-none" style={{
                      transform: `translate(-50%, -50%) rotate(${angle + 180}deg)`,
                      width: radius,
                      height: 2
                    }}>
                      <line x1="0" y1="1" x2={radius} y2="1" stroke={branch.color} strokeWidth="2" />
                    </svg>

                    {/* Branch Node */}
                    <Card className="w-48 shadow-lg hover:shadow-xl transition-shadow">
                      <CardHeader className="pb-2" style={{ borderLeftColor: branch.color, borderLeftWidth: '4px' }}>
                        <CardTitle className="text-sm" style={{ color: branch.color }}>
                          {branch.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-1">
                          {branch.children.map((child, childIndex) => (
                            <li key={childIndex} className="text-xs text-[#5F6368] flex items-center space-x-1">
                              <div className="w-1 h-1 rounded-full bg-[#5F6368]" />
                              <span>{child}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>

            {/* Spacer for positioning */}
            <div className="h-96"></div>
          </CardContent>
        </Card>

        {/* Mind Map Controls */}
        <div className="mt-6 text-center">
          <Button variant="outline" className="mr-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            重新生成布局
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            自定义节点
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack} className="text-[#5F6368] hover:text-[#202124]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-medium text-[#202124]">{chapter.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-[#5F6368]">
              <Badge className="bg-[#1A73E8] text-white">{chapter.subject}</Badge>
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

        {/* Personalization Settings */}
        <Button
          variant="outline"
          onClick={() => setShowPersonalization(!showPersonalization)}
          className="flex items-center space-x-2"
        >
          <Settings className="w-4 h-4" />
          <span>个性化设置</span>
        </Button>
      </div>

      {/* Personalization Panel */}
      {showPersonalization && (
        <Card className="mb-6 border-[#1A73E8]/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-[#1A73E8]" />
              <span>AI 个性化学习</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-[#202124] mb-2 block">学习风格</label>
                <select
                  value={learningStyle}
                  onChange={(e) => setLearningStyle(e.target.value as any)}
                  className="w-full p-2 border border-[#E0E0E0] rounded-lg"
                >
                  <option value="visual">视觉型</option>
                  <option value="auditory">听觉型</option>
                  <option value="kinesthetic">动手型</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#202124] mb-2 block">难度级别</label>
                <select
                  value={difficultyLevel}
                  onChange={(e) => setDifficultyLevel(e.target.value as any)}
                  className="w-full p-2 border border-[#E0E0E0] rounded-lg"
                >
                  <option value="basic">基础</option>
                  <option value="standard">标准</option>
                  <option value="advanced">进阶</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="adaptive-hints"
                  checked={adaptiveHints}
                  onChange={(e) => setAdaptiveHints(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="adaptive-hints" className="text-sm text-[#202124]">
                  智能提示
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Bar */}
      <div className="mb-6">
        <Progress value={actualProgress} className="h-2" />
      </div>

      {/* Multi-Modal Content Tabs */}
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
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

        <TabsContent value="text">
          {renderTextContent()}
        </TabsContent>

        <TabsContent value="slides">
          {renderSlidesView()}
        </TabsContent>

        <TabsContent value="audio">
          {renderAudioView()}
        </TabsContent>

        <TabsContent value="mindmap">
          {renderMindMapView()}
        </TabsContent>
      </Tabs>

      {/* Chapter Complete Action */}
      <div className="mt-12 text-center">
        <Button 
          onClick={handleCompleteChapter}
          className="px-8 py-3 bg-[#34A853] hover:bg-[#2E7D32] text-white"
          size="lg"
        >
          完成章节，开始测验
        </Button>
      </div>
    </div>
  );
}

// Enhanced Question Card Component
function QuestionCard({ 
  question, 
  answered, 
  showFeedback, 
  onAnswer,
  showAdaptiveHint = false
}: {
  question: any;
  answered?: number;
  showFeedback?: boolean;
  onAnswer: (answerIndex: number) => void;
  showAdaptiveHint?: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="font-medium text-[#202124]">{question.question}</p>
      
      {/* Adaptive Hint */}
      {showAdaptiveHint && !showFeedback && (
        <div className="bg-[#FFF3E0] border border-[#FBBC05]/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-[#FBBC05]" />
            <span className="text-sm font-medium text-[#FBBC05]">智能提示</span>
          </div>
          <p className="text-sm text-[#5F6368]">{question.adaptiveHint}</p>
        </div>
      )}

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
                    ? 'bg-[#34A853] hover:bg-[#34A853] text-white' 
                    : 'bg-[#EA4335] hover:bg-[#EA4335] text-white'
                  : isSelected
                    ? 'bg-[#1A73E8] hover:bg-[#1A73E8] text-white'
                    : 'hover:bg-[#F8F9FA]'
              }`}
              onClick={() => onAnswer(index)}
              disabled={showFeedback}
            >
              <div className="flex items-center space-x-3 w-full">
                <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1">{option}</span>
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
      
      {/* Feedback */}
      {showFeedback && answered !== undefined && (
        <div className={`p-4 rounded-lg ${
          answered === question.correct 
            ? 'bg-[#34A853]/10 border border-[#34A853]/30' 
            : 'bg-[#EA4335]/10 border border-[#EA4335]/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {answered === question.correct ? (
              <CheckCircle className="w-5 h-5 text-[#34A853]" />
            ) : (
              <XCircle className="w-5 h-5 text-[#EA4335]" />
            )}
            <span className="font-medium">
              {answered === question.correct ? '回答正确！' : '答案错误'}
            </span>
          </div>
          <p className="text-sm text-[#5F6368]">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
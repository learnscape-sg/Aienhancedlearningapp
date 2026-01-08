import React, { useState, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { X, HelpCircle, Lightbulb, Eye, SkipForward, RotateCcw, CheckCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { LearningHeader } from './LearningHeader';
import { TextSelectionHelper } from './TextSelectionHelper';


interface Question {
  id: string;
  question: string;
  options: {
    label: string;
    text: string;
  }[];
  correctAnswer?: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: {
    label: string;
    text: string;
  }[];
  correctAnswer: string;
  explanation?: string;
}

interface ImmersiveTextPageProps {
  pdfData: {
    fileName: string;
    grade: string;
    interests: string[];
  };
  onBack: () => void;
  onSwitchMode?: (mode: string) => void;
  onAskTutor?: (selectedText: string, context: string) => void;
}

export function ImmersiveTextPage({ pdfData, onBack, onSwitchMode, onAskTutor }: ImmersiveTextPageProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [currentSectionCompleted, setCurrentSectionCompleted] = useState(true);
  const [nextSectionCompleted, setNextSectionCompleted] = useState(false);
  
  // Quiz interface states
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<number, string>>({});
  
  // 用于文本选择功能的ref
  const contentRef = useRef<HTMLDivElement>(null);

  // Sample questions that can appear throughout the text
  const questions: Question[] = [
    {
      id: 'q1',
      question: '根据牛顿第三定律，当你推墙时会发生什么？',
      options: [
        { label: 'A', text: '墙会用相同大小的力推你。' },
        { label: 'B', text: '墙不会产生任何反作用力。' },
        { label: 'C', text: '墙会用更大的力推你。' },
        { label: 'D', text: '墙会用更小的力推你。' }
      ],
      correctAnswer: 'A'
    },
    {
      id: 'q2',
      question: '根据图3.5中的火箭发射例子，火箭是如何向上运动的？',
      options: [
        { label: 'A', text: '通过空气的浮力作用。' },
        { label: 'B', text: '通过向下喷射气体产生的反作用力。' },
        { label: 'C', text: '通过重力的作用。' },
        { label: 'D', text: '通过磁力的作用。' }
      ],
      correctAnswer: 'B'
    }
  ];

  // Quiz questions for the comprehensive quiz
  const quizQuestions: QuizQuestion[] = [
    {
      id: 'quiz1',
      question: '根据文本内容，牛顿第三定律的核心特征是什么？',
      options: [
        { label: 'A', text: '作用力总是大于反作用力' },
        { label: 'B', text: '每一个作用力都有大小相等、方向相反的反作用力' },
        { label: 'C', text: '只有运动的物体才会产生反作用力' },
        { label: 'D', text: '反作用力只存在于接触的物体之间' }
      ],
      correctAnswer: 'B',
      explanation: '牛顿第三定律指出：每一个作用力都有一个大小相等、方向相反的反作用力。这是该定律的核心特征。'
    },
    {
      id: 'quiz2',
      question: '在火箭发射的例子中，火箭向上运动的原理是什么？',
      options: [
        { label: 'A', text: '火箭燃料的重量减轻使其上升' },
        { label: 'B', text: '火箭向下喷射气体，气体向上推火箭' },
        { label: 'C', text: '火箭利用空气阻力向上运动' },
        { label: 'D', text: '火箭通过磁力作用向上飞行' }
      ],
      correctAnswer: 'B',
      explanation: '根据牛顿第三定律，当火箭向下喷射高温气体时，气体会对火箭产生向上的反作用力，推动火箭上升。'
    },
    {
      id: 'quiz3',
      question: '滑板运动员推地面的例子说明了什么物理原理？',
      options: [
        { label: 'A', text: '摩擦力的作用' },
        { label: 'B', text: '重力的影响' },
        { label: 'C', text: '作用力与反作用力成对出现' },
        { label: 'D', text: '动量守恒定律' }
      ],
      correctAnswer: 'C',
      explanation: '滑板运动员推地面时，地面同时向相反方向推滑板运动员，这清楚地展示了力总是成对出现的特性。'
    },
    {
      id: 'quiz4',
      question: '牛顿第三定律适用于哪些情况？',
      options: [
        { label: 'A', text: '只适用于运动的物体' },
        { label: 'B', text: '只适用于静止的物体' },
        { label: 'C', text: '适用于所有力的相互作用，无论物体是否运动' },
        { label: 'D', text: '只适用于大质量的物体' }
      ],
      correctAnswer: 'C',
      explanation: '牛顿第三定律适用于所有的力的相互作用，无论物体是否在运动。这是一个普遍适用的物理定律。'
    }
  ];

  const handleQuestionClick = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      setCurrentQuestion(question);
      setShowQuestion(true);
      setUserAnswer('');
      setSelectedOption('');
    }
  };

  const handleCloseQuestion = () => {
    setShowQuestion(false);
    setCurrentQuestion(null);
    setUserAnswer('');
    setSelectedOption('');
  };

  const handleOptionSelect = (optionLabel: string) => {
    setSelectedOption(optionLabel);
    setUserAnswer(optionLabel);
  };

  const handleSubmitAnswer = () => {
    console.log('User answer:', userAnswer);
    // Here you could add logic to check the answer and provide feedback
    handleCloseQuestion();
  };

  const handleOpenPDF = () => {
    console.log('Opening PDF:', pdfData.fileName);
    alert(`打开PDF文件: ${pdfData.fileName}`);
  };

  // Quiz interface handlers
  const handleStartQuiz = () => {
    setShowQuiz(true);
    setCurrentQuizQuestion(0);
    setSelectedAnswer('');
    setShowAnswer(false);
    setShowHint(false);
    setAnsweredQuestions(new Set());
    setUserQuizAnswers({});
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setUserQuizAnswers(prev => ({
      ...prev,
      [currentQuizQuestion]: answer
    }));
  };

  const handleSubmitQuizAnswer = () => {
    if (selectedAnswer) {
      setAnsweredQuestions(prev => new Set([...prev, currentQuizQuestion]));
      setShowAnswer(true);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuizQuestion < quizQuestions.length - 1) {
      setCurrentQuizQuestion(currentQuizQuestion + 1);
      setSelectedAnswer(userQuizAnswers[currentQuizQuestion + 1] || '');
      setShowAnswer(false);
      setShowHint(false);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuizQuestion > 0) {
      setCurrentQuizQuestion(currentQuizQuestion - 1);
      setSelectedAnswer(userQuizAnswers[currentQuizQuestion - 1] || '');
      setShowAnswer(answeredQuestions.has(currentQuizQuestion - 1));
      setShowHint(false);
    }
  };

  const handleSkip = () => {
    handleNextQuestion();
  };

  const handleRestartQuiz = () => {
    setCurrentQuizQuestion(0);
    setSelectedAnswer('');
    setShowAnswer(false);
    setShowHint(false);
    setAnsweredQuestions(new Set());
    setUserQuizAnswers({});
  };

  const handleFinishQuiz = () => {
    setShowQuiz(false);
    // 可以添加完成逻辑，比如显示成绩等
  };

  const getHintForQuestion = (questionIndex: number): string => {
    const hints = [
      "想想定律名称本身！牛顿第三定律强调的是作用力和反作用力的关系。它们在大小和方向上有什么特殊的关系呢？",
      "火箭发射的关键在于牛顿第三定律。当火箭向一个方向喷射什么东西时，根据这个定律，会发生什么反向的作用呢？",
      "注意看滑板运动员的动作！当他推地面时，根据牛顿第三定律，地面会如何回应？这展示了力的什么特性？",
      "牛顿第三定律是一个普遍适用的物理定律。想想它是否只在特定条件下才成立，还是在所有情况下都有效？"
    ];
    return hints[questionIndex] || "仔细回顾文本中的相关内容，思考牛顿第三定律的核心概念。";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <LearningHeader 
        pdfData={pdfData}
        currentMode="immersive-text"
        onModeSelect={onSwitchMode}
        onOpenPDF={handleOpenPDF}
        onBack={onBack}
      />

      {/* Main content container */}
      <div className="w-full max-w-7xl mx-auto p-6">
        {/* Content area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200" ref={contentRef}>
          <div className="p-8">
            {/* Content header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-medium text-gray-900">
                牛顿第三定律：作用力与反作用力
              </h1>
              <Button variant="ghost" size="sm" className="text-gray-400">
                →
              </Button>
            </div>

            <div className="grid lg:grid-cols-4 gap-8">
              {/* Left sidebar - Table of contents */}
              <div className="lg:col-span-1">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={currentSectionCompleted} 
                      onChange={(e) => setCurrentSectionCompleted(e.target.checked)}
                      className="w-4 h-4 text-blue-600" 
                    />
                    <span className="text-sm text-gray-700">牛顿第三定律：基础概念</span>
                  </div>
                  <div className="ml-6 space-y-2">
                    <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                      当前阅读内容
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-4">
                    <input 
                      type="checkbox" 
                      checked={nextSectionCompleted}
                      onChange={(e) => setNextSectionCompleted(e.target.checked)}
                      className="w-4 h-4" 
                    />
                    <span className="text-sm text-gray-500">实际应用和例子</span>
                  </div>
                  
                  {/* Quiz button or quiz progress */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    {showQuiz ? (
                      <div className="bg-orange-100 text-orange-700 px-3 py-2 rounded-lg text-xs">
                        <div className="flex items-center justify-between">
                          <span>测验进行中</span>
                          <span>{currentQuizQuestion + 1}/{quizQuestions.length}</span>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        onClick={handleStartQuiz}
                        className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm py-2 px-3 rounded-lg border-0"
                        variant="outline"
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        开始测验巩固
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Main content area */}
              <div className="lg:col-span-3 space-y-6">
                <div className="prose max-w-none relative">
                  <div className="relative">
                    <p className="text-gray-700 leading-relaxed pr-12">
                      <strong>牛顿第三定律</strong>指出：每一个作用力都有一个大小相等、方向相反的反作用力。这意味着当一个物体对另一个物体施加力时，第二个物体会对第一个物体施加相等但方向相反的力。例如，当你推墙时，墙也在用相同大小的力推你。这个定律适用于所有的力的相互作用，无论物体是否在运动（图3.5）。理解这个概念对于分析各种物理现象至关重要。
                    </p>
                    {/* Interactive question icon */}
                    <button
                      onClick={() => handleQuestionClick('q1')}
                      className="absolute top-0 right-0 w-8 h-8 bg-[#FF8A65] hover:bg-[#FF7043] rounded-full flex items-center justify-center transition-colors shadow-sm"
                      title="点击进行相关测验"
                    >
                      <span className="text-black text-sm font-bold">?</span>
                    </button>
                  </div>
                </div>

                {/* Images section */}
                <div className="grid grid-cols-2 gap-6 my-8">
                  <div className="space-y-2">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1728520509654-d37de68da7a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxza2F0ZWJvYXJkJTIwcGh5c2ljcyUyMGFjdGlvbiUyMHJlYWN0aW9ufGVufDF8fHx8MTc1ODcyNDQyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="滑板运动展示作用力与反作用力"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <p className="text-sm text-gray-600 text-center">(a)</p>
                  </div>
                  <div className="space-y-2">
                    <ImageWithFallback
                      src="https://cdn.pixabay.com/photo/2012/11/28/10/37/rocket-launch-67649_1280.jpg"
                      alt="火箭发射演示牛顿第三定律"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <p className="text-sm text-gray-600 text-center">(b)</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg relative">
                  <p className="text-sm text-gray-700 pr-12">
                    图3.5 (a) 滑板运动员推地面时，地面会向相反方向推滑板运动员，这是牛顿第三定律的经典示例。(b) 火箭发射时，火箭向下喷射高温气体，气体向上推火箭，展示了作用力与反作用力的原理。这两个例子都清楚地展示了力总是成对出现的特性。
                  </p>
                  {/* Interactive question icon for image explanation */}
                  <button
                    onClick={() => handleQuestionClick('q2')}
                    className="absolute top-4 right-4 w-8 h-8 bg-[#FF8A65] hover:bg-[#FF7043] rounded-full flex items-center justify-center transition-colors shadow-sm"
                    title="点击进行相关测验"
                  >
                    <span className="text-black text-sm font-bold">?</span>
                  </button>
                </div>

                {/* Quiz Interface */}
                {showQuiz && (
                  <div className="mt-8">
                    <Card className="bg-white rounded-2xl shadow-sm border border-gray-200">
                      <CardContent className="p-8">
                        {/* Quiz header */}
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 text-lg">📝</span>
                          </div>
                          <div>
                            <h2 className="text-xl font-medium text-gray-900">Take a quiz to check your understanding</h2>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-8">
                          <div className="flex justify-between items-center mb-2">
                            <Progress value={((currentQuizQuestion + 1) / quizQuestions.length) * 100} className="flex-1 mr-4" />
                            <span className="text-sm text-gray-500">{currentQuizQuestion + 1} / {quizQuestions.length}</span>
                          </div>
                        </div>

                        {/* Question */}
                        <div className="mb-8">
                          <p className="text-lg text-gray-900 mb-6">
                            <strong>Question {currentQuizQuestion + 1}:</strong> {quizQuestions[currentQuizQuestion].question}
                          </p>

                          {/* Answer options */}
                          <div className="space-y-3 mb-6">
                            {quizQuestions[currentQuizQuestion].options.map((option) => {
                              const isCorrect = selectedAnswer === quizQuestions[currentQuizQuestion].correctAnswer;
                              return (
                                <button
                                  key={option.label}
                                  onClick={() => handleAnswerSelect(option.label)}
                                  disabled={showAnswer}
                                  className={`w-full p-4 rounded-lg text-left transition-colors border ${
                                    selectedAnswer === option.label
                                      ? showAnswer
                                        ? isCorrect
                                          ? 'bg-green-50 border-green-200 text-green-800'
                                          : 'bg-red-50 border-red-200 text-red-800'
                                        : 'bg-orange-50 border-orange-200 text-orange-800'
                                      : showAnswer && option.label === quizQuestions[currentQuizQuestion].correctAnswer
                                      ? 'bg-green-50 border-green-200 text-green-800'
                                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  <span className="font-semibold">{option.label})</span> {option.text}
                                  {showAnswer && option.label === quizQuestions[currentQuizQuestion].correctAnswer && (
                                    <CheckCircle className="w-5 h-5 text-green-600 float-right mt-0.5" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Answer feedback */}
                          {showAnswer && (
                            <div className={`p-4 rounded-lg mb-6 ${
                              selectedAnswer === quizQuestions[currentQuizQuestion].correctAnswer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                            }`}>
                              <p className={`font-medium mb-2 ${
                                selectedAnswer === quizQuestions[currentQuizQuestion].correctAnswer ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {selectedAnswer === quizQuestions[currentQuizQuestion].correctAnswer ? '正确！' : '不太对，正确答案是 ' + quizQuestions[currentQuizQuestion].correctAnswer + '。'}
                              </p>
                              {quizQuestions[currentQuizQuestion].explanation && (
                                <p className="text-sm text-gray-700">{quizQuestions[currentQuizQuestion].explanation}</p>
                              )}
                            </div>
                          )}

                          {/* Hint */}
                          {showHint && !showAnswer && (
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-6">
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                  <Lightbulb className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                  <p className="text-orange-800 text-sm mb-2">
                                    <strong>I need a hint</strong>
                                  </p>
                                  <p className="text-orange-700 text-sm">
                                    {getHintForQuestion(currentQuizQuestion)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-3 mb-8">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowHint(!showHint)}
                              className="text-gray-600 border-gray-300"
                            >
                              <Lightbulb className="w-4 h-4 mr-2" />
                              Hint
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAnswer(true)}
                              disabled={showAnswer}
                              className="text-gray-600 border-gray-300"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Show the answer
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSkip}
                              className="text-gray-600 border-gray-300"
                            >
                              <SkipForward className="w-4 h-4 mr-2" />
                              Skip
                            </Button>
                          </div>

                          {/* Submit button */}
                          {!showAnswer && (
                            <div className="mb-6">
                              <Button
                                onClick={handleSubmitQuizAnswer}
                                disabled={!selectedAnswer}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                              >
                                提交答案
                              </Button>
                            </div>
                          )}

                          {/* Navigation buttons */}
                          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                onClick={handlePrevQuestion}
                                disabled={currentQuizQuestion === 0}
                                className="text-gray-600"
                              >
                                上一题
                              </Button>
                              
                              {currentQuizQuestion < quizQuestions.length - 1 ? (
                                <Button
                                  onClick={handleNextQuestion}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  下一题
                                </Button>
                              ) : (
                                <Button
                                  onClick={handleFinishQuiz}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  完成测验
                                </Button>
                              )}
                            </div>

                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                onClick={handleRestartQuiz}
                                className="text-gray-600 border-gray-300"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restart quiz
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex justify-center gap-4">
                  <Button 
                    variant="outline" 
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      // 触发AI导师对话
                      window.dispatchEvent(new CustomEvent('askTutor', { 
                        detail: { 
                          question: '我想了解更多关于牛顿第三定律的内容',
                          context: '用户正在阅读沉浸式文本'
                        }
                      }));
                    }}
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    向导师提问
                  </Button>
                  
                  <Button 
                    onClick={handleStartQuiz}
                    className="bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200"
                    variant="outline"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    开始测验巩固
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Modal */}
      {showQuestion && currentQuestion && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-end pr-6 z-50">
          <Card className="bg-white rounded-2xl w-full max-w-md relative shadow-2xl">
            <CardContent className="p-6">
              {/* Close button */}
              <Button
                variant="ghost"
                onClick={handleCloseQuestion}
                className="absolute top-3 right-3 w-6 h-6 p-0 hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Question header with icon */}
              <div className="flex items-start space-x-3 mb-6 pr-6">
                <div className="w-6 h-6 bg-[#FF8A65] rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                  <span className="text-black text-sm font-bold">?</span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 leading-relaxed text-sm">
                    {currentQuestion.question}
                  </p>
                </div>
              </div>

              {/* Answer options */}
              <div className="space-y-2 mb-6">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => handleOptionSelect(option.label)}
                    className={`w-full p-3 rounded-lg text-left text-sm transition-colors ${
                      selectedOption === option.label
                        ? 'bg-[#FF8A65] text-black'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="font-semibold">{option.label}.</span> {option.text}
                  </button>
                ))}
              </div>

              {/* Submit button */}
              <div className="space-y-3">
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOption}
                  className="w-full bg-[#FF8A65] hover:bg-[#FF7043] text-black disabled:opacity-50 h-10 text-sm font-medium"
                >
                  提交答案
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 文本选择助手 */}
      {onAskTutor && (
        <TextSelectionHelper 
          onAskTutor={onAskTutor}
          containerRef={contentRef}
        />
      )}
    </div>
  );
}
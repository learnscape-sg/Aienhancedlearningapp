import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { LearningHeader } from '../LearningHeader';
import { Lightbulb, Eye, SkipForward, RotateCcw, CheckCircle } from 'lucide-react';

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

interface QuizInterfacePageProps {
  pdfData: {
    fileName: string;
    grade: string;
    interests: string[];
  };
  onBack: () => void;
  onSwitchMode?: (mode: string) => void;
  onComplete?: () => void;
}

export function QuizInterfacePage({ pdfData, onBack, onSwitchMode, onComplete }: QuizInterfacePageProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});

  // Sample quiz questions related to Newton's Third Law
  const questions: QuizQuestion[] = [
    {
      id: 'q1',
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
      id: 'q2',
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
      id: 'q3',
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
      id: 'q4',
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

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion]: answer
    }));
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer) {
      setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
      setShowAnswer(true);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(userAnswers[currentQuestion + 1] || '');
      setShowAnswer(false);
      setShowHint(false);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(userAnswers[currentQuestion - 1] || '');
      setShowAnswer(answeredQuestions.has(currentQuestion - 1));
      setShowHint(false);
    }
  };

  const handleSkip = () => {
    handleNextQuestion();
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer('');
    setShowAnswer(false);
    setShowHint(false);
    setAnsweredQuestions(new Set());
    setUserAnswers({});
  };

  const handleFinish = () => {
    if (onComplete) {
      onComplete();
    } else {
      onBack();
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentQ = questions[currentQuestion];
  const isCorrect = selectedAnswer === currentQ.correctAnswer;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <LearningHeader 
        pdfData={pdfData}
        currentMode="quiz"
        onModeSelect={onSwitchMode}
        onOpenPDF={() => {}}
        onBack={onBack}
      />

      {/* Main content container */}
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Left sidebar - Table of contents */}
          <div className="lg:col-span-1">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={true}
                  readOnly
                  className="w-4 h-4 text-blue-600" 
                />
                <span className="text-sm text-gray-700">牛顿第三定律：基础概念</span>
              </div>
              
              <div className="flex items-center space-x-2 mt-4">
                <input 
                  type="checkbox" 
                  checked={false}
                  readOnly
                  className="w-4 h-4" 
                />
                <span className="text-sm text-gray-500">实际应用和例子</span>
              </div>
              
              <div className="flex items-center space-x-2 mt-4">
                <input 
                  type="checkbox" 
                  checked={false}
                  readOnly
                  className="w-4 h-4" 
                />
                <span className="text-sm text-gray-500">力的相互作用分析</span>
              </div>
              
              <div className="flex items-center space-x-2 mt-4">
                <input 
                  type="checkbox" 
                  checked={false}
                  readOnly
                  className="w-4 h-4" 
                />
                <span className="text-sm text-gray-500">牛顿定律的综合应用</span>
              </div>

              {/* Quiz progress indicator */}
              <div className="mt-8 pt-4 border-t border-gray-200">
                <div className="bg-orange-100 text-orange-700 px-3 py-2 rounded-lg text-xs">
                  <div className="flex items-center justify-between">
                    <span>测验进行中</span>
                    <span>{currentQuestion + 1}/{questions.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main quiz area */}
          <div className="lg:col-span-3">
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
                    <Progress value={progress} className="flex-1 mr-4" />
                    <span className="text-sm text-gray-500">{currentQuestion + 1} / {questions.length}</span>
                  </div>
                </div>

                {/* Question */}
                <div className="mb-8">
                  <p className="text-lg text-gray-900 mb-6">
                    <strong>Question {currentQuestion + 1}:</strong> {currentQ.question}
                  </p>

                  {/* Answer options */}
                  <div className="space-y-3 mb-6">
                    {currentQ.options.map((option) => (
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
                            : showAnswer && option.label === currentQ.correctAnswer
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="font-semibold">{option.label})</span> {option.text}
                        {showAnswer && option.label === currentQ.correctAnswer && (
                          <CheckCircle className="w-5 h-5 text-green-600 float-right mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Answer feedback */}
                  {showAnswer && (
                    <div className={`p-4 rounded-lg mb-6 ${
                      isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className={`font-medium mb-2 ${
                        isCorrect ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {isCorrect ? '正确！' : '不太对，正确答案是 ' + currentQ.correctAnswer + '。'}
                      </p>
                      {currentQ.explanation && (
                        <p className="text-sm text-gray-700">{currentQ.explanation}</p>
                      )}
                    </div>
                  )}

                  {/* Hint */}
                  {showHint && !showAnswer && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                      <p className="text-blue-800 text-sm">
                        <strong>提示：</strong> 回顾文本中关于牛顿第三定律的基本定义和特征。
                      </p>
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
                        onClick={handleSubmitAnswer}
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
                        disabled={currentQuestion === 0}
                        className="text-gray-600"
                      >
                        上一题
                      </Button>
                      
                      {currentQuestion < questions.length - 1 ? (
                        <Button
                          onClick={handleNextQuestion}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          下一题
                        </Button>
                      ) : (
                        <Button
                          onClick={handleFinish}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          完成测验
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleRestart}
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
        </div>
      </div>
    </div>
  );
}
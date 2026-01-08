import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { useProgressTracker } from './ProgressTracker';
import { 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw,
  Trophy,
  TrendingUp,
  Target
} from 'lucide-react';

interface QuizPageProps {
  chapterId?: string;
  onBack: () => void;
  onComplete: () => void;
}

// Mock quiz data
const quizData = {
  title: '分数加减法测验',
  description: '测试您对分数运算的掌握程度',
  questions: [
    {
      id: 1,
      question: '计算：2/5 + 1/5 = ?',
      options: ['2/5', '3/5', '3/10', '1/5'],
      correct: 1,
      explanation: '同分母分数相加，分子相加分母不变：2 + 1 = 3，所以答案是 3/5。'
    },
    {
      id: 2,
      question: '小明练习篮球，上午练了 1/4 小时，下午练了 1/4 小时，总共练了多长时间？',
      options: ['1/2 小时', '1/4 小时', '2/4 小时', '1/8 小时'],
      correct: 0,
      explanation: '1/4 + 1/4 = 2/4 = 1/2 小时。注意可以化简分数。'
    },
    {
      id: 3,
      question: '计算：4/7 - 2/7 = ?',
      options: ['2/7', '6/7', '2/14', '4/7'],
      correct: 0,
      explanation: '同分母分数相减，分子相减分母不变：4 - 2 = 2，所以答案是 2/7。'
    },
    {
      id: 4,
      question: '在一次音乐会中，小提琴演奏占了 3/8，钢琴演奏占了 2/8，这两种乐器演奏总共占了多少？',
      options: ['5/8', '5/16', '1/8', '6/8'],
      correct: 0,
      explanation: '3/8 + 2/8 = 5/8，两种乐器演奏总共占了 5/8。'
    },
    {
      id: 5,
      question: '一幅画的 5/9 已经完成，又完成了 2/9，现在总共完成了多少？',
      options: ['7/9', '3/9', '7/18', '5/9'],
      correct: 0,
      explanation: '5/9 + 2/9 = 7/9，现在总共完成了 7/9。'
    }
  ]
};

export function QuizPage({ chapterId = '1', onBack, onComplete }: QuizPageProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: number}>({});
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState<{[key: number]: boolean}>({});
  const [startTime] = useState(Date.now());
  const { saveQuizResult } = useProgressTracker();

  const handleAnswer = (questionId: number, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    setShowExplanation(prev => ({ ...prev, [questionId]: true }));
  };

  const nextQuestion = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const finishQuiz = async () => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const score = calculateScore();
    
    // Save quiz result to backend
    try {
      await saveQuizResult(chapterId, score.percentage, answers, timeSpent);
    } catch (error) {
      console.error('Error saving quiz result:', error);
    }
    
    setShowResults(true);
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setShowExplanation({});
  };

  const calculateScore = () => {
    let correct = 0;
    quizData.questions.forEach(question => {
      if (answers[question.id] === question.correct) {
        correct++;
      }
    });
    return {
      correct,
      total: quizData.questions.length,
      percentage: Math.round((correct / quizData.questions.length) * 100)
    };
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return '#22C55E';
    if (percentage >= 60) return '#FACC15';
    return '#EF4444';
  };

  const getScoreMessage = (percentage: number) => {
    if (percentage >= 90) return { title: '优秀！', message: '您掌握得非常好！', emoji: '🏆' };
    if (percentage >= 80) return { title: '良好！', message: '继续保持，再接再厉！', emoji: '👍' };
    if (percentage >= 60) return { title: '及格！', message: '还有提升空间，加油！', emoji: '💪' };
    return { title: '需要努力', message: '建议复习后再次尝试', emoji: '📚' };
  };

  if (showResults) {
    const score = calculateScore();
    const scoreMessage = getScoreMessage(score.percentage);
    const scoreColor = getScoreColor(score.percentage);

    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Results Header */}
          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">{scoreMessage.emoji}</div>
              <h1 className="text-3xl mb-2" style={{ color: scoreColor }}>
                {scoreMessage.title}
              </h1>
              <p className="text-gray-600 mb-6">{scoreMessage.message}</p>
              
              {/* Score Display */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="text-4xl mb-2" style={{ color: scoreColor }}>
                  {score.percentage}%
                </div>
                <p className="text-lg text-gray-600">
                  {score.correct} / {score.total} 题正确
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={resetQuiz}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重新测验</span>
                </Button>
                <Button
                  onClick={onComplete}
                  className="bg-[#4F46E5] hover:bg-[#4338CA] flex items-center space-x-2"
                >
                  <Trophy className="w-4 h-4" />
                  <span>完成学习</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Review Questions */}
          <Card>
            <CardHeader>
              <CardTitle>答题回顾</CardTitle>
              <CardDescription>查看您的答题情况和解析</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {quizData.questions.map((question, index) => {
                const userAnswer = answers[question.id];
                const isCorrect = userAnswer === question.correct;
                
                return (
                  <div key={question.id} className="border-l-4 pl-4" style={{ 
                    borderLeftColor: isCorrect ? '#22C55E' : '#EF4444' 
                  }}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">问题 {index + 1}</h3>
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-[#22C55E]" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <p className="mb-3">{question.question}</p>
                    <div className="space-y-1 mb-3">
                      {question.options.map((option, optionIndex) => (
                        <div 
                          key={optionIndex}
                          className={`text-sm p-2 rounded ${
                            optionIndex === question.correct
                              ? 'bg-[#22C55E]/10 text-[#22C55E]'
                              : optionIndex === userAnswer && !isCorrect
                                ? 'bg-red-50 text-red-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {String.fromCharCode(65 + optionIndex)}. {option}
                          {optionIndex === question.correct && ' ✓'}
                          {optionIndex === userAnswer && !isCorrect && ' ✗'}
                        </div>
                      ))}
                    </div>
                    <div className="bg-blue-50 p-3 rounded text-sm text-gray-700">
                      <strong>解析：</strong>{question.explanation}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const question = quizData.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-medium">{quizData.title}</h1>
            <p className="text-sm text-gray-600">{quizData.description}</p>
          </div>
          <div className="w-20"></div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>问题 {currentQuestion + 1} / {quizData.questions.length}</span>
            <span>已答 {answeredCount} 题</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#4F46E5] text-white rounded-full flex items-center justify-center text-sm">
                {currentQuestion + 1}
              </div>
              <span>第 {currentQuestion + 1} 题</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-6">{question.question}</p>
            
            <div className="space-y-3">
              {question.options.map((option, index) => {
                const isSelected = answers[question.id] === index;
                const isCorrect = index === question.correct;
                const showFeedback = showExplanation[question.id];
                
                return (
                  <Button
                    key={index}
                    variant={isSelected ? "default" : "outline"}
                    className={`w-full justify-start text-left h-auto py-4 px-4 ${
                      showFeedback && isSelected
                        ? isCorrect 
                          ? 'bg-[#22C55E] hover:bg-[#22C55E] text-white' 
                          : 'bg-red-500 hover:bg-red-500 text-white'
                        : isSelected
                          ? 'bg-[#4F46E5] hover:bg-[#4F46E5]'
                          : ''
                    }`}
                    onClick={() => handleAnswer(question.id, index)}
                    disabled={showExplanation[question.id]}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showFeedback && isSelected && (
                        <div>
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

            {/* Explanation */}
            {showExplanation[question.id] && (
              <div className={`mt-6 p-4 rounded-lg ${
                answers[question.id] === question.correct
                  ? 'bg-[#22C55E]/10 border border-[#22C55E]/30'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <h4 className="font-medium mb-2">解析</h4>
                <p className="text-sm">{question.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevQuestion}
            disabled={currentQuestion === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            上一题
          </Button>

          {currentQuestion === quizData.questions.length - 1 ? (
            <Button
              onClick={() => finishQuiz()}
              disabled={answeredCount < quizData.questions.length}
              className="bg-[#22C55E] hover:bg-[#16A34A]"
            >
              完成测验
              <Trophy className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={nextQuestion}
              disabled={currentQuestion === quizData.questions.length - 1}
            >
              下一题
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
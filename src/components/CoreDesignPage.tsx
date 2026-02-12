import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ArrowLeft, FileText, Plus, Target } from 'lucide-react';
import { Badge } from './ui/badge';

interface CoreDesignPageProps {
  courseData?: any;
  onBack?: () => void;
  onComplete?: (designData: any) => void;
}

export function CoreDesignPage({ courseData, onBack, onComplete }: CoreDesignPageProps) {
  const [logicChain, setLogicChain] = useState('从重点主体(德制)对高效达到3学生到要学 -> 经所困力对物体运动的响应实践 -> 运用牛顿第一定律进行生活现象 -> 小组对辩论一定律 -> 评估继续对物体运动当性"咕嘟" -> 回归生活辩弹理赋当实验、应用问题。');
  const [bigConcept, setBigConcept] = useState('物体的运动状态改变与力量关系与惯性的相互作用：力是改变物体运动状态的原因，而惯性是物体保持原有运动状态或处于静止状态的本性。');
  const [essentialQuestions, setEssentialQuestions] = useState<string[]>([
    '如果一个运动的物体不再受到任何力作用，它会发生什么变化？',
    '为什么亚里士多德多看而力是维持运动原因的观点需要上否定科学上被否?',
    '惯性是力吗？为什么公路铁路需限速?'
  ]);
  const [learningGoals, setLearningGoals] = useState([
    { level: 'RETRIEVAL', description: '我能准确表述牛顿第一定律的内容，并能说出惯性的定义。' },
    { level: 'COMPREHENSION', description: '我能通过对比析师惯性的的关系，解释如何实验实例论证惯体理想运动规律。' },
    { level: 'ANALYSIS', description: '我能对比分析"力与惯性"的区别，辩倒生活中关于惯性的错误理论（如"受惯性力作用"）。' },
    { level: 'UTILIZATION', description: '我能运用牛顿第一定律来预测日常现象知识，解释安全驾驶全员坐在哪前需要系固面的道理。' }
  ]);

  const [newQuestion, setNewQuestion] = useState('');
  const [selectedModule, setSelectedModule] = useState('Module C');

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setEssentialQuestions([...essentialQuestions, newQuestion]);
      setNewQuestion('');
    }
  };

  const addGoal = () => {
    setLearningGoals([...learningGoals, { level: 'RETRIEVAL', description: '' }]);
  };

  const updateGoal = (index: number, field: 'level' | 'description', value: string) => {
    const updated = [...learningGoals];
    updated[index][field] = value;
    setLearningGoals(updated);
  };

  const handleComplete = () => {
    const designData = {
      logicChain,
      bigConcept,
      essentialQuestions,
      learningGoals
    };
    
    if (onComplete) {
      onComplete(designData);
    } else {
      alert('核心设计已完成！');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">课程设计</h1>
          <p className="text-muted-foreground mt-2">核心设计阶段</p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-40 h-1 bg-primary rounded-full"></div>
            <div className="w-3 h-3 bg-primary rounded-full -ml-1.5"></div>
          </div>
          <div className="flex items-center">
            <div className="w-40 h-1 bg-primary rounded-full"></div>
            <div className="w-3 h-3 bg-primary rounded-full -ml-1.5"></div>
          </div>
          <div className="flex items-center">
            <div className="w-40 h-1 bg-muted rounded-full"></div>
            <div className="w-3 h-3 bg-muted rounded-full -ml-1.5"></div>
          </div>
          <div className="flex items-center">
            <div className="w-40 h-1 bg-muted rounded-full"></div>
            <div className="w-3 h-3 bg-muted rounded-full -ml-1.5"></div>
          </div>
        </div>
      </div>

      {/* Core Design Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">2. 核心设计 <span className="text-sm text-muted-foreground">(可编辑)</span></CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">重新生成</Button>
              <Badge variant="secondary" className="bg-accent/10 text-accent-foreground border-accent/30">
                {selectedModule}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logic Chain */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-primary">设计逻辑链 (Logic Chain)</h3>
            <Textarea
              value={logicChain}
              onChange={(e) => setLogicChain(e.target.value)}
              className="min-h-[80px] bg-accent/5 border-accent/20"
              placeholder="输入设计逻辑链..."
            />
          </div>

          {/* Big Concept */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-primary">大概念 (BIG CONCEPT)</h3>
            <Textarea
              value={bigConcept}
              onChange={(e) => setBigConcept(e.target.value)}
              className="min-h-[80px] bg-primary/5 border-primary/20"
              placeholder="输入大概念..."
            />
          </div>

          {/* Essential Questions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">基本问题 (ESSENTIAL QUESTIONS)</h3>
            {essentialQuestions.map((question, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-sm text-muted-foreground mt-2">{index + 1}.</span>
                <Input
                  value={question}
                  onChange={(e) => {
                    const updated = [...essentialQuestions];
                    updated[index] = e.target.value;
                    setEssentialQuestions(updated);
                  }}
                  className="flex-1"
                />
              </div>
            ))}
            <div className="flex items-center space-x-2">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="添加新问题..."
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addQuestion();
                  }
                }}
              />
              <Button onClick={addQuestion} variant="ghost" size="sm" className="text-primary">
                <Plus className="w-4 h-4 mr-1" />
                添加问题
              </Button>
            </div>
          </div>

          {/* Learning Goals (MARZANO) */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">学习目标 (MARZANO分类)</h3>
            {learningGoals.map((goal, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
                <select
                  value={goal.level}
                  onChange={(e) => updateGoal(index, 'level', e.target.value)}
                  className="px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-ring focus:border-ring bg-input-background"
                >
                  <option value="RETRIEVAL">RETRIEVAL</option>
                  <option value="COMPREHENSION">COMPREHENSION</option>
                  <option value="ANALYSIS">ANALYSIS</option>
                  <option value="UTILIZATION">UTILIZATION</option>
                </select>
                <Textarea
                  value={goal.description}
                  onChange={(e) => updateGoal(index, 'description', e.target.value)}
                  className="flex-1 min-h-[60px]"
                  placeholder="描述学习目标..."
                />
              </div>
            ))}
            <Button onClick={addGoal} variant="ghost" size="sm" className="text-primary">
              <Plus className="w-4 h-4 mr-1" />
              添加目标
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button onClick={onBack} variant="outline" size="lg">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <Button onClick={handleComplete} size="lg">
          <FileText className="w-4 h-4 mr-2" />
          确认设计 & 生成教学文档
        </Button>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, FileText, Download, Edit3 } from 'lucide-react';
import { Badge } from './ui/badge';

interface TeachingDocumentPageProps {
  courseData?: any;
  designData?: any;
  onBack?: () => void;
  onNext?: () => void;
}

export function TeachingDocumentPage({ courseData, designData, onBack, onNext }: TeachingDocumentPageProps) {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');

  return (
    <div className="min-h-screen bg-muted">
      {/* Header with Title */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-2xl font-bold text-center text-foreground">自学任务教师控制台 (v0.5)</h1>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="w-40 h-1 bg-primary rounded-full"></div>
              <div className="w-40 h-1 bg-primary rounded-full"></div>
              <div className="w-40 h-1 bg-primary rounded-full"></div>
              <div className="w-40 h-1 bg-muted rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">3. 教学文档 <span className="text-sm text-muted-foreground">(可编辑)</span></CardTitle>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm">
                  <Edit3 className="w-4 h-4 mr-2" />
                  编辑模式
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  生成并导出 PDF
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  完整 PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tab Headers */}
            <div className="flex space-x-4 border-b mb-6">
              <button
                onClick={() => setActiveTab('student')}
                className={`pb-3 px-4 font-medium transition-colors ${
                  activeTab === 'student'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                学生自学任务书
              </button>
              <button
                onClick={() => setActiveTab('teacher')}
                className={`pb-3 px-4 font-medium transition-colors ${
                  activeTab === 'teacher'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                教师教学指南
              </button>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Student Document */}
              <div className="bg-muted rounded-lg p-6 max-h-[600px] overflow-y-auto">
                <h2 className="text-xl font-bold text-center mb-6 text-foreground">《牛顿第一定律》学生自主学习任务单</h2>
                
                {/* 学习指南 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">学习指南</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><span className="text-primary font-medium">• 课前准备：</span>物理教材、笔记本、同样桌、准备一个可以在桌面滚动的物体（如小球或橡皮）。</p>
                    <p><span className="text-primary font-medium">• 学习流程：</span>情境导入 → 知识精研 → 实验探究与科学推理 → 迁移应用 → 自我总结。</p>
                    <p><span className="text-primary font-medium">• 学习资源：</span>教材相关章节、微课/科教面支撑演示视频 (可选) 。</p>
                  </div>
                </div>

                {/* 学习目标 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">学习目标</h3>
                  <p className="text-sm text-muted-foreground mb-3">请在学习开始前阅读来后，对照下完成自我评估：</p>
                  <div className="bg-background p-4 rounded border border-border space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-2 font-medium border-b pb-2">
                      <div>学习目标</div>
                      <div className="text-center">掌握程度 (1~5星)</div>
                      <div>证据/笔记记录</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b">
                      <div><span className="font-medium">LG1:</span> 我能准确表述牛顿第一定律的内容，并说出惯性的定义。</div>
                      <div className="text-center">☆☆☆☆☆</div>
                      <div></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b">
                      <div><span className="font-medium text-primary">LG2:</span> 我能通过对比分析力与惯性的关系验，解释科学推理的过程。</div>
                      <div className="text-center">☆☆☆☆☆</div>
                      <div></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2">
                      <div><span className="font-medium text-primary">LG3:</span> 我能辨析"力"与"惯性"的区别，纠正"惯性力"等错误概念。</div>
                      <div className="text-center">☆☆☆☆☆</div>
                      <div></div>
                    </div>
                  </div>
                </div>

                {/* 任务环节 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">任务环节</h3>
                  <div className="space-y-4">
                    <div className="bg-background p-4 rounded border border-border">
                      <h4 className="font-medium text-primary mb-2">📍 任务一：课前诊断与情境唤醒</h4>
                      <p className="text-sm text-muted-foreground">
                        思考：当你的校车在行驶，车体突然停车，你自己的身体会发生什么？为什么会"前冲"或"后仰"？请描述生活实验。
                      </p>
                    </div>
                    <div className="bg-background p-4 rounded border border-border">
                      <h4 className="font-medium text-primary mb-2">📍 任务二：知识精研</h4>
                      <p className="text-sm text-muted-foreground">
                        阅读教材，把握重点：一定要理解惯性的定义...
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Teacher Guide */}
              <div className="bg-muted rounded-lg p-6 max-h-[600px] overflow-y-auto">
                <h2 className="text-xl font-bold text-center mb-6 text-foreground">《牛顿第一定律》教学设计导引（教师版）</h2>
                
                {/* 一、设计概览 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">一、设计概览</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><span className="text-primary font-medium">• 建议时长：</span>1 课时 (45~50分钟)</p>
                    <p><span className="text-primary font-medium">• 任务类型：</span>探究性学习、科学推理任务。</p>
                    <p><span className="text-primary font-medium">• 核心逻辑：</span>认知冲突 → 实验探究 → 理想推论 → 归纳应用。</p>
                  </div>
                </div>

                {/* 二、核心素养与大概念分析 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">二、核心素养与大概念分析</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><span className="font-medium">• 大概念：</span>物体的运动状态改变与力/惯性与惯性的相互作用。</p>
                    <p><span className="font-medium">• 设计思路：</span></p>
                    <p className="pl-4"><span className="font-medium">• 物理观念：</span>通过对比亚里士多德与伽利略的观点，打破"力是维持运动原因"的顽固前概念。</p>
                    <p className="pl-4"><span className="font-medium">• 科学思维：</span>本质的联系而非手实验事实+科学推理"的思维方法，这是学生整一次正式接触"理想实验"需要点化其科学价值。</p>
                    <p className="pl-4"><span className="font-medium">• 核心素养：</span>通过科学实的落实，培养学生不迷信权威、尊重事实的科学态度。</p>
                  </div>
                </div>

                {/* 三、任务设计逻辑 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">三、任务设计逻辑</h3>
                  <div className="bg-background p-4 rounded border border-border text-sm text-muted-foreground">
                    <p className="mb-2"><span className="font-medium">从课前诊断引导</span> → 对比历史观点冲突(亚里士多德 vs 伽利略) → 学生实验探究验证惯性 → 理想实验推理 → 应用与概念辨析 → 自我反思总结</p>
                  </div>
                </div>

                {/* 四、关键教学提示 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-foreground">四、关键教学提示</h3>
                  <div className="space-y-2 text-sm">
                    <div className="bg-accent/10 border-l-4 border-accent p-3 rounded">
                      <p className="font-medium text-foreground">⚠️ 易错点一：惯性 ≠ 力</p>
                      <p className="text-muted-foreground mt-1">很多学生会说"受惯性作用"或"惯性力"，需教师明确纠正：惯性是物体保持运动状态的性质，不是力。</p>
                    </div>
                    <div className="bg-primary/10 border-l-4 border-primary p-3 rounded">
                      <p className="font-medium text-foreground">💡 教学建议</p>
                      <p className="text-muted-foreground mt-1">引导学生用"理想实验"思维：如果摩擦力越来越小...物体会怎样？</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button onClick={onBack} variant="outline" size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Button onClick={onNext} size="lg" className="px-8">
            <FileText className="w-4 h-4 mr-2" />
            确认文档 & 构建运行任务
          </Button>
        </div>
      </div>
    </div>
  );
}
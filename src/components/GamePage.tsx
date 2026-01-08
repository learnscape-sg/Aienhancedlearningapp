import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Microscope,
  HelpCircle
} from 'lucide-react';
import { LearningHeader } from './LearningHeader';

interface GamePageProps {
  pdfData: {
    fileName: string;
    grade: string;
    interests: string[];
  };
  onBack: () => void;
  onSwitchMode: (mode: string) => void;
  onAskTutor?: (selectedText: string, context: string) => void;
}

export function GamePage({ pdfData, onBack, onSwitchMode, onAskTutor }: GamePageProps) {



  const handleOpenPDF = () => {
    console.log('Opening PDF:', pdfData.fileName);
    alert(`打开PDF文件: ${pdfData.fileName}`);
  };

  const SimulatorExperience = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-medium text-gray-900 mb-3">PhET重力实验室</h2>
        <p className="text-lg text-gray-600">通过互动模拟实验探索牛顿第三定律中的作用力与反作用力</p>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-3 text-xl">
            <Microscope className="w-6 h-6 text-blue-600" />
            <span>重力和力的相互作用模拟器</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">实验指导：</h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• 拖动两个物体，观察它们之间的引力</li>
                <li>• 改变物体的质量，看看力的大小如何变化</li>
                <li>• 调整物体间的距离，观察力的变化</li>
                <li>• 注意两个物体之间的力总是大小相等、方向相反</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">思考问题：</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p>1. 当你增加其中一个物体的质量时，两个物体之间的引力如何变化？</p>
                <p>2. 两个物体施加给对方的力是否总是相等的？这体现了牛顿第三定律的哪个方面？</p>
                <p>3. 如果将距离增加一倍，引力会如何变化？</p>
              </div>
            </div>
          </div>
          
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
            <iframe
              src="https://phet.colorado.edu/sims/html/gravity-force-lab-basics/latest/gravity-force-lab-basics_all.html?locale=zh_CN"
              width="100%"
              height="700"
              className="w-full"
              title="PhET重力实验室模拟器"
              allowFullScreen
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <LearningHeader 
        pdfData={pdfData}
        currentMode="game"
        onModeSelect={onSwitchMode}
        onOpenPDF={handleOpenPDF}
        onBack={onBack}
      />

      {/* Main content container */}
      <div className="w-full max-w-7xl mx-auto p-6">
        {/* Content area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-8">
            {/* Content header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-medium text-gray-900">
                互动体验学习
              </h1>
              <Button variant="ghost" size="sm" className="text-gray-400">
                →
              </Button>
            </div>

            {/* Main content area - full width and centered */}
            <div className="max-w-6xl mx-auto">
              <SimulatorExperience />
            </div>

            {/* Ask Tutor Button */}
            {onAskTutor && (
              <div className="mt-6 text-center">
                <Button 
                  variant="outline" 
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => onAskTutor('互动游戏学习', '牛顿第三定律模拟器体验')}
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  向导师提问
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      

    </div>
  );
}
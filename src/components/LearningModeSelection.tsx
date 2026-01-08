import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { LearningHeader } from './LearningHeader';

interface LearningModeSelectionProps {
  pdfData: {
    fileName: string;
    grade: string;
    interests: string[];
  };
  onSelectMode: (mode: string) => void;
  onBack: () => void;
}

export function LearningModeSelection({ pdfData, onSelectMode, onBack }: LearningModeSelectionProps) {
  const learningModes = [
    {
      id: 'immersive-text',
      name: '沉浸式文本',
      icon: (
        <div className="w-16 h-16 flex items-center justify-center relative">
          <div className="w-12 h-9 bg-[#FF8A65] rounded-lg flex items-center justify-center">
            <div className="w-7 h-5 bg-white rounded-sm flex flex-col justify-center space-y-0.5 px-1">
              <div className="h-0.5 bg-gray-400 rounded"></div>
              <div className="h-0.5 bg-gray-400 rounded"></div>
              <div className="h-0.5 bg-gray-400 rounded"></div>
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FF8A65] rounded-full flex items-center justify-center text-white text-xs font-bold">
            ?
          </div>
        </div>
      ),
      borderColor: 'border-[#FF8A65]',
      bgColor: 'bg-orange-50'
    },
    {
      id: 'slides-narration',
      name: '幻灯片和旁白',
      icon: (
        <div className="w-16 h-16 flex items-center justify-center">
          <div className="w-12 h-9 bg-[#9C27B0] rounded-lg flex items-center justify-center">
            <div className="w-0 h-0 border-l-[6px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-1"></div>
          </div>
        </div>
      ),
      borderColor: 'border-[#9C27B0]',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'audio-lesson',
      name: '音频课程',
      icon: (
        <div className="w-16 h-16 flex items-center justify-center">
          <div className="w-12 h-9 bg-[#4CAF50] rounded-lg flex items-center justify-center">
            <div className="flex items-end space-x-0.5">
              <div className="w-1 h-2 bg-white rounded-full"></div>
              <div className="w-1 h-4 bg-white rounded-full"></div>
              <div className="w-1 h-3 bg-white rounded-full"></div>
              <div className="w-1 h-5 bg-white rounded-full"></div>
              <div className="w-1 h-2 bg-white rounded-full"></div>
              <div className="w-1 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      ),
      borderColor: 'border-[#4CAF50]',
      bgColor: 'bg-green-50'
    },
    {
      id: 'mindmap',
      name: '思维导图',
      icon: (
        <div className="w-16 h-16 flex items-center justify-center">
          <div className="w-12 h-9 bg-[#2196F3] rounded-lg flex items-center justify-center">
            <div className="relative w-8 h-6">
              {/* Center node */}
              <div className="absolute top-2 left-3 w-2 h-2 bg-white rounded-full"></div>
              {/* Connecting lines */}
              <div className="absolute top-2.5 left-5 w-2 h-0.5 bg-white"></div>
              <div className="absolute top-2.5 left-1 w-2 h-0.5 bg-white"></div>
              <div className="absolute top-4 left-3.5 w-0.5 h-2 bg-white"></div>
              <div className="absolute top-0.5 left-3.5 w-0.5 h-1.5 bg-white"></div>
              {/* Outer nodes */}
              <div className="absolute top-0 left-3 w-1.5 h-1.5 bg-white rounded-full"></div>
              <div className="absolute top-2 left-0 w-1.5 h-1.5 bg-white rounded-full"></div>
              <div className="absolute top-2 left-6 w-1.5 h-1.5 bg-white rounded-full"></div>
              <div className="absolute top-4.5 left-3 w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      ),
      borderColor: 'border-[#2196F3]',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'game',
      name: '互动体验',
      icon: (
        <div className="w-16 h-16 flex items-center justify-center">
          <div className="w-12 h-9 bg-[#E91E63] rounded-lg flex items-center justify-center">
            <div className="relative w-8 h-6">
              {/* Controller body */}
              <div className="absolute top-1 left-1 w-6 h-3 bg-white rounded-lg"></div>
              {/* D-pad */}
              <div className="absolute top-1.5 left-1.5 w-1 h-1 bg-[#E91E63] rounded-sm"></div>
              {/* Buttons */}
              <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-[#E91E63] rounded-full"></div>
              <div className="absolute top-2.5 right-1.5 w-1 h-1 bg-[#E91E63] rounded-full"></div>
            </div>
          </div>
        </div>
      ),
      borderColor: 'border-[#E91E63]',
      bgColor: 'bg-pink-50'
    },
    {
      id: 'video',
      name: '视频动画',
      icon: (
        <div className="w-16 h-16 flex items-center justify-center">
          <div className="w-12 h-9 bg-[#3F51B5] rounded-lg flex items-center justify-center">
            <div className="relative w-8 h-6">
              {/* Video screen */}
              <div className="absolute top-0.5 left-1 w-5 h-4 bg-white rounded-sm"></div>
              {/* Play button */}
              <div className="absolute top-2 left-3 w-0 h-0 border-l-[6px] border-l-[#3F51B5] border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent"></div>
            </div>
          </div>
        </div>
      ),
      borderColor: 'border-[#3F51B5]',
      bgColor: 'bg-indigo-50'
    }
  ];

  const handleOpenPDF = () => {
    // 这里可以实现打开PDF的逻辑
    console.log('Opening PDF:', pdfData.fileName);
    // 可以打开新窗口或者显示PDF查看器
    alert(`打开PDF文件: ${pdfData.fileName}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <LearningHeader 
        pdfData={pdfData}
        onModeSelect={onSelectMode}
        onOpenPDF={handleOpenPDF}
        onBack={onBack}
      />
      
      <div className="flex flex-col items-center justify-center p-12">
        <div className="text-center space-y-12">
          {/* Title */}
          <h1 className="text-4xl text-gray-800 mb-12">选择学习方式</h1>
          
          {/* Learning Mode Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
            {learningModes.map((mode) => (
              <Card
                key={mode.id}
                className={`w-48 h-48 ${mode.bgColor} ${mode.borderColor} border-4 rounded-3xl cursor-pointer hover:scale-105 transition-transform`}
                onClick={() => onSelectMode(mode.id)}
              >
                <CardContent className="p-8 flex flex-col items-center justify-center h-full space-y-4">
                  {mode.icon}
                  <h3 className="text-lg text-gray-700 text-center leading-tight">
                    {mode.name}
                  </h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
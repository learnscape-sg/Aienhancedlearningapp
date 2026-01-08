import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, Volume2, SkipBack, SkipForward, HelpCircle } from 'lucide-react';
import { LearningHeader } from './LearningHeader';


interface AudioLessonPageProps {
  pdfData: {
    fileName: string;
    grade: string;
    interests: string[];
  };
  onBack: () => void;
  onSwitchMode?: (mode: string) => void;
  onAskTutor?: (selectedText: string, context: string) => void;
}

export function AudioLessonPage({ pdfData, onBack, onSwitchMode, onAskTutor }: AudioLessonPageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentSectionCompleted, setCurrentSectionCompleted] = useState(true);
  const [nextSectionCompleted, setNextSectionCompleted] = useState(false);
  
  const totalDuration = 324; // 5:24 in seconds
  const waveformBars = 32;

  // Generate random waveform heights
  const [waveformHeights] = useState(() => 
    Array.from({ length: waveformBars }, () => Math.random() * 80 + 20)
  );

  // Auto-update current time when playing
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeSeek = (value: number[]) => {
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBarHeight = (index: number) => {
    const progress = currentTime / totalDuration;
    const currentBar = Math.floor(progress * waveformBars);
    
    if (isPlaying && index <= currentBar) {
      return waveformHeights[index] + Math.sin(Date.now() / 100 + index) * 10;
    }
    return waveformHeights[index];
  };

  const getBarOpacity = (index: number) => {
    const progress = currentTime / totalDuration;
    const currentBar = Math.floor(progress * waveformBars);
    
    if (index <= currentBar) {
      return 1;
    }
    return 0.3;
  };

  const handleOpenPDF = () => {
    console.log('Opening PDF:', pdfData.fileName);
    alert(`打开PDF文件: ${pdfData.fileName}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <LearningHeader 
        pdfData={pdfData}
        currentMode="audio-lesson"
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
                    <span className="text-sm text-gray-700">音频课程</span>
                  </div>
                  <div className="ml-6 space-y-2">
                    <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                      当前播放内容
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(currentTime)} / {formatTime(totalDuration)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-4">
                    <input 
                      type="checkbox" 
                      checked={nextSectionCompleted}
                      onChange={(e) => setNextSectionCompleted(e.target.checked)}
                      className="w-4 h-4" 
                    />
                    <span className="text-sm text-gray-500">课后练习</span>
                  </div>
                </div>
              </div>

              {/* Main content area */}
              <div className="lg:col-span-3 space-y-6">
                {/* Audio Waveform Visualization */}
                <div className="min-h-[400px] flex flex-col justify-center">
                  <div className="w-full max-w-4xl mx-auto">
                    <div className="flex items-end justify-center space-x-2 h-64 mb-12">
                      {Array.from({ length: waveformBars }, (_, index) => (
                        <div
                          key={index}
                          className="bg-[#4CAF50] rounded-full transition-all duration-100 ease-out"
                          style={{
                            width: '12px',
                            height: `${getBarHeight(index)}px`,
                            opacity: getBarOpacity(index),
                            transform: isPlaying && index <= Math.floor((currentTime / totalDuration) * waveformBars) 
                              ? 'scaleY(1.1)' 
                              : 'scaleY(1)'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Audio Controls */}
                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  {/* Main control row */}
                  <div className="flex items-center space-x-6">
                    {/* Play/Pause button */}
                    <Button
                      onClick={handlePlayPause}
                      className="w-12 h-12 rounded-full bg-[#4CAF50] hover:bg-[#45a049] text-white p-0 flex items-center justify-center"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </Button>

                    {/* Timeline with time labels */}
                    <div className="flex-1 flex items-center space-x-4">
                      <span className="text-sm text-gray-500 w-12 text-right">
                        {formatTime(currentTime)}
                      </span>
                      <div className="flex-1">
                        <Slider
                          value={[currentTime]}
                          max={totalDuration}
                          step={1}
                          onValueChange={handleTimeSeek}
                          className="w-full"
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-12">
                        {formatTime(totalDuration)}
                      </span>
                    </div>

                    {/* Volume control */}
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-gray-500" />
                      <div className="w-20">
                        <Slider
                          value={[volume]}
                          max={100}
                          step={1}
                          onValueChange={handleVolumeChange}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Audio lesson title */}
                  <div className="text-center pt-2">
                    <h2 className="text-xl font-medium text-gray-800 mb-2">
                      牛顿第三定律：作用力与反作用力
                    </h2>
                    <p className="text-gray-600">
                      一堂关于力和运动的互动音频课程
                    </p>
                  </div>
                </div>

                {/* Ask Tutor Button */}
                {onAskTutor && (
                  <div className="mt-6 text-center">
                    <Button 
                      variant="outline" 
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => onAskTutor('音频课程学习', '牛顿第三定律音频内容')}
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
      </div>
      

    </div>
  );
}
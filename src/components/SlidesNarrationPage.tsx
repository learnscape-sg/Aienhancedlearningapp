import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, Volume2, SkipBack, SkipForward, HelpCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { LearningHeader } from './LearningHeader';


interface SlidesNarrationPageProps {
  pdfData: {
    fileName: string;
    grade: string;
    interests: string[];
  };
  onBack: () => void;
  onSwitchMode?: (mode: string) => void;
  onAskTutor?: (selectedText: string, context: string) => void;
}

interface Slide {
  id: number;
  title: string;
  content: string[];
  image?: string;
  duration: number; // in seconds
}

export function SlidesNarrationPage({ pdfData, onBack, onSwitchMode, onAskTutor }: SlidesNarrationPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentSectionCompleted, setCurrentSectionCompleted] = useState(true);
  const [nextSectionCompleted, setNextSectionCompleted] = useState(false);

  // Sample slides data
  const slides: Slide[] = [
    {
      id: 1,
      title: "牛顿第三定律是什么？",
      content: [
        "每一个作用力都有一个大小相等、方向相反的反作用力。",
        "当你推一个物体时，它也会用相同的力推你。",
        "这种情况在每次推拉中都会发生。"
      ],
      image: "https://images.unsplash.com/photo-1728520509654-d37de68da7a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxza2F0ZWJvYXJkJTIwYWN0aW9uJTIwcmVhY3Rpb24lMjBwaHlzaWNzfGVufDF8fHx8MTc1ODcwMjE0OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      duration: 180 // 3 minutes
    },
    {
      id: 2,
      title: "日常生活中的例子",
      content: [
        "走路：你向后推地面，地面向前推你。",
        "游泳：你向后推水，水向前推你。",
        "火箭推进：热气向下排出，火箭向上移动。"
      ],
      duration: 200
    },
    {
      id: 3,
      title: "作用力和反作用力",
      content: [
        "作用力和反作用力总是大小相等。",
        "它们的方向相反。",
        "它们作用在不同的物体上。",
        "它们同时发生。"
      ],
      duration: 190
    },
    {
      id: 4,
      title: "理解力的配对",
      content: [
        "力总是成对出现的——你不能只有其中一个。",
        "这些力对被称为作用-反作用对。",
        "这些力大小相等但方向相反。"
      ],
      duration: 170
    }
  ];

  const totalSlides = slides.length;
  const currentSlideData = slides[currentSlide];
  const totalDuration = currentSlideData?.duration || 180;

  // Auto-advance slide when audio completes
  useEffect(() => {
    if (isPlaying && currentTime >= totalDuration) {
      if (currentSlide < totalSlides - 1) {
        setCurrentSlide(prev => prev + 1);
        setCurrentTime(0);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }
  }, [currentTime, totalDuration, currentSlide, totalSlides, isPlaying]);

  // Timer for audio progress
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => prev + 1);
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
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeSeek = (value: number[]) => {
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const handlePreviousSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const handleNextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        currentMode="slides-narration"
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
                    <span className="text-sm text-gray-700">幻灯片演示</span>
                  </div>
                  <div className="ml-6 space-y-2">
                    <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                      当前演示内容
                    </div>
                    <div className="text-xs text-gray-500">
                      幻灯片 {currentSlide + 1} / {totalSlides}
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
                {/* Slide content */}
                <div className="grid lg:grid-cols-5 gap-10 min-h-[450px]">
                  {/* Image area */}
                  <div className="lg:col-span-2 flex items-center justify-center">
                    {currentSlideData?.image && (
                      <div className="relative bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
                        <ImageWithFallback
                          src={currentSlideData.image}
                          alt="物理演示"
                          className="w-full h-72 object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Content area */}
                  <div className="lg:col-span-3 flex flex-col justify-center space-y-6">
                    <h2 className="text-2xl font-medium text-gray-900 mb-6">
                      {currentSlideData?.title}
                    </h2>

                    <div className="space-y-6">
                      {currentSlideData?.content.map((point, index) => (
                        <div key={index} className="flex items-start space-x-4">
                          <div className="w-2 h-2 bg-gray-400 rounded-full mt-3 flex-shrink-0"></div>
                          <p className="text-gray-700 text-lg leading-relaxed">
                            {point}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Audio player controls */}
                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  {/* Main controls row */}
                  <div className="flex items-center space-x-6">
                    {/* Play/Pause button */}
                    <Button
                      onClick={handlePlayPause}
                      className="w-10 h-10 rounded-full bg-[#9C27B0] hover:bg-[#7B1FA2] text-white p-0 flex items-center justify-center"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </Button>

                    {/* Timeline with time labels */}
                    <div className="flex-1 flex items-center space-x-3">
                      <span className="text-sm text-gray-500 w-10 text-right">
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
                      <span className="text-sm text-gray-500 w-10">
                        {formatTime(totalDuration)}
                      </span>
                    </div>

                    {/* Volume control */}
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-gray-500" />
                      <div className="w-16">
                        <Slider
                          value={[volume]}
                          max={100}
                          step={1}
                          onValueChange={handleVolumeChange}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Slide navigation */}
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handlePreviousSlide}
                        disabled={currentSlide === 0}
                        className="p-2"
                      >
                        <SkipBack className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleNextSlide}
                        disabled={currentSlide === totalSlides - 1}
                        className="p-2"
                      >
                        <SkipForward className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Bottom row with slide counter */}
                  <div className="flex items-center justify-center pt-2">
                    <div className="text-sm text-gray-500 text-center">
                      幻灯片 {currentSlide + 1} / {totalSlides}
                    </div>
                  </div>
                </div>

                {/* Ask Tutor Button */}
                {onAskTutor && (
                  <div className="mt-6 text-center">
                    <Button 
                      variant="outline" 
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => onAskTutor('幻灯片学习', '牛顿第三定律幻灯片内容')}
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
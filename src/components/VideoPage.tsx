import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Maximize,
  Settings,
  Video,
  BookOpen,
  Clock,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { LearningHeader } from './LearningHeader';

interface VideoPageProps {
  pdfData: {
    fileName: string;
    grade: string;
    interests: string[];
  };
  onBack: () => void;
  onSwitchMode: (mode: string) => void;
  onAskTutor?: (selectedText: string, context: string) => void;
}

export function VideoPage({ pdfData, onBack, onSwitchMode, onAskTutor }: VideoPageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(300); // 5分钟示例
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentChapter, setCurrentChapter] = useState(0);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const [currentSectionCompleted, setCurrentSectionCompleted] = useState(true);
  const [nextSectionCompleted, setNextSectionCompleted] = useState(false);

  // YouTube 视频ID
  const youtubeVideoId = 'By-ggTfeuJU';
  const youtubeEmbedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&origin=${window.location.origin}`;

  // YouTube视频章节数据
  const videoChapters = [
    {
      id: 0,
      title: "牛顿第三定律介绍",
      startTime: 0,
      duration: 180,
      description: "了解牛顿第三定律的基本概念和重要性",
      completed: true
    },
    {
      id: 1,
      title: "作用力与反作用力",
      startTime: 180,
      duration: 240,
      description: "深入理解作用力和反作用力的相互关系",
      completed: false
    },
    {
      id: 2,
      title: "实际应用案例",
      startTime: 420,
      duration: 200,
      description: "探索牛顿第三定律在日常生活中的应用",
      completed: false
    },
    {
      id: 3,
      title: "总结与思考",
      startTime: 620,
      duration: 120,
      description: "回顾学习要点并进行深入思考",
      completed: false
    }
  ];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
  };

  const jumpToChapter = (chapterIndex: number) => {
    setCurrentChapter(chapterIndex);
    setCurrentTime(videoChapters[chapterIndex].startTime);
  };

  const getCurrentChapter = () => {
    return videoChapters.find(chapter => 
      currentTime >= chapter.startTime && 
      currentTime < chapter.startTime + chapter.duration
    ) || videoChapters[0];
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
        currentMode="video"
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
                    <span className="text-sm text-gray-700">视频动画</span>
                  </div>
                  <div className="ml-6 space-y-2">
                    <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                      YouTube视频播放中
                    </div>
                    <div className="text-xs text-gray-500">
                      牛顿第三定律教学视频
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

                  {/* Chapter List */}
                  <div className="mt-8">
                    <h4 className="font-medium text-sm mb-3 text-gray-700">章节目录</h4>
                    <div className="space-y-2">
                      {videoChapters.map((chapter, index) => (
                        <button
                          key={chapter.id}
                          onClick={() => jumpToChapter(index)}
                          className={`w-full text-left p-2 rounded-lg border transition-all text-xs ${
                            currentChapter === index
                              ? 'bg-blue-50 border-blue-300 text-blue-900'
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-1 mb-1">
                                <span className="font-medium">{chapter.title}</span>
                                {chapter.completed && (
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                )}
                              </div>
                              <div className="flex items-center space-x-1 text-gray-500">
                                <Clock className="w-2 h-2" />
                                <span>{formatTime(chapter.duration)}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main content area */}
              <div className="lg:col-span-3 space-y-6">
                {/* YouTube Video Player */}
                <div className="relative bg-gray-900 rounded-lg aspect-video overflow-hidden">
                  <iframe
                    ref={videoRef}
                    src={youtubeEmbedUrl}
                    title="牛顿第三定律 - 教学视频"
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                {/* Video Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Video className="w-5 h-5 text-indigo-600" />
                        <span className="font-medium text-gray-900">牛顿第三定律教学视频</span>
                      </div>
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                        高质量视频
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`https://youtu.be/${youtubeVideoId}`, '_blank')}
                      >
                        <Maximize className="w-4 h-4 mr-2" />
                        在YouTube中观看
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Video Description */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">视频介绍</h3>
                  <p className="text-gray-600 mb-4">
                    这是一个关于牛顿第三定律的高质量教学视频，结合您上传的PDF《{pdfData.fileName}》中的知识点，通过视觉化的方式帮助您更好地理解作用力与反作用力的概念。
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      物理学
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      牛顿定律
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      教学视频
                    </Badge>
                    {pdfData.interests.map((interest, index) => (
                      <Badge key={index} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>📺 来源：YouTube教育视频</p>
                    <p>🎯 适合年级：{pdfData.grade}</p>
                    <p>⏱️ 建议学习时间：15-20分钟</p>
                  </div>
                </div>

                {/* Ask Tutor Button */}
                {onAskTutor && (
                  <div className="mt-6 text-center">
                    <Button 
                      variant="outline" 
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => onAskTutor('视频动画学习', '牛顿第三定律视频内容')}
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
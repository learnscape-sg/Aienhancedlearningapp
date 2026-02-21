import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { PDFUploadFlow } from './PDFUploadFlow';
import { useAuth } from './AuthContext';
import { 
  Upload, 
  Play, 
  BookOpen, 
  Brain, 
  Microscope, 
  FlaskConical, 
  Computer, 
  PenTool, 
  TrendingUp, 
  Heart, 
  Clock, 
  Lightbulb, 
  Users, 
  Globe,
  Volume2,
  FileText,
  Map,
  BarChart3,
  Gamepad2,
  Video
} from 'lucide-react';

const subjects = [
  { id: 'all', name: '全部', icon: Globe },
  { id: 'astronomy', name: '天文学', icon: Globe },
  { id: 'biology', name: '生物学', icon: Microscope },
  { id: 'chemistry', name: '化学', icon: FlaskConical },
  { id: 'physics', name: '物理', icon: FlaskConical },
  { id: 'computer-science', name: '计算机科学', icon: Computer },
  { id: 'language', name: '语言文学', icon: PenTool },
  { id: 'economics', name: '经济学', icon: TrendingUp },
  { id: 'health', name: '健康教育', icon: Heart },
  { id: 'history', name: '历史', icon: Clock },
  { id: 'philosophy', name: '哲学', icon: Lightbulb },
  { id: 'psychology', name: '心理学', icon: Brain },
  { id: 'sociology', name: '社会学', icon: Users }
];

const learningModes = [
  { id: 'audio-lesson', name: '音频课程', icon: Volume2, color: 'bg-green-100 text-green-700' },
  { id: 'visual', name: '可视化学习', icon: BarChart3, color: 'bg-blue-100 text-blue-700' },
  { id: 'immersive-text', name: '沉浸式文本', icon: FileText, color: 'bg-purple-100 text-purple-700' },
  { id: 'slides-narration', name: '幻灯片和旁白', icon: Play, color: 'bg-purple-100 text-purple-700' },
  { id: 'mindmap', name: '思维导图', icon: Map, color: 'bg-orange-100 text-orange-700' },
  { id: 'game', name: '互动体验', icon: Gamepad2, color: 'bg-pink-100 text-pink-700' },
  { id: 'video', name: '视频动画', icon: Video, color: 'bg-indigo-100 text-indigo-700' }
];

const sampleCourses = [
  {
    id: 1,
    subject: 'physics',
    title: '牛顿第三定律',
    description: '作用力与反作用力的探索与应用',
    color: 'bg-gradient-to-br from-blue-500 to-purple-600',
    icon: FlaskConical,
    modes: ['immersive-text', 'slides-narration', 'audio-lesson', 'video', 'mindmap', 'game'],
    isDemo: true
  },
  {
    id: 2,
    subject: 'history',
    title: '早期人类进化与迁移',
    description: '探索人类祖先的进化历程和全球迁移模式',
    color: 'bg-gradient-to-br from-orange-400 to-red-500',
    icon: Clock,
    modes: ['audio-lesson', 'visual', 'video', 'mindmap']
  },
  {
    id: 3,
    subject: 'sociology',
    title: '什么是社会学？',
    description: '理解社会学的基本概念和研究方法',
    color: 'bg-gradient-to-br from-blue-400 to-cyan-500',
    icon: Users,
    modes: ['immersive-text', 'audio-lesson', 'game', 'visual']
  },
  {
    id: 4,
    subject: 'biology',
    title: '免疫系统的干扰',
    description: '了解免疫系统如何保护我们免受疾病侵害',
    color: 'bg-gradient-to-br from-purple-400 to-indigo-500',
    icon: Microscope,
    modes: ['visual', 'immersive-text', 'video', 'game']
  },
  {
    id: 5,
    subject: 'language',
    title: '阅读理解与回应',
    description: '提升阅读理解能力和批判性思维',
    color: 'bg-gradient-to-br from-green-400 to-teal-500',
    icon: PenTool,
    modes: ['immersive-text', 'audio-lesson', 'game']
  },
  {
    id: 6,
    subject: 'chemistry',
    title: '原子与分子',
    description: '探索物质的基本构成单位',
    color: 'bg-gradient-to-br from-yellow-400 to-orange-500',
    icon: FlaskConical,
    modes: ['visual', 'video', 'game', 'immersive-text']
  },
  {
    id: 7,
    subject: 'chemistry',
    title: '碳元素化学',
    description: '深入了解碳化合物的特性和应用',
    color: 'bg-gradient-to-br from-gray-400 to-slate-500',
    icon: FlaskConical,
    modes: ['visual', 'immersive-text', 'audio-lesson']
  },
  {
    id: 8,
    subject: 'astronomy',
    title: '地球与天空',
    description: '观察和理解我们的星球与宇宙的关系',
    color: 'bg-gradient-to-br from-indigo-400 to-purple-500',
    icon: Globe,
    modes: ['visual', 'audio-lesson', 'mindmap']
  }
];



interface LearnYourWayPageProps {
  onStartPDFLearning?: (data: { fileName: string; grade: string; interests: string[] }) => void;
  onPersonalizePDF?: (data: { fileName: string; grade: string; interests: string[] }) => void;
}

export function LearnYourWayPage({ onStartPDFLearning, onPersonalizePDF }: LearnYourWayPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  // 监听快速体验事件，自动打开PDF上传界面
  useEffect(() => {
    const handleTriggerPDFUpload = () => {
      setShowPDFUpload(true);
    };

    window.addEventListener('triggerPDFUpload', handleTriggerPDFUpload);
    
    return () => {
      window.removeEventListener('triggerPDFUpload', handleTriggerPDFUpload);
    };
  }, []);

  const filteredCourses = selectedSubject === 'all' 
    ? sampleCourses 
    : sampleCourses.filter(course => course.subject === selectedSubject);

  const getModeIcon = (modeId: string) => {
    const mode = learningModes.find(m => m.id === modeId);
    return mode ? mode.icon : FileText;
  };

  const getModeColor = (modeId: string) => {
    const mode = learningModes.find(m => m.id === modeId);
    return mode ? mode.color : 'bg-gray-100 text-gray-700';
  };

  const getModeName = (modeId: string) => {
    const mode = learningModes.find(m => m.id === modeId);
    return mode ? mode.name : '默认模式';
  };

  const handlePDFUploadComplete = (data: { fileName: string; grade: string; interests: string[] }) => {
    setShowPDFUpload(false);
    if (onStartPDFLearning) {
      onStartPDFLearning(data);
    }
  };

  const handlePDFPersonalize = (data: { fileName: string; grade: string; interests: string[] }) => {
    setShowPDFUpload(false);
    if (onPersonalizePDF) {
      onPersonalizePDF(data);
    }
  };

  const handleBackFromUpload = () => {
    setShowPDFUpload(false);
  };

  const handleCourseClick = (course: any) => {
    if (course.isDemo && course.id === 1) {
      // 这是牛顿第三定律的demo课程，直接进入学习模式选择
      const demoPDFData = {
        fileName: '牛顿第三定律：作用力与反作用力.pdf',
        grade: 'grade9', // 假设九年级
        interests: ['science', 'physics'] // 科学和物理兴趣
      };
      if (onPersonalizePDF) {
        onPersonalizePDF(demoPDFData);
      }
    }
    // 对于其他课程，不执行任何操作（它们只是示例）
  };

  if (showPDFUpload) {
    return (
      <PDFUploadFlow 
        onComplete={handlePDFUploadComplete}
        onPersonalize={handlePDFPersonalize}
        onBack={handleBackFromUpload}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background with organic shapes */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-200 via-orange-300 to-orange-400 opacity-80"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full">
          <div className="absolute top-8 right-8 w-80 h-80 bg-white/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-16 right-16 w-60 h-60 bg-white/40 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">

              
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  为每位学习者<br />
                  <span className="text-primary">重塑</span><br />
                  自学体验
                </h1>
                
                <p className="text-xl text-gray-700 max-w-lg leading-relaxed">
                  AI随心学将教材和学习资料转化为引人入胜的多媒体学习体验，为你量身定制。
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  onClick={() => setShowPDFUpload(true)}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  立即体验AI随心学：上传你的PDF
                </Button>
              </div>
            </div>
            
            {/* Right Content - Learning Interface Preview */}
            <div className="relative">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/50">
                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-6">学习方式</p>
                </div>
                
                {/* Six learning modes grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl p-4 text-center border-2 border-orange-300">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">沉浸式文本</span>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center border-2 border-purple-300">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">幻灯片和旁白</span>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center border-2 border-green-300">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Volume2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">音频课程</span>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center border-2 border-blue-300">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Map className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">思维导图</span>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center border-2 border-pink-300">
                    <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Gamepad2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">互动体验</span>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center border-2 border-indigo-300">
                    <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">视频动画</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Subject Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject) => {
              const Icon = subject.icon;
              const isActive = selectedSubject === subject.id;
              
              return (
                <Button
                  key={subject.id}
                  variant={isActive ? "default" : "outline"}
                  className={`h-12 px-4 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-secondary'
                  }`}
                  onClick={() => setSelectedSubject(subject.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {subject.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Course Grid */}
        <div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCourses.map((course) => {
                const Icon = course.icon;
                
                return (
                  <Card 
                    key={course.id} 
                    className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 overflow-hidden"
                    onClick={() => handleCourseClick(course)}
                  >
                    <div className={`${course.color} p-6 text-white relative`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex flex-col space-y-2">
                          <Badge className="bg-white/20 text-white border-white/30">
                            {subjects.find(s => s.id === course.subject)?.name}
                          </Badge>
                          {course.isDemo && (
                            <Badge className="bg-green-500 text-white border-0 text-xs">
                              立即体验
                            </Badge>
                          )}
                        </div>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-20 h-20 bg-white/10 rounded-tl-full"></div>
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                            {course.title}
                          </h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {course.description}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {course.modes.map((modeId) => {
                            const ModeIcon = getModeIcon(modeId);
                            
                            return (
                              <Badge
                                key={modeId}
                                className={`${getModeColor(modeId)} border-0`}
                              >
                                <ModeIcon className="w-3 h-3 mr-1" />
                                {getModeName(modeId)}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
        </div>
      </div>
    </div>
  );
}
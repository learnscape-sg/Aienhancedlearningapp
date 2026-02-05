import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { PublishedCoursesProvider, usePublishedCourses } from './components/PublishedCoursesContext';
import { LoginPage } from './components/LoginPage';
import { OnboardingPage } from './components/OnboardingPage';
import { Sidebar } from './components/Sidebar';
import { TeacherSidebar } from './components/TeacherSidebar';
import { HomePage } from './components/HomePage';
import { EnhancedChapterPage } from './components/EnhancedChapterPage';
import { QuizPage } from './components/QuizPage';
import { ReportsPage } from './components/ReportsPage';

import { LearningPathsPage } from './components/LearningPathsPage';
import { LearnYourWayPage } from './components/LearnYourWayPage';
import { LearningModeSelection } from './components/LearningModeSelection';
import { ImmersiveTextPage } from './components/ImmersiveTextPage';
import { SlidesNarrationPage } from './components/SlidesNarrationPage';
import { AudioLessonPage } from './components/AudioLessonPage';
import { MindmapPage } from './components/MindmapPage';
import { GamePage } from './components/GamePage';
import { VideoPage } from './components/VideoPage';
import { SettingsPage } from './components/SettingsPage';
import { AITutor } from './components/AITutor';

// Teacher platform components
import { TeacherOverview } from './components/TeacherOverview';
import { CourseDesignPage } from './components/CourseDesignPage';
import { CoreDesignPage } from './components/CoreDesignPage';
import { TeachingDocumentPage } from './components/TeachingDocumentPage';
import { TaskConfigurationPage } from './components/TaskConfigurationPage';
import { CourseManagementPage } from './components/CourseManagementPage';
import { ClassManagementPage } from './components/ClassManagementPage';

type AppState = 'login' | 'onboarding' | 'dashboard' | 'chapter' | 'quiz' | 'learning-mode-selection' | 'immersive-text' | 'slides-narration' | 'audio-lesson' | 'mindmap' | 'game' | 'video' | 'core-design' | 'teaching-document' | 'task-configuration';

function AppContent() {
  const { user, loading, login } = useAuth();
  const [appState, setAppState] = useState<AppState>('login');
  const [activeSection, setActiveSection] = useState('learn-your-way');
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<{ fileName: string; grade: string; interests: string[] } | null>(null);
  const [tutorQuestionTrigger, setTutorQuestionTrigger] = useState<{ selectedText: string; context: string; timestamp: number } | null>(null);
  const [courseDesignData, setCourseDesignData] = useState<any>(null);

  // Handle quick experience function - defined early to avoid hoisting issues
  const handleQuickExperience = async () => {
    // 使用demo用户快速登录并直接进入PDF上传界面
    try {
      const demoEmail = 'student@demo.com';
      const demoPassword = 'demo123';
      await login(demoEmail, demoPassword);
      setActiveSection('learn-your-way');
      // 直接进入PDF上传界面，而不是停留在AI随心学页面
      setTimeout(() => {
        // 等待状态更新后，模拟点击上传PDF按钮
        const event = new CustomEvent('triggerPDFUpload');
        window.dispatchEvent(event);
      }, 100);
    } catch (error) {
      console.error('Quick experience failed:', error);
    }
  };

  // Update app state based on user status
  useEffect(() => {
    if (user) {
      // Check if user needs onboarding (only for students)
      if (user.role === 'teacher') {
        setActiveSection('overview');
        setAppState('dashboard');
      } else {
        const needsOnboarding = !user.grade && (!user.interests || user.interests.length === 0);
        setAppState(needsOnboarding ? 'onboarding' : 'dashboard');
        if (!needsOnboarding) {
          setActiveSection('learn-your-way');
        }
      }
    } else {
      setAppState('login');
    }
  }, [user]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#1A73E8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5F6368]">加载中...</p>
        </div>
      </div>
    );
  }

  // Auth flow
  if (!user && appState === 'login') {
    return (
      <LoginPage 
        onSuccess={() => {
          // State will be automatically updated by useEffect
        }}
        onQuickExperience={handleQuickExperience}
      />
    );
  }

  if (appState === 'onboarding') {
    return (
      <OnboardingPage onComplete={() => setAppState('dashboard')} />
    );
  }

  // Main app navigation
  const handleStartChapter = (chapterId: string) => {
    setCurrentChapter(chapterId);
    setAppState('chapter');
  };

  const handleStartQuiz = () => {
    setAppState('quiz');
  };

  const handleBackToDashboard = () => {
    setAppState('dashboard');
    setCurrentChapter(null);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setAppState('dashboard');
  };

  const handleStartPDFLearning = (data: { fileName: string; grade: string; interests: string[] }) => {
    console.log('Starting PDF learning with:', data);
    console.log('Selected interests:', data.interests);
    // 这里可以添加导航到PDF学习界面的逻辑
    // 暂时回到dashboard
    setAppState('dashboard');
  };

  const handlePersonalizePDF = (data: { fileName: string; grade: string; interests: string[] }) => {
    setPdfData(data);
    setAppState('learning-mode-selection');
  };

  const handleSelectLearningMode = (mode: string) => {
    console.log('Selected learning mode:', mode, 'for PDF:', pdfData);
    
    // 根据选择的学习模式导航到相应页面
    switch (mode) {
      case 'immersive-text':
        setAppState('immersive-text');
        break;
      case 'slides-narration':
        setAppState('slides-narration');
        break;
      case 'audio-lesson':
        setAppState('audio-lesson');
        break;
      case 'mindmap':
        setAppState('mindmap');
        break;
      case 'game':
        setAppState('game');
        break;
      case 'video':
        setAppState('video');
        break;
      default:
        setAppState('dashboard');
    }
  };

  const handleBackFromLearningMode = () => {
    setAppState('dashboard');
    setActiveSection('learn-your-way');
  };

  const handleBackFromImmersiveText = () => {
    setAppState('learning-mode-selection');
  };

  const handleBackFromSlidesNarration = () => {
    setAppState('learning-mode-selection');
  };

  const handleBackFromAudioLesson = () => {
    setAppState('learning-mode-selection');
  };

  const handleBackFromMindmap = () => {
    setAppState('learning-mode-selection');
  };

  const handleBackFromGame = () => {
    setAppState('learning-mode-selection');
  };

  const handleBackFromVideo = () => {
    setAppState('learning-mode-selection');
  };

  const handleSwitchLearningMode = (mode: string) => {
    handleSelectLearningMode(mode);
  };

  // 处理文本选择问题
  const handleTextSelectionQuestion = (selectedText: string, context: string) => {
    setTutorQuestionTrigger({
      selectedText,
      context,
      timestamp: Date.now()
    });
  };

  // Render teacher content
  const renderTeacherContent = () => {
    // Handle teaching document page
    if (appState === 'teaching-document') {
      return (
        <TeachingDocumentPage 
          courseData={courseDesignData}
          designData={courseDesignData}
          onBack={() => {
            setAppState('core-design');
          }}
          onNext={() => {
            setAppState('task-configuration');
          }}
        />
      );
    }

    // Handle task configuration page
    if (appState === 'task-configuration') {
      return (
        <TaskConfigurationPage 
          courseData={courseDesignData}
          designData={courseDesignData}
          onBack={() => {
            setAppState('teaching-document');
          }}
          onPublish={() => {
            alert('课程已成功发布！');
            setAppState('dashboard');
            setActiveSection('courses');
          }}
        />
      );
    }

    // Handle core design page separately (appState-based)
    if (appState === 'core-design') {
      return (
        <CoreDesignPage 
          courseData={courseDesignData}
          onBack={() => {
            setAppState('dashboard');
            setActiveSection('course-design');
          }}
          onComplete={(designData) => {
            console.log('Design completed:', designData);
            setCourseDesignData({ ...courseDesignData, ...designData });
            setAppState('teaching-document');
          }}
        />
      );
    }

    // Normal section-based navigation
    switch (activeSection) {
      case 'overview':
        return <TeacherOverview />;
      case 'course-design':
        return (
          <CourseDesignPage 
            onNextStep={(data) => {
              setCourseDesignData(data);
              setAppState('core-design');
            }}
          />
        );
      case 'courses':
        return <CourseManagementPage />;
      case 'classes':
        return <ClassManagementPage />;
      case 'materials':
        return <div className="p-8"><h1 className="text-3xl font-bold">教学资源</h1><p className="text-muted-foreground mt-2">教学资源管理功能开发中...</p></div>;
      case 'settings':
        return <SettingsPage />;
      default:
        return <TeacherOverview />;
    }
  };

  // Render student content
  const renderMainContent = () => {
    if (appState === 'mindmap' && pdfData) {
      return (
        <MindmapPage
          pdfData={pdfData}
          onBack={handleBackFromMindmap}
          onSwitchMode={handleSwitchLearningMode}
          onAskTutor={handleTextSelectionQuestion}
        />
      );
    }

    if (appState === 'audio-lesson' && pdfData) {
      return (
        <AudioLessonPage
          pdfData={pdfData}
          onBack={handleBackFromAudioLesson}
          onSwitchMode={handleSwitchLearningMode}
          onAskTutor={handleTextSelectionQuestion}
        />
      );
    }

    if (appState === 'game' && pdfData) {
      return (
        <GamePage
          pdfData={pdfData}
          onBack={handleBackFromGame}
          onSwitchMode={handleSwitchLearningMode}
          onAskTutor={handleTextSelectionQuestion}
        />
      );
    }

    if (appState === 'video' && pdfData) {
      return (
        <VideoPage
          pdfData={pdfData}
          onBack={handleBackFromVideo}
          onSwitchMode={handleSwitchLearningMode}
          onAskTutor={handleTextSelectionQuestion}
        />
      );
    }

    if (appState === 'slides-narration' && pdfData) {
      return (
        <SlidesNarrationPage
          pdfData={pdfData}
          onBack={handleBackFromSlidesNarration}
          onSwitchMode={handleSwitchLearningMode}
          onAskTutor={handleTextSelectionQuestion}
        />
      );
    }

    if (appState === 'immersive-text' && pdfData) {
      return (
        <ImmersiveTextPage
          pdfData={pdfData}
          onBack={handleBackFromImmersiveText}
          onSwitchMode={handleSwitchLearningMode}
          onAskTutor={handleTextSelectionQuestion}
        />
      );
    }

    if (appState === 'learning-mode-selection' && pdfData) {
      return (
        <LearningModeSelection
          pdfData={pdfData}
          onSelectMode={handleSelectLearningMode}
          onBack={handleBackFromLearningMode}
        />
      );
    }

    if (appState === 'chapter' && currentChapter) {
      return (
        <EnhancedChapterPage
          chapterId={currentChapter}
          onBack={handleBackToDashboard}
          onStartQuiz={handleStartQuiz}
        />
      );
    }

    if (appState === 'quiz') {
      return (
        <QuizPage
          chapterId={currentChapter || '1'}
          onBack={() => setAppState('chapter')}
          onComplete={handleBackToDashboard}
        />
      );
    }

    // Dashboard sections
    switch (activeSection) {
      case 'home':
        return <HomePage onStartChapter={handleStartChapter} />;
      case 'paths':
        return <LearningPathsPage onStartPath={handleStartChapter} />;
      case 'reports':
        return <ReportsPage />;
      case 'learn-your-way':
        return <LearnYourWayPage 
          onStartPDFLearning={handleStartPDFLearning} 
          onPersonalizePDF={handlePersonalizePDF}
        />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage onStartChapter={handleStartChapter} />;
    }
  };

  // 判断是否应该显示AI导师（在学习相关页面显示）
  const shouldShowAITutor = [
    'learning-mode-selection', 
    'immersive-text', 
    'slides-narration', 
    'audio-lesson', 
    'mindmap', 
    'game', 
    'video'
  ].includes(appState);

  // 判断是否应该隐藏左侧导航栏（在多媒体学习页面隐藏）
  const shouldHideSidebar = [
    'learning-mode-selection', 
    'immersive-text', 
    'slides-narration', 
    'audio-lesson', 
    'mindmap', 
    'game', 
    'video'
  ].includes(appState);

  // Render teacher platform
  if (user?.role === 'teacher') {
    return (
      <div className="flex h-screen bg-[#F8F9FA]">
        <TeacherSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
        <main className="flex-1 overflow-auto">
          {renderTeacherContent()}
        </main>
      </div>
    );
  }

  // Render student platform
  return (
    <div className="flex h-screen bg-[#F8F9FA]">
      {/* 条件性渲染侧边栏 */}
      {!shouldHideSidebar && (
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      )}
      
      {/* 主内容区域 - 根据侧边栏和AI导师的显示状态调整样式 */}
      <main className={`flex-1 overflow-auto ${shouldShowAITutor ? 'mr-[400px]' : ''}`}>
        {renderMainContent()}
      </main>
      
      {/* AI导师侧栏 */}
      {shouldShowAITutor && (
        <div className="fixed right-0 top-0 bottom-0 w-[400px] z-30">
          <AITutor 
            subject="物理" 
            context="牛顿第三定律学习"
            isFixedSidebar={true}
            tutorQuestionTrigger={tutorQuestionTrigger}
            onActionClick={(action) => {
              console.log('AI Tutor action:', action);
              // 根据不同的action执行相应的逻辑
              if (action === 'show-example') {
                // 显示例子
              } else if (action === 'retry') {
                // 重新开始
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PublishedCoursesProvider>
        <div className="size-full">
          <AppContent />
        </div>
      </PublishedCoursesProvider>
    </AuthProvider>
  );
}
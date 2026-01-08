import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuth } from './AuthContext';
import { 
  FileText,
  Play,
  Volume2,
  Map,
  Gamepad2,
  Video,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';

interface LearningHeaderProps {
  pdfData: {
    fileName: string;
    grade: string;
    interests: string[];
  };
  currentMode?: string;
  onModeSelect?: (mode: string) => void;
  onOpenPDF?: () => void;
  onBack?: () => void;
}

const modes = [
  { id: 'immersive-text', name: '沉浸式文本', icon: FileText, color: '#FF8A65' },
  { id: 'slides-narration', name: '幻灯片和旁白', icon: Play, color: '#9C27B0' },
  { id: 'audio-lesson', name: '音频课程', icon: Volume2, color: '#4CAF50' },
  { id: 'mindmap', name: '思维导图', icon: Map, color: '#2196F3' },
  { id: 'game', name: '互动体验', icon: Gamepad2, color: '#E91E63' },
  { id: 'video', name: '视频动画', icon: Video, color: '#3F51B5' }
];

export function LearningHeader({ pdfData, currentMode, onModeSelect, onOpenPDF, onBack }: LearningHeaderProps) {
  const { user } = useAuth();
  const getGradeDisplayName = (gradeId: string) => {
    const gradeMapping: { [key: string]: string } = {
      'grade1': '一年级', 'grade2': '二年级', 'grade3': '三年级',
      'grade4': '四年级', 'grade5': '五年级', 'grade6': '六年级',
      'grade7': '七年级', 'grade8': '八年级', 'grade9': '九年级',
      'grade10': '十年级', 'grade11': '十一年级', 'grade12': '十二年级'
    };
    return gradeMapping[gradeId] || gradeId;
  };

  const getInterestDisplayNames = (interests: string[]) => {
    const interestMapping: { [key: string]: string } = {
      'basketball': '篮球',
      'music': '音乐',
      'art': '美术',
      'reading': '阅读',
      'games': '游戏',
      'photography': '摄影',
      'science': '科学',
      'physics': '物理',
      'geography': '地理',
      'math': '数学'
    };
    return interests.map(interest => interestMapping[interest] || interest);
  };

  return (
    <div className="bg-[#F5F3F0] px-6 py-4">
      {/* Top row */}
      <div className="flex items-center justify-between mb-6">
        {/* Left - Back button and Title */}
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回</span>
            </Button>
          )}
          <h1 className="text-2xl font-medium text-gray-800">随心学</h1>
        </div>

        {/* Center - Grade and Interest info */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-orange-600">●</span>
            <span className="text-sm text-gray-600">兴趣：{user ? getInterestDisplayNames(user.interests).join('，') : '未设置'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">年级：{user ? getGradeDisplayName(user.grade) : '未设置'}</span>
          </div>
        </div>

        {/* Right - Icons */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm">
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <span className="text-lg">?</span>
          </Button>
        </div>
      </div>

      {/* Bottom row - Source and Mode buttons */}
      <div className="flex items-center space-x-4">
        {/* Source button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenPDF}
          className="flex flex-col items-center p-3 min-w-[80px] h-auto bg-white hover:bg-gray-50 border border-gray-200 rounded-lg"
        >
          <div className="w-8 h-8 mb-1 flex items-center justify-center">
            <div className="w-6 h-6 bg-amber-600 rounded text-white text-xs font-bold flex items-center justify-center">
              PDF
            </div>
          </div>
          <span className="text-xs text-gray-600">资源</span>
        </Button>

        {/* Mode selection buttons */}
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <Button
              key={mode.id}
              variant="ghost"
              size="sm"
              onClick={() => onModeSelect?.(mode.id)}
              className={`flex flex-col items-center p-3 min-w-[80px] h-auto rounded-lg border transition-all ${
                isActive 
                  ? 'bg-white border-2 shadow-sm' 
                  : 'bg-transparent border border-transparent hover:bg-white/50'
              }`}
              style={{
                borderColor: isActive ? mode.color : 'transparent'
              }}
            >
              <div 
                className="w-8 h-8 mb-1 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: mode.color }}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs text-gray-600 text-center leading-tight">
                {mode.name}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
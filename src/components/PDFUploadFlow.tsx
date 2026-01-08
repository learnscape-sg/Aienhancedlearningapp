import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileText, Plus, Upload } from 'lucide-react';
import { useAuth } from './AuthContext';

interface PDFUploadFlowProps {
  onComplete: (data: { fileName: string; grade: string; interests: string[] }) => void;
  onPersonalize: (data: { fileName: string; grade: string; interests: string[] }) => void;
  onBack: () => void;
}

type FlowStep = 'upload' | 'uploaded' | 'summary';

export function PDFUploadFlow({ onComplete, onPersonalize, onBack }: PDFUploadFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { user } = useAuth();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    if (file && file.type === 'application/pdf') {
      console.log('Valid PDF file, proceeding to uploaded state');
      setUploadedFile(file);
      setCurrentStep('uploaded');
    } else if (file) {
      console.log('Invalid file type:', file.type);
      alert('请选择PDF格式的文件');
    }
  };

  const handleStartLearning = () => {
    setCurrentStep('summary');
  };

  const handlePersonalize = () => {
    if (!user) return;
    
    onPersonalize({
      fileName: uploadedFile?.name || 'Unknown file',
      grade: user.grade,
      interests: user.interests
    });
  };

  // Helper function to get grade display name
  const getGradeDisplayName = (gradeId: string) => {
    const gradeMapping: { [key: string]: string } = {
      'grade1': '一年级',
      'grade2': '二年级', 
      'grade3': '三年级',
      'grade4': '四年级',
      'grade5': '五年级',
      'grade6': '六年级',
      'grade7': '七年级',
      'grade8': '八年级',
      'grade9': '九年级',
      'grade10': '十年级',
      'grade11': '十一年级',
      'grade12': '十二年级'
    };
    return gradeMapping[gradeId] || gradeId;
  };

  // Helper function to get interest display names
  const getInterestDisplayNames = (interestIds: string[]) => {
    const interestMapping: { [key: string]: string } = {
      'basketball': '篮球',
      'music': '音乐',
      'art': '美术',
      'reading': '阅读',
      'games': '游戏',
      'photography': '摄影',
      'science': '科学',
      'geography': '地理',
      'math': '数学'
    };
    return interestIds.map(id => interestMapping[id] || id);
  };

  if (currentStep === 'summary') {
    if (!user) return null;
    
    return (
      <div className="min-h-screen bg-[#F5F3F0] flex items-center justify-center p-6 relative">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => setCurrentStep('uploaded')}
          className="absolute top-6 left-6 text-gray-600 hover:text-gray-800"
        >
          ← 返回
        </Button>
        
        <div className="text-center space-y-8">
          {/* Top - User Grade and Interests */}
          <div className="flex items-center justify-center space-x-8">
            {/* Grade level */}
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-[#81C784] rounded-full flex items-center justify-center text-white font-medium text-lg">
                {getGradeDisplayName(user.grade).replace('年级', '')}
              </div>
              <span className="text-gray-600 bg-white px-6 py-3 rounded-full">
                {getGradeDisplayName(user.grade)}
              </span>
            </div>
            
            {/* Interests */}
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-[#E1BEE7] rounded-full flex items-center justify-center text-2xl">
                🎨
              </div>
              <span className="text-gray-600 bg-white px-6 py-3 rounded-full">
                兴趣爱好 ({user.interests.length})
              </span>
            </div>
          </div>

          {/* Interests Display */}
          {user.interests.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {getInterestDisplayNames(user.interests).map((interest, index) => (
                <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-700">
                  {interest}
                </Badge>
              ))}
            </div>
          )}

          {/* Settings reminder */}
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            信息有误？可在<span className="text-primary font-medium">设置</span>中修改年级和兴趣偏好
          </p>
          
          {/* PDF File */}
          <div className="flex items-center justify-center space-x-4 bg-white rounded-2xl px-8 py-4 mx-auto w-fit">
            <div className="bg-[#EA4335] text-white px-3 py-1 rounded text-sm font-medium">
              PDF
            </div>
            <span className="text-gray-700 text-lg">
              {uploadedFile?.name || 'Newton\'s Third Law of Motion.pdf'}
            </span>
          </div>
          
          {/* Personalize Button */}
          <Button
            onClick={handlePersonalize}
            className="bg-[#FF8A65] hover:bg-[#FF7043] text-black px-12 py-4 rounded-full text-lg font-medium flex items-center space-x-3 mx-auto"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l-1.912 5.813a2 2 0 01-1.275 1.275L3 12l5.813 1.912a2 2 0 011.275 1.275L12 21l1.912-5.813a2 2 0 011.275-1.275L21 12l-5.813-1.912a2 2 0 01-1.275-1.275L12 3z"/>
            </svg>
            <span>开始个性化学习</span>
          </Button>
        </div>
      </div>
    );
  }



  if (currentStep === 'uploaded') {
    return (
      <div className="min-h-screen bg-[#F5F3F0] flex items-center justify-center p-6 relative">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => setCurrentStep('upload')}
          className="absolute top-6 left-6 text-gray-600 hover:text-gray-800"
        >
          ← 返回
        </Button>
        
        <div className="w-full max-w-2xl">
          <Card className="bg-white border-2 border-[#FF6B6B] rounded-3xl overflow-hidden">
            <CardContent className="p-12">
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center space-x-3">
                  <div className="bg-[#EA4335] text-white px-3 py-1 rounded text-sm font-medium">
                    PDF
                  </div>
                  <span className="text-gray-600 text-lg">
                    {uploadedFile?.name || 'Newton\'s Third Law of Motion.pdf'}
                  </span>
                </div>
              </div>
              
              <div className="text-center">
                {user && (
                  <div className="mb-4 text-sm text-gray-600">
                    基于您设置的{getGradeDisplayName(user.grade)}和兴趣偏好生成个性化学习内容
                  </div>
                )}
                <Button
                  onClick={handleStartLearning}
                  className="bg-[#FF8A65] hover:bg-[#FF7043] text-gray-800 px-8 py-3 rounded-full text-lg font-medium transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <span>开始学习</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8E4DC] flex items-center justify-center p-8 relative">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="absolute top-6 left-6 text-gray-600 hover:text-gray-800"
      >
        ← 返回 AI随心学
      </Button>
      
      <div className="w-full max-w-4xl">
        <div className="bg-white border-2 border-[#FF6B6B] rounded-[2rem] p-16">
          <div className="border-2 border-dashed border-gray-300 rounded-[2rem] p-20 relative">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#E1BEE7] rounded-xl mb-6 relative">
                <FileText className="w-10 h-10 text-white" />
                <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-[#FF6B35] rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
              </div>
              
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
          
          <div className="flex justify-center mt-8">
            <Button
              variant="ghost"
              disabled
              className="bg-[#D1D5DB] text-[#9CA3AF] px-12 py-4 rounded-full text-lg font-medium cursor-not-allowed flex items-center space-x-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span>Start learning</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
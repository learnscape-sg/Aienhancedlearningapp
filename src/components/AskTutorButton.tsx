import React from 'react';
import { Button } from './ui/button';
import { HelpCircle } from 'lucide-react';

interface AskTutorButtonProps {
  onAskTutor?: () => void;
  className?: string;
}

export function AskTutorButton({ onAskTutor, className = '' }: AskTutorButtonProps) {
  const handleClick = () => {
    if (onAskTutor) {
      // 触发通用的导师问答功能
      onAskTutor();
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      className={`
        bg-white border-blue-300 text-blue-700 
        hover:bg-blue-50 hover:border-blue-400 
        px-4 py-2 rounded-lg
        transition-all duration-200
        shadow-md hover:shadow-lg
        ${className}
      `}
    >
      <HelpCircle className="w-4 h-4 mr-2" />
      向导师提问
    </Button>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { MessageCircle } from 'lucide-react';

interface TextSelectionHelperProps {
  onAskTutor: (selectedText: string, context: string) => void;
  containerRef?: React.RefObject<HTMLElement>;
}

export function TextSelectionHelper({ onAskTutor, containerRef }: TextSelectionHelperProps) {
  const [selectedText, setSelectedText] = useState('');
  const [showButton, setShowButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [contextText, setContextText] = useState('');

  // 获取选中文本周围的上下文
  const getContext = (selection: Selection): string => {
    if (!selection.rangeCount) return '';
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // 获取包含选中文本的段落或容器元素
    let contextElement: Element | null = null;
    
    if (container.nodeType === Node.TEXT_NODE) {
      contextElement = container.parentElement;
    } else {
      contextElement = container as Element;
    }
    
    // 向上查找到段落级别的元素
    while (contextElement && !['P', 'DIV', 'SECTION', 'ARTICLE'].includes(contextElement.tagName)) {
      contextElement = contextElement.parentElement;
    }
    
    return contextElement ? contextElement.textContent || '' : '';
  };

  // 处理文本选择
  const handleTextSelection = () => {
    const selection = window.getSelection();
    
    if (!selection || selection.isCollapsed) {
      setShowButton(false);
      return;
    }

    const text = selection.toString().trim();
    
    if (text.length > 0) {
      setSelectedText(text);
      setContextText(getContext(selection));
      
      // 获取选中文本的位置
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // 计算按钮位置（在选中文本上方）
      const buttonX = rect.left + (rect.width / 2);
      const buttonY = rect.top - 60; // 在选中文本上方60px
      
      setButtonPosition({ x: buttonX, y: buttonY });
      setShowButton(true);
    } else {
      setShowButton(false);
    }
  };

  // 处理点击"问导师"按钮
  const handleAskTutor = () => {
    if (selectedText) {
      onAskTutor(selectedText, contextText);
      setShowButton(false);
      // 清除选中状态
      window.getSelection()?.removeAllRanges();
    }
  };

  // 处理点击其他地方隐藏按钮
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest('.selection-helper-button')) {
      setShowButton(false);
    }
  };

  useEffect(() => {
    const targetElement = containerRef?.current || document;
    
    // 监听文本选择事件
    const handleMouseUp = () => {
      setTimeout(handleTextSelection, 10);
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || 
          event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
          event.shiftKey) {
        setTimeout(handleTextSelection, 10);
      }
    };

    targetElement.addEventListener('mouseup', handleMouseUp);
    targetElement.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      targetElement.removeEventListener('mouseup', handleMouseUp);
      targetElement.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [containerRef]);

  // 当按钮显示时，监听滚动事件来隐藏按钮
  useEffect(() => {
    if (showButton) {
      const handleScroll = () => {
        setShowButton(false);
      };
      
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [showButton]);

  if (!showButton) return null;

  return (
    <div
      className="fixed z-50 selection-helper-button"
      style={{
        left: `${buttonPosition.x}px`,
        top: `${buttonPosition.y}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <Button
        onClick={handleAskTutor}
        size="sm"
        className="bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-lg animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <MessageCircle className="w-4 h-4 mr-1" />
        问导师
      </Button>
    </div>
  );
}
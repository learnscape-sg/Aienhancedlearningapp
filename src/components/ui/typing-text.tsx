'use client';

import React, { useState, useEffect } from 'react';
import { cn } from './utils';

interface TypingTextProps {
  /** Full text to display, use \n for paragraph breaks */
  text: string;
  /** Delay between each character in ms */
  speed?: number;
  /** Called when typing completes */
  onComplete?: () => void;
  className?: string;
  /** Class for each paragraph */
  paragraphClassName?: string;
}

export function TypingText({
  text,
  speed = 40,
  onComplete,
  className,
  paragraphClassName = 'text-gray-700 leading-relaxed',
}: TypingTextProps) {
  const [displayLength, setDisplayLength] = useState(0);
  const fullLen = text.length;

  useEffect(() => {
    if (displayLength >= fullLen) {
      onComplete?.();
      return;
    }
    const t = setTimeout(
      () => setDisplayLength((d) => Math.min(d + 1, fullLen)),
      speed
    );
    return () => clearTimeout(t);
  }, [displayLength, fullLen, speed, onComplete]);

  const displayed = text.slice(0, displayLength);
  const paragraphs = displayed.split('\n').filter((p) => p.length > 0);

  return (
    <div className={cn('space-y-4', className)}>
      {paragraphs.map((p, i) => (
        <p key={i} className={paragraphClassName}>
          {p}
        </p>
      ))}
    </div>
  );
}

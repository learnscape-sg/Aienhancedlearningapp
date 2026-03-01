import React, { createContext, useContext, useEffect, useState } from 'react';

export type FontSize = 's' | 'm' | 'l';

const STORAGE_KEY = 'siteFontSize';

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === 's' || s === 'm' || s === 'l') return s;
    }
    return 'm';
  });

  const setFontSize = (s: FontSize) => {
    setFontSizeState(s);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, s);
      document.documentElement.setAttribute('data-font-size', s);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize(): FontSizeContextType {
  const ctx = useContext(FontSizeContext);
  if (!ctx) throw new Error('useFontSize must be used within FontSizeProvider');
  return ctx;
}

import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import mermaid from 'mermaid';

interface MermaidPreviewProps {
  code: string;
  className?: string;
  errorMessage?: string;
  idPrefix?: string;
}

export const MermaidPreview: React.FC<MermaidPreviewProps> = ({
  code,
  className = 'w-full h-full flex items-center justify-center overflow-auto custom-scrollbar',
  errorMessage,
  idPrefix = 'mermaid',
}) => {
  const { t } = useTranslation('common');
  const displayError = errorMessage ?? t('renderError');
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!idRef.current) {
      idRef.current = `${idPrefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (ref.current && code) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          fontFamily: 'sans-serif',
          themeVariables: {
            darkMode: false,
            background: '#ffffff',
            primaryColor: '#e0f2fe',
            edgeLabelBackground: '#ffffff',
            lineColor: '#334155',
            textColor: '#0f172a',
            mainBkg: '#f0f9ff',
            nodeBorder: '#0284c7',
          },
        });
        const cleanCode = code.trim();
        const finalCode =
          cleanCode.startsWith('graph') || cleanCode.startsWith('mindmap')
            ? cleanCode
            : `graph TD\n  Node["${cleanCode.replace(/"/g, "'")}"]`;
        mermaid.render(idRef.current!, finalCode).then(({ svg }) => {
          if (ref.current) ref.current.innerHTML = svg;
        });
      } catch (e) {
        console.error('Mermaid render error', e);
        if (ref.current) {
          ref.current.innerHTML = `<div class='text-xs text-red-400 p-4'>${displayError}</div>`;
        }
      }
    }
  }, [code, idPrefix, displayError]);

  return <div ref={ref} className={className} />;
};

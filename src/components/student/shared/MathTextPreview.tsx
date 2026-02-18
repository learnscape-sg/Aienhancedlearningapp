import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import type { MarkdownComponentProps } from '@/utils/types';

interface MathTextPreviewProps {
  text: string;
  className?: string;
}

export const MathTextPreview: React.FC<MathTextPreviewProps> = ({
  text,
  className = 'text-sm text-slate-700 leading-relaxed',
}) => {
  const processedText = React.useMemo(() => {
    if (!text) return '';
    return text
      .split(/\n\n+/)
      .map((paragraph) => paragraph.replace(/([^\n])\n([^\n])/g, '$1  \n$2'))
      .join('\n\n');
  }, [text]);

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ ...props }: MarkdownComponentProps<'p'>) => (
            <p className="mb-2 last:mb-0 text-slate-700 whitespace-pre-line" {...props} />
          ),
          h1: ({ ...props }: MarkdownComponentProps<'h1'>) => (
            <h1 className="text-xl font-bold mb-2 text-slate-800" {...props} />
          ),
          h2: ({ ...props }: MarkdownComponentProps<'h2'>) => (
            <h2 className="text-lg font-bold mb-2 text-slate-800" {...props} />
          ),
          h3: ({ ...props }: MarkdownComponentProps<'h3'>) => (
            <h3 className="text-base font-bold mb-2 text-slate-800" {...props} />
          ),
          strong: ({ ...props }: MarkdownComponentProps<'strong'>) => (
            <strong className="font-semibold text-slate-800" {...props} />
          ),
          em: ({ ...props }: MarkdownComponentProps<'em'>) => <em className="italic" {...props} />,
          ul: ({ ...props }: MarkdownComponentProps<'ul'>) => (
            <ul className="list-disc list-inside mb-2 space-y-1 ml-4" {...props} />
          ),
          ol: ({ ...props }: MarkdownComponentProps<'ol'>) => (
            <ol className="list-decimal list-inside mb-2 space-y-1 ml-4" {...props} />
          ),
          li: ({ ...props }: MarkdownComponentProps<'li'>) => <li className="ml-2" {...props} />,
          code: ({ inline, ...props }: MarkdownComponentProps<'code'> & { inline?: boolean }) =>
            inline ? (
              <code
                className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-800"
                {...props}
              />
            ) : (
              <code
                className="block bg-slate-50 p-3 rounded text-xs font-mono text-slate-800 overflow-x-auto my-2"
                {...props}
              />
            ),
          table: ({ ...props }: MarkdownComponentProps<'table'>) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse bg-white border border-slate-300" {...props} />
            </div>
          ),
          thead: ({ ...props }: MarkdownComponentProps<'thead'>) => (
            <thead className="bg-slate-100" {...props} />
          ),
          tbody: ({ ...props }: MarkdownComponentProps<'tbody'>) => <tbody {...props} />,
          tr: ({ ...props }: MarkdownComponentProps<'tr'>) => (
            <tr className="border-b border-slate-200 hover:bg-slate-50" {...props} />
          ),
          th: ({ ...props }: MarkdownComponentProps<'th'>) => (
            <th
              className="px-4 py-2 text-left font-semibold text-slate-800 border-r border-slate-300 last:border-r-0"
              {...props}
            />
          ),
          td: ({ ...props }: MarkdownComponentProps<'td'>) => (
            <td
              className="px-4 py-2 text-slate-700 border-r border-slate-300 last:border-r-0"
              {...props}
            />
          ),
          blockquote: ({ ...props }: MarkdownComponentProps<'blockquote'>) => (
            <blockquote
              className="border-l-4 border-slate-300 pl-3 italic my-2 text-slate-600"
              {...props}
            />
          ),
        }}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
};

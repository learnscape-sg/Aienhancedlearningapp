import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import html2pdf from 'html2pdf.js';

/** 将 Markdown（含 LaTeX 公式）转为 PDF 并触发下载 */
export async function downloadMarkdownAsPdf(
  markdown: string,
  filename: string
): Promise<void> {
  const baseName = filename.replace(/\.(md|pdf)$/i, '') + '.pdf';

  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;overflow:auto;visibility:hidden;z-index:-1;pointer-events:none';
  const container = document.createElement('div');
  container.style.cssText = `
    position: relative;
    width: 210mm;
    max-width: 210mm;
    padding: 20mm;
    font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #1f2937;
    background: white;
  `;
  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  const pdfNoBreak = { breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const };
  const pdfComponents = {
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p style={pdfNoBreak} {...props}>{children}</p>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={pdfNoBreak} {...props}>{children}</li>
    ),
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 style={pdfNoBreak} {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 style={pdfNoBreak} {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 style={pdfNoBreak} {...props}>{children}</h3>
    ),
    h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h4 style={pdfNoBreak} {...props}>{children}</h4>
    ),
    h5: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h5 style={pdfNoBreak} {...props}>{children}</h5>
    ),
    h6: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h6 style={pdfNoBreak} {...props}>{children}</h6>
    ),
  };

  const root: Root = createRoot(container);
  root.render(
    <div className="markdown-pdf-source">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={pdfComponents}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );

  // 等待 React 和 KaTeX 渲染完成
  await new Promise((r) => setTimeout(r, 600));

  try {
    await html2pdf()
      .set({
        margin: 10,
        filename: baseName,
        pagebreak: {
          mode: ['avoid-all', 'css'],
          avoid: ['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', '.katex', '.katex-display'],
        },
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container)
      .save();
  } finally {
    root.unmount();
    wrapper.remove();
  }
}

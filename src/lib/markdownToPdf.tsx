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

  const root: Root = createRoot(container);
  root.render(
    <div className="markdown-pdf-source">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
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

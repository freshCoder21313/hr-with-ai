import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Search, Copy, Check, AlertTriangle } from 'lucide-react';
import mermaid from 'mermaid';

interface MarkdownRendererProps {
  content: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
      title="Copy code"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

const MermaidBlock: React.FC<{ code: string }> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(false);
        }
      } catch (e) {
        console.error('Mermaid rendering error:', e);
        setError(true);
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      }
    };

    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className="my-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Failed to render diagram</p>
          <pre className="mt-2 text-xs overflow-x-auto opacity-70">{code}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 overflow-x-auto flex justify-center">
      <div ref={containerRef} />
    </div>
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = memo(({ content }) => {
  // Pre-process content to convert [[Keyword]] to [Keyword](search:Keyword)
  // And also normalize any existing [Keyword](search:Keyword) to ensure it's handled consistently
  // Especially handling spaces in search queries which can break markdown link parsing
  const processedContent = content
    .replace(/\[\[(.*?)\]\]/g, (_, term) => `[${term}](search:${term.replace(/\s+/g, '%20')})`)
    .replace(
      /\[(.*?)\]\(search:(.*?)\)/g,
      (_, text, term) => `[${text}](search:${term.trim().replace(/\s+/g, '%20')})`
    );
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={(url) => {
        // Allow search: protocol
        if (url.startsWith('search:')) return url;
        // Default transform for other URLs
        return url;
      }}
      components={{
        code({
          inline,
          className,
          children,
          ...props
        }: {
          inline?: boolean;
          className?: string;
          children?: React.ReactNode;
          [key: string]: any;
        }) {
          const match = /language-(\w+)/.exec(className || '');
          const lang = match ? match[1] : '';
          const codeText = String(children).replace(/\n$/, '');

          // Mermaid diagram support
          if (!inline && lang === 'mermaid') {
            return <MermaidBlock code={codeText} />;
          }

          return !inline && match ? (
            <div className="relative my-4 group">
              <CopyButton text={codeText} />
              <div className="absolute top-2 left-3 text-xs text-slate-400 font-mono uppercase tracking-wider">
                {lang}
              </div>
              <SyntaxHighlighter
                style={vscDarkPlus as any}
                language={match[1]}
                PreTag="div"
                className="rounded-lg !my-0 !bg-[#1e1e1e] border border-slate-700 shadow-sm pt-8"
                {...props}
              >
                {codeText}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code
              className={`${
                inline
                  ? 'bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono text-[0.9em] border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                  : 'block bg-slate-100 text-slate-900 p-4 rounded-lg my-2 overflow-x-auto text-sm border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
              }`}
              {...props}
            >
              {children}
            </code>
          );
        },
        // Custom styles for standard elements
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mb-4 mt-6 pb-2 border-b border-slate-200">
            {children}
          </h1>
        ),
        h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
        h4: ({ children }) => (
          <h4 className="text-base font-bold mb-2 mt-3 text-slate-700 dark:text-slate-300">
            {children}
          </h4>
        ),
        h5: ({ children }) => (
          <h5 className="text-sm font-bold mb-1 mt-2 text-slate-600 dark:text-slate-400">
            {children}
          </h5>
        ),
        h6: ({ children }) => (
          <h6 className="text-sm font-semibold mb-1 mt-2 text-slate-500 dark:text-slate-500">
            {children}
          </h6>
        ),
        hr: () => <hr className="my-6 border-t border-slate-200 dark:border-slate-700" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-400 pl-4 py-1 my-3 bg-blue-50/50 italic text-slate-700 rounded-r">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => {
          if (href?.startsWith('search:')) {
            // Decode the term because it might have been encoded in pre-processing (e.g. %20 for spaces)
            const term = decodeURIComponent(href.replace('search:', ''));
            return (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(term)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md text-[0.9em] font-medium border border-blue-100 hover:bg-blue-100 hover:text-blue-800 transition-colors mx-0.5 no-underline"
                title={`Search for "${term}"`}
                onClick={(e) => e.stopPropagation()} // Prevent bubbling if needed
              >
                <Search size={10} className="stroke-[3]" />
                {children}
              </a>
            );
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              {children}
            </a>
          );
        },
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
        th: ({ children }) => (
          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-slate-100">
            {children}
          </td>
        ),
        del: ({ children }) => (
          <del className="line-through text-slate-500 dark:text-slate-400">{children}</del>
        ),
        strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
        em: ({ children }) => (
          <em className="italic text-slate-700 dark:text-slate-300">{children}</em>
        ),
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;

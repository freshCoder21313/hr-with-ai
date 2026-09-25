import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Search, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy:', err);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title="Copy code"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

const MermaidBlock: React.FC<{ code: string }> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      setIsRendering(true);
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(false);
        }
      } catch (e) {
        logger.error('Mermaid rendering error:', e);
        setError(true);
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      } finally {
        setIsRendering(false);
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
    <div className="my-4 p-4 rounded-lg bg-muted/50 border border-border overflow-x-auto flex justify-center min-h-[100px] items-center relative">
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <div ref={containerRef} className={isRendering ? 'opacity-0' : 'opacity-100'} />
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
        code(props: { inline?: boolean; className?: string; children?: React.ReactNode }) {
          const { inline, className, children } = props;
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
              <div className="absolute top-2 left-3 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                {lang}
              </div>
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                className="rounded-lg !my-0 !bg-[#1e1e1e] border border-border shadow-sm pt-8"
              >
                {codeText}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code
              className={`${
                inline
                  ? 'bg-muted text-foreground px-1.5 py-0.5 rounded font-mono text-[0.9em] border border-border'
                  : 'block bg-muted text-foreground p-4 rounded-lg my-2 overflow-x-auto text-sm border border-border'
              }`}
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
          <h1 className="text-2xl font-bold mb-4 mt-6 pb-2 border-b border-border text-foreground">
            {children}
          </h1>
        ),
        h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 text-foreground">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4 text-foreground">{children}</h3>,
        h4: ({ children }) => (
          <h4 className="text-base font-bold mb-2 mt-3 text-foreground">
            {children}
          </h4>
        ),
        h5: ({ children }) => (
          <h5 className="text-sm font-bold mb-1 mt-2 text-muted-foreground">
            {children}
          </h5>
        ),
        h6: ({ children }) => (
          <h6 className="text-sm font-semibold mb-1 mt-2 text-muted-foreground">
            {children}
          </h6>
        ),
        hr: () => <hr className="my-6 border-t border-border" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-4 py-1 my-3 bg-accent/50 italic text-foreground rounded-r">
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
            <table className="min-w-full divide-y divide-border border border-border rounded-lg">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
        th: ({ children }) => (
          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-border">
            {children}
          </td>
        ),
        del: ({ children }) => (
          <del className="line-through text-muted-foreground">{children}</del>
        ),
        strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
        em: ({ children }) => (
          <em className="italic text-foreground">{children}</em>
        ),
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;

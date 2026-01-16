import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Search } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = memo(({ content }) => {
  // Pre-process content to convert [[Keyword]] to [Keyword](search:Keyword)
  // This allows us to intercept the link and render a search chip
  const processedContent = content.replace(/\[\[(.*?)\]\]/g, '[$1](search:$1)');

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              className="rounded-lg !my-4 !bg-[#1e1e1e] border border-slate-700 shadow-sm"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code 
              className={`${inline ? 'bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-[0.9em] border border-slate-200' : 'block bg-slate-100 p-4 rounded-lg my-2 overflow-x-auto text-sm'}`} 
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
        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 pb-2 border-b border-slate-200">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-400 pl-4 py-1 my-3 bg-blue-50/50 italic text-slate-700 rounded-r">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => {
          if (href?.startsWith('search:')) {
            const term = href.replace('search:', '');
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
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
              {children}
            </a>
          );
        },
        table: ({ children }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg">{children}</table></div>,
        thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
        th: ({ children }) => <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b">{children}</th>,
        td: ({ children }) => <td className="px-4 py-2 whitespace-nowrap text-sm border-b border-slate-100">{children}</td>,
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
});

export default MarkdownRenderer;

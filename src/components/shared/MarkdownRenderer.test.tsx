import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownRenderer from './MarkdownRenderer';

describe('MarkdownRenderer url sanitization', () => {
  it('neutralizes javascript: links from LLM markdown', () => {
    render(<MarkdownRenderer content={'[click](javascript:alert(1))'} />);
    const link = screen.getByText('click');
    expect(link.getAttribute('href')).not.toBe('javascript:alert(1)');
  });

  it('neutralizes vbscript: and data: links', () => {
    render(<MarkdownRenderer content={'[a](vbscript:msgbox(1)) [b](data:text/html,<h1>x</h1>)'} />);
    expect(screen.getByText('a').getAttribute('href')).not.toContain('vbscript:');
    expect(screen.getByText('b').getAttribute('href')).not.toContain('data:text/html');
  });

  it('preserves search:, http(s) and relative links', () => {
    render(
      <MarkdownRenderer
        content={'[s](search:react) [h](https://example.com) [r](/docs/page)'}
      />
    );
    expect(screen.getByText('s').getAttribute('href')).toContain('search?q=react');
    expect(screen.getByText('h').getAttribute('href')).toBe('https://example.com');
    expect(screen.getByText('r').getAttribute('href')).toBe('/docs/page');
  });
});

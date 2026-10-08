import { describe, it, expect } from 'vitest';
import { sanitizeSvg } from './svgSanitizer';

describe('sanitizeSvg', () => {
  it('strips <script> tags and payloads', () => {
    const dirty = '<svg><script>alert("xss")</script><circle cx="10" cy="10" r="5"/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('alert');
    expect(clean).toContain('<circle cx="10" cy="10" r="5"/>');
  });

  it('strips inline event handlers', () => {
    const dirty = '<svg><rect width="100" height="100" onload="alert(1)" onclick=\'alert(2)\'/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('onload');
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('<rect width="100" height="100"/>');
  });

  it('strips <foreignObject> tags', () => {
    const dirty = '<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></body></foreignObject><g></g></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('<foreignObject');
    expect(clean).not.toContain('<script');
    expect(clean).toContain('<g></g>');
  });

  it('strips javascript: URIs', () => {
    const dirty = '<svg><a href="javascript:alert(1)"><text>Click</text></a></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('javascript:');
  });

  it('preserves valid SVG elements and attributes', () => {
    const valid = '<svg viewBox="0 0 100 100"><path d="M10 10 H 90 V 90 H 10 Z" fill="red"/></svg>';
    expect(sanitizeSvg(valid)).toBe(valid);
  });
});

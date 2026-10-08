/**
 * Sanitizes SVG markup to prevent stored or reflected XSS before insertion into DOM via innerHTML.
 * Strips script tags, foreignObject elements, inline event handlers, and javascript: links.
 */
export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';

  return rawSvg
    // Strip <script>...</script> tags and self-closing <script/>
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    // Strip <foreignObject>...</foreignObject> tags and self-closing
    .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
    .replace(/<foreignObject\b[^>]*\/>/gi, '')
    // Strip all inline event handler attributes: on*="..." or on*='...' or on*=...
    .replace(/\s+on[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    // Strip javascript: protocol in href or xlink:href
    .replace(/(?:href|xlink:href)\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi, '');
}

/**
 * Content validation and sanitization utilities
 */

/**
 * Check if content appears to be CSS code
 */
export function isCSSContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  
  const trimmed = content.trim();

  // If it already contains HTML tags, it's not "raw CSS code".
  // (Event descriptions often include inline styles like style="text-align:left",
  // which would otherwise trip the CSS syntax density heuristic.)
  if (/<[^>]+>/.test(trimmed)) {
    return false;
  }
  
  // Check for common CSS patterns
  const cssPatterns = [
    /^\.\w+.*\{/,           // Starts with CSS class selector
    /^@media/,              // Media query
    /^@keyframes/,          // Keyframes
    /^@import/,             // Import
    /^@charset/,            // Charset
    /^@supports/,           // Supports
    /^@page/,               // Page
    /^@font-face/,          // Font-face
    /^@namespace/,          // Namespace
    /^@document/,           // Document
    /^@viewport/,           // Viewport
    /^@counter-style/,      // Counter-style
    /^@font-feature-values/, // Font-feature-values
    /^@property/,           // Property
    /^@layer/,              // Layer
    /^@container/,          // Container
    /^@scope/,              // Scope
    /^@starting-style/,     // Starting-style
    /margin.*important/i,   // CSS properties with important
    /padding.*important/i,
    /display.*important/i,
    /position.*important/i,
    /width.*important/i,
    /height.*important/i,
    /color.*important/i,
    /background.*important/i,
    /font.*important/i,
    /border.*important/i,
    /box-shadow.*important/i,
    /text-align.*important/i,
    /line-height.*important/i,
    /z-index.*important/i,
    /overflow.*important/i,
    /transform.*important/i,
    /transition.*important/i,
    /animation.*important/i,
    /opacity.*important/i,
    /visibility.*important/i,
    /float.*important/i,
    /clear.*important/i,
    /vertical-align.*important/i,
    /white-space.*important/i,
    /word-wrap.*important/i,
    /word-break.*important/i,
    /text-overflow.*important/i,
    /text-decoration.*important/i,
    /text-transform.*important/i,
    /letter-spacing.*important/i,
    /word-spacing.*important/i,
    /text-indent.*important/i,
    /text-shadow.*important/i,
    /list-style.*important/i,
    /cursor.*important/i,
    /outline.*important/i,
    /resize.*important/i,
    /user-select.*important/i,
    /pointer-events.*important/i,
    /content.*important/i,
    /quotes.*important/i,
    /counter-reset.*important/i,
    /counter-increment.*important/i,
    /page-break.*important/i,
    /break.*important/i,
    /orphans.*important/i,
    /widows.*important/i,
    /columns.*important/i,
    /column-.*important/i,
    /flex.*important/i,
    /grid.*important/i,
    /align.*important/i,
    /justify.*important/i,
    /order.*important/i,
    /gap.*important/i,
    /object-fit.*important/i,
    /object-position.*important/i,
    /filter.*important/i,
    /backdrop-filter.*important/i,
    /mix-blend-mode.*important/i,
    /isolation.*important/i,
    /will-change.*important/i,
    /contain.*important/i,
    /clip-path.*important/i,
    /mask.*important/i,
    /shape-outside.*important/i,
    /perspective.*important/i,
    /perspective-origin.*important/i,
    /transform-style.*important/i,
    /backface-visibility.*important/i,
    /scroll-behavior.*important/i,
    /scroll-snap.*important/i,
    /overscroll-behavior.*important/i,
    /touch-action.*important/i,
    /-webkit-.*important/i,
    /-moz-.*important/i,
    /-ms-.*important/i,
    /-o-.*important/i,
  ];
  
  // Check if content starts with CSS selector or at-rule
  if (trimmed.startsWith('.') || trimmed.startsWith('@') || trimmed.startsWith('#')) {
    return true;
  }
  
  // Check for CSS patterns
  for (const pattern of cssPatterns) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  
  // Check if content has high density of CSS-like syntax
  const cssLikeSyntax = (trimmed.match(/[{}:;!]/g) || []).length;
  const totalLength = trimmed.length;
  if (totalLength > 0 && cssLikeSyntax / totalLength > 0.1) {
    // More than 10% CSS syntax characters suggests it's CSS
    return true;
  }
  
  return false;
}

/**
 * Check if content appears to be valid HTML/text content
 */
export function isValidContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  
  // If it's CSS, it's not valid content
  if (isCSSContent(content)) return false;
  
  // Basic validation: should have some text content
  const textContent = content.replace(/<[^>]*>/g, '').trim();
  return textContent.length > 0;
}

/**
 * Sanitize and prepare content for display
 * Returns sanitized content or null if content is invalid
 */
export function sanitizeContent(content: string | null | undefined): string | null {
  if (!content || typeof content !== 'string') return null;
  
  const trimmed = content.trim();
  if (trimmed.length === 0) return null;
  
  // If it's CSS code, don't render it
  if (isCSSContent(trimmed)) {
    return null;
  }
  
  return trimmed;
}


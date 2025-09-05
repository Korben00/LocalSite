/**
 * Sanitizes HTML content to fix common issues in AI-generated HTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return html;

  let sanitized = html;

  // Fix common broken CDN links
  sanitized = sanitized.replace(
    /https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/heroicons\/[^"'\s]+/g,
    'https://unpkg.com/heroicons@2.0.18/24/outline/index.js'
  );

  // Remove or fix common broken CDN CSS links for heroicons
  sanitized = sanitized.replace(
    /<link[^>]*href="[^"]*heroicons[^"]*\.css"[^>]*>/gi,
    ''
  );

  // Fix broken script tags that might cause syntax errors
  sanitized = sanitized.replace(
    /<script[^>]*>\s*<[^<]*<\/script>/gi,
    ''
  );

  // Wrap potential JavaScript errors in try-catch blocks
  sanitized = sanitized.replace(
    /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,
    (match, scriptContent) => {
      if (!scriptContent.trim()) return match;
      
      // Add try-catch wrapper for inline scripts
      const wrappedContent = `
        try {
          ${scriptContent}
        } catch (error) {
          console.warn('Script error in preview:', error);
        }
      `;
      
      return match.replace(scriptContent, wrappedContent);
    }
  );

  // Add null checks for common DOM manipulation patterns
  sanitized = sanitized.replace(
    /document\.getElementById\(['"`]([^'"`]+)['"`]\)\.addEventListener/g,
    '(document.getElementById(\'$1\') || {addEventListener: () => {}}).addEventListener'
  );

  sanitized = sanitized.replace(
    /document\.querySelector\(['"`]([^'"`]+)['"`]\)\.addEventListener/g,
    '(document.querySelector(\'$1\') || {addEventListener: () => {}}).addEventListener'
  );

  return sanitized;
}
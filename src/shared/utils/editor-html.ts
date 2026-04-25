function stripHtmlComments(html: string): string {
  return html.replace(/<!--([\s\S]*?)-->/g, ' ');
}

function stripDangerousBlocks(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, ' ')
    .replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, ' ')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, ' ')
    .replace(/<source\b[^>]*\/?>/gi, ' ')
    .replace(/<input\b[^>]*\/?>/gi, ' ')
    .replace(/<meta\b[^>]*\/?>/gi, ' ')
    .replace(/<link\b[^>]*\/?>/gi, ' ');
}

function stripRssChromeBlocks(html: string): string {
  return html
    .replace(/<(aside|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(section|div)\b[^>]*(?:id|class)=["'][^"']*(?:widget|sidebar|comment|comments|xenforo|share|social|sponsored|sponsor|popular|newsletter|related|recirc|recirculation|paywall|author-bio|author__|infinite-container|slice-container|follow-us|read-more)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, ' ');
}

function stripUnwantedAttributes(html: string): string {
  return html.replace(/<([a-z0-9-]+)([^>]*)>/gi, (_match, tagName: string, rawAttrs: string) => {
    const lowerTag = tagName.toLowerCase();
    const attrs = rawAttrs || '';
    const allowed: string[] = [];
    const attrRegex = /([:\w-]+)\s*=\s*(["'])(.*?)\2/gi;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[3];

      if (attrName === 'href' && lowerTag === 'a') {
        allowed.push(`href="${attrValue}"`);
        continue;
      }
      if (attrName === 'src' && lowerTag === 'img') {
        allowed.push(`src="${attrValue}"`);
        continue;
      }
      if (attrName === 'alt' && lowerTag === 'img') {
        allowed.push(`alt="${attrValue}"`);
        continue;
      }
      if (attrName === 'title' && (lowerTag === 'a' || lowerTag === 'img')) {
        allowed.push(`title="${attrValue}"`);
        continue;
      }
    }

    return allowed.length > 0 ? `<${lowerTag} ${allowed.join(' ')}>` : `<${lowerTag}>`;
  });
}

function unwrapLayoutTags(html: string): string {
  return html
    .replace(/<\/?(?:article|main|section|div|span|figure|picture|header)\b[^>]*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '<br>');
}

function collapseWhitespace(html: string): string {
  return html
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/(?:\s*<br>\s*){3,}/gi, '<br><br>')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeEditorHtml(html: string): string {
  if (typeof html !== 'string' || html.trim() === '') return '';

  return collapseWhitespace(stripDangerousBlocks(stripHtmlComments(html)));
}

export function normalizeRssHtmlForEditor(html: string): string {
  if (typeof html !== 'string' || html.trim() === '') return '';

  const cleaned = collapseWhitespace(
    stripUnwantedAttributes(
      unwrapLayoutTags(
        stripRssChromeBlocks(
          stripDangerousBlocks(
            stripHtmlComments(html)
          )
        )
      )
    )
  );

  return cleaned;
}
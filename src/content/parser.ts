import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import katex from 'katex';
import { ICONS } from './icons';

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
}

export interface ParseResult {
  html: string;
  headings: HeadingItem[];
}

// Common GitHub emojis
const EMOJI_MAP: Record<string, string> = {
  '+1': '👍',
  '-1': '👎',
  '100': '💯',
  'sparkles': '✨',
  'rocket': '🚀',
  'tada': '🎉',
  'fire': '🔥',
  'bug': '🐛',
  'bulb': '💡',
  'books': '📚',
  'art': '🎨',
  'memo': '📝',
  'zap': '⚡',
  'hammer': '🔨',
  'wrench': '🔧',
  'pencil': '✏️',
  'heavy_check_mark': '✔️',
  'white_check_mark': '✅',
  'x': '❌',
  'warning': '⚠️',
  'point_right': '👉',
  'heart': '❤️',
  'eyes': '👀',
  'star': '⭐',
  'star2': '🌟',
  'smile': '😄',
  'grin': '😁',
  'laughing': '😆',
  'rofl': '🤣',
  'joy': '😂',
  'thinking': '🤔',
  'clap': '👏',
  'wave': '👋',
  'checkered_flag': '🏁',
  'construction': '🚧',
  'lock': '🔒',
  'key': '🔑',
  'package': '📦',
  'mag': '🔍',
  'link': '🔗',
  'gear': '⚙️',
  'shield': '🛡️',
  'bar_chart': '📊',
  'clipboard': '📋'
};

function replaceEmojis(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/g, (match, code) => {
    return EMOJI_MAP[code] || match;
  });
}

function slugify(text: string, existingSlugs: Set<string>): string {
  // Strip HTML tags and markdown formatting
  let clean = text.replace(/<[^>]*>/g, '').trim();
  clean = clean.toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '') // Keep alphanumeric, unicode and hyphen
    .replace(/\s+/g, '-');

  if (!clean) {
    clean = 'section';
  }

  let slug = clean;
  let counter = 1;
  while (existingSlugs.has(slug)) {
    slug = `${clean}-${counter}`;
    counter++;
  }
  existingSlugs.add(slug);
  return slug;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHtml(rawHtml: string): string {
  const purifyConfig = {
    ADD_TAGS: [
      'input',
      'button',
      'math',
      'annotation',
      'semantics',
      'mrow',
      'mi',
      'mo',
      'mn',
      'msup',
      'msub',
      'mfrac',
      'mover',
      'munder',
      'mtable',
      'mtr',
      'mtd'
    ],
    ADD_ATTR: [
      'aria-label',
      'aria-hidden',
      'target',
      'data-code',
      'data-lang',
      'data-mermaid-code',
      'align',
      'xmlns',
      'display'
    ],
    ALLOW_DATA_ATTR: true,
  };

  if (typeof window !== 'undefined') {
    const purifyInstance = typeof (DOMPurify as any).sanitize === 'function'
      ? (DOMPurify as any)
      : (DOMPurify as any)(window);
    return purifyInstance.sanitize(rawHtml, purifyConfig);
  }
  return rawHtml;
}

export function parseMarkdown(markdown: string): ParseResult {
  const headings: HeadingItem[] = [];
  const existingSlugs = new Set<string>();

  // Process math placeholders before marked parses them
  const mathBlocks: { id: string; html: string }[] = [];
  let mathCounter = 0;

  let processed = markdown;

  // Process block math: $$ ... $$
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    const id = `MATH_BLOCK_PLACEHOLDER_${mathCounter++}`;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      mathBlocks.push({ id, html: `<div class="katex-display-wrapper">${rendered}</div>` });
    } catch {
      mathBlocks.push({ id, html: `<pre class="katex-error">${escapeHtml(math)}</pre>` });
    }
    return id;
  });

  // Process inline math: $...$ (avoiding currency like $5 or $$)
  processed = processed.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (_, prefix, math) => {
    const id = `MATH_INLINE_PLACEHOLDER_${mathCounter++}`;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      mathBlocks.push({ id, html: rendered });
    } catch {
      mathBlocks.push({ id, html: `<code>${escapeHtml(math)}</code>` });
    }
    return `${prefix}${id}`;
  });

  // Emojis
  processed = replaceEmojis(processed);

  const marked = new Marked();

  // Custom renderer
  marked.use({
    renderer: {
      heading({ tokens, depth }: { tokens: any[]; depth: number }) {
        const text = this.parser.parseInline(tokens);
        const plainText = text.replace(/<[^>]*>/g, '');
        const id = slugify(plainText, existingSlugs);

        headings.push({
          id,
          level: depth,
          text: plainText
        });

        return `
          <h${depth} id="${id}" class="markdown-heading">
            <a class="heading-anchor" href="#${id}" aria-label="Permalink: ${escapeHtml(plainText)}">
              ${ICONS.link}
            </a>
            <span class="heading-text">${text}</span>
          </h${depth}>
        `;
      },

      code({ text, lang }: { text: string; lang?: string }) {
        const normalizedLang = (lang || '').trim().toLowerCase();

        // Mermaid diagram code block
        if (normalizedLang === 'mermaid') {
          return `
            <div class="mermaid-container">
              <div class="mermaid-header">
                <span class="code-lang-label">mermaid</span>
                <button type="button" class="code-copy-btn" data-code="${escapeHtml(text)}" title="Copy code" aria-label="Copy code">
                  ${ICONS.copy}
                  <span class="copy-text">Copy</span>
                </button>
              </div>
              <div class="mermaid-diagram" data-mermaid-code="${escapeHtml(text)}">${escapeHtml(text)}</div>
            </div>
          `;
        }

        let highlighted = '';
        if (normalizedLang && hljs.getLanguage(normalizedLang)) {
          try {
            highlighted = hljs.highlight(text, { language: normalizedLang, ignoreIllegals: true }).value;
          } catch {
            highlighted = escapeHtml(text);
          }
        } else {
          try {
            highlighted = hljs.highlightAuto(text).value;
          } catch {
            highlighted = escapeHtml(text);
          }
        }

        const displayLang = normalizedLang || 'text';

        return `
          <div class="code-block-wrapper" data-lang="${escapeHtml(displayLang)}">
            <div class="code-block-header">
              <span class="code-lang-label">${escapeHtml(displayLang)}</span>
              <button type="button" class="code-copy-btn" data-code="${escapeHtml(text)}" title="Copy code" aria-label="Copy code">
                ${ICONS.copy}
                <span class="copy-text">Copy</span>
              </button>
            </div>
            <pre><code class="hljs language-${escapeHtml(displayLang)}">${highlighted}</code></pre>
          </div>
        `;
      },

      blockquote({ tokens }: { tokens: any[] }) {
        const rawContent = this.parser.parse(tokens);

        // Check for GitHub Alerts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
        const alertMatch = rawContent.match(/^\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>([\s\S]*)$/i);

        if (alertMatch) {
          const alertType = alertMatch[1].toLowerCase() as 'note' | 'tip' | 'important' | 'warning' | 'caution';
          const firstLineRemainder = alertMatch[2].trim();
          const restOfContent = alertMatch[3];

          const title = alertType.charAt(0).toUpperCase() + alertType.slice(1);
          const iconSvg = ICONS[alertType] || ICONS.note;

          let body = '';
          if (firstLineRemainder) {
            body += `<p>${firstLineRemainder}</p>`;
          }
          if (restOfContent) {
            body += restOfContent;
          }

          return `
            <div class="markdown-alert markdown-alert-${alertType}">
              <p class="markdown-alert-title">
                ${iconSvg}
                <span>${title}</span>
              </p>
              <div class="markdown-alert-content">${body}</div>
            </div>
          `;
        }

        return `<blockquote>${rawContent}</blockquote>`;
      },

      checkbox({ checked }: { checked: boolean }) {
        return `<input class="task-list-item-checkbox" type="checkbox" ${checked ? 'checked' : ''} disabled />`;
      },

      listitem(item: any) {
        let itemBody = this.parser.parse(item.tokens);
        const isTask = item.task;
        if (isTask) {
          return `<li class="task-list-item">${itemBody}</li>`;
        }
        return `<li>${itemBody}</li>`;
      },

      table({ header, rows }: { header: any[]; rows: any[][] }) {
        let headerHtml = '<tr>';
        for (const cell of header) {
          const align = cell.align ? ` align="${cell.align}"` : '';
          headerHtml += `<th${align}>${this.parser.parseInline(cell.tokens)}</th>`;
        }
        headerHtml += '</tr>';

        let bodyHtml = '';
        for (const row of rows) {
          bodyHtml += '<tr>';
          for (const cell of row) {
            const align = cell.align ? ` align="${cell.align}"` : '';
            bodyHtml += `<td${align}>${this.parser.parseInline(cell.tokens)}</td>`;
          }
          bodyHtml += '</tr>';
        }

        return `
          <div class="table-container">
            <table>
              <thead>${headerHtml}</thead>
              <tbody>${bodyHtml}</tbody>
            </table>
          </div>
        `;
      }
    }
  });

  let rawHtml = marked.parse(processed) as string;

  // Restore math placeholders
  for (const item of mathBlocks) {
    rawHtml = rawHtml.replace(item.id, item.html);
  }

  // Sanitize with DOMPurify
  const cleanHtml = sanitizeHtml(rawHtml);

  return {
    html: cleanHtml,
    headings
  };
}

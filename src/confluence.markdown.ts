import TurndownService from 'turndown';
import { gfm } from '@joplin/turndown-plugin-gfm';

const BRUSH_PATTERN = /brush:\s*([\w+#-]+)/;
const PLAIN_BRUSHES = new Set(['none', 'text', 'plain']);
const ROOT_RELATIVE_LINK = /\]\((\/(?!\/)[^)\s]*)/g;

function hasClass(node: HTMLElement, className: string): boolean {
  return (node.getAttribute('class') ?? '').split(/\s+/).includes(className);
}

function createTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  service.use(gfm);
  service.remove(['script', 'style', 'noscript']);

  service.addRule('confluenceCodeMacro', {
    filter: (node) => node.nodeName === 'PRE' && !node.querySelector('code'),
    replacement: (_content, node) => {
      const element = node as HTMLElement;
      const brush =
        element
          .getAttribute('data-syntaxhighlighter-params')
          ?.match(BRUSH_PATTERN)?.[1] ?? '';
      const language = PLAIN_BRUSHES.has(brush) ? '' : brush;
      const code = (element.textContent ?? '').replace(/\n$/, '');
      const fence = code.includes('```') ? '~~~~' : '```';
      return `\n\n${fence}${language}\n${code}\n${fence}\n\n`;
    },
  });

  service.addRule('confluenceInfoPanel', {
    filter: (node) =>
      node.nodeName === 'DIV' &&
      hasClass(node as HTMLElement, 'confluence-information-macro'),
    replacement: (content) => {
      const quoted = content
        .trim()
        .split('\n')
        .map((line) => `> ${line}`.trimEnd())
        .join('\n');
      return `\n\n${quoted}\n\n`;
    },
  });

  return service;
}

const turndownService = createTurndownService();

/**
 * Converts Confluence rendered page HTML (body.view) to Markdown.
 * Root-relative links and images are made absolute against `origin`.
 */
export function confluenceHtmlToMarkdown(html: string, origin: string): string {
  if (!html.trim()) {
    return '';
  }
  return turndownService
    .turndown(html)
    .replace(ROOT_RELATIVE_LINK, (_match, path: string) => `](${origin}${path}`)
    .trim();
}

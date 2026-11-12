import {
  ConfluenceConfig,
  ConfluencePage,
  ConfluencePageSummary,
  ConfluenceRawContent,
  ConfluenceRawContentList,
} from './confluence.js';
import { confluenceHtmlToMarkdown } from './confluence.markdown.js';
import {
  extractConfluencePageUrls,
  isUrlOnHost,
  parsePageReference,
} from './confluence.url.js';

export const DEFAULT_PAGE_MAX_LENGTH = 50000;

export class ConfluenceService {
  private readonly baseUrl: string;
  private readonly origin: string;
  private readonly authorization: string;

  constructor(config: ConfluenceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.origin = new URL(this.baseUrl).origin;
    // NOTE: Server/DC 7.9+ accepts PATs as Bearer; older versions only support
    // Basic username:password, enabled by setting CONFLUENCE_USERNAME.
    this.authorization = config.username
      ? `Basic ${Buffer.from(`${config.username}:${config.apiToken}`).toString('base64')}`
      : `Bearer ${config.apiToken}`;
  }

  private async request<T>(
    path: string,
    params: Record<string, string | number> = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/rest/api/${path}`);
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, String(value)),
    );

    const response = await fetch(url, {
      headers: {
        Authorization: this.authorization,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(
        `Confluence API request failed: ${response.status} ${response.statusText} (${url.pathname}) ${details.slice(0, 300)}`.trim(),
      );
    }

    return (await response.json()) as T;
  }

  private pageUrl(pageId: string): string {
    return `${this.baseUrl}/pages/viewpage.action?pageId=${pageId}`;
  }

  private toSummary(raw: ConfluenceRawContent): ConfluencePageSummary {
    return {
      id: raw.id,
      title: raw.title,
      spaceKey: raw.space?.key ?? '',
      url: this.pageUrl(raw.id),
      lastUpdated: raw.version?.when,
    };
  }

  isConfluenceUrl(url: string): boolean {
    return isUrlOnHost(url, this.baseUrl);
  }

  extractPageUrls(text: string): string[] {
    return extractConfluencePageUrls(text, this.baseUrl);
  }

  async resolvePageId(pageUrlOrId: string): Promise<string> {
    const reference = parsePageReference(pageUrlOrId);
    if (!reference) {
      throw new Error(
        `Not a recognizable Confluence page: "${pageUrlOrId}". Pass a page ID or a page URL.`,
      );
    }
    if ('pageId' in reference) {
      return reference.pageId;
    }

    const { results } = await this.request<ConfluenceRawContentList>(
      'content',
      {
        type: 'page',
        spaceKey: reference.spaceKey,
        title: reference.title,
        limit: 1,
      },
    );
    if (!results.length) {
      throw new Error(
        `Page "${reference.title}" not found in space ${reference.spaceKey}.`,
      );
    }
    return results[0].id;
  }

  async getPage(
    pageUrlOrId: string,
    maxLength: number = DEFAULT_PAGE_MAX_LENGTH,
  ): Promise<ConfluencePage> {
    const pageId = await this.resolvePageId(pageUrlOrId);
    const raw = await this.request<ConfluenceRawContent>(`content/${pageId}`, {
      expand: 'body.view,version,space,ancestors',
    });

    const markdown = confluenceHtmlToMarkdown(
      raw.body?.view?.value ?? '',
      this.origin,
    );
    const truncated = markdown.length > maxLength;

    return {
      ...this.toSummary(raw),
      spaceName: raw.space?.name ?? '',
      version: raw.version?.number,
      lastUpdatedBy: raw.version?.by?.displayName,
      breadcrumbs: (raw.ancestors ?? []).map((ancestor) => ancestor.title),
      body: truncated ? markdown.slice(0, maxLength) : markdown,
      truncated,
    };
  }

  async search(cql: string, limit = 25): Promise<ConfluencePageSummary[]> {
    const { results } = await this.request<ConfluenceRawContentList>(
      'content/search',
      { cql, limit, expand: 'space,version' },
    );
    return results.map((raw) => this.toSummary(raw));
  }

  async getChildPages(
    pageUrlOrId: string,
    limit = 100,
  ): Promise<ConfluencePageSummary[]> {
    const pageId = await this.resolvePageId(pageUrlOrId);
    const { results } = await this.request<ConfluenceRawContentList>(
      `content/${pageId}/child/page`,
      { limit, expand: 'space,version' },
    );
    return results.map((raw) => this.toSummary(raw));
  }
}

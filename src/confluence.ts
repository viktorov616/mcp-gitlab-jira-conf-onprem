/**
 * Shared types for Confluence Server/Data Center integration
 */

export interface ConfluenceConfig {
  baseUrl: string;
  apiToken: string;
  username?: string;
}

export type ConfluencePageReference =
  { pageId: string } | { spaceKey: string; title: string };

export interface ConfluencePageSummary {
  id: string;
  title: string;
  spaceKey: string;
  url: string;
  lastUpdated?: string;
}

export interface ConfluencePage extends ConfluencePageSummary {
  spaceName: string;
  version?: number;
  lastUpdatedBy?: string;
  breadcrumbs: string[];
  body: string;
  truncated: boolean;
}

export interface ConfluenceRawContent {
  id: string;
  title: string;
  space?: { key: string; name: string };
  version?: { number: number; when: string; by?: { displayName?: string } };
  ancestors?: { title: string }[];
  body?: { view?: { value: string } };
}

export interface ConfluenceRawContentList {
  results: ConfluenceRawContent[];
}

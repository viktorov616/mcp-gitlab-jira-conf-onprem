import { ConfluencePage } from './confluence.js';
import { ConfluenceService } from './confluence.service.js';
import { JiraTicket } from './jira.js';
import { JiraService } from './jira.service.js';

const CONFLUENCE_APPLICATION_TYPE = 'com.atlassian.confluence';

type LinkSource = 'remote-link' | 'description';

interface LinkFailure {
  source: LinkSource;
  url: string;
  error: string;
}

interface LinkedPage {
  source: LinkSource;
  url: string;
  page: ConfluencePage;
}

export type LinkedConfluencePage = LinkedPage | LinkFailure;

export interface TicketWithConfluencePages {
  ticket: JiraTicket;
  confluencePages: LinkedConfluencePage[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Loads a Jira ticket together with every Confluence page it points to,
 * via Jira remote links ("Confluence pages" panel) and URLs in the description.
 * A page that fails to load is reported per link instead of failing the call.
 */
export async function getTicketWithConfluencePages(
  jira: JiraService,
  confluence: ConfluenceService,
  ticketId: string,
  maxPageLength?: number,
): Promise<TicketWithConfluencePages> {
  const [ticket, remoteLinks] = await Promise.all([
    jira.getTicketDetails(ticketId),
    jira.getRemoteLinks(ticketId),
  ]);

  const candidates = [
    ...remoteLinks
      .filter(
        (link) =>
          link.url &&
          (link.applicationType === CONFLUENCE_APPLICATION_TYPE ||
            confluence.isConfluenceUrl(link.url)),
      )
      .map((link) => ({ source: 'remote-link' as const, url: link.url })),
    ...confluence
      .extractPageUrls(ticket.description ?? '')
      .map((url) => ({ source: 'description' as const, url })),
  ];

  const resolved = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        return {
          ...candidate,
          pageId: await confluence.resolvePageId(candidate.url),
        };
      } catch (error) {
        return { ...candidate, error: errorMessage(error) };
      }
    }),
  );

  const seenPageIds = new Set<string>();
  const unique = resolved.filter((candidate) => {
    if ('error' in candidate) {
      return true;
    }
    if (seenPageIds.has(candidate.pageId)) {
      return false;
    }
    seenPageIds.add(candidate.pageId);
    return true;
  });

  const confluencePages = await Promise.all(
    unique.map(async (candidate): Promise<LinkedConfluencePage> => {
      if ('error' in candidate) {
        return candidate;
      }
      const { source, url, pageId } = candidate;
      try {
        return {
          source,
          url,
          page: await confluence.getPage(pageId, maxPageLength),
        };
      } catch (error) {
        return { source, url, error: errorMessage(error) };
      }
    }),
  );

  return { ticket, confluencePages };
}

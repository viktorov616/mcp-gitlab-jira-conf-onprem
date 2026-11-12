import { ConfluencePage } from './confluence';
import { ConfluenceService } from './confluence.service';
import { JiraService } from './jira.service';
import { getTicketWithConfluencePages } from './ticket-docs';

function page(id: string): ConfluencePage {
  return {
    id,
    title: `Page ${id}`,
    spaceKey: 'DEV',
    spaceName: 'Dev',
    url: `https://wiki.example.com/pages/viewpage.action?pageId=${id}`,
    breadcrumbs: [],
    body: `body ${id}`,
    truncated: false,
  };
}

describe('getTicketWithConfluencePages', () => {
  const ticket = {
    id: '1',
    key: 'PROJ-1',
    summary: 'Ticket',
    status: 'Open',
    description: [
      'ТЗ: [здесь|https://wiki.example.com/pages/viewpage.action?pageId=10]',
      'Макет: https://wiki.example.com/pages/viewpage.action?pageId=20',
      'Битая: https://wiki.example.com/display/DEV/Missing',
    ].join('\n'),
  };

  const remoteLinks = [
    {
      title: 'Page',
      url: 'https://confluence-applink.internal/pages/viewpage.action?pageId=10',
      applicationType: 'com.atlassian.confluence',
    },
    {
      title: 'Page',
      url: 'https://wiki.example.com/pages/viewpage.action?pageId=30',
      applicationType: 'com.atlassian.confluence',
    },
    { title: 'GitLab MR', url: 'https://gitlab.example.com/mr/1' },
  ];

  function createServices() {
    const jira = {
      getTicketDetails: jest.fn().mockResolvedValue(ticket),
      getRemoteLinks: jest.fn().mockResolvedValue(remoteLinks),
    } as unknown as JiraService;

    const realService = new ConfluenceService({
      baseUrl: 'https://wiki.example.com',
      apiToken: 'pat',
    });
    const getPage = jest.fn(async (pageId: string) => {
      if (pageId === '30') {
        throw new Error('403 Forbidden');
      }
      return page(pageId);
    });
    const confluence = {
      isConfluenceUrl: (url: string) => realService.isConfluenceUrl(url),
      extractPageUrls: (text: string) => realService.extractPageUrls(text),
      resolvePageId: jest.fn(async (url: string) => {
        if (url.includes('/display/')) {
          throw new Error('Page "Missing" not found in space DEV.');
        }
        return new URL(url).searchParams.get('pageId') as string;
      }),
      getPage,
    } as unknown as ConfluenceService;

    return { jira, confluence, getPage };
  }

  it('collects pages from remote links and description, deduplicated, with per-link errors', async () => {
    const { jira, confluence, getPage } = createServices();

    const result = await getTicketWithConfluencePages(
      jira,
      confluence,
      'PROJ-1',
      1000,
    );

    expect(result.ticket).toBe(ticket);
    expect(getPage).toHaveBeenCalledTimes(3);
    expect(getPage).toHaveBeenCalledWith('10', 1000);
    expect(result.confluencePages).toEqual([
      {
        source: 'remote-link',
        url: 'https://confluence-applink.internal/pages/viewpage.action?pageId=10',
        page: page('10'),
      },
      {
        source: 'remote-link',
        url: 'https://wiki.example.com/pages/viewpage.action?pageId=30',
        error: '403 Forbidden',
      },
      {
        source: 'description',
        url: 'https://wiki.example.com/pages/viewpage.action?pageId=20',
        page: page('20'),
      },
      {
        source: 'description',
        url: 'https://wiki.example.com/display/DEV/Missing',
        error: 'Page "Missing" not found in space DEV.',
      },
    ]);
  });
});

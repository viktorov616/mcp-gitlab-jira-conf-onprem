import { ConfluenceService } from './confluence.service';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const rawPage = {
  id: '42',
  title: 'ТЗ',
  space: { key: 'DEV', name: 'Разработка' },
  version: {
    number: 3,
    when: '2026-01-01T00:00:00.000Z',
    by: { displayName: 'Иван' },
  },
  ancestors: [{ title: 'Проект' }, { title: 'Требования' }],
  body: { view: { value: '<h1>Заголовок</h1><p>Текст</p>' } },
};

describe('ConfluenceService', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  function requestedUrl(callIndex = 0): URL {
    return new URL(String(fetchMock.mock.calls[callIndex][0]));
  }

  function requestedHeaders(callIndex = 0): Record<string, string> {
    return fetchMock.mock.calls[callIndex][1].headers;
  }

  it('fetches a page by URL with Bearer auth and converts it to Markdown', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(rawPage));
    const service = new ConfluenceService({
      baseUrl: 'https://example.com/confluence/',
      apiToken: 'pat',
    });

    const page = await service.getPage(
      'https://example.com/confluence/pages/viewpage.action?pageId=42',
    );

    expect(requestedUrl().pathname).toBe('/confluence/rest/api/content/42');
    expect(requestedUrl().searchParams.get('expand')).toBe(
      'body.view,version,space,ancestors',
    );
    expect(requestedHeaders().Authorization).toBe('Bearer pat');
    expect(page).toEqual({
      id: '42',
      title: 'ТЗ',
      spaceKey: 'DEV',
      spaceName: 'Разработка',
      url: 'https://example.com/confluence/pages/viewpage.action?pageId=42',
      version: 3,
      lastUpdated: '2026-01-01T00:00:00.000Z',
      lastUpdatedBy: 'Иван',
      breadcrumbs: ['Проект', 'Требования'],
      body: '# Заголовок\n\nТекст',
      truncated: false,
    });
  });

  it('uses Basic auth when a username is configured', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(rawPage));
    const service = new ConfluenceService({
      baseUrl: 'https://wiki.example.com',
      apiToken: 'secret',
      username: 'user',
    });

    await service.getPage('42');

    expect(requestedHeaders().Authorization).toBe(
      `Basic ${Buffer.from('user:secret').toString('base64')}`,
    );
  });

  it('truncates long pages', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(rawPage));
    const service = new ConfluenceService({
      baseUrl: 'https://wiki.example.com',
      apiToken: 'pat',
    });

    const page = await service.getPage('42', 5);

    expect(page.body).toBe('# Заг');
    expect(page.truncated).toBe(true);
  });

  it('resolves /display/ URLs through a title lookup', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ results: [{ id: '42', title: 'ТЗ' }] }),
      )
      .mockResolvedValueOnce(jsonResponse(rawPage));
    const service = new ConfluenceService({
      baseUrl: 'https://wiki.example.com',
      apiToken: 'pat',
    });

    const page = await service.getPage(
      'https://wiki.example.com/display/DEV/My+Page',
    );

    expect(requestedUrl(0).pathname).toBe('/rest/api/content');
    expect(requestedUrl(0).searchParams.get('spaceKey')).toBe('DEV');
    expect(requestedUrl(0).searchParams.get('title')).toBe('My Page');
    expect(requestedUrl(1).pathname).toBe('/rest/api/content/42');
    expect(page.id).toBe('42');
  });

  it('fails clearly when a /display/ page does not exist', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));
    const service = new ConfluenceService({
      baseUrl: 'https://wiki.example.com',
      apiToken: 'pat',
    });

    await expect(
      service.getPage('https://wiki.example.com/display/DEV/Missing'),
    ).rejects.toThrow('Page "Missing" not found in space DEV.');
  });

  it('includes status and response details in API errors', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"message":"No permission"}', {
        status: 403,
        statusText: 'Forbidden',
      }),
    );
    const service = new ConfluenceService({
      baseUrl: 'https://wiki.example.com',
      apiToken: 'pat',
    });

    await expect(service.getPage('42')).rejects.toThrow(
      'Confluence API request failed: 403 Forbidden (/rest/api/content/42) {"message":"No permission"}',
    );
  });

  it('searches with CQL and maps results to summaries', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [rawPage] }));
    const service = new ConfluenceService({
      baseUrl: 'https://wiki.example.com',
      apiToken: 'pat',
    });

    const results = await service.search('space = DEV', 10);

    expect(requestedUrl().pathname).toBe('/rest/api/content/search');
    expect(requestedUrl().searchParams.get('cql')).toBe('space = DEV');
    expect(requestedUrl().searchParams.get('limit')).toBe('10');
    expect(results).toEqual([
      {
        id: '42',
        title: 'ТЗ',
        spaceKey: 'DEV',
        url: 'https://wiki.example.com/pages/viewpage.action?pageId=42',
        lastUpdated: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('lists child pages', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [rawPage] }));
    const service = new ConfluenceService({
      baseUrl: 'https://wiki.example.com',
      apiToken: 'pat',
    });

    const results = await service.getChildPages('7');

    expect(requestedUrl().pathname).toBe('/rest/api/content/7/child/page');
    expect(results.map((result) => result.id)).toEqual(['42']);
  });

  it('rejects unrecognizable page references without calling the API', async () => {
    const service = new ConfluenceService({
      baseUrl: 'https://wiki.example.com',
      apiToken: 'pat',
    });

    await expect(service.getPage('hello')).rejects.toThrow(
      'Not a recognizable Confluence page',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

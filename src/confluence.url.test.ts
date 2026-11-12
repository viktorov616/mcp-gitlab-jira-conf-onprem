import {
  decodeTinyLinkPageId,
  extractConfluencePageUrls,
  parsePageReference,
} from './confluence.url';

function encodeTinyLink(pageId: bigint): string {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(pageId);
  return bytes
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/A+$/, '')
    .replace(/\//g, '-')
    .replace(/\+/g, '_');
}

describe('decodeTinyLinkPageId', () => {
  it.each([1n, 255n, 12345678n, 987654321n, 2147483647n, 9876543210n])(
    'round-trips page ID %s',
    (pageId) => {
      expect(decodeTinyLinkPageId(encodeTinyLink(pageId))).toBe(
        pageId.toString(),
      );
    },
  );

  it('decodes a known tiny link', () => {
    expect(decodeTinyLinkPageId('TmG8')).toBe('12345678');
  });
});

describe('parsePageReference', () => {
  const base = 'https://wiki.example.com';

  it.each([
    ['123456', { pageId: '123456' }],
    [`${base}/pages/viewpage.action?pageId=123456`, { pageId: '123456' }],
    [
      `${base}/confluence/pages/viewpage.action?pageId=42#section`,
      { pageId: '42' },
    ],
    [`${base}/spaces/DEV/pages/777/Some+Title`, { pageId: '777' }],
    [`${base}/x/TmG8`, { pageId: '12345678' }],
    [
      `${base}/display/DEV/%D0%A2%D0%97+%D0%BD%D0%B0+%D1%84%D0%BE%D1%80%D0%BC%D1%83`,
      { spaceKey: 'DEV', title: 'ТЗ на форму' },
    ],
    [
      `${base}/pages/viewpage.action?spaceKey=DEV&title=My+Page`,
      { spaceKey: 'DEV', title: 'My Page' },
    ],
  ])('parses %s', (input, expected) => {
    expect(parsePageReference(input)).toEqual(expected);
  });

  it.each([
    'not a url',
    `${base}/download/attachments/1/file.pdf`,
    `${base}/display/DEV`,
    `${base}/display/DEV/2024/01/01/blog-post`,
  ])('returns null for %s', (input) => {
    expect(parsePageReference(input)).toBeNull();
  });
});

describe('extractConfluencePageUrls', () => {
  it('finds page links in Jira wiki markup and plain text, deduplicated', () => {
    const description = [
      'Описание в [ТЗ|https://wiki.example.com/pages/viewpage.action?pageId=1].',
      'См. также https://wiki.example.com/display/DEV/Page, и ещё раз',
      'https://wiki.example.com/pages/viewpage.action?pageId=1',
      'Вложение https://wiki.example.com/download/attachments/1/a.pdf',
      'Чужая ссылка https://other.example.com/pages/viewpage.action?pageId=9',
    ].join('\n');

    expect(
      extractConfluencePageUrls(description, 'https://wiki.example.com'),
    ).toEqual([
      'https://wiki.example.com/pages/viewpage.action?pageId=1',
      'https://wiki.example.com/display/DEV/Page',
    ]);
  });

  it('matches http links when the base URL uses https', () => {
    expect(
      extractConfluencePageUrls(
        'http://wiki.example.com/x/TmG8',
        'https://wiki.example.com/',
      ),
    ).toEqual(['http://wiki.example.com/x/TmG8']);
  });
});

import { confluenceHtmlToMarkdown } from './confluence.markdown';

const origin = 'https://wiki.example.com';

describe('confluenceHtmlToMarkdown', () => {
  it('returns empty string for empty body', () => {
    expect(confluenceHtmlToMarkdown('  ', origin)).toBe('');
  });

  it('converts headings, emphasis and tables', () => {
    const html = `<h2>Поля формы</h2><p>Текст <strong>жирный</strong></p>
      <div class="table-wrap"><table class="confluenceTable"><tbody>
        <tr><th>Поле</th><th>Тип</th></tr>
        <tr><td><p>name</p></td><td>string</td></tr>
      </tbody></table></div>`;

    expect(confluenceHtmlToMarkdown(html, origin)).toBe(
      [
        '## Поля формы',
        '',
        'Текст **жирный**',
        '',
        '| Поле | Тип |',
        '| --- | --- |',
        '| name | string |',
      ].join('\n'),
    );
  });

  it('fences code macro output with its language', () => {
    const html = `<div class="code panel"><div class="codeContent"><pre class="syntaxhighlighter-pre" data-syntaxhighlighter-params="brush: js; gutter: false">const x = 1;
console.log(x);</pre></div></div>`;

    expect(confluenceHtmlToMarkdown(html, origin)).toBe(
      '```js\nconst x = 1;\nconsole.log(x);\n```',
    );
  });

  it('omits language for plain code blocks', () => {
    const html = `<pre class="syntaxhighlighter-pre" data-syntaxhighlighter-params="brush: none">raw</pre>`;

    expect(confluenceHtmlToMarkdown(html, origin)).toBe('```\nraw\n```');
  });

  it('renders info/note panels as blockquotes', () => {
    const html = `<div class="confluence-information-macro confluence-information-macro-note"><span class="aui-icon"></span><div class="confluence-information-macro-body"><p>Важно!</p><p>Вторая строка</p></div></div>`;

    expect(confluenceHtmlToMarkdown(html, origin)).toBe(
      '> Важно!\n>\n> Вторая строка',
    );
  });

  it('makes root-relative links and images absolute', () => {
    const html = `<p><a href="/confluence/pages/viewpage.action?pageId=5">ссылка</a>
      <a href="https://external.example.com/a">внешняя</a></p>
      <img src="/confluence/download/attachments/5/img.png">`;

    const markdown = confluenceHtmlToMarkdown(html, origin);

    expect(markdown).toContain(
      '[ссылка](https://wiki.example.com/confluence/pages/viewpage.action?pageId=5)',
    );
    expect(markdown).toContain('[внешняя](https://external.example.com/a)');
    expect(markdown).toContain(
      '![](https://wiki.example.com/confluence/download/attachments/5/img.png)',
    );
  });

  it('drops scripts and styles', () => {
    expect(
      confluenceHtmlToMarkdown(
        '<p>текст</p><script>alert(1)</script><style>.x{}</style>',
        origin,
      ),
    ).toBe('текст');
  });
});

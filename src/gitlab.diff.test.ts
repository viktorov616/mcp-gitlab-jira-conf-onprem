import { annotateDiffWithLineNumbers } from './gitlab.diff';

describe('annotateDiffWithLineNumbers', () => {
  it('returns empty string for an empty diff', () => {
    expect(annotateDiffWithLineNumbers('')).toBe('');
  });

  it('numbers context, removed and added lines across hunks', () => {
    const diff = [
      '@@ -8,3 +8,3 @@ function render() {',
      ' const a = 1;',
      '-const b = 2;',
      '+const b = 3;',
      ' const c = 4;',
      '@@ -98,2 +98,3 @@',
      ' return a;',
      '+// added',
      ' }',
      '',
    ].join('\n');

    expect(annotateDiffWithLineNumbers(diff)).toBe(
      [
        '@@ -8,3 +8,3 @@ function render() {',
        '  8   8  const a = 1;',
        '  9     -const b = 2;',
        '      9 +const b = 3;',
        ' 10  10  const c = 4;',
        '@@ -98,2 +98,3 @@',
        ' 98  98  return a;',
        '     99 +// added',
        ' 99 100  }',
      ].join('\n'),
    );
  });

  it('does not count "no newline" markers as lines', () => {
    const diff = [
      '@@ -1 +1 @@',
      '-old',
      '\\ No newline at end of file',
      '+new',
      '\\ No newline at end of file',
    ].join('\n');

    expect(annotateDiffWithLineNumbers(diff)).toBe(
      [
        '@@ -1 +1 @@',
        '1   -old',
        '    \\ No newline at end of file',
        '  1 +new',
        '    \\ No newline at end of file',
      ].join('\n'),
    );
  });
});

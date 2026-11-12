const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

interface AnnotatedLine {
  text: string;
  oldLine?: number;
  newLine?: number;
  isHunkHeader?: boolean;
}

function splitDiffLines(diff: string): string[] {
  if (!diff) {
    return [];
  }
  return (diff.endsWith('\n') ? diff.slice(0, -1) : diff).split('\n');
}

/**
 * Prefixes each unified-diff line with its old and new line numbers
 * (blank when the line does not exist on that side), e.g.
 *
 *   @@ -10,2 +10,2 @@
 *   10 10  unchanged
 *   11    -removed
 *      11 +added
 */
export function annotateDiffWithLineNumbers(diff: string): string {
  const annotated: AnnotatedLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const text of splitDiffLines(diff)) {
    const header = text.match(HUNK_HEADER);
    if (header) {
      oldLine = Number(header[1]);
      newLine = Number(header[2]);
      annotated.push({ text, isHunkHeader: true });
    } else if (text.startsWith('+')) {
      annotated.push({ text, newLine: newLine++ });
    } else if (text.startsWith('-')) {
      annotated.push({ text, oldLine: oldLine++ });
    } else if (text.startsWith('\\')) {
      annotated.push({ text });
    } else {
      annotated.push({ text, oldLine: oldLine++, newLine: newLine++ });
    }
  }

  const width = String(Math.max(oldLine - 1, newLine - 1, 1)).length;
  const column = (lineNumber?: number) =>
    (lineNumber === undefined ? '' : String(lineNumber)).padStart(width);

  return annotated
    .map((line) =>
      line.isHunkHeader
        ? line.text
        : `${column(line.oldLine)} ${column(line.newLine)} ${line.text}`,
    )
    .join('\n');
}

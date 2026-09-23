/**
 * Pure plain-text editing operations used by the keyboard toolbar.
 *
 * Notes are stored as plain text. Structure is expressed with line prefixes:
 *   "☐ " open to-do, "☑ " done to-do, "• " bullet, and leading spaces for indent.
 */

export type Selection = { start: number; end: number };
export type Edit = { text: string; selection: Selection };

export const TODO_OPEN = '☐ ';
export const TODO_DONE = '☑ ';
export const BULLET = '• ';
export const INDENT = '    ';

const MARKERS = [TODO_OPEN, TODO_DONE, BULLET] as const;
type Marker = (typeof MARKERS)[number];

type ParsedLine = { indent: string; marker: Marker | ''; rest: string };

export function parseLine(line: string): ParsedLine {
  const indent = /^[ \t]*/.exec(line)![0];
  const afterIndent = line.slice(indent.length);
  const marker = MARKERS.find((m) => afterIndent.startsWith(m)) ?? '';
  return { indent, marker, rest: afterIndent.slice(marker.length) };
}

const joinLine = (p: ParsedLine) => p.indent + p.marker + p.rest;

/** Character offsets of the start of every line touched by the selection. */
function touchedLines(text: string, sel: Selection): { from: number; to: number } {
  const from = text.lastIndexOf('\n', sel.start - 1) + 1;
  const nl = text.indexOf('\n', sel.end);
  return { from, to: nl === -1 ? text.length : nl };
}

/**
 * Rewrites every line touched by the selection and keeps the cursor/selection
 * attached to the same text it was next to.
 */
function mapLines(edit: Edit, fn: (line: ParsedLine) => ParsedLine): Edit {
  const { text, selection } = edit;
  const { from, to } = touchedLines(text, selection);
  const oldLines = text.slice(from, to).split('\n');
  const newLines = oldLines.map((l) => joinLine(fn(parseLine(l))));

  // Shift each selection endpoint by the length change of the lines before it,
  // plus the change of its own line (clamped so it never moves before line start).
  const shift = (pos: number) => {
    let lineStart = from;
    let delta = 0;
    for (let i = 0; i < oldLines.length; i++) {
      const lineEnd = lineStart + oldLines[i].length;
      if (pos <= lineEnd || i === oldLines.length - 1) {
        const lineDelta = newLines[i].length - oldLines[i].length;
        const newLineStart = lineStart + delta;
        return Math.max(newLineStart, pos + delta + lineDelta);
      }
      delta += newLines[i].length - oldLines[i].length;
      lineStart = lineEnd + 1;
    }
    return pos + delta;
  };

  const next = text.slice(0, from) + newLines.join('\n') + text.slice(to);
  return { text: next, selection: { start: shift(selection.start), end: shift(selection.end) } };
}

function linesInSelection(edit: Edit): ParsedLine[] {
  const { from, to } = touchedLines(edit.text, edit.selection);
  return edit.text.slice(from, to).split('\n').map(parseLine);
}

const isTodo = (m: Marker | '') => m === TODO_OPEN || m === TODO_DONE;

/** Turns lines into to-dos, or back into plain lines if they already all are. */
export function toggleTodo(edit: Edit): Edit {
  const allTodo = linesInSelection(edit).every((l) => isTodo(l.marker));
  return mapLines(edit, (l) =>
    allTodo ? { ...l, marker: '' } : { ...l, marker: isTodo(l.marker) ? l.marker : TODO_OPEN },
  );
}

/** Ticks / unticks to-dos. Lines that aren't to-dos yet become open to-dos. */
export function toggleDone(edit: Edit): Edit {
  const lines = linesInSelection(edit);
  if (!lines.some((l) => isTodo(l.marker))) return toggleTodo(edit);
  const allDone = lines.filter((l) => isTodo(l.marker)).every((l) => l.marker === TODO_DONE);
  return mapLines(edit, (l) =>
    isTodo(l.marker) ? { ...l, marker: allDone ? TODO_OPEN : TODO_DONE } : l,
  );
}

export function toggleBullet(edit: Edit): Edit {
  const allBullets = linesInSelection(edit).every((l) => l.marker === BULLET);
  return mapLines(edit, (l) => ({ ...l, marker: allBullets ? '' : BULLET }));
}

export function indent(edit: Edit): Edit {
  return mapLines(edit, (l) => ({ ...l, indent: INDENT + l.indent }));
}

export function outdent(edit: Edit): Edit {
  return mapLines(edit, (l) => {
    if (l.indent.startsWith('\t')) return { ...l, indent: l.indent.slice(1) };
    const spaces = /^ {0,4}/.exec(l.indent)![0].length;
    return { ...l, indent: l.indent.slice(spaces) };
  });
}

/**
 * Where a single typed newline went, or -1 if `next` isn't `prev` plus one
 * newline. Inside a run of blank lines several positions give the same text;
 * `caret` (where the caret was, or just after it on platforms that report the
 * caret move before the text change) picks between them.
 */
function newlineInsertedAt(prev: string, next: string, caret: number): number {
  if (next.length !== prev.length + 1) return -1;
  let first = 0;
  while (first < prev.length && prev[first] === next[first]) first++;
  if (next[first] !== '\n' || next.slice(first + 1) !== prev.slice(first)) return -1;
  // Every position in [lowest, first] produces the same text.
  let lowest = first;
  while (lowest > 0 && prev[lowest - 1] === '\n') lowest--;
  if (caret >= lowest && caret <= first) return caret;
  if (caret - 1 >= lowest && caret - 1 <= first) return caret - 1;
  return first;
}

/**
 * Called after every keystroke. If the user just pressed Return inside a
 * list line, continue the list (or end it, when the line was empty) the way
 * Apple Notes does. Returns null when the change needs no adjustment.
 */
export function continueListOnNewline(prev: string, next: string, prevSel: Selection): Edit | null {
  if (prevSel.start !== prevSel.end) return null;
  const pos = newlineInsertedAt(prev, next, prevSel.start);
  if (pos === -1) return null;

  const lineStart = prev.lastIndexOf('\n', pos - 1) + 1;
  const lineEndIdx = prev.indexOf('\n', pos);
  const lineEnd = lineEndIdx === -1 ? prev.length : lineEndIdx;
  const line = parseLine(prev.slice(lineStart, lineEnd));
  if (!line.marker && !line.indent) return null;

  // Return on an empty item steps it out one level, then ends the list.
  if (line.rest.trim() === '' && pos === lineEnd) {
    const replacement = line.indent
      ? outdent({ text: line.indent + line.marker, selection: { start: 0, end: 0 } }).text
      : '';
    const text = prev.slice(0, lineStart) + replacement + prev.slice(lineEnd);
    const cursor = lineStart + replacement.length;
    return { text, selection: { start: cursor, end: cursor } };
  }

  const nextMarker = line.marker === TODO_DONE ? TODO_OPEN : line.marker;
  const insert = '\n' + line.indent + nextMarker;
  const text = prev.slice(0, pos) + insert + prev.slice(pos);
  const cursor = pos + insert.length;
  return { text, selection: { start: cursor, end: cursor } };
}

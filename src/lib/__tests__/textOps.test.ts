/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NoteHistory } from '../history.ts';
import {
  continueListOnNewline,
  indent,
  outdent,
  toggleBullet,
  toggleDone,
  toggleTodo,
  type Edit,
} from '../textOps.ts';

/** Builds an Edit from text where "|" marks the caret (or "[" "]" a selection). */
function at(src: string): Edit {
  if (src.includes('|')) {
    const i = src.indexOf('|');
    return { text: src.replace('|', ''), selection: { start: i, end: i } };
  }
  const start = src.indexOf('[');
  const end = src.indexOf(']') - 1;
  return { text: src.replace('[', '').replace(']', ''), selection: { start, end } };
}

function show(e: Edit): string {
  const { start, end } = e.selection;
  if (start === end) return e.text.slice(0, start) + '|' + e.text.slice(start);
  return e.text.slice(0, start) + '[' + e.text.slice(start, end) + ']' + e.text.slice(end);
}

test('toggleTodo adds and removes a checkbox, keeping the caret on its text', () => {
  assert.equal(show(toggleTodo(at('buy mi|lk'))), '☐ buy mi|lk');
  assert.equal(show(toggleTodo(at('☐ buy mi|lk'))), 'buy mi|lk');
  assert.equal(show(toggleTodo(at('|'))), '☐ |');
});

test('toggleTodo on a multi-line selection converts every line', () => {
  assert.equal(show(toggleTodo(at('[a\nb]\nc'))), '☐ [a\n☐ b]\nc');
  assert.equal(show(toggleTodo(at('[☐ a\nb]'))), '[☐ a\n☐ b]');
});

test('toggleTodo replaces a bullet and keeps indentation', () => {
  assert.equal(show(toggleTodo(at('    • ite|m'))), '    ☐ ite|m');
});

test('toggleDone ticks and unticks', () => {
  assert.equal(show(toggleDone(at('☐ ta|sk'))), '☑ ta|sk');
  assert.equal(show(toggleDone(at('☑ ta|sk'))), '☐ ta|sk');
  assert.equal(show(toggleDone(at('pla|in'))), '☐ pla|in');
});

test('toggleBullet', () => {
  assert.equal(show(toggleBullet(at('x|'))), '• x|');
  assert.equal(show(toggleBullet(at('• x|'))), 'x|');
});

test('indent and outdent only touch the current line', () => {
  assert.equal(show(indent(at('a\n☐ b|\nc'))), 'a\n    ☐ b|\nc');
  assert.equal(show(outdent(at('a\n    ☐ b|\nc'))), 'a\n☐ b|\nc');
  assert.equal(show(outdent(at('  b|'))), 'b|');
  assert.equal(show(outdent(at('b|'))), 'b|');
});

test('outdent with caret inside the removed indent stays at line start', () => {
  assert.equal(show(outdent(at('x\n  |    y'))), 'x\n|  y');
});

test('Return continues a to-do list, and done items continue as open', () => {
  const prev = at('☑ milk|');
  const next = prev.text + '\n';
  assert.equal(show(continueListOnNewline(prev.text, next, prev.selection)!), '☑ milk\n☐ |');

  const indented = at('    • a|');
  assert.equal(
    show(continueListOnNewline(indented.text, indented.text + '\n', indented.selection)!),
    '    • a\n    • |',
  );
});

test('Return on an empty list item ends the list', () => {
  const prev = at('☐ a\n☐ |');
  const next = prev.text + '\n';
  assert.equal(show(continueListOnNewline(prev.text, next, prev.selection)!), '☐ a\n|');
});

test('Return on an empty indented item outdents it first', () => {
  const prev = at('☐ a\n    ☐ |');
  assert.equal(show(continueListOnNewline(prev.text, prev.text + '\n', prev.selection)!), '☐ a\n☐ |');
});

test('Return is found even if the caret was reported after the newline', () => {
  const prev = '☐ milk';
  // Caret already moved to 7 (past the new "\n") when the text change arrives.
  assert.equal(
    show(continueListOnNewline(prev, prev + '\n', { start: 7, end: 7 })!),
    '☐ milk\n☐ |',
  );
});

test('Return at the end of an item followed by more items continues the list', () => {
  const prev = at('☐ a|\n☐ b');
  const next = '☐ a\n\n☐ b';
  assert.equal(show(continueListOnNewline(prev.text, next, prev.selection)!), '☐ a\n☐ |\n☐ b');
});

test('Return on a plain line or a non-newline edit is left alone', () => {
  const plain = at('hello|');
  assert.equal(continueListOnNewline(plain.text, 'hello\n', plain.selection), null);
  const todo = at('☐ a|');
  assert.equal(continueListOnNewline(todo.text, '☐ ab', todo.selection), null);
  assert.equal(continueListOnNewline(todo.text, 'pasted\n\ntext', todo.selection), null);
});

test('history groups a typing burst into one undo step', () => {
  const h = new NoteHistory();
  const n = (body: string) => ({ title: '', body });
  h.record(n(''), true);
  h.record(n('a'), true);
  h.record(n('ab'), true);
  assert.deepEqual(h.undo(n('abc')), n(''));
  assert.deepEqual(h.redo(n('')), n('abc'));
  assert.equal(h.canRedo, false);
});

test('toolbar actions are separate undo steps and new edits clear redo', () => {
  const h = new NoteHistory();
  const n = (body: string) => ({ title: '', body });
  h.record(n('a'), true);
  h.record(n('ab'), false);
  assert.deepEqual(h.undo(n('☐ ab')), n('ab'));
  assert.deepEqual(h.undo(n('ab')), n('a'));
  h.record(n('a'), true);
  assert.equal(h.canRedo, false);
});

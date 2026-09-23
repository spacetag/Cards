/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Article } from '../natgeo.ts';
import { EMPTY_READING, queue, saveAndLike, skip, startOver, toggleLike, unsave } from '../reading.ts';

const art = (id: string): Article => ({ id, section: 'Animals', title: id, blurb: '', url: `https://x/${id}` });
const ARTS = ['a', 'b', 'c'].map(art);
const ids = (list: Article[]) => list.map((x) => x.id);

test('the queue starts with every article in order', () => {
  assert.deepEqual(ids(queue(ARTS, EMPTY_READING)), ['a', 'b', 'c']);
});

test('skipping moves on to the next article', () => {
  const r = skip(EMPTY_READING, 'a');
  assert.deepEqual(ids(queue(ARTS, r)), ['b', 'c']);
  assert.deepEqual(r.saved, []);
});

test('saving keeps it for later with a thumbs up, and moves on', () => {
  const r = saveAndLike(saveAndLike(EMPTY_READING, 'a'), 'b');
  assert.deepEqual(r.saved, ['b', 'a']);
  assert.deepEqual(r.liked, ['a', 'b']);
  assert.deepEqual(ids(queue(ARTS, r)), ['c']);
});

test('saving twice does not duplicate', () => {
  const r = saveAndLike(saveAndLike(EMPTY_READING, 'a'), 'a');
  assert.deepEqual(r.saved, ['a']);
  assert.deepEqual(r.liked, ['a']);
});

test('saving a skipped article un-skips it', () => {
  const r = saveAndLike(skip(EMPTY_READING, 'a'), 'a');
  assert.deepEqual(r.skipped, []);
  assert.deepEqual(r.saved, ['a']);
});

test('thumbs up toggles without moving on', () => {
  const liked = toggleLike(EMPTY_READING, 'a');
  assert.deepEqual(liked.liked, ['a']);
  assert.deepEqual(ids(queue(ARTS, liked)), ['a', 'b', 'c']);
  assert.deepEqual(toggleLike(liked, 'a').liked, []);
});

test('unsaving keeps the thumbs up and puts the article back in the queue', () => {
  const r = unsave(saveAndLike(EMPTY_READING, 'a'), 'a');
  assert.deepEqual(r.saved, []);
  assert.deepEqual(r.liked, ['a']);
  assert.deepEqual(ids(queue(ARTS, r)), ['a', 'b', 'c']);
});

test('starting over deals skipped articles again but keeps saved ones out', () => {
  const r = startOver(skip(saveAndLike(EMPTY_READING, 'a'), 'b'));
  assert.deepEqual(ids(queue(ARTS, r)), ['b', 'c']);
});

import type { Article } from './natgeo';

/** What the reader has done with each article, by article id. */
export type Reading = {
  /** Saved for later, newest first. */
  saved: string[];
  /** Thumbs up. */
  liked: string[];
  /** Swiped past. */
  skipped: string[];
};

export const EMPTY_READING: Reading = { saved: [], liked: [], skipped: [] };

const without = (ids: string[], id: string) => ids.filter((x) => x !== id);

/** Articles still to be dealt, in order: not saved and not skipped yet. */
export function queue(articles: Article[], r: Reading): Article[] {
  const done = new Set([...r.saved, ...r.skipped]);
  return articles.filter((a) => !done.has(a.id));
}

/** Swipe left: move on to the next article. */
export function skip(r: Reading, id: string): Reading {
  return { ...r, skipped: [...without(r.skipped, id), id] };
}

/** Swipe right: keep it for later and give it a thumbs up. */
export function saveAndLike(r: Reading, id: string): Reading {
  return {
    saved: [id, ...without(r.saved, id)],
    liked: r.liked.includes(id) ? r.liked : [...r.liked, id],
    skipped: without(r.skipped, id),
  };
}

export function toggleLike(r: Reading, id: string): Reading {
  return { ...r, liked: r.liked.includes(id) ? without(r.liked, id) : [...r.liked, id] };
}

/** Takes an article off the saved list (its thumbs up stays). */
export function unsave(r: Reading, id: string): Reading {
  return { ...r, saved: without(r.saved, id) };
}

/** Deals the skipped articles again. */
export function startOver(r: Reading): Reading {
  return { ...r, skipped: [] };
}

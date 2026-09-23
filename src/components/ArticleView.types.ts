import type { GestureResponderHandlers } from 'react-native';

import type { Article } from '../lib/natgeo';

export type ArticleViewProps = {
  article: Article;
  /** Auto-scroll speed in px per second. */
  speed: number;
  paused: boolean;
  /** Swipe handlers for platforms where the page itself can't report drags. */
  panHandlers: GestureResponderHandlers;
  /** A horizontal drag inside the page, in px from where it started. */
  onDrag: (dx: number) => void;
  /** The drag ended; `vx` is in px per ms. */
  onRelease: (dx: number, vx: number) => void;
  /** The page has scrolled to the bottom. */
  onEnd: () => void;
};

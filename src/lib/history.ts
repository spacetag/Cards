import type { Note } from './notes';

const MAX_STEPS = 200;
/** Keystrokes closer together than this are undone as one step. */
const TYPING_BURST_MS = 1000;

/** Undo/redo stack for one day's note. */
export class NoteHistory {
  private past: Note[] = [];
  private future: Note[] = [];
  private lastTypingAt = 0;

  /**
   * Call with the note as it was *before* a change. Typing is coalesced into
   * bursts; toolbar actions (`typing: false`) always get their own step.
   */
  record(before: Note, typing: boolean) {
    const now = Date.now();
    const continuesBurst = typing && now - this.lastTypingAt < TYPING_BURST_MS;
    this.lastTypingAt = typing ? now : 0;
    this.future = [];
    if (continuesBurst) return;
    this.past.push(before);
    if (this.past.length > MAX_STEPS) this.past.shift();
  }

  undo(current: Note): Note | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(current);
    this.lastTypingAt = 0;
    return prev;
  }

  redo(current: Note): Note | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(current);
    this.lastTypingAt = 0;
    return next;
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }
}

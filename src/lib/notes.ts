import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export type Note = { title: string; body: string };
export type NotesByDay = Record<string, Note>;

export const EMPTY_NOTE: Note = { title: '', body: '' };

const STORAGE_KEY = 'glass-cards/notes/v1';
const SAVE_DELAY_MS = 400;

export const isEmptyNote = (n: Note | undefined) => !n || (!n.title.trim() && !n.body.trim());

/** All notes, keyed by day ("2026-09-23"), persisted to device storage. */
export function useNotes() {
  const [notes, setNotes] = useState<NotesByDay>({});
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(notes);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setNotes(JSON.parse(raw));
      })
      .catch((e) => console.warn('Could not load notes', e))
      .finally(() => setLoaded(true));
  }, []);

  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current)).catch((e) =>
      console.warn('Could not save notes', e),
    );
  }, []);

  // Save immediately when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && saveTimer.current) flush();
    });
    return () => sub.remove();
  }, [flush]);

  const setNote = useCallback(
    (day: string, note: Note) => {
      setNotes((prev) => {
        const next = { ...prev };
        if (isEmptyNote(note)) delete next[day];
        else next[day] = note;
        latest.current = next;
        return next;
      });
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  return { notes, setNote, loaded };
}

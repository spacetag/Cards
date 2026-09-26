import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { EMPTY_READING, type Reading } from './reading';

const STORAGE_KEY = 'glass-cards/natgeo/v1';

/** Saved / liked / skipped articles, persisted to device storage. */
export function useReading() {
  const [reading, setReading] = useState<Reading>(EMPTY_READING);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setReading({ ...EMPTY_READING, ...JSON.parse(raw) });
      })
      .catch((e) => console.warn('Could not load reading list', e))
      .finally(() => setLoaded(true));
  }, []);

  /** Applies one of the reading.ts operations and saves the result. */
  const update = useCallback((op: (r: Reading) => Reading) => {
    setReading((prev) => {
      const next = op(prev);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
        console.warn('Could not save reading list', e),
      );
      return next;
    });
  }, []);

  return { reading, update, loaded };
}

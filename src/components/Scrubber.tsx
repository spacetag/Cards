import * as Haptics from 'expo-haptics';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { DAY_COUNT, dateForIndex, dayKey, shortMonth, weekdayName } from '../lib/dates';
import { Glass } from './Glass';

/** Width of one day in the scrubber strip. */
export const TICK = 12;
const STRIP_HEIGHT = 40;

export type ScrubberHandle = {
  /** Follow the pager without triggering onScrub. Accepts fractional indices. */
  follow: (index: number) => void;
};

type Props = {
  index: number;
  /** Day keys that have a note, shown as dots. */
  filledDays: Set<string>;
  onScrub: (index: number) => void;
};

const DAYS = Array.from({ length: DAY_COUNT }, (_, i) => i);

const Tick = memo(function Tick({ index, filled }: { index: number; filled: boolean }) {
  const date = dateForIndex(index);
  const dow = date.getDay();
  const firstOfMonth = date.getDate() === 1;
  return (
    <View style={styles.tick}>
      <View
        style={[
          styles.bar,
          dow === 1 && styles.weekBar,
          firstOfMonth && styles.monthBar,
          dow === 0 && styles.sundayBar,
        ]}
      />
      {filled && <View style={styles.dot} />}
      {firstOfMonth && (
        <Text style={styles.month}>{shortMonth(date)}</Text>
      )}
    </View>
  );
});

export const Scrubber = forwardRef<ScrubberHandle, Props>(function Scrubber(
  { index, filledDays, onScrub },
  ref,
) {
  const list = useRef<FlatList<number>>(null);
  const strip = useRef<View>(null);
  const [stripWidth, setStripWidth] = useState(0);
  // The strip scrolls either because it follows the pager or because the user
  // is scrubbing it. Only a real touch (or wheel, on web) counts as scrubbing;
  // it lasts until the finger is up and the strip has stopped moving.
  const scrubbing = useRef(false);
  const touching = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIndex = useRef(index);
  if (!scrubbing.current) lastIndex.current = index;

  useImperativeHandle(ref, () => ({
    follow: (i) => {
      if (scrubbing.current) return;
      list.current?.scrollToOffset({ offset: i * TICK, animated: false });
    },
  }));

  const armIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (touching.current) return;
      scrubbing.current = false;
      // Rest exactly on the chosen day.
      list.current?.scrollToOffset({ offset: lastIndex.current * TICK, animated: true });
    }, 200);
  }, []);

  const beginScrub = useCallback(() => {
    scrubbing.current = true;
    armIdle();
  }, [armIdle]);

  const onTouchStart = () => {
    touching.current = true;
    beginScrub();
  };
  const onTouchEnd = () => {
    touching.current = false;
    armIdle();
  };

  // Mouse wheels and trackpads scroll without any touch events.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = strip.current as unknown as HTMLElement | null;
    el?.addEventListener('wheel', beginScrub, { passive: true });
    return () => el?.removeEventListener('wheel', beginScrub);
  }, [beginScrub, stripWidth]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!scrubbing.current) return;
      armIdle();
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.max(0, Math.min(DAY_COUNT - 1, Math.round(x / TICK)));
      if (i !== lastIndex.current) {
        lastIndex.current = i;
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        onScrub(i);
      }
    },
    [onScrub, armIdle],
  );

  const onLayout = (e: LayoutChangeEvent) => setStripWidth(e.nativeEvent.layout.width);
  const side = Math.max(0, stripWidth / 2 - TICK / 2);
  const date = dateForIndex(index);

  return (
    <Glass style={styles.container} radius={26}>
      <Text style={[styles.label, date.getDay() === 0 && styles.sundayLabel]}>
        {weekdayName(date).slice(0, 3)} · {shortMonth(date)} {date.getDate()}, {date.getFullYear()}
      </Text>
      <View
        ref={strip}
        style={styles.strip}
        onLayout={onLayout}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {stripWidth > 0 && (
          <FlatList
            ref={list}
            data={DAYS}
            horizontal
            keyExtractor={String}
            renderItem={({ item }) => <Tick index={item} filled={filledDays.has(dayKey(dateForIndex(item)))} />}
            extraData={filledDays}
            getItemLayout={(_, i) => ({ length: TICK, offset: TICK * i, index: i })}
            initialScrollIndex={index}
            contentContainerStyle={{ paddingHorizontal: side }}
            showsHorizontalScrollIndicator={false}
            snapToInterval={TICK}
            decelerationRate="fast"
            onScroll={onScroll}
            onScrollBeginDrag={beginScrub}
            scrollEventThrottle={16}
            initialNumToRender={60}
            windowSize={9}
          />
        )}
        <View pointerEvents="none" style={[styles.needle, { left: stripWidth / 2 - 1.5 }]} />
      </View>
    </Glass>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  sundayLabel: { color: '#ffb3ad' },
  strip: { height: STRIP_HEIGHT },
  tick: {
    width: TICK,
    height: STRIP_HEIGHT,
    alignItems: 'center',
    paddingTop: 6,
    overflow: 'visible',
  },
  bar: {
    width: 2,
    height: 10,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  weekBar: { height: 14, marginTop: 0, backgroundColor: 'rgba(255,255,255,0.7)' },
  monthBar: { height: 18, marginTop: -2, backgroundColor: '#fff' },
  sundayBar: { backgroundColor: 'rgba(255,99,88,0.95)' },
  dot: {
    position: 'absolute',
    top: 21,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#64d2ff',
  },
  month: {
    position: 'absolute',
    top: 27,
    left: -12,
    width: 36,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '600',
  },
  needle: {
    position: 'absolute',
    top: 0,
    width: 3,
    height: 26,
    borderRadius: 1.5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
});

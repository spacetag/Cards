import * as Haptics from 'expo-haptics';
import { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from 'react';
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
  const [stripWidth, setStripWidth] = useState(0);
  // The strip scrolls for two reasons: following the pager (we asked for an
  // exact offset) or the user scrubbing it. Anything that isn't the offset we
  // asked for counts as scrubbing until the strip has been still for a moment.
  const expectedOffset = useRef(index * TICK);
  const scrubbing = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIndex = useRef(index);
  if (!scrubbing.current) lastIndex.current = index;

  useImperativeHandle(ref, () => ({
    follow: (i) => {
      if (scrubbing.current) return;
      expectedOffset.current = i * TICK;
      list.current?.scrollToOffset({ offset: i * TICK, animated: false });
    },
  }));

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      if (!scrubbing.current && Math.abs(x - expectedOffset.current) < 1) return;

      scrubbing.current = true;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        scrubbing.current = false;
        expectedOffset.current = lastIndex.current * TICK;
      }, 180);

      const i = Math.max(0, Math.min(DAY_COUNT - 1, Math.round(x / TICK)));
      if (i !== lastIndex.current) {
        lastIndex.current = i;
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        onScrub(i);
      }
    },
    [onScrub],
  );

  const onLayout = (e: LayoutChangeEvent) => setStripWidth(e.nativeEvent.layout.width);
  const side = Math.max(0, stripWidth / 2 - TICK / 2);
  const date = dateForIndex(index);

  return (
    <Glass style={styles.container} radius={26}>
      <Text style={[styles.label, date.getDay() === 0 && styles.sundayLabel]}>
        {weekdayName(date).slice(0, 3)} · {shortMonth(date)} {date.getDate()}, {date.getFullYear()}
      </Text>
      <View style={styles.strip} onLayout={onLayout}>
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

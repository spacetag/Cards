import * as Haptics from 'expo-haptics';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Animated,
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

/** Distance from one mini card to the next. */
export const PITCH = 26;
const CARD_W = 20;
const CARD_H = 30;
/** How much the card under the centre grows, like the Photos scrubber. */
const FOCUS_SCALE = 1.45;
const STRIP_HEIGHT = CARD_H * FOCUS_SCALE + 6;

export type ScrubberHandle = {
  /** Follow the pager without triggering onScrub. Accepts fractional indices. */
  follow: (index: number) => void;
};

type Props = {
  index: number;
  /** Day keys that have a note; their mini cards look written on. */
  filledDays: Set<string>;
  onScrub: (index: number) => void;
};

const DAYS = Array.from({ length: DAY_COUNT }, (_, i) => i);

/** Stable pseudo-random line lengths so each mini card looks a little different. */
function lineWidths(index: number): number[] {
  let seed = (index * 2654435761) >>> 0;
  const next = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return 0.35 + ((seed >>> 16) % 1000) / 1600;
  };
  return [next(), next(), next()];
}

const MiniCard = memo(function MiniCard({
  index,
  filled,
  scrollX,
}: {
  index: number;
  filled: boolean;
  scrollX: Animated.Value;
}) {
  const date = dateForIndex(index);
  const sunday = date.getDay() === 0;
  const firstOfMonth = date.getDate() === 1;
  const center = index * PITCH;
  const range = [center - PITCH * 1.5, center - PITCH * 0.5, center, center + PITCH * 0.5, center + PITCH * 1.5];
  const scale = scrollX.interpolate({
    inputRange: range,
    outputRange: [1, 1.12, FOCUS_SCALE, 1.12, 1],
    extrapolate: 'clamp',
  });
  const opacity = scrollX.interpolate({
    inputRange: range,
    outputRange: [0.75, 0.85, 1, 0.85, 0.75],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.slot}>
      <Animated.View
        style={[
          styles.mini,
          sunday && styles.miniSunday,
          firstOfMonth && styles.miniMonth,
          { opacity, transform: [{ scale }] },
        ]}
      >
        <Text style={[styles.miniDate, sunday && styles.miniDateSunday, firstOfMonth && styles.miniMonthText]}>
          {firstOfMonth ? shortMonth(date) : date.getDate()}
        </Text>
        {lineWidths(index).map((w, i) => (
          <View
            key={i}
            style={[
              styles.miniLine,
              { width: `${Math.round(w * 100)}%` },
              filled && styles.miniLineFilled,
              filled && i === 0 && styles.miniTitle,
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
});

export const Scrubber = forwardRef<ScrubberHandle, Props>(function Scrubber(
  { index, filledDays, onScrub },
  ref,
) {
  const list = useRef<FlatList<number>>(null);
  const strip = useRef<View>(null);
  const scrollX = useRef(new Animated.Value(index * PITCH)).current;
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
      list.current?.scrollToOffset({ offset: i * PITCH, animated: false });
    },
  }));

  const armIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (touching.current) return;
      scrubbing.current = false;
      // Settle exactly on the chosen day (native snapping already does this;
      // on web it's the snap).
      list.current?.scrollToOffset({ offset: lastIndex.current * PITCH, animated: true });
    }, 160);
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

  const onScrollJS = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!scrubbing.current) return;
      armIdle();
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.max(0, Math.min(DAY_COUNT - 1, Math.round(x / PITCH)));
      if (i !== lastIndex.current) {
        lastIndex.current = i;
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        onScrub(i);
      }
    },
    [onScrub, armIdle],
  );

  const onScrollRef = useRef(onScrollJS);
  onScrollRef.current = onScrollJS;
  // Drives the mini-card zoom on the native thread; the listener handles scrubbing.
  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: Platform.OS !== 'web',
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => onScrollRef.current(e),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => setStripWidth(e.nativeEvent.layout.width);
  const side = Math.max(0, stripWidth / 2 - PITCH / 2);
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
          <Animated.FlatList
            ref={list}
            data={DAYS}
            horizontal
            keyExtractor={String}
            renderItem={({ item }) => (
              <MiniCard index={item} filled={filledDays.has(dayKey(dateForIndex(item)))} scrollX={scrollX} />
            )}
            extraData={filledDays}
            getItemLayout={(_, i) => ({ length: PITCH, offset: PITCH * i, index: i })}
            initialScrollIndex={index}
            contentContainerStyle={{ paddingHorizontal: side }}
            showsHorizontalScrollIndicator={false}
            snapToInterval={PITCH}
            decelerationRate="fast"
            onScroll={onScroll}
            onScrollBeginDrag={beginScrub}
            scrollEventThrottle={16}
            initialNumToRender={30}
            windowSize={7}
          />
        )}
      </View>
    </Glass>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  sundayLabel: { color: '#ffb3ad' },
  strip: { height: STRIP_HEIGHT },
  slot: {
    width: PITCH,
    height: STRIP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mini: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 5,
    paddingHorizontal: 2.5,
    paddingTop: 2,
    gap: 2.5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  miniSunday: {
    backgroundColor: 'rgba(255,69,58,0.32)',
    borderColor: 'rgba(255,140,130,0.6)',
  },
  miniMonth: { borderColor: 'rgba(255,255,255,0.85)' },
  miniDate: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 7,
    lineHeight: 9,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  miniDateSunday: { color: '#ffc2bc' },
  miniMonthText: { fontSize: 6, letterSpacing: -0.2, marginHorizontal: -1 },
  miniLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  miniLineFilled: { backgroundColor: 'rgba(255,255,255,0.75)' },
  miniTitle: { height: 2.5, backgroundColor: '#64d2ff' },
});

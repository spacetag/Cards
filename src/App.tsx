import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  KeyboardAvoidingView,
  KeyboardController,
  KeyboardProvider,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from './components/Backdrop';
import { DayCard, type CardInputs, type Field } from './components/DayCard';
import { EditorToolbar, TOOLBAR_HEIGHT, type ToolbarAction } from './components/EditorToolbar';
import { BlurTargetContext, Glass } from './components/Glass';
import { Scrubber, type ScrubberHandle } from './components/Scrubber';
import { DAY_COUNT, TODAY_INDEX, dateForIndex, dayKey, monthName } from './lib/dates';
import { NoteHistory } from './lib/history';
import { EMPTY_NOTE, useNotes, type Note } from './lib/notes';
import {
  continueListOnNewline,
  indent,
  outdent,
  toggleBullet,
  toggleDone,
  toggleTodo,
  type Edit,
  type Selection,
} from './lib/textOps';

const DAYS = Array.from({ length: DAY_COUNT }, (_, i) => i);


const BODY_OPS: Partial<Record<ToolbarAction, (e: Edit) => Edit>> = {
  todo: toggleTodo,
  done: toggleDone,
  bullet: toggleBullet,
  indent,
  outdent,
};

type Editing = { day: string; field: Field } | null;

export default function App() {
  const backdropRef = useRef<View>(null);
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <BlurTargetContext.Provider value={backdropRef}>
          <StatusBar style="light" />
          <Backdrop targetRef={backdropRef} />
          <CardsScreen />
        </BlurTargetContext.Provider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function CardsScreen() {
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { notes, setNote } = useNotes();

  const [index, setIndex] = useState(TODAY_INDEX);
  const [pagerSize, setPagerSize] = useState<{ width: number; height: number } | null>(null);
  // Cards are exactly as wide as the pager, which can differ from the window
  // (e.g. inside a frame), so measure it rather than trusting the window.
  const width = pagerSize?.width || screen.width;
  const pagerHeight = pagerSize?.height ?? 0;
  const [editing, setEditing] = useState<Editing>(null);
  const [pendingCaret, setPendingCaret] = useState<{ day: string; sel: Selection } | null>(null);
  const [, setHistoryVersion] = useState(0);

  const pager = useRef<FlatList<number>>(null);
  const scrubber = useRef<ScrubberHandle>(null);
  const inputs = useRef(new Map<string, CardInputs>());
  const selections = useRef(new Map<string, Selection>());
  const histories = useRef(new Map<string, NoteHistory>());
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const indexRef = useRef(index);
  indexRef.current = index;
  const editingRef = useRef(editing);
  editingRef.current = editing;

  const historyFor = useCallback((day: string) => {
    let h = histories.current.get(day);
    if (!h) histories.current.set(day, (h = new NoteHistory()));
    return h;
  }, []);

  /** Writes a note, recording the previous version for undo. */
  const commit = useCallback(
    (day: string, next: Note, typing: boolean) => {
      historyFor(day).record(notesRef.current[day] ?? EMPTY_NOTE, typing);
      notesRef.current = { ...notesRef.current, [day]: next };
      setNote(day, next);
      setHistoryVersion((v) => v + 1);
    },
    [setNote, historyFor],
  );

  /**
   * Moves the caret together with the text change: the selection is handed to
   * the input as a prop in the same render as the new value, and released
   * again on the next selection event so the user's own caret takes over.
   */
  const placeCaret = useCallback((day: string, sel: Selection) => {
    selections.current.set(day, sel);
    setPendingCaret({ day, sel });
    // Browsers move focus to a tapped toolbar button; take it back, which
    // also resets the caret, so place it again.
    if (Platform.OS === 'web') {
      setTimeout(() => {
        const el = inputs.current.get(day)?.body as unknown as HTMLTextAreaElement | undefined;
        if (!el || document.activeElement === el) return;
        el.focus();
        el.setSelectionRange(sel.start, sel.end);
      }, 0);
    }
  }, []);

  /**
   * Current caret in a day's body. Native inputs report every caret move via
   * onSelectionChange; browsers don't fire that while typing, so on web read
   * it straight from the <textarea>.
   */
  const selectionOf = useCallback((day: string, text: string): Selection => {
    if (Platform.OS === 'web') {
      const el = inputs.current.get(day)?.body as unknown as HTMLTextAreaElement | undefined;
      if (el && typeof el.selectionStart === 'number') {
        return { start: el.selectionStart, end: el.selectionEnd };
      }
    }
    return selections.current.get(day) ?? { start: text.length, end: text.length };
  }, []);

  // ---- Card callbacks (stable, so memoized cards don't re-render) ----

  const onChangeText = useCallback(
    (day: string, field: Field, text: string) => {
      const before = notesRef.current[day] ?? EMPTY_NOTE;
      setPendingCaret(null);
      if (field === 'body') {
        let sel = selectionOf(day, before.body);
        if (Platform.OS === 'web') {
          // The DOM caret is already past the typed text; step back to where it was.
          const typed = text.length - before.body.length;
          sel = { start: sel.start - typed, end: sel.start - typed };
        }
        const continued = continueListOnNewline(before.body, text, sel);
        if (continued) {
          commit(day, { ...before, body: continued.text }, true);
          placeCaret(day, continued.selection);
          return;
        }
      }
      commit(day, { ...before, [field]: text }, true);
    },
    [commit, placeCaret, selectionOf],
  );

  const onSelectionChange = useCallback((day: string, sel: Selection) => {
    selections.current.set(day, sel);
    setPendingCaret((p) => (p?.day === day ? null : p));
  }, []);

  const onFocusField = useCallback((day: string, field: Field) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setEditing({ day, field });
  }, []);

  // Focus often hops straight from one input to another; wait a beat before
  // deciding editing has actually ended so the toolbar doesn't flicker.
  const onBlurField = useCallback((day: string) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      setEditing((cur) => (cur?.day === day ? null : cur));
    }, 80);
  }, []);

  const registerInputs = useCallback((day: string, card: CardInputs | null) => {
    if (card) inputs.current.set(day, card);
    else inputs.current.delete(day);
  }, []);

  // ---- Paging ----

  const settleOn = useCallback((i: number) => {
    indexRef.current = i;
    setIndex(i);
    // Keep typing when swiping to another day with the keyboard up.
    const cur = editingRef.current;
    const day = dayKey(dateForIndex(i));
    if (cur && cur.day !== day) inputs.current.get(day)?.[cur.field]?.focus();
  }, []);

  // On web, react-native-web pages with CSS scroll-snap, which Safari keeps
  // re-snapping as virtualized cards mount and unmount, so the pager runs
  // away. There we page by hand instead: once the scroll comes to rest and no
  // finger is down, glide to the nearest card.
  const pagerX = useRef(0);
  const pagerTouching = useRef(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snapToNearestPage = useCallback(() => {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      if (pagerTouching.current) return;
      const nearest = Math.round(pagerX.current / width);
      if (Math.abs(pagerX.current - nearest * width) > 1) {
        pager.current?.scrollToOffset({ offset: nearest * width, animated: true });
      }
    }, 120);
  }, [width]);

  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    pagerX.current = x;
    const page = x / width;
    scrubber.current?.follow(page);
    // Web has no momentum events, so settle whenever a page lines up.
    const nearest = Math.round(page);
    if (Math.abs(page - nearest) < 0.01 && nearest !== indexRef.current) settleOn(nearest);
    if (Platform.OS === 'web') snapToNearestPage();
  };

  const onPagerTouchStart = () => {
    pagerTouching.current = true;
  };
  const onPagerTouchEnd = () => {
    pagerTouching.current = false;
    if (Platform.OS === 'web') snapToNearestPage();
  };

  const onPagerSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    settleOn(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const jumpTo = useCallback(
    (i: number) => {
      indexRef.current = i;
      pager.current?.scrollToOffset({ offset: i * width, animated: false });
      setIndex(i);
    },
    [width],
  );

  // Keep showing the same day if the card width changes (first measure, rotation).
  useEffect(() => {
    pager.current?.scrollToOffset({ offset: indexRef.current * width, animated: false });
  }, [width]);

  const goToToday = () => {
    jumpTo(TODAY_INDEX);
    scrubber.current?.follow(TODAY_INDEX);
  };

  // ---- Toolbar ----

  const onToolbar = (action: ToolbarAction) => {
    if (action === 'dismiss') {
      KeyboardController.dismiss();
      return;
    }
    if (!editing) return;
    const { day } = editing;
    const current = notesRef.current[day] ?? EMPTY_NOTE;

    if (action === 'undo' || action === 'redo') {
      const h = historyFor(day);
      const restored = action === 'undo' ? h.undo(current) : h.redo(current);
      if (!restored) return;
      notesRef.current = { ...notesRef.current, [day]: restored };
      setNote(day, restored);
      setHistoryVersion((v) => v + 1);
      if (Platform.OS === 'web') setTimeout(() => inputs.current.get(day)?.[editing.field]?.focus(), 0);
      return;
    }

    const op = BODY_OPS[action];
    if (!op || editing.field !== 'body') return;
    const result = op({ text: current.body, selection: selectionOf(day, current.body) });
    commit(day, { ...current, body: result.text }, false);
    placeCaret(day, result.selection);
  };

  const filledDays = useMemo(() => new Set(Object.keys(notes)), [notes]);
  const editingHistory = editing ? histories.current.get(editing.day) : undefined;
  const monthLabel = (() => {
    const d = dateForIndex(index);
    return `${monthName(d)} ${d.getFullYear()}`;
  })();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{monthLabel}</Text>
        {index !== TODAY_INDEX && (
          <Pressable onPress={goToToday} accessibilityRole="button" accessibilityLabel="Go to today">
            <Glass style={styles.todayPill} radius={18} interactive>
              <MaterialCommunityIcons name="calendar-today" size={16} color="#fff" />
              <Text style={styles.todayText}>Today</Text>
            </Glass>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <FlatList
          ref={pager}
          style={styles.flex}
          onLayout={(e) => setPagerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          data={DAYS}
          horizontal
          pagingEnabled={Platform.OS !== 'web'}
          onTouchStart={onPagerTouchStart}
          onTouchEnd={onPagerTouchEnd}
          onTouchCancel={onPagerTouchEnd}
          keyExtractor={String}
          extraData={[notes, pagerSize, pendingCaret]}
          renderItem={({ item }) => (
            <DayCard
              index={item}
              width={width}
              height={pagerHeight}
              note={notes[dayKey(dateForIndex(item))]}
              caret={pendingCaret?.day === dayKey(dateForIndex(item)) ? pendingCaret.sel : undefined}
              onChangeText={onChangeText}
              onFocusField={onFocusField}
              onBlurField={onBlurField}
              onSelectionChange={onSelectionChange}
              registerInputs={registerInputs}
            />
          )}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          initialScrollIndex={TODAY_INDEX}
          initialNumToRender={1}
          windowSize={3}
          maxToRenderPerBatch={2}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onPagerScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onPagerSettle}
        />

        {editing ? (
          <View style={{ height: TOOLBAR_HEIGHT }} />
        ) : (
          <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
            <Scrubber ref={scrubber} index={index} filledDays={filledDays} onScrub={jumpTo} />
          </View>
        )}
      </KeyboardAvoidingView>

      {editing && (
        <KeyboardStickyView style={styles.toolbar} offset={{ closed: -insets.bottom, opened: 0 }}>
          <EditorToolbar
            onAction={onToolbar}
            editingBody={editing.field === 'body'}
            canUndo={!!editingHistory?.canUndo}
            canRedo={!!editingHistory?.canRedo}
          />
        </KeyboardStickyView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: 52,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
  },
  todayText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  toolbar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

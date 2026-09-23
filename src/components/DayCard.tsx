import { memo, useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';

import { dateForIndex, dayKey, isSunday, longDate, relativeLabel, weekdayName } from '../lib/dates';
import { EMPTY_NOTE, type Note } from '../lib/notes';
import type { Selection } from '../lib/textOps';
import { Glass } from './Glass';

export type Field = 'title' | 'body';

export type CardInputs = { title: TextInput | null; body: TextInput | null };

type Props = {
  index: number;
  width: number;
  height: number;
  note: Note | undefined;
  /** Caret position to apply along with a programmatic text change. */
  caret?: Selection;
  onChangeText: (day: string, field: Field, text: string) => void;
  onFocusField: (day: string, field: Field) => void;
  onBlurField: (day: string) => void;
  onSelectionChange: (day: string, sel: Selection) => void;
  registerInputs: (day: string, inputs: CardInputs | null) => void;
};

const SUNDAY_TINT = 'rgba(255, 69, 58, 0.26)';

// Browsers draw a focus ring around text fields; the card is the focus cue.
const noFocusRing = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

function DayCardImpl({
  index,
  width,
  height,
  note = EMPTY_NOTE,
  caret,
  onChangeText,
  onFocusField,
  onBlurField,
  onSelectionChange,
  registerInputs,
}: Props) {
  const date = dateForIndex(index);
  const day = dayKey(date);
  const sunday = isSunday(date);
  const relative = relativeLabel(index);
  const inputs = useRef<CardInputs>({ title: null, body: null });

  useEffect(() => {
    registerInputs(day, inputs.current);
    return () => registerInputs(day, null);
  }, [day, registerInputs]);

  return (
    <View style={[styles.page, { width, height }]}>
      <Glass style={styles.card} tint={sunday ? SUNDAY_TINT : undefined} radius={34}>
        <View style={styles.header}>
          <Text style={[styles.weekday, sunday && styles.sundayText]}>{weekdayName(date)}</Text>
          <View style={styles.dateRow}>
            <Text style={styles.date}>{longDate(date)}</Text>
            {relative && (
              <View style={[styles.badge, relative === 'Today' && styles.todayBadge]}>
                <Text style={styles.badgeText}>{relative}</Text>
              </View>
            )}
          </View>
        </View>

        <TextInput
          ref={(el) => {
            inputs.current.title = el;
          }}
          style={[styles.title, noFocusRing]}
          value={note.title}
          placeholder="Title"
          placeholderTextColor="rgba(255,255,255,0.35)"
          onChangeText={(t) => onChangeText(day, 'title', t.replace(/\n/g, ' '))}
          onFocus={() => onFocusField(day, 'title')}
          onBlur={() => onBlurField(day)}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => inputs.current.body?.focus()}
          selectionColor="#fff"
        />
        <View style={styles.divider} />
        <TextInput
          ref={(el) => {
            inputs.current.body = el;
          }}
          style={[styles.body, noFocusRing]}
          value={note.body}
          selection={caret}
          placeholder="Write something…"
          placeholderTextColor="rgba(255,255,255,0.35)"
          multiline
          scrollEnabled
          textAlignVertical="top"
          onChangeText={(t) => onChangeText(day, 'body', t)}
          onSelectionChange={(e) => onSelectionChange(day, e.nativeEvent.selection)}
          onFocus={() => onFocusField(day, 'body')}
          onBlur={() => onBlurField(day)}
          selectionColor="#fff"
        />
      </Glass>
    </View>
  );
}

export const DayCard = memo(DayCardImpl);

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  card: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 12,
  },
  header: { marginBottom: 14 },
  weekday: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sundayText: { color: '#ffb3ad' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  date: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  todayBadge: { backgroundColor: 'rgba(10,132,255,0.55)' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  title: {
    // Keeps inputs painted above the glass blur layer on web.
    position: 'relative',
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    paddingVertical: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 8,
  },
  body: {
    position: 'relative',
    flex: 1,
    color: '#fff',
    fontSize: 17,
    lineHeight: 25,
    paddingTop: 4,
  },
});

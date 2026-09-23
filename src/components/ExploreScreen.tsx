import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ARTICLES, type Article } from '../lib/natgeo';
import { queue, saveAndLike, skip, startOver, toggleLike, unsave } from '../lib/reading';
import { useReading } from '../lib/useReading';
import { ArticleView } from './ArticleView';
import { Glass } from './Glass';

const NATGEO_YELLOW = '#ffd60a';
/** Auto-scroll speeds in px per second. */
const SPEEDS = [30, 60, 110];
/** How far (px) or fast (px/ms) a swipe must go to count. */
const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 0.6;

type Props = { onSwitchMode: () => void };

/**
 * National Geographic stories, one card at a time. Each story auto-scrolls;
 * swipe left to skip to the next one, swipe right to save it for later with
 * a thumbs up.
 */
export function ExploreScreen({ onSwitchMode }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { reading, update, loaded } = useReading();

  const [speedIndex, setSpeedIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const upcoming = useMemo(() => queue(ARTICLES, reading), [reading]);
  const current: Article | undefined = upcoming[0];
  const currentRef = useRef(current);
  currentRef.current = current;

  const dx = useRef(new Animated.Value(0)).current;
  const flying = useRef(false);

  /** Throws the card off one side, then applies the swipe. */
  const commit = useCallback(
    (direction: 'left' | 'right') => {
      const article = currentRef.current;
      if (!article || flying.current) return;
      flying.current = true;
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          direction === 'right'
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
        );
      }
      Animated.timing(dx, {
        toValue: (direction === 'right' ? 1 : -1) * width * 1.3,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        update((r) => (direction === 'right' ? saveAndLike(r, article.id) : skip(r, article.id)));
        setEnded(false);
        dx.setValue(0);
        flying.current = false;
      });
    },
    [dx, update, width],
  );

  const onDrag = useCallback(
    (x: number) => {
      if (!flying.current) dx.setValue(x);
    },
    [dx],
  );

  const onRelease = useCallback(
    (x: number, vx: number) => {
      if (x > SWIPE_DISTANCE || vx > SWIPE_VELOCITY) commit('right');
      else if (x < -SWIPE_DISTANCE || vx < -SWIPE_VELOCITY) commit('left');
      else {
        Animated.spring(dx, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
      }
    },
    [commit, dx],
  );

  // Swipes that start on the card's header (and, on web, anywhere on the card).
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => onDrag(g.dx),
        onPanResponderRelease: (_, g) => onRelease(g.dx, g.vx),
        onPanResponderTerminate: () => onRelease(0, 0),
      }),
    [onDrag, onRelease],
  );

  const liked = current ? reading.liked.includes(current.id) : false;
  const savedArticles = reading.saved
    .map((id) => ARTICLES.find((a) => a.id === id))
    .filter((a): a is Article => !!a);

  const rotate = dx.interpolate({ inputRange: [-width, 0, width], outputRange: ['-8deg', '0deg', '8deg'] });
  const saveStamp = dx.interpolate({ inputRange: [0, SWIPE_DISTANCE], outputRange: [0, 1], extrapolate: 'clamp' });
  const skipStamp = dx.interpolate({ inputRange: [-SWIPE_DISTANCE, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.frame} />
          <Text style={styles.headerTitle}>Explore</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable onPress={() => setShowSaved(true)} accessibilityRole="button" accessibilityLabel="Saved stories">
            <Glass style={styles.pill} radius={18} interactive>
              <MaterialCommunityIcons name="bookmark-multiple" size={16} color="#fff" />
              <Text style={styles.pillText}>{reading.saved.length}</Text>
            </Glass>
          </Pressable>
          <Pressable onPress={onSwitchMode} accessibilityRole="button" accessibilityLabel="Back to notes">
            <Glass style={styles.pill} radius={18} interactive>
              <MaterialCommunityIcons name="notebook-outline" size={16} color="#fff" />
              <Text style={styles.pillText}>Notes</Text>
            </Glass>
          </Pressable>
        </View>
      </View>

      <View style={styles.stage}>
        {!loaded ? null : current ? (
          <Animated.View style={[styles.flex, { transform: [{ translateX: dx }, { rotate }] }]}>
            <Glass style={styles.card} radius={34}>
              <View style={styles.cardHeader} {...pan.panHandlers}>
                <Text style={styles.section}>{current.section.toUpperCase()}</Text>
                <Text style={styles.title} numberOfLines={3}>
                  {current.title}
                </Text>
                <Text style={styles.source}>
                  National Geographic · {upcoming.length} to go
                </Text>
              </View>
              <View style={styles.page}>
                <ArticleView
                  key={current.id}
                  article={current}
                  speed={SPEEDS[speedIndex]}
                  paused={paused || showSaved}
                  panHandlers={pan.panHandlers}
                  onDrag={onDrag}
                  onRelease={onRelease}
                  onEnd={() => setEnded(true)}
                />
                {ended && (
                  <View style={styles.endBanner} pointerEvents="none">
                    <Text style={styles.endText}>End of story. Swipe for the next one.</Text>
                  </View>
                )}
              </View>
            </Glass>
            <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampSave, { opacity: saveStamp }]}>
              <MaterialCommunityIcons name="thumb-up" size={22} color="#30d158" />
              <Text style={[styles.stampText, { color: '#30d158' }]}>SAVED</Text>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampSkip, { opacity: skipStamp }]}>
              <Text style={[styles.stampText, { color: '#ff453a' }]}>SKIP</Text>
              <MaterialCommunityIcons name="skip-next" size={22} color="#ff453a" />
            </Animated.View>
          </Animated.View>
        ) : (
          <Glass style={[styles.card, styles.done]} radius={34}>
            <MaterialCommunityIcons name="earth" size={48} color={NATGEO_YELLOW} />
            <Text style={styles.doneTitle}>You’re all caught up</Text>
            <Text style={styles.doneText}>
              {reading.saved.length} saved for later, {reading.skipped.length} skipped.
            </Text>
            <Pressable onPress={() => update(startOver)} accessibilityRole="button" style={styles.primary}>
              <Text style={styles.primaryText}>Show skipped stories again</Text>
            </Pressable>
          </Glass>
        )}
      </View>

      {current && (
        <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <RoundButton icon="skip-next" label="Skip"color="#ff453a" onPress={() => commit('left')} />
          <RoundButton
            icon={paused ? 'play' : 'pause'}
            label={paused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
            small
            onPress={() => setPaused((p) => !p)}
          />
          <Pressable
            onPress={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)}
            accessibilityRole="button"
            accessibilityLabel="Auto-scroll speed"
          >
            <Glass style={styles.speed} radius={22} interactive>
              <Text style={styles.speedText}>{speedIndex + 1}×</Text>
            </Glass>
          </Pressable>
          <RoundButton
            icon={liked ? 'thumb-up' : 'thumb-up-outline'}
            label="Thumbs up"
            small
            color={liked ? NATGEO_YELLOW : '#fff'}
            onPress={() => update((r) => toggleLike(r, current.id))}
          />
          <RoundButton icon="bookmark-plus" label="Save for later" color="#30d158" onPress={() => commit('right')} />
        </View>
      )}

      <Modal visible={showSaved} animationType="slide" transparent onRequestClose={() => setShowSaved(false)}>
        <View style={[styles.sheetBackdrop, { paddingTop: insets.top + 40 }]}>
          <Glass style={styles.sheet} radius={30}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Saved for later</Text>
              <Pressable onPress={() => setShowSaved(false)} accessibilityRole="button" accessibilityLabel="Close">
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
              {savedArticles.length === 0 && (
                <Text style={styles.empty}>Swipe a story right to save it here.</Text>
              )}
              {savedArticles.map((a) => {
                const isLiked = reading.liked.includes(a.id);
                return (
                  <View key={a.id} style={styles.row}>
                    <Pressable style={styles.flex} onPress={() => Linking.openURL(a.url)} accessibilityRole="link">
                      <Text style={styles.rowSection}>{a.section.toUpperCase()}</Text>
                      <Text style={styles.rowTitle}>{a.title}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => update((r) => toggleLike(r, a.id))}
                      accessibilityRole="button"
                      accessibilityLabel="Thumbs up"
                      hitSlop={8}
                    >
                      <MaterialCommunityIcons
                        name={isLiked ? 'thumb-up' : 'thumb-up-outline'}
                        size={20}
                        color={isLiked ? NATGEO_YELLOW : 'rgba(255,255,255,0.6)'}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => update((r) => unsave(r, a.id))}
                      accessibilityRole="button"
                      accessibilityLabel="Remove from saved"
                      hitSlop={8}
                    >
                      <MaterialCommunityIcons name="bookmark-remove-outline" size={20} color="rgba(255,255,255,0.6)" />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </Glass>
        </View>
      </Modal>
    </View>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  color = '#fff',
  small,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  small?: boolean;
}) {
  const size = small ? 44 : 60;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Glass style={[styles.round, { width: size, height: size }]} radius={size / 2} interactive>
        <MaterialCommunityIcons name={icon} size={small ? 20 : 28} color={color} />
      </Glass>
    </Pressable>
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // The yellow rectangle.
  frame: { width: 14, height: 20, borderWidth: 3, borderColor: NATGEO_YELLOW },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36 },
  pillText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  stage: { flex: 1, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 },
  card: { flex: 1 },
  cardHeader: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 14 },
  section: { color: NATGEO_YELLOW, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 6, lineHeight: 28 },
  source: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 6 },
  page: {
    flex: 1,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  endBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(20,16,50,0.85)',
    alignItems: 'center',
  },
  endText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  stamp: {
    position: 'absolute',
    top: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  stampSave: { left: 24, borderColor: '#30d158', transform: [{ rotate: '-10deg' }] },
  stampSkip: { right: 24, borderColor: '#ff453a', transform: [{ rotate: '10deg' }] },
  stampText: { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  done: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 },
  doneTitle: { color: '#fff', fontSize: 24, fontWeight: '700' },
  doneText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, textAlign: 'center' },
  primary: {
    marginTop: 8,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: NATGEO_YELLOW,
  },
  primaryText: { color: '#1b1440', fontSize: 15, fontWeight: '700' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingTop: 4,
  },
  round: { alignItems: 'center', justifyContent: 'center' },
  speed: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  speedText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { flex: 1, paddingHorizontal: 20, paddingTop: 18, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  empty: { color: 'rgba(255,255,255,0.6)', fontSize: 15, marginTop: 20, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  rowSection: { color: NATGEO_YELLOW, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 3 },
});

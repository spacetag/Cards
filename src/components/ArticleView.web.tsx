import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ArticleViewProps } from './ArticleView.types';

/**
 * Browsers won't let another site's page be framed and scrolled, so on web
 * the card shows the story's summary with a link out, and is swiped directly.
 */
export function ArticleView({ article, panHandlers }: ArticleViewProps) {
  return (
    <View style={styles.page} {...panHandlers}>
      <Text style={styles.blurb}>{article.blurb}</Text>
      <Pressable
        onPress={() => Linking.openURL(article.url)}
        accessibilityRole="link"
        style={styles.open}
      >
        <Text style={styles.openText}>Read on nationalgeographic.com</Text>
        <MaterialCommunityIcons name="open-in-new" size={16} color="#1b1440" />
      </Pressable>
      <Text style={styles.note}>
        The auto-scrolling reader runs in the iOS and Android app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', padding: 24, gap: 20 },
  blurb: { color: '#fff', fontSize: 20, lineHeight: 28 },
  open: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffd60a',
  },
  openText: { color: '#1b1440', fontSize: 15, fontWeight: '700' },
  note: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
});

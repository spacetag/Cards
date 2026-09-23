import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Glass } from './Glass';

export type ToolbarAction =
  | 'todo'
  | 'done'
  | 'bullet'
  | 'outdent'
  | 'indent'
  | 'undo'
  | 'redo'
  | 'dismiss';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const BUTTONS: { action: ToolbarAction; icon: IconName; label: string }[] = [
  { action: 'todo', icon: 'format-list-checks', label: 'To-do' },
  { action: 'done', icon: 'checkbox-marked-outline', label: 'Check' },
  { action: 'bullet', icon: 'format-list-bulleted', label: 'List' },
  { action: 'outdent', icon: 'format-indent-decrease', label: 'Outdent' },
  { action: 'indent', icon: 'format-indent-increase', label: 'Indent' },
  { action: 'undo', icon: 'undo', label: 'Undo' },
  { action: 'redo', icon: 'redo', label: 'Redo' },
];

/** Actions that only make sense while editing the note body. */
const BODY_ONLY: ToolbarAction[] = ['todo', 'done', 'bullet', 'outdent', 'indent'];

type Props = {
  onAction: (action: ToolbarAction) => void;
  canUndo: boolean;
  canRedo: boolean;
  editingBody: boolean;
};

export const TOOLBAR_HEIGHT = 76;

export function EditorToolbar({ onAction, canUndo, canRedo, editingBody }: Props) {
  const enabled = (a: ToolbarAction) =>
    a === 'undo' ? canUndo : a === 'redo' ? canRedo : !BODY_ONLY.includes(a) || editingBody;

  const press = (a: ToolbarAction) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAction(a);
  };

  return (
    <View style={styles.wrap}>
      <Glass style={styles.bar} radius={24}>
        {BUTTONS.map(({ action, icon, label }) => {
          const on = enabled(action);
          return (
            <Pressable
              key={action}
              disabled={!on}
              onPress={() => press(action)}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={({ pressed }) => [styles.button, pressed && styles.pressed, !on && styles.disabled]}
            >
              <MaterialCommunityIcons name={icon} size={25} color="#fff" />
              <Text style={styles.label}>{label}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => press('dismiss')}
          accessibilityRole="button"
          accessibilityLabel="Done editing"
          style={({ pressed }) => [styles.done, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="keyboard-close" size={26} color="#fff" />
          <Text style={styles.label}>Done</Text>
        </Pressable>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingBottom: 8 },
  bar: {
    height: TOOLBAR_HEIGHT - 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  button: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: {
    flex: 1.15,
    height: 58,
    marginHorizontal: 5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,132,255,0.55)',
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.22)' },
  disabled: { opacity: 0.35 },
  label: { color: '#fff', fontSize: 10, fontWeight: '600', marginTop: 2 },
});

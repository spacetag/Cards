import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { createContext, useContext, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const LIQUID_GLASS = isLiquidGlassAvailable();

/**
 * Android blurs only what's inside a BlurTargetView, so the app background
 * registers itself here and every Glass surface blurs it.
 */
export const BlurTargetContext = createContext<RefObject<View | null> | undefined>(undefined);

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Optional colour wash over the glass, e.g. red for Sundays. */
  tint?: string;
  radius?: number;
  interactive?: boolean;
};

/**
 * Frosted glass surface. Uses native Liquid Glass on iOS 26+, and falls back
 * to a blur with a light sheen and hairline border everywhere else.
 */
export function Glass({ children, style, tint, radius = 28, interactive }: Props) {
  const blurTarget = useContext(BlurTargetContext);

  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={tint}
        isInteractive={interactive}
        style={[{ borderRadius: radius, overflow: 'hidden' }, style]}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <BlurView
        pointerEvents="none"
        intensity={40}
        tint="systemUltraThinMaterialDark"
        blurMethod="dimezisBlurViewSdk31Plus"
        blurTarget={blurTarget}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.sheen,
          { borderRadius: radius, backgroundColor: tint ?? 'rgba(255,255,255,0.08)' },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheen: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.28)',
  },
});

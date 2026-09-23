import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

/** Colourful wallpaper for the glass to refract. */
export function Backdrop({ targetRef }: { targetRef: RefObject<View | null> }) {
  return (
    <BlurTargetView ref={targetRef} style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#1b1440', '#2d1b69', '#0f3b5c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, { top: -80, left: -60, backgroundColor: '#ff5f9e' }]} />
      <View style={[styles.blob, { top: '38%', right: -110, backgroundColor: '#3fd0ff' }]} />
      <View style={[styles.blob, { bottom: -60, left: -40, backgroundColor: '#8a5cff' }]} />
      <View style={[styles.blobSmall, { top: '22%', left: '30%', backgroundColor: '#ffb84d' }]} />
    </BlurTargetView>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.55 },
  blobSmall: { position: 'absolute', width: 140, height: 140, borderRadius: 70, opacity: 0.5 },
});

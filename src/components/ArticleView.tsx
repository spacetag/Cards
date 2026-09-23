import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { ArticleViewProps } from './ArticleView.types';

/**
 * Runs inside the page. Scrolls it at `__ng.speed` px/s unless paused, holds
 * still for a moment after the reader touches it, and reports mostly
 * horizontal drags back to the app so the card can be swiped away.
 */
const AUTO_SCROLL = `
(function () {
  var s = (window.__ng = window.__ng || { speed: 40, paused: false });
  if (s.started) return;
  s.started = true;
  s.hold = 0;
  var carry = 0, last = 0, ended = false;
  function post(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  document.documentElement.style.overflowX = 'hidden';
  if (document.body) document.body.style.overflowX = 'hidden';

  function tick(t) {
    var dt = last ? Math.min(t - last, 64) : 0;
    last = t;
    if (!s.paused && Date.now() > s.hold) {
      carry += (s.speed * dt) / 1000;
      var step = Math.floor(carry);
      if (step >= 1) { carry -= step; window.scrollBy(0, step); }
      var el = document.scrollingElement || document.documentElement;
      if (!ended && el.scrollHeight > window.innerHeight * 1.5 &&
          window.innerHeight + window.scrollY >= el.scrollHeight - 4) {
        ended = true;
        post({ type: 'end' });
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  var x0 = 0, y0 = 0, t0 = 0, mode = null;
  addEventListener('touchstart', function (e) {
    var p = e.touches[0];
    x0 = p.clientX; y0 = p.clientY; t0 = Date.now(); mode = null;
    s.hold = Infinity;
  }, { passive: true });
  addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) return;
    var p = e.touches[0], dx = p.clientX - x0, dy = p.clientY - y0;
    if (mode === null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
      mode = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'h' : 'v';
    }
    if (mode === 'h') { e.preventDefault(); post({ type: 'drag', dx: dx }); }
  }, { passive: false });
  function end(e) {
    s.hold = Date.now() + 2500;
    if (mode === 'h') {
      var dx = e.changedTouches[0].clientX - x0;
      post({ type: 'release', dx: dx, vx: dx / Math.max(1, Date.now() - t0) });
    }
    mode = null;
  }
  addEventListener('touchend', end, { passive: true });
  addEventListener('touchcancel', end, { passive: true });
})();
true;
`;

const settingsScript = (speed: number, paused: boolean) =>
  `(window.__ng = window.__ng || {}).speed = ${speed}; window.__ng.paused = ${paused}; true;`;

/** The live article page, auto-scrolling. */
export function ArticleView({ article, speed, paused, onDrag, onRelease, onEnd }: ArticleViewProps) {
  const web = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const settings = settingsScript(speed, paused);

  useEffect(() => {
    web.current?.injectJavaScript(settings);
  }, [settings]);

  const onMessage = (e: WebViewMessageEvent) => {
    let m: { type: string; dx?: number; vx?: number };
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m.type === 'drag') onDrag(m.dx ?? 0);
    else if (m.type === 'release') onRelease(m.dx ?? 0, m.vx ?? 0);
    else if (m.type === 'end') onEnd();
  };

  return (
    <View style={styles.fill}>
      <WebView
        ref={web}
        source={{ uri: article.url }}
        style={styles.fill}
        injectedJavaScriptBeforeContentLoaded={settings}
        injectedJavaScript={AUTO_SCROLL}
        onMessage={onMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          web.current?.injectJavaScript(settings);
        }}
        // Links that open a new tab stay in this card.
        setSupportMultipleWindows={false}
        // The edge-swipe back gesture would fight the card swipe.
        allowsBackForwardNavigationGestures={false}
        mediaPlaybackRequiresUserAction
        allowsInlineMediaPlayback
      />
      {loading && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});

// Side menu drawer, opened by the ☰ button top-left of every screen.
// The drawer is EMPTY for now — its contents come later. This is just the
// button + sliding shell, wired up and working.
import { useEffect, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDrawer } from '@/state/drawer';
import { useSettings } from '@/state/settings';

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.85);

export function AppDrawer() {
  const { isOpen, closeDrawer } = useDrawer();
  const { palette, accent } = useSettings();
  // Stable animated value, created once via lazy state init (no ref read
  // during render). The panel is always mounted and slides off-screen when
  // closed, so no mount/unmount state is needed.
  const [slide] = useState(() => new Animated.Value(-DRAWER_WIDTH));

  useEffect(() => {
    Animated.timing(slide, {
      toValue: isOpen ? 0 : -DRAWER_WIDTH,
      duration: isOpen ? 220 : 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen, slide]);

  return (
    <View style={styles.root} pointerEvents={isOpen ? 'auto' : 'none'}>
      {isOpen ? (
        <Pressable
          style={[styles.overlay, { backgroundColor: palette.overlay }]}
          onPress={closeDrawer}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
      ) : null}
      <Animated.View
        style={[
          styles.panel,
          { backgroundColor: palette.bg, borderColor: accent.color, transform: [{ translateX: slide }] },
        ]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.ink }]}>Menu</Text>
          <Pressable onPress={closeDrawer} accessibilityRole="button" accessibilityLabel="Close menu">
            <Text style={[styles.close, { color: palette.ink }]}>✕</Text>
          </Pressable>
        </View>
        {/* Empty for now — menu items come later. */}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    paddingTop: 56,
    paddingHorizontal: 16,
    borderRightWidth: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  close: {
    fontSize: 20,
    fontWeight: '700',
    padding: 8,
  },
});

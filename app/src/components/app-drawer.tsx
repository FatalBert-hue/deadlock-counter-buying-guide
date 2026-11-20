// Side menu drawer, opened by the ☰ button top-left of every screen.
// Holds the five main destinations — Full build, Quick pick, Counter sheet,
// Patch, Saved. Tapping one navigates there and closes the drawer.
import { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';

import { useDrawer } from '@/state/drawer';
import { useSettings } from '@/state/settings';

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.85);

interface MenuItem {
  label: string;
  href: Href;
  icon: ImageSourcePropType;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Full build', href: '/', icon: require('@/assets/images/tabIcons/full-build.png') },
  { label: 'Quick pick', href: '/quick-pick', icon: require('@/assets/images/tabIcons/quick-pick.png') },
  {
    label: 'Counter sheet',
    href: '/counter-sheet',
    icon: require('@/assets/images/tabIcons/counter-sheet.png'),
  },
  { label: 'Patch', href: '/patch', icon: require('@/assets/images/tabIcons/patch.png') },
  { label: 'Saved', href: '/saved', icon: require('@/assets/images/tabIcons/saved.png') },
];

export function AppDrawer() {
  const { isOpen, closeDrawer } = useDrawer();
  const { palette, accent } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
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
        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Pressable
                key={item.label}
                onPress={() => {
                  if (!isActive) {
                    router.push(item.href);
                  }
                  closeDrawer();
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: isActive }}
                style={[styles.item, { backgroundColor: isActive ? palette.panel : 'transparent' }]}>
                <Image
                  source={item.icon}
                  style={[styles.itemIcon, { tintColor: isActive ? accent.color : palette.ink }]}
                />
                <Text style={[styles.itemLabel, { color: isActive ? accent.color : palette.ink }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
  menu: {
    marginTop: 16,
    gap: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  itemLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
});

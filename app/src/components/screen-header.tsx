// Screen header: menu button top-left (opens the side drawer), title,
// AI Chat button top-right (goes to the AI Chat screen). Settings now
// lives in the side drawer instead. Short and quiet — no long
// descriptions.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { pillShadow } from '@/constants/palette';
import { useDrawer } from '@/state/drawer';
import { useSettings } from '@/state/settings';

export function ScreenHeader({ title }: { title: string }) {
  const { palette, accent } = useSettings();
  const { openDrawer } = useDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const onAiChat = pathname === '/ai-chat';
  return (
    <View style={[styles.row, { borderTopColor: accent.color }]}>
      <Pressable
        onPress={openDrawer}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        style={[styles.iconButton, pillShadow(palette), { backgroundColor: accent.color }]}>
        <Text style={[styles.icon, { color: palette.onAccent }]}>☰</Text>
      </Pressable>
      <Text style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
        {title}
      </Text>
      <Pressable
        onPress={() => {
          if (!onAiChat) router.push('/ai-chat');
        }}
        accessibilityRole="button"
        accessibilityLabel="Open AI Chat"
        accessibilityState={{ selected: onAiChat }}
        style={[
          styles.aiChatButton,
          pillShadow(palette),
          // Solid accent fill while on the AI Chat screen, so the
          // current screen is unmistakable; outlined pill elsewhere.
          onAiChat
            ? { backgroundColor: accent.color }
            : { backgroundColor: palette.panel, borderColor: accent.color, borderWidth: 2 },
        ]}>
        <Image
          source={require('@/assets/images/tabIcons/ai-chat.png')}
          style={[styles.aiChatIcon, { tintColor: onAiChat ? palette.onAccent : palette.ink }]}
        />
        <Text style={[styles.aiChatText, { color: onAiChat ? palette.onAccent : palette.ink }]}>AI Chat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 3,
  },
  iconButton: {
    width: 40,
    height: 40,
    // Circular, like the reference's round icon buttons.
    borderRadius: 999,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    fontWeight: '800',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  aiChatButton: {
    height: 40,
    paddingHorizontal: 12,
    // Fully rounded pill, like the reference's chunky pill buttons.
    borderRadius: 999,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  aiChatIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  aiChatText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { DATA_PATCH, HERO_COUNT, ITEM_COUNT } from '@/data';

export interface PlaceholderProps {
  title: string;
  body: string;
}

export default function PlaceholderScreen({ title, body }: PlaceholderProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.body}>{body}</ThemedText>
        <ThemedView type="backgroundElement" style={styles.dataBox}>
          <ThemedText type="small">
            {HERO_COUNT} heroes · {ITEM_COUNT} items · Data: {DATA_PATCH}
          </ThemedText>
        </ThemedView>
        <ThemedText type="small" style={styles.footer}>
          Unofficial fan companion — not affiliated with, endorsed by, or sponsored by
          Valve Corporation.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: 800,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
  },
  dataBox: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  footer: {
    textAlign: 'center',
    opacity: 0.7,
  },
});

// Primary action button — one shared component so every main action in
// the app looks the same: a chunky pill with a soft shadow and a
// clearly visible gradient built from the user's chosen accent (accent
// -> a much lighter stop of the same accent), like the reference's
// gradient CTA card. The dark onAccent text stays readable on both
// gradient stops. Secondary actions stay flat panel buttons (see the
// screens) — only the primary action on a screen uses this.
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { lighten, pillShadow } from '@/constants/palette';
import { useSettings } from '@/state/settings';

interface AccentButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Tighter padding for small in-row buttons (e.g. Load). */
  compact?: boolean;
  style?: ViewStyle;
}

export function AccentButton({ label, onPress, accessibilityLabel, disabled, compact, style }: AccentButtonProps) {
  const { palette, accent } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.press, { opacity: disabled ? 0.6 : 1 }, style]}>
      <LinearGradient
        colors={[accent.color, lighten(accent.color, 0.35)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.gradient, pillShadow(palette), compact ? styles.compact : styles.regular]}>
        <Text style={[styles.text, { color: palette.onAccent }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    borderRadius: 999,
    borderCurve: 'continuous',
  },
  gradient: {
    borderRadius: 999,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  regular: {
    paddingVertical: 12,
  },
  compact: {
    paddingVertical: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: '800',
  },
});

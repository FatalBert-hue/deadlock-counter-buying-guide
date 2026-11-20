/**
 * Theme colours for the app, resolved through Settings so the user's
 * dark/light choice (not just the device) wins. Falls back to the device
 * scheme when the theme mode is 'system'.
 */
import { useSettings } from '@/state/settings';

export function useTheme() {
  const { palette } = useSettings();
  return {
    text: palette.ink,
    background: palette.bg,
    backgroundElement: palette.panel2,
    backgroundSelected: palette.chip,
    textSecondary: palette.muted,
  };
}

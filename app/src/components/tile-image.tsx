// Tinted icon tile — the reference's coloured rounded-square tiles:
// a hero portrait or item image sits on a clearly coloured pastel
// tile (orange / blue / violet / mint, cycling) instead of floating
// on the background. Purely presentational — no hooks, no state —
// so it stays cheap inside the picker FlatLists. The tile keeps the
// same outer size as the image it replaces: the image inside is a
// little smaller, with the tint showing as a frame around it.
// Pass `bg` to override the tint (e.g. white on the violet hero
// panel); otherwise the tint cycles from `palette.tileTints`.
// Pass `onPress` / `onLongPress` to make the tile itself tappable:
// hero portraits use onLongPress to open the hero's abilities, with
// onPress doing whatever a tap on that portrait already did (open
// the picker, select the hero, load the build). When neither is
// set the tile stays a plain View, as before.
import { Pressable, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';

import { pillShadow, Radii, type Palette } from '@/constants/palette';

interface TileImageProps {
  /** Undefined renders the bare tinted tile (no hero picked yet). */
  source: ImageSource | undefined;
  /** Outer size of the tile (same size the bare image used to be). */
  size: number;
  palette: Palette;
  /** Which tile tint to use (cycles 0-3). Ignored when `bg` is set. */
  tint?: number;
  /** Explicit tile background, e.g. white on the hero panel. */
  bg?: string;
  /** Tap on the tile itself (defaults to nothing). */
  onPress?: () => void;
  /** Long-press on the tile itself (defaults to nothing). */
  onLongPress?: () => void;
}

export function TileImage({ source, size, palette, tint = 0, bg, onPress, onLongPress }: TileImageProps) {
  const tileBg = bg ?? palette.tileTints[((tint % 4) + 4) % 4];
  const inner = size - 8;
  const tile = (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Radii.tile,
          borderCurve: 'continuous',
          backgroundColor: tileBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pillShadow(palette),
      ]}>
      {source ? (
        <Image source={source} style={{ width: inner, height: inner, borderRadius: 12 }} contentFit="cover" />
      ) : null}
    </View>
  );
  if (!onPress && !onLongPress) return tile;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      {tile}
    </Pressable>
  );
}

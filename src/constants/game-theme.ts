import type { TextStyle } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

// The game deliberately uses the cream/green brand in both appearances.
// Native settings controls retain their platform's own semantic styling.
export const gameColors = {
  light: {
    background: '#F7F6F2', surface: '#FFFFFF', text: '#18261D', secondary: '#536158',
    border: '#DFE5DE', accent: '#246B49', onAccent: '#FFFFFF', accentSoft: '#E6EEE5',
    warning: '#8A5100', warningSoft: '#F6EBCD', danger: '#B32F35', dangerSoft: '#F8E8E7',
    meterTrack: '#E2E5DC',
  },
  dark: {
    background: '#121613', surface: '#1D241F', text: '#F1F5F1', secondary: '#B6C2B8',
    border: '#38433B', accent: '#80D0A2', onAccent: '#122219', accentSoft: '#263C2D',
    warning: '#FFD08A', warningSoft: '#3F3320', danger: '#FFACAF', dangerSoft: '#422829',
    meterTrack: '#38433B',
  },
} as const;

export const gameSpacing = { xs: 4, sm: 8, md: 12, lg: 16, edge: 20, xl: 24, xxl: 32, huge: 48 } as const;
export const gameRadius = { sm: 8, button: 12, panel: 16, pill: 999 } as const;
export const gameType = {
  eyebrow: { fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: 1.3 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: -0.6 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  money: { fontSize: 56, lineHeight: 68, fontWeight: '600', letterSpacing: -2, fontVariant: ['tabular-nums'] },
} as const satisfies Record<string, TextStyle>;

export function useGameTheme() {
  const scheme = useColorScheme();
  return gameColors[scheme === 'dark' ? 'dark' : 'light'];
}

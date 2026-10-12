import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Host, Switch, TextInput } from '@expo/ui';
import type { ScrollViewProps, StyleProp, TextProps, ViewProps, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gameRadius, gameSpacing, gameType, useGameTheme } from '@/constants/game-theme';

type Tone = 'primary' | 'secondary' | 'accent' | 'danger' | 'warning';

export function GameField({ label, initialValue = '', onChangeText, numeric = false, secure = false, email = false, testID }: {
  label: string; initialValue?: string; onChangeText: (text: string) => void; numeric?: boolean; secure?: boolean; email?: boolean; testID?: string;
}) {
  const theme = useGameTheme();
  const { fontScale } = useWindowDimensions();
  return <View style={{ gap: gameSpacing.sm }}>
    <GameText variant="caption" style={{ fontWeight: '600' }}>{label}</GameText>
    <Host matchContents={{ vertical: true }} ignoreSafeArea="all" seedColor={theme.accent} style={{ width: '100%' }}>
      <TextInput defaultValue={initialValue} onChangeText={onChangeText} placeholder={label} testID={testID}
        secureTextEntry={secure} autoCapitalize={email || secure ? 'none' : 'sentences'} autoCorrect={!email && !secure && !numeric}
        keyboardType={numeric ? 'number-pad' : email ? 'email-address' : 'default'} returnKeyType="done"
        placeholderTextColor={theme.secondary} textStyle={{ color: theme.text, fontSize: gameType.body.fontSize * Math.max(1, fontScale) }}
        style={{ height: 56 * Math.max(1, fontScale), padding: gameSpacing.md, borderWidth: 1, borderColor: theme.border, borderRadius: gameRadius.button, backgroundColor: theme.surface, width: '100%' }} />
    </Host>
  </View>;
}

export function GameToggle({ label, value, onValueChange, disabled }: { label: string; value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean }) {
  const theme = useGameTheme();
  return <Host matchContents={{ vertical: true }} ignoreSafeArea="all" seedColor={theme.accent} style={{ width: '100%', minHeight: 48 }}>
    <Switch label={label} value={value} onValueChange={onValueChange} disabled={disabled} />
  </Host>;
}

export function GameChoice({ title, detail, selected, onPress, disabled = false, testID, children, accessibilityLabel }: { title: string; detail?: string; selected?: boolean; onPress: () => void; disabled?: boolean; testID?: string; children?: ReactNode; accessibilityLabel?: string }) {
  const theme = useGameTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? [title, detail].filter(Boolean).join('. ')} accessibilityState={{ selected: !!selected, disabled }} disabled={disabled} onPress={onPress} testID={testID}
    style={({ pressed }) => ({ minHeight: 48, paddingVertical: gameSpacing.md, gap: gameSpacing.xs, opacity: disabled ? 0.45 : pressed ? 0.65 : 1, borderBottomWidth: 1, borderBottomColor: theme.border })}>
    <GameText variant="body" tone={selected ? 'accent' : 'primary'} style={{ fontWeight: selected ? '600' : '400' }}>{selected ? '✓ ' : ''}{title}</GameText>
    {detail && <GameText variant="caption" tone="secondary">{detail}</GameText>}
    {children}
  </Pressable>;
}

export function GameText({ variant = 'body', tone = 'primary', style, ...props }: TextProps & {
  variant?: keyof typeof gameType;
  tone?: Tone;
}) {
  const theme = useGameTheme();
  const color = tone === 'primary' ? theme.text : theme[tone];
  return <Text selectable style={[gameType[variant], { color }, style]} {...props} />;
}

// Scrolling preserves access to care actions on short displays and at large text sizes.
export function GameScreen({ children, style, contentContainerStyle, ...props }: ScrollViewProps) {
  const theme = useGameTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={[{ flex: 1, backgroundColor: theme.background }, style]}
      contentContainerStyle={[
        { paddingHorizontal: gameSpacing.edge, paddingTop: gameSpacing.xl, paddingBottom: gameSpacing.xxl + insets.bottom, gap: gameSpacing.xl, width: '100%', maxWidth: 600, alignSelf: 'center', flexGrow: 1 },
        contentContainerStyle,
      ]}
      {...props}>
      {children}
    </ScrollView>
  );
}

export function GameButton({ title, subtitle, onPress, disabled = false, loading = false, variant = 'primary', size = 'regular', style, testID, accessibilityLabel, accessibilityHint }: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'regular' | 'large';
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const theme = useGameTheme();
  const filled = variant === 'primary';
  const color = filled ? theme.onAccent : variant === 'danger' ? theme.danger : theme.text;
  const backgroundColor = filled ? theme.accent : variant === 'secondary' ? theme.surface : variant === 'danger' ? theme.dangerSoft : 'transparent';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join('. ')}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        { minHeight: size === 'large' ? 72 : 48, minWidth: 48, paddingHorizontal: gameSpacing.lg, paddingVertical: gameSpacing.md, borderRadius: gameRadius.button, borderCurve: 'continuous', backgroundColor, borderWidth: variant === 'secondary' ? 1 : 0, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', gap: gameSpacing.xs, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 },
        style,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: gameSpacing.sm }}>
        {loading && <ActivityIndicator size="small" color={color} />}
        <Text style={[gameType.heading, { color, textAlign: 'center', flexShrink: 1 }]}>{title}</Text>
      </View>
      {subtitle && <Text style={[gameType.caption, { color, textAlign: 'center' }]}>{subtitle}</Text>}
    </Pressable>
  );
}

export function GameSection({ children, variant = 'plain', style, ...props }: ViewProps & { variant?: 'plain' | 'surface' | 'accent' }) {
  const theme = useGameTheme();
  return <View style={[
    { gap: gameSpacing.lg },
    variant !== 'plain' && { padding: gameSpacing.edge, borderRadius: gameRadius.panel, borderCurve: 'continuous', backgroundColor: variant === 'accent' ? theme.accentSoft : theme.surface },
    style,
  ]} {...props}>{children}</View>;
}

export function GameBadge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'accent' | 'warning' | 'danger' }>) {
  const theme = useGameTheme();
  const color = tone === 'neutral' ? theme.secondary : theme[tone];
  const backgroundColor = tone === 'neutral' ? theme.meterTrack : theme[`${tone}Soft`];
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: gameSpacing.sm, paddingVertical: gameSpacing.xs, borderRadius: gameRadius.sm, borderCurve: 'continuous', backgroundColor }}>
    <GameText variant="caption" style={{ color, fontWeight: '600' }}>{children}</GameText>
  </View>;
}

export function GameDivider() {
  const theme = useGameTheme();
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

export function ResourceMeter({ label, value, max = 100, kind, status }: { label: string; value: number; max?: number; kind: 'hunger' | 'sanity'; status?: string }) {
  const theme = useGameTheme();
  const fraction = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const critical = kind === 'hunger' && fraction <= 0.1;
  const low = fraction <= 0.25;
  const color = critical ? theme.danger : low ? theme.warning : theme.accent;
  const state = status ?? (critical ? 'Critical' : low ? 'Low' : 'Good');
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={`${label}, ${state}`} accessibilityValue={{ min: 0, max, now: value, text: `${value} of ${max}. ${state}` }} style={{ gap: gameSpacing.sm }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: gameSpacing.sm }}>
      <GameText variant="caption" style={{ fontWeight: '600', flexGrow: 1 }}>{label}</GameText>
      <GameText variant="caption" style={{ color }}>{state}</GameText>
      <GameText variant="caption" style={{ fontVariant: ['tabular-nums'] }}>{value}/{max}</GameText>
    </View>
    <View style={{ height: 6, borderRadius: gameRadius.pill, backgroundColor: theme.meterTrack, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${fraction * 100}%`, borderRadius: gameRadius.pill, backgroundColor: color }} />
    </View>
  </View>;
}

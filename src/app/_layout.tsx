import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from '@/features/game/game-provider';
import { useGameTheme } from '@/constants/game-theme';

function Navigation() {
  const colors = useGameTheme();
  return <>
    <StatusBar style="auto" />
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Account and showcase' }} />
      <Stack.Screen name="game-over" options={{ title: 'Life complete', headerBackVisible: false, gestureEnabled: false }} />
    </Stack>
  </>;
}

export default function RootLayout() {
  return <SafeAreaProvider><GameProvider><Navigation /></GameProvider></SafeAreaProvider>;
}

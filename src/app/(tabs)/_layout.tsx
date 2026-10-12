import { Tabs, router } from 'expo-router';
import { Platform, Pressable, Text } from 'react-native';
import { useGameTheme } from '@/constants/game-theme';

export default function TabLayout() {
  const colors = useGameTheme();
  return <Tabs screenOptions={{
    headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text,
    headerShadowVisible: false, tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.secondary,
    tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border, ...(Platform.OS === 'web' ? { height: 76, paddingBottom: 12, paddingTop: 8 } : {}) },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    headerRight: () => <Pressable accessibilityRole="button" accessibilityLabel="Account and settings" onPress={() => router.push('/settings')} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, justifyContent: 'center', paddingHorizontal: 18, opacity: pressed ? 0.65 : 1 })}><Text style={{ color: colors.secondary, fontSize: 14, fontWeight: '600' }}>Profile</Text></Pressable>,
  }}>
    <Tabs.Screen name="index" options={{ title: 'Small beginnings', tabBarLabel: 'Home', tabBarIcon: ({ color }) => <Text accessible={false} style={{ color, fontSize: 22 }}>⌂</Text> }} />
    <Tabs.Screen name="career" options={{ title: 'Career', tabBarLabel: 'Career', tabBarIcon: ({ color }) => <Text accessible={false} style={{ color, fontSize: 22 }}>◇</Text> }} />
    <Tabs.Screen name="life" options={{ title: 'Life', tabBarLabel: 'Life', tabBarIcon: ({ color }) => <Text accessible={false} style={{ color, fontSize: 22 }}>□</Text> }} />
    <Tabs.Screen name="journey" options={{ title: 'Journey', tabBarLabel: 'Journey', tabBarIcon: ({ color }) => <Text accessible={false} style={{ color, fontSize: 22 }}>↗</Text> }} />
    <Tabs.Screen name="leaders" options={{ title: 'Leaders', tabBarLabel: 'Leaders', tabBarIcon: ({ color }) => <Text accessible={false} style={{ color, fontSize: 22 }}>☆</Text> }} />
    <Tabs.Screen name="jobs" options={{ href: null }} />
    <Tabs.Screen name="shop" options={{ href: null }} />
  </Tabs>;
}

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: "700" },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: "보이스노트" }} />
          <Stack.Screen
            name="record"
            options={{
              title: "녹음 중",
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="note/[id]" options={{ title: "노트" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

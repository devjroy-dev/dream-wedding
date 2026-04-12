import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

const AUTH_SCREENS = ["login", "otp", "user-type", "vendor-login", "vendor-onboarding"];

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Small delay to ensure navigation is ready
    const timer = setTimeout(() => {
      checkSession();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const checkSession = async () => {
    try {
      // Step 1 — Check access grant
      const accessRaw = await AsyncStorage.getItem("access_grant");
      if (!accessRaw) { router.replace("/access-gate" as any); return; }
      const access = JSON.parse(accessRaw);
      if (!access.granted) { router.replace("/access-gate" as any); return; }
      if (access.expires_at && new Date(access.expires_at) < new Date()) {
        await AsyncStorage.removeItem("access_grant");
        router.replace("/access-gate" as any);
        return;
      }
      // Step 2 — Check session
      const [userSession, vendorSession] = await Promise.all([
        AsyncStorage.getItem("user_session"),
        AsyncStorage.getItem("vendor_session"),
      ]);
      const inAuthGroup = AUTH_SCREENS.includes(segments[0] as string);
      const isIndexScreen = !segments[0] || segments[0] === undefined;
      if (vendorSession) {
        const parsed = JSON.parse(vendorSession);
        if (parsed.vendorId) {
          if (inAuthGroup || isIndexScreen) router.replace("/vendor-dashboard");
          return;
        }
      }
      if (userSession) {
        const parsed = JSON.parse(userSession);
        if (parsed.uid) {
          if (inAuthGroup || isIndexScreen) router.replace("/home");
          return;
        }
      }
      if (!inAuthGroup) {
        if (access.type === "vendor_permanent" || access.type === "vendor_demo") {
          router.replace("/vendor-login");
        } else {
          router.replace("/login");
        }
      }
    } catch (e) {
      router.replace("/access-gate" as any);
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F0E8", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="access-gate" />
          <Stack.Screen name="login" />
          <Stack.Screen name="otp" />
          <Stack.Screen name="user-type" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="home" />
          <Stack.Screen name="vendor-login" />
          <Stack.Screen name="vendor-onboarding" />
          <Stack.Screen name="vendor-dashboard" />
          <Stack.Screen name="vendor-preview" />
          <Stack.Screen name="filter" />
          <Stack.Screen name="swipe" />
          <Stack.Screen name="vendor-profile" />
          <Stack.Screen name="moodboard" />
          <Stack.Screen name="bts-planner" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="inquiry" />
          <Stack.Screen name="payment" />
          <Stack.Screen name="payment-success" />
          <Stack.Screen name="messaging" />
          <Stack.Screen name="compare" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="lookalike" />
          <Stack.Screen name="wedding-website" />
          <Stack.Screen name="get-inspired" />
          <Stack.Screen name="look-book" />
          <Stack.Screen name="destination-weddings" />
          <Stack.Screen name="special-offers" />
          <Stack.Screen name="spotlight" />
        </Stack>
      </AuthGate>
    </>
  );
}

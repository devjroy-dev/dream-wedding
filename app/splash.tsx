import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const currentScreen = segments[0] as string;

      // These screens never need auth checks — let them through always
      const openScreens = [
        'index', 'splash', 'login', 'otp',
        'user-type', 'onboarding',
        'vendor-login', 'vendor-onboarding',
        undefined
      ];

      if (openScreens.includes(currentScreen)) {
        setChecking(false);
        return;
      }

      const user = await AsyncStorage.getItem('user_session');
      const vendorUser = await AsyncStorage.getItem('vendor_session');

      if (!user && !vendorUser) {
        router.replace('/login');
      }
    } catch (e) {
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#C9A84C" />
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
          <Stack.Screen name="splash" />
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
        </Stack>
      </AuthGate>
    </>
  );
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/index';
import { DMSans_300Light, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const AUTH_SCREENS = ['login', 'otp', 'user-type', 'vendor-login', 'vendor-onboarding'];

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => checkSession(), 150);
    return () => clearTimeout(timer);
  }, []);

  const checkSession = async () => {
    try {
      // Always check BOTH session keys
      const [userSession, vendorSession] = await Promise.all([
        AsyncStorage.getItem('user_session'),
        AsyncStorage.getItem('vendor_session'),
      ]);

      const inAuthGroup = AUTH_SCREENS.includes(segments[0] as string);
      const isIndexScreen = segments[0] === 'index' as any || segments[0] === undefined;

      if (vendorSession) {
        // Vendor is logged in
        const parsed = JSON.parse(vendorSession);
        if (parsed.vendorId) {
          if (inAuthGroup || isIndexScreen) {
            router.replace('/vendor-dashboard');
          }
          return;
        }
      }

      if (userSession) {
        // Couple is logged in
        const parsed = JSON.parse(userSession);
        if (parsed.uid) {
          if (inAuthGroup || isIndexScreen) {
            router.replace('/home');
          }
          return;
        }
      }

      // No valid session — send to login
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } catch (e) {
      // On any error, go to login safely
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: '#8C7B6E', letterSpacing: 14, textTransform: 'uppercase' }}>T H E</Text>
        <Text style={{ fontSize: 42, color: '#2C2420', letterSpacing: 1, marginTop: 12 }}>Dream Wedding</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
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
          <Stack.Screen name="curated-suggestions" />
          <Stack.Screen name="access-gate" />
        </Stack>
      </AuthGate>
    </>
  );
}
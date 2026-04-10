import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(async () => {
      try {
        const vendorSession = await AsyncStorage.getItem('vendor_session');
        if (vendorSession) {
          const parsed = JSON.parse(vendorSession);
          if (parsed.onboarded && parsed.vendorId) {
            router.replace('/vendor-dashboard');
            return;
          }
        }
        const userSession = await AsyncStorage.getItem('user_session');
        if (userSession) {
          router.replace('/home');
          return;
        }
        router.replace('/login');
      } catch (e) {
        router.replace('/login');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.tagline, { opacity }]}>
        Your Dreams Start Here.
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagline: {
    fontSize: 28,
    color: '#2C2420',
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
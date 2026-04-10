import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const dividerWidth = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dreamOpacity = useRef(new Animated.Value(0)).current;
  const dreamTranslate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(dividerWidth, {
        toValue: 48,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(dreamOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(dreamTranslate, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(async () => {
      try {
        const userSession = await AsyncStorage.getItem('user_session');
        const vendorSession = await AsyncStorage.getItem('vendor_session');

        if (vendorSession) {
          const parsed = JSON.parse(vendorSession);
          if (parsed.onboarded && parsed.vendorId) {
            router.replace('/vendor-dashboard');
            return;
          }
        }

        if (userSession) {
          router.replace('/home');
          return;
        }

        router.replace('/login');
      } catch (e) {
        router.replace('/login');
      }
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>

      <Animated.View style={[styles.logoContainer, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }]
      }]}>
        <Text style={styles.logoTop}>The</Text>
        <Text style={styles.logoMain}>Dream Wedding</Text>
        <Animated.View style={[styles.divider, { width: dividerWidth }]} />
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          India's Premium Wedding Platform
        </Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.dreamLineContainer, {
        opacity: dreamOpacity,
        transform: [{ translateY: dreamTranslate }]
      }]}>
        <Text style={styles.dreamLine}>Your dreams start here.</Text>
      </Animated.View>

      <Animated.Text style={[styles.footer, { opacity: taglineOpacity }]}>
        thedreamwedding.in
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
  logoContainer: {
    alignItems: 'center',
    gap: 10,
  },
  logoTop: {
    fontSize: 18,
    color: '#8C7B6E',
    fontWeight: '300',
    letterSpacing: 8,
    textTransform: 'uppercase',
  },
  logoMain: {
    fontSize: 48,
    color: '#2C2420',
    fontWeight: '400',
    letterSpacing: 3,
    textAlign: 'center',
    lineHeight: 54,
  },
  divider: {
    height: 1.5,
    backgroundColor: '#C9A84C',
    marginVertical: 6,
  },
  tagline: {
    fontSize: 10,
    color: '#8C7B6E',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  dreamLineContainer: {
    position: 'absolute',
    bottom: height * 0.18,
    alignItems: 'center',
  },
  dreamLine: {
    fontSize: 22,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    fontSize: 11,
    color: '#C9A84C',
    letterSpacing: 2,
  },
});
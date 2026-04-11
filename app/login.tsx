import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Animated, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';
import { createOrGetUser } from '../services/api';
import {
  useFonts,
  PlayfairDisplay_300Light,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display/index';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

const { height } = Dimensions.get('window');

GoogleSignin.configure({
  webClientId: '707007171164-3uphuoa96s37ur6h76dl09854k8tqa16.apps.googleusercontent.com',
  offlineAccess: true,
});

export default function LoginScreen() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(20)).current;
  const dividerWidth = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslate = useRef(new Animated.Value(60)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;

  // Load fonts — but don't block render on them
  useFonts({
    PlayfairDisplay_300Light,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  // Animation starts immediately on mount — no font dependency
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(logoTranslate, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
      Animated.timing(dividerWidth, { toValue: 40, duration: 400, useNativeDriver: false }),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(buttonsTranslate, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error('No ID token received');
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const firebaseUID = result.user.uid;
      const userName = result.user.displayName || '';
      const userEmail = result.user.email || '';
      const userPhone = result.user.phoneNumber || '';
      let userData = null;
      try {
        const userResult = await createOrGetUser(userEmail || firebaseUID, userName, userEmail);
        userData = userResult.data;
      } catch (e) {}
      await AsyncStorage.setItem('user_session', JSON.stringify({
        uid: firebaseUID,
        userId: userData?.id || firebaseUID,
        phone: userPhone,
        email: userEmail,
        name: userName,
        userType: 'couple',
        avatar: result.user.photoURL || '',
      }));
      router.replace('/user-type');
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Please wait', 'Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available');
      } else {
        Alert.alert('Sign in failed', 'Could not sign in with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Animated.View style={[styles.logoInner, {
          opacity: logoOpacity,
          transform: [{ translateY: logoTranslate }]
        }]}>
          <Text style={styles.logoThe}>THE</Text>
          <Text style={styles.logoMain}>Dream Wedding</Text>
          <Animated.View style={[styles.logoDivider, { width: dividerWidth }]} />
          <Animated.Text style={[styles.logoTagline, { opacity: taglineOpacity }]}>
            It all starts here.
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Buttons Section */}
      <Animated.View style={[styles.bottomSection, {
        opacity: buttonsOpacity,
        transform: [{ translateY: buttonsTranslate }]
      }]}>

        <View style={styles.buttons}>

          {/* Google */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#2C2420" />
            ) : (
              <View style={styles.socialButtonInner}>
                <View style={styles.googleIconBox}>
                  <Text style={styles.googleIconG}>G</Text>
                </View>
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Apple — mock, Android-safe */}
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={() => {}}
            activeOpacity={0.8}
          >
            <View style={styles.socialButtonInner}>
              <View style={styles.appleIconBox}>
                <Text style={styles.appleIconText}>A</Text>
              </View>
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Phone */}
          <TouchableOpacity
            style={styles.phoneButton}
            onPress={() => router.push('/otp')}
          >
            <Text style={styles.phoneButtonText}>Continue with Phone Number</Text>
          </TouchableOpacity>

        </View>

        {/* Vendor link */}
        <TouchableOpacity
          style={styles.vendorRow}
          onPress={() => router.push('/vendor-login')}
        >
          <Text style={styles.vendorLink}>Vendor? Sign in here</Text>
        </TouchableOpacity>

      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 60,
  },
  logoSection: {
    flex: 0.9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    alignItems: 'center',
    gap: 10,
  },
  logoThe: {
    fontSize: 13,
    color: '#8C7B6E',
    letterSpacing: 12,
    textTransform: 'uppercase',
  },
  logoMain: {
    fontSize: 48,
    color: '#2C2420',
    letterSpacing: 1,
    textAlign: 'center',
    fontWeight: '300',
  },
  logoDivider: {
    height: 1,
    backgroundColor: '#C9A84C',
    marginVertical: 10,
  },
  logoTagline: {
    fontSize: 15,
    color: '#8C7B6E',
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },
  bottomSection: {
    gap: 20,
  },
  buttons: {
    gap: 12,
  },
  socialButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  socialButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  socialButtonText: {
    color: '#2C2420',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  googleIconBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconG: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  appleIconBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleIconText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E0D5',
  },
  dividerText: {
    color: '#8C7B6E',
    fontSize: 12,
  },
  phoneButton: {
    width: '100%',
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  phoneButtonText: {
    color: '#F5F0E8',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  vendorRow: {
    alignItems: 'center',
    paddingTop: 4,
  },
  vendorLink: {
    color: '#5C4A3A',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3,
    textDecorationLine: 'underline',
  },
});
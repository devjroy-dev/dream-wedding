import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Animated, Dimensions,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

let GoogleSignin: any = null;
let statusCodes: any = {};
try {
  const gsi = require('@react-native-google-signin/google-signin');
  GoogleSignin = gsi.GoogleSignin;
  statusCodes = gsi.statusCodes;
} catch (e) {
  console.warn('Google Sign-In native module not available:', e);
}
import { auth } from '../services/firebase';
import { createOrGetUser } from '../services/api';
import { PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/index';
import { DMSans_300Light, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';

const { height, width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    try {
      if (GoogleSignin) {
        GoogleSignin.configure({
          webClientId: '707007171164-3uphuoa96s37ur6h76dl09854k8tqa16.apps.googleusercontent.com',
          offlineAccess: true,
        });
      }
    } catch (e) {
      console.warn('GoogleSignin.configure failed:', e);
    }
  }, []);

  // Animation values — everything starts invisible
  const theOpacity = useRef(new Animated.Value(0)).current;
  const theTranslate = useRef(new Animated.Value(8)).current;
  const mainOpacity = useRef(new Animated.Value(0)).current;
  const mainTranslate = useRef(new Animated.Value(24)).current;
  const dividerWidth = useRef(new Animated.Value(0)).current;
  const dividerOpacity = useRef(new Animated.Value(0)).current;
  const tagline1Opacity = useRef(new Animated.Value(0)).current;
  const tagline2Opacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslate = useRef(new Animated.Value(40)).current;
  const vendorOpacity = useRef(new Animated.Value(0)).current;



  useEffect(() => {

    // Cinematic reveal sequence
    Animated.sequence([
      // Beat 1: "THE" whispers in
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(theOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(theTranslate, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),

      // Beat 2: "Dream Wedding" rises up
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(mainOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(mainTranslate, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),

      // Beat 3: Gold divider draws across
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(dividerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dividerWidth, { toValue: 48, duration: 600, useNativeDriver: false }),
      ]),

      // Beat 4: First tagline line fades in
      Animated.delay(300),
      Animated.timing(tagline1Opacity, { toValue: 1, duration: 600, useNativeDriver: true }),

      // Beat 5: Second tagline line (the gold punch)
      Animated.delay(200),
      Animated.timing(tagline2Opacity, { toValue: 1, duration: 600, useNativeDriver: true }),

      // Beat 6: Buttons rise
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(buttonsTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),

      // Beat 7: Vendor link fades in last
      Animated.delay(200),
      Animated.timing(vendorOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Logo section — vertically centered */}
        <View style={s.logoSection}>

          {/* THE */}
          <Animated.Text style={[s.logoThe, { opacity: theOpacity, transform: [{ translateY: theTranslate }] }]}>
            T H E
          </Animated.Text>

          {/* Dream Wedding */}
          <Animated.Text style={[s.logoMain, { opacity: mainOpacity, transform: [{ translateY: mainTranslate }] }]}>
            Dream Wedding
          </Animated.Text>

          {/* Gold divider */}
          <Animated.View style={[s.divider, { width: dividerWidth, opacity: dividerOpacity }]} />

          {/* Tagline — two lines, second in gold */}
          <View style={s.taglineWrap}>
            <Animated.Text style={[s.tagline, { opacity: tagline1Opacity }]}>
              Not just happily married.
            </Animated.Text>
            <Animated.Text style={[s.taglineGold, { opacity: tagline2Opacity }]}>
              Getting married happily.
            </Animated.Text>
          </View>

        </View>

        {/* Buttons section */}
        <Animated.View style={[s.buttonSection, { opacity: buttonsOpacity, transform: [{ translateY: buttonsTranslate }] }]}>

          <TouchableOpacity style={s.googleBtn} onPress={handleGoogleLogin} disabled={googleLoading} activeOpacity={0.85}>
            {googleLoading ? <ActivityIndicator color="#2C2420" /> : (
              <View style={s.btnInner}>
                <Text style={s.googleG}>G</Text>
                <Text style={s.btnLabel}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.appleBtn} onPress={() => {}} activeOpacity={0.85}>
            <View style={s.btnInner}>
              <Text style={s.appleA}>A</Text>
              <Text style={s.appleBtnLabel}>Continue with Apple</Text>
            </View>
          </TouchableOpacity>

          <View style={s.orRow}>
            <View style={s.orLine} />
            <Text style={s.orText}>or</Text>
            <View style={s.orLine} />
          </View>

          <TouchableOpacity style={s.phoneBtn} onPress={() => router.push('/otp')} activeOpacity={0.85}>
            <Text style={s.phoneBtnLabel}>Continue with Phone Number</Text>
          </TouchableOpacity>

        </Animated.View>

        {/* Vendor link — last to appear */}
        <Animated.View style={[s.vendorWrap, { opacity: vendorOpacity }]}>
          <TouchableOpacity onPress={() => router.push('/vendor-login')}>
            <Text style={s.vendorLink}>Vendor? Sign in here</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 32,
    paddingBottom: 44,
    paddingTop: 60,
  },

  // Logo section
  logoSection: {
    flex: 1,
    minHeight: height * 0.46,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  logoThe: {
    fontFamily: 'DMSans_300Light',
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 14,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  logoMain: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 42,
    color: '#2C2420',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#C9A84C',
    marginBottom: 18,
  },
  taglineWrap: {
    alignItems: 'center',
    gap: 5,
  },
  tagline: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    color: '#2C2420',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  taglineGold: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    color: '#C9A84C',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // Button section
  buttonSection: {
    gap: 12,
  },
  googleBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  appleBtn: {
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#2C2420',
    letterSpacing: 0.3,
  },
  googleG: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  appleA: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  appleBtnLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 4,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E0D5',
  },
  orText: {
    fontFamily: 'DMSans_300Light',
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 0.5,
  },
  phoneBtn: {
    width: '100%',
    backgroundColor: '#2C2420',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  phoneBtnLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#F5F0E8',
    letterSpacing: 0.5,
  },

  // Vendor link
  vendorWrap: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  vendorLink: {
    fontFamily: 'DMSans_300Light',
    fontSize: 13,
    color: '#8C7B6E',
    letterSpacing: 0.3,
    textDecorationLine: 'underline',
    textDecorationColor: '#C4B8AC',
  },
});

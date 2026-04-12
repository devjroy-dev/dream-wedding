import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PhoneAuthProvider, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

GoogleSignin.configure({
  webClientId: '707007171164-3uphuoa96s37ur6h76dl09854k8tqa16.apps.googleusercontent.com',
  offlineAccess: true,
});

async function lookupVendor(firebaseUID: string) {
  try {
    const res = await fetch(`${API}/api/vendor-logins/${firebaseUID}`);
    const data = await res.json();
    if (data.success && data.data && data.data.vendors) return data.data.vendors;
    return null;
  } catch (e) { return null; }
}

async function saveVendorLogin(firebaseUID: string, vendorId: string, email?: string, phone?: string) {
  try {
    await fetch(`${API}/api/vendor-logins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor_id: vendorId, firebase_uid: firebaseUID, email, phone }),
    });
  } catch (e) {}
}

export default function VendorLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationId, setVerificationId] = useState('');

  const buildAndSaveSession = async (firebaseUID: string, extra: any, vendor: any) => {
    if (vendor && vendor.id) {
      const session = {
        uid: firebaseUID, userId: firebaseUID, userType: 'vendor',
        vendorId: vendor.id, vendorName: vendor.name,
        category: vendor.category, city: vendor.city,
        plan: vendor.plan || 'basic', onboarded: true, ...extra,
      };
      await AsyncStorage.setItem('vendor_session', JSON.stringify(session));
      // Save the firebase_uid <-> vendor_id link for future logins
      await saveVendorLogin(firebaseUID, vendor.id, extra.email, extra.phone);
      router.replace('/vendor-dashboard');
    } else {
      await AsyncStorage.setItem('vendor_session', JSON.stringify({
        uid: firebaseUID, userId: firebaseUID,
        userType: 'vendor', onboarded: false, ...extra,
      }));
      router.replace('/vendor-onboarding');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error('No ID token');
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const vendor = await lookupVendor(result.user.uid);
      await buildAndSaveSession(result.user.uid, {
        email: result.user.email || '',
        name: result.user.displayName || '',
      }, vendor);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {}
      else if (error.code === statusCodes.IN_PROGRESS) Alert.alert('Please wait', 'Sign in already in progress');
      else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) Alert.alert('Error', 'Google Play Services not available');
      else Alert.alert('Sign in failed', 'Could not sign in with Google. Please try again.');
    } finally { setGoogleLoading(false); }
  };

  const handleSendOTP = async () => {
    try {
      setLoading(true);
      const provider = new PhoneAuthProvider(auth);
      const vid = await provider.verifyPhoneNumber(`+91${phone}`, { type: 'recaptcha', verify: () => Promise.resolve('') } as any);
      setVerificationId(vid);
      setOtpSent(true);
      Alert.alert('Code Sent', `Verification code sent to +91 ${phone}`);
    } catch (error: any) {
      const msg = error?.code === 'auth/invalid-phone-number' ? 'Please enter a valid 10-digit number.'
        : error?.code === 'auth/too-many-requests' ? 'Too many attempts. Try again later.'
        : 'Could not send OTP. Please try again.';
      Alert.alert('Error', msg);
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const result = await signInWithCredential(auth, credential);
      const vendor = await lookupVendor(result.user.uid);
      await buildAndSaveSession(result.user.uid, {
        phone: result.user.phoneNumber || `+91${phone}`,
      }, vendor);
    } catch (error: any) {
      Alert.alert('Error', 'Incorrect OTP. Please check and try again.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>The Dream Wedding</Text>
        <Text style={styles.tag}>Vendor Portal</Text>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={googleLoading}>
          {googleLoading ? <ActivityIndicator color="#2C2420" /> : (
            <View style={styles.googleButtonInner}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.orRow}>
          <View style={styles.orLine} /><Text style={styles.orText}>or use phone</Text><View style={styles.orLine} />
        </View>
        {!otpSent ? (
          <>
            <Text style={styles.title}>Welcome,{'\n'}Wedding Professional</Text>
            <Text style={styles.subtitle}>Enter your phone number to continue</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}><Text style={styles.countryCodeText}>🇮🇳 +91</Text></View>
              <TextInput style={styles.input} placeholder="10 digit mobile number" placeholderTextColor="#8C7B6E" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={setPhone} />
            </View>
            <TouchableOpacity style={[styles.button, (phone.length !== 10 || loading) && styles.buttonDisabled]} onPress={handleSendOTP} disabled={phone.length !== 10 || loading}>
              {loading ? <ActivityIndicator color="#FAF6F0" /> : <Text style={styles.buttonText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Verify your{'\n'}number</Text>
            <Text style={styles.subtitle}>OTP sent to +91 {phone}</Text>
            <TextInput style={styles.otpInput} placeholder="000000" placeholderTextColor="#C9B99A" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} textAlign="center" />
            <TouchableOpacity style={[styles.button, (otp.length !== 6 || loading) && styles.buttonDisabled]} onPress={handleVerify} disabled={otp.length !== 6 || loading}>
              {loading ? <ActivityIndicator color="#FAF6F0" /> : <Text style={styles.buttonText}>Verify & Continue</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); }}>
              <Text style={styles.resendText}>← Change number</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={styles.customerLink} onPress={() => router.replace('/login')}>
          <Text style={styles.customerLinkText}>Looking to plan a wedding? →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FAF6F0', paddingTop: 60, paddingHorizontal: 30, paddingBottom: 40, gap: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 10 },
  backBtnText: { fontSize: 22, color: '#1C1C1C' },
  logo: { fontSize: 22, color: '#C9A84C', fontWeight: '500', letterSpacing: 2 },
  tag: { fontSize: 11, color: '#8C7B6E', letterSpacing: 3, textTransform: 'uppercase', marginTop: -8 },
  divider: { height: 1, backgroundColor: '#E8DDD4', marginVertical: 4 },
  googleButton: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E8DDD4' },
  googleButtonInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleButtonText: { fontSize: 15, color: '#1C1C1C', fontWeight: '500' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: '#E8DDD4' },
  orText: { fontSize: 12, color: '#8C7B6E' },
  title: { fontSize: 28, color: '#1C1C1C', fontWeight: '300', letterSpacing: 0.5, lineHeight: 38 },
  subtitle: { fontSize: 13, color: '#8C7B6E', letterSpacing: 0.5, marginTop: -8 },
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  countryCode: { borderWidth: 1, borderColor: '#E8DDD4', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  countryCodeText: { fontSize: 14, color: '#1C1C1C' },
  input: { flex: 1, borderWidth: 1, borderColor: '#E8DDD4', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16, fontSize: 14, color: '#1C1C1C', backgroundColor: '#FFFFFF' },
  otpInput: { borderWidth: 1, borderColor: '#E8DDD4', borderRadius: 8, paddingVertical: 16, fontSize: 24, color: '#1C1C1C', backgroundColor: '#FFFFFF', letterSpacing: 8 },
  button: { backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#FAF6F0', fontSize: 14, letterSpacing: 1, fontWeight: '500' },
  resendText: { color: '#C9A84C', fontSize: 13, textAlign: 'center' },
  customerLink: { marginTop: 8, alignItems: 'center' },
  customerLinkText: { color: '#8C7B6E', fontSize: 13, letterSpacing: 0.5 },
});

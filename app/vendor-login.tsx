import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';
import { createOrGetUser } from '../services/api';

export default function VendorLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState('');

  const handleSendOTP = async () => {
    try {
      setLoading(true);
      const phoneNumber = `+91${phone}`;
      const provider = new PhoneAuthProvider(auth);
      const fakeVerifier = {
        type: 'recaptcha' as const,
        verify: () => Promise.resolve(''),
      } as any;
      const id = await provider.verifyPhoneNumber(phoneNumber, fakeVerifier);
      setVerificationId(id);
      setOtpSent(true);
      Alert.alert('Code Sent', `Verification code sent to +91 ${phone}`);
    } catch (error: any) {
      const msg = error?.code === 'auth/invalid-phone-number'
        ? 'Please enter a valid 10-digit phone number.'
        : error?.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please try again later.'
        : 'Could not send OTP. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const result = await signInWithCredential(auth, credential);
      const firebaseUID = result.user.uid;
      const userPhone = result.user.phoneNumber || `+91${phone}`;

      // Check if vendor already exists in backend
      let userData = null;
      try {
        const userResult = await createOrGetUser(userPhone);
        userData = userResult.data;
      } catch (e) {
        console.log('Backend lookup failed, using Firebase UID');
      }

      // Check if they have an existing vendor session
      const existingSession = await AsyncStorage.getItem('vendor_session');
      const existingParsed = existingSession ? JSON.parse(existingSession) : {};

      // Save vendor session
      await AsyncStorage.setItem('vendor_session', JSON.stringify({
        ...existingParsed,
        uid: firebaseUID,
        userId: userData?.id || firebaseUID,
        phone: userPhone,
        userType: 'vendor',
      }));

      // If vendor has already onboarded, go to dashboard
      // Otherwise go to onboarding
      if (existingParsed.onboarded && existingParsed.vendorId) {
        router.replace('/vendor-dashboard');
      } else {
        router.replace('/vendor-onboarding');
      }
    } catch (error: any) {
      const msg = error?.code === 'auth/invalid-verification-code'
        ? 'The code you entered is incorrect. Please try again.'
        : error?.code === 'auth/code-expired'
        ? 'This code has expired. Please request a new one.'
        : 'Verification failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.logo}>The Dream Wedding</Text>
        <Text style={styles.tag}>Vendor Portal</Text>

        <View style={styles.divider} />

        {!otpSent ? (
          <>
            <Text style={styles.title}>Welcome,{'\n'}Wedding Professional</Text>
            <Text style={styles.subtitle}>Enter your phone number to continue</Text>

            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="10 digit mobile number"
                placeholderTextColor="#8C7B6E"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, (phone.length !== 10 || loading) && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={phone.length !== 10 || loading}
            >
              {loading
                ? <ActivityIndicator color="#FAF6F0" />
                : <Text style={styles.buttonText}>Send OTP</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Verify your{'\n'}number</Text>
            <Text style={styles.subtitle}>OTP sent to +91 {phone}</Text>

            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor="#C9B99A"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.button, (otp.length !== 6 || loading) && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={otp.length !== 6 || loading}
            >
              {loading
                ? <ActivityIndicator color="#FAF6F0" />
                : <Text style={styles.buttonText}>Verify & Continue</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); }}>
              <Text style={styles.resendText}>← Change number</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.customerLink}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.customerLinkText}>Looking to plan a wedding? →</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  header: {
    marginBottom: 40,
  },
  backBtn: {
    fontSize: 22,
    color: '#1C1C1C',
  },
  content: {
    flex: 1,
    gap: 16,
  },
  logo: {
    fontSize: 24,
    color: '#C9A84C',
    fontWeight: '500',
    letterSpacing: 2,
  },
  tag: {
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: -8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8DDD4',
    marginVertical: 8,
  },
  title: {
    fontSize: 32,
    color: '#1C1C1C',
    fontWeight: '300',
    letterSpacing: 0.5,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 13,
    color: '#8C7B6E',
    letterSpacing: 0.5,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  countryCode: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  countryCodeText: {
    fontSize: 14,
    color: '#1C1C1C',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1C1C1C',
    backgroundColor: '#FFFFFF',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 8,
    paddingVertical: 16,
    fontSize: 24,
    color: '#1C1C1C',
    backgroundColor: '#FFFFFF',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#C9A84C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FAF6F0',
    fontSize: 14,
    letterSpacing: 1,
    fontWeight: '500',
  },
  resendText: {
    color: '#C9A84C',
    fontSize: 13,
    textAlign: 'center',
  },
  customerLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  customerLinkText: {
    color: '#8C7B6E',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
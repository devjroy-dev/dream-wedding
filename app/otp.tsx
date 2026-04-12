import { useRouter, useLocalSearchParams } from 'expo-router';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';
import { createOrGetUser } from '../services/api';

export default function OTPScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const isEmailMode = mode === 'email';

  const handleSendOTP = async () => {
    try {
      setLoading(true);
      const provider = new PhoneAuthProvider(auth);
      const fakeVerifier = { type: 'recaptcha' as const, verify: () => Promise.resolve('') } as any;
      const id = await provider.verifyPhoneNumber(`+91${phone}`, fakeVerifier);
      setVerificationId(id);
      setOtpSent(true);
      Alert.alert('Code Sent', `Verification code sent to +91 ${phone}`);
    } catch (error: any) {
      const msg = error?.code === 'auth/invalid-phone-number' ? 'Please enter a valid 10-digit phone number.'
        : error?.code === 'auth/too-many-requests' ? 'Too many attempts. Please try again later.'
        : 'Could not send OTP. Please check your number and try again.';
      Alert.alert('Error', msg);
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const result = await signInWithCredential(auth, credential);
      const firebaseUID = result.user.uid;
      const userPhone = result.user.phoneNumber || `+91${phone}`;
      let userData = null;
      try {
        const userResult = await createOrGetUser(userPhone);
        userData = userResult.data;
      } catch (e) {}
      const session = {
        uid: firebaseUID,
        userId: userData?.id || firebaseUID,
        phone: userPhone,
        email: userData?.email || '',
        name: userData?.name || '',
        userType: 'couple',
        avatar: userData?.avatar || '',
        wedding_date: userData?.wedding_date || '',
      };
      await AsyncStorage.setItem('user_session', JSON.stringify(session));
      // If returning user, go home. If new, go to user-type
      if (userData && userData.name && userData.name.length > 0) {
        router.replace('/home');
      } else {
        router.replace('/user-type');
      }
    } catch (error: any) {
      const msg = error?.code === 'auth/invalid-verification-code' ? 'The code you entered is incorrect. Please try again.'
        : error?.code === 'auth/code-expired' ? 'This code has expired. Please request a new one.'
        : 'Verification failed. Please try again.';
      Alert.alert('Error', msg);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.logo}>The Dream Wedding</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.content}>
          {isEmailMode ? (
            <>
              <Text style={styles.title}>Your email{'
'}address</Text>
              <Text style={styles.subtitle}>We'll send you a magic link</Text>
              <TextInput style={styles.inputFull} placeholder="your@email.com" placeholderTextColor="#8C7B6E" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
              <TouchableOpacity style={[styles.button, (!email.includes('@') || loading) && styles.buttonDisabled]} onPress={() => Alert.alert('Coming Soon', 'Email login will be available shortly.')} disabled={!email.includes('@') || loading}>
                <Text style={styles.buttonText}>Send Magic Link</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.changeNumber}>Use phone instead</Text>
              </TouchableOpacity>
            </>
          ) : !otpSent ? (
            <>
              <Text style={styles.title}>Your phone{'
'}number</Text>
              <Text style={styles.subtitle}>We'll send a 6-digit verification code</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}><Text style={styles.countryCodeText}>+91</Text></View>
                <TextInput style={styles.input} placeholder="10 digit mobile number" placeholderTextColor="#8C7B6E" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={setPhone} />
              </View>
              <TouchableOpacity style={[styles.button, (phone.length !== 10 || loading) && styles.buttonDisabled]} onPress={handleSendOTP} disabled={phone.length !== 10 || loading}>
                {loading ? <ActivityIndicator color="#F5F0E8" /> : <Text style={styles.buttonText}>Send Code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter the{'
'}code</Text>
              <Text style={styles.subtitle}>Sent to +91 {phone}</Text>
              <TextInput style={styles.otpInput} placeholder="000000" placeholderTextColor="#C9B99A" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} textAlign="center" />
              <TouchableOpacity style={[styles.button, (otp.length !== 6 || loading) && styles.buttonDisabled]} onPress={handleVerify} disabled={otp.length !== 6 || loading}>
                {loading ? <ActivityIndicator color="#F5F0E8" /> : <Text style={styles.buttonText}>Verify</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); }}>
                <Text style={styles.changeNumber}>Change number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F5F0E8', paddingTop: 60, paddingHorizontal: 28, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 52 },
  backBtn: { fontSize: 22, color: '#2C2420', width: 24 },
  logo: { fontSize: 14, color: '#C9A84C', fontWeight: '500', letterSpacing: 2, textAlign: 'center' },
  content: { flex: 1, gap: 20 },
  title: { fontSize: 36, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5, lineHeight: 46 },
  subtitle: { fontSize: 14, color: '#8C7B6E', marginTop: -8 },
  phoneRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  countryCode: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 10, paddingVertical: 16, paddingHorizontal: 16, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  countryCodeText: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  input: { flex: 1, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 10, paddingVertical: 16, paddingHorizontal: 16, fontSize: 15, color: '#2C2420', backgroundColor: '#FFFFFF' },
  inputFull: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 10, paddingVertical: 16, paddingHorizontal: 16, fontSize: 15, color: '#2C2420', backgroundColor: '#FFFFFF' },
  otpInput: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 10, paddingVertical: 18, fontSize: 28, color: '#2C2420', backgroundColor: '#FFFFFF', letterSpacing: 12, marginTop: 8 },
  button: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.3 },
  buttonText: { color: '#F5F0E8', fontSize: 15, letterSpacing: 0.5, fontWeight: '500' },
  changeNumber: { color: '#C9A84C', fontSize: 14, textAlign: 'center', letterSpacing: 0.3 },
});

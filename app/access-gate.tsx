import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
  Animated, Dimensions, KeyboardAvoidingView,
  Platform, ScrollView, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const { height } = Dimensions.get('window');
const API = 'https://dream-wedding-production-89ae.up.railway.app';

export default function AccessGateScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(24)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslate = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(logoTranslate, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(formTranslate, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleValidate = async () => {
    if (code.trim().length < 4) {
      Alert.alert('Enter your code', 'Please enter the access code you received.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/access-codes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        const access = {
          granted: true,
          type: data.data.type,
          expires_at: data.data.expires_at,
          granted_at: new Date().toISOString(),
        };
        await AsyncStorage.setItem('access_grant', JSON.stringify(access));
        // Route based on type
        if (data.data.type === 'vendor_permanent' || data.data.type === 'vendor_demo') {
          router.replace('/vendor-login');
        } else {
          router.replace('/login');
        }
      } else {
        Alert.alert('Invalid code', data.error || 'This code is not valid. Please check and try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not validate code. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={styles.logoSection}>
          <Animated.View style={[styles.logoInner, { opacity: logoOpacity, transform: [{ translateY: logoTranslate }] }]}>
            <Text style={styles.logoThe}>THE</Text>
            <Text style={styles.logoMain}>Dream Wedding</Text>
            <View style={styles.logoDivider} />
            <Text style={styles.logoTagline}>Invite Only · Early Access</Text>
          </Animated.View>
        </View>

        {/* Form */}
        <Animated.View style={[styles.formSection, { opacity: formOpacity, transform: [{ translateY: formTranslate }] }]}>
          <Text style={styles.formTitle}>Enter your access code</Text>
          <Text style={styles.formSubtitle}>You would have received this from The Dream Wedding team during your onboarding.</Text>

          <TextInput
            style={styles.codeInput}
            placeholder="e.g. VENDOR-A3X9K2"
            placeholderTextColor="#C4B8AC"
            value={code}
            onChangeText={text => setCode(text.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleValidate}
          />

          <TouchableOpacity
            style={[styles.submitBtn, (loading || code.trim().length < 4) && styles.submitBtnDisabled]}
            onPress={handleValidate}
            disabled={loading || code.trim().length < 4}
          >
            {loading
              ? <ActivityIndicator color="#F5F0E8" />
              : <Text style={styles.submitBtnText}>UNLOCK ACCESS</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.requestBtn}
            onPress={() => Linking.openURL('https://thedreamwedding.in')}
          >
            <Text style={styles.requestBtnText}>Request access → thedreamwedding.in</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FAF6F0', paddingHorizontal: 28, paddingBottom: 48, paddingTop: 60 },
  logoSection: { flex: 1, minHeight: height * 0.45, justifyContent: 'center', alignItems: 'center' },
  logoInner: { alignItems: 'center', gap: 12 },
  logoThe: { fontSize: 13, color: '#8C7B6E', letterSpacing: 12, textTransform: 'uppercase' },
  logoMain: { fontSize: 48, color: '#2C2420', letterSpacing: 1, textAlign: 'center', fontWeight: '300' },
  logoDivider: { height: 1, width: 40, backgroundColor: '#C9A84C', marginVertical: 4 },
  logoTagline: { fontSize: 12, color: '#C9A84C', letterSpacing: 3, textTransform: 'uppercase' },
  formSection: { gap: 16 },
  formTitle: { fontSize: 22, color: '#2C2420', fontWeight: '300', letterSpacing: 0.3 },
  formSubtitle: { fontSize: 13, color: '#8C7B6E', lineHeight: 20, marginTop: -8 },
  codeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#2C2420',
    letterSpacing: 4,
    textAlign: 'center',
  },
  submitBtn: { backgroundColor: '#2C2420', borderRadius: 12, paddingVertical: 17, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.35 },
  submitBtnText: { color: '#F5F0E8', fontSize: 13, letterSpacing: 2 },
  requestBtn: { alignItems: 'center', paddingVertical: 8 },
  requestBtnText: { color: '#C9A84C', fontSize: 13, letterSpacing: 0.3 },
});

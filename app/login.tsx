import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Animated, Dimensions,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const API = 'https://dream-wedding-production-89ae.up.railway.app';

type Screen = 'gate' | 'code' | 'request' | 'requested';
type CodeTab = 'dreamer' | 'vendor';
type VendorMode = 'code' | 'signin';
type DreamerMode = 'signup' | 'login';
type SignupStep = 1 | 2 | 3;
type DreamerType = '' | 'couple' | 'family' | 'friend';

export default function LoginScreen() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('gate');
  const [codeTab, setCodeTab] = useState<CodeTab>('dreamer');
  const [vendorMode, setVendorMode] = useState<VendorMode>('code');
  const [dreamerMode, setDreamerMode] = useState<DreamerMode>('signup');
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Dreamer signup state (mirrors PWA)
  const [codeData, setCodeData] = useState<any>(null);
  const [dName, setDName] = useState('');
  const [dPhone, setDPhone] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dInstagram, setDInstagram] = useState('');
  const [dPassword, setDPassword] = useState('');
  const [dConfirmPassword, setDConfirmPassword] = useState('');
  const [dreamerType, setDreamerType] = useState<DreamerType>('');

  // Dreamer login state
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Request form
  const [reqName, setReqName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqType, setReqType] = useState<'couple' | 'vendor'>('couple');
  const [reqCity, setReqCity] = useState('');

  // Animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(20)).current;
  const dividerWidth = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    checkSession();
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(logoTranslate, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
      Animated.timing(dividerWidth, { toValue: 40, duration: 350, useNativeDriver: false }),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(contentTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const checkSession = async () => {
    try {
      const cs = await AsyncStorage.getItem('user_session');
      if (cs) { const p = JSON.parse(cs); if (p.userId || p.uid) { router.replace('/home'); return; } }
      const vs = await AsyncStorage.getItem('vendor_session');
      if (vs) { const p = JSON.parse(vs); if (p.vendorId) { router.replace('/vendor-dashboard'); return; } }
    } catch (e) {}
  };

  const clearForm = () => {
    setCode(''); setError(''); setUsername(''); setPassword('');
    setCodeData(null); setSignupStep(1);
    setDName(''); setDPhone(''); setDEmail(''); setDInstagram('');
    setDPassword(''); setDConfirmPassword(''); setDreamerType('');
    setLoginId(''); setLoginPass('');
  };

  // ── Dreamer Signup (3-step PWA parity) ─────────────────────────────────────

  const handleDreamerValidateCode = async () => {
    if (!code.trim()) { setError('Please enter your invite or referral code'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/signup/validate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCodeData(data.data);
        setSignupStep(2);
      } else {
        setError(data.error || 'Invalid or expired code.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally { setLoading(false); }
  };

  const handleDreamerGoToPassword = () => {
    if (!dName.trim()) { setError('Name is required'); return; }
    if (!dreamerType) { setError('Please select what describes you'); return; }
    if (!dPhone || dPhone.length < 10) { setError('Valid 10-digit phone required'); return; }
    if (!dEmail || !dEmail.includes('@')) { setError('Valid email required'); return; }
    if (!dInstagram.trim()) { setError('Instagram handle required'); return; }
    setError('');
    setSignupStep(3);
  };

  const handleDreamerInstagramBlur = async () => {
    const h = dInstagram.replace('@', '').trim();
    if (h.length <= 2) return;
    try {
      const r = await fetch(`${API}/api/verify/check-instagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: h }),
      });
      const d = await r.json();
      if (d.success && d.exists === false) setError('Instagram handle not found');
    } catch {}
  };

  const handleDreamerCompleteSignup = async () => {
    if (!dPassword || dPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (dPassword !== dConfirmPassword) { setError('Passwords do not match'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/signup/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          name: dName.trim(),
          phone: dPhone,
          email: dEmail.trim(),
          instagram: dInstagram.trim(),
          password: dPassword,
          code_type: codeData?.type,
          code_id: codeData?.code_id,
          tier: codeData?.tier,
          vendor_id: codeData?.vendor_id,
          referral_code: codeData?.referral_code,
          dreamer_type: dreamerType,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.type === 'vendor') {
          await AsyncStorage.setItem('vendor_session', JSON.stringify({
            vendorId: data.data.id, vendorName: data.data.name,
            category: data.data.category, city: data.data.city,
            tier: data.data.tier, trialEnd: data.data.trial_end,
            userType: 'vendor', onboarded: true,
          }));
          router.replace('/vendor-dashboard');
        } else {
          await AsyncStorage.setItem('user_session', JSON.stringify({
            userId: data.data.id, uid: data.data.id,
            name: data.data.name || dName, userType: 'couple',
            couple_tier: data.data.couple_tier || 'free',
            tier_label: data.data.tier_label || '',
            tokens: data.data.tokens,
            phone: dPhone, email: dEmail.trim(),
            wedding_date: '', budget: 0,
          }));
          if (!data.data.wedding_date) router.replace('/user-type');
          else router.replace('/home');
        }
      } else {
        setError(data.error || 'Signup failed.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Dreamer Login (returning user) ────────────────────────────────────────

  const handleDreamerLogin = async () => {
    if (!loginId.trim()) { setError('Enter your email or phone number'); return; }
    if (!loginPass) { setError('Enter your password'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/signup/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginId.trim(), password: loginPass }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.type === 'vendor') {
          await AsyncStorage.setItem('vendor_session', JSON.stringify({
            vendorId: data.data.id, vendorName: data.data.name,
            category: data.data.category, city: data.data.city,
            tier: data.data.tier, trialEnd: data.data.trial_end,
            userType: 'vendor', onboarded: true,
          }));
          router.replace('/vendor-dashboard');
        } else {
          await AsyncStorage.setItem('user_session', JSON.stringify({
            userId: data.data.id, uid: data.data.id,
            name: data.data.name || '', userType: 'couple',
            couple_tier: data.data.couple_tier || 'free',
            tier_label: data.data.tier_label || '',
            tokens: data.data.tokens,
            wedding_date: data.data.wedding_date || '',
            budget: data.data.budget || 0,
          }));
          if (!data.data.wedding_date) router.replace('/user-type');
          else router.replace('/home');
        }
      } else {
        setError(data.error || 'Invalid credentials.');
      }
    } catch (e) {
      setError('Could not sign in. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Vendor Code ──────────────────────────────────────────────────────────

  const handleVendorCode = async () => {
    if (!code.trim()) { setError('Please enter your vendor code'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/tier-codes/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        await AsyncStorage.setItem('vendor_session', JSON.stringify({
          vendorId: data.data.id, vendorName: data.data.name,
          category: data.data.category, city: data.data.city,
          tier: data.data.tier, trialEnd: data.data.trial_end,
          userType: 'vendor', onboarded: true,
        }));
        router.replace('/vendor-dashboard');
      } else {
        setError(data.error || 'Invalid or expired code.');
      }
    } catch (e) {
      setError('Could not verify code. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Vendor Sign In (username/password) ────────────────────────────────────

  const handleVendorSignIn = async () => {
    if (!username.trim() || !password.trim()) { setError('Enter username and password'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/credentials/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        await AsyncStorage.setItem('vendor_session', JSON.stringify({
          vendorId: data.data.id, vendorName: data.data.name,
          category: data.data.category, city: data.data.city,
          tier: data.data.tier, trialEnd: data.data.trial_end,
          userType: 'vendor', onboarded: true,
        }));
        router.replace('/vendor-dashboard');
      } else {
        setError(data.error || 'Invalid credentials.');
      }
    } catch (e) {
      setError('Could not sign in. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Request Access ───────────────────────────────────────────────────────

  const handleRequest = async () => {
    if (!reqName.trim() || !reqPhone.trim()) {
      setError('Please enter your name and phone number');
      return;
    }
    try {
      setLoading(true); setError('');
      // Submit to waitlist endpoint
      await fetch(`${API}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reqName.trim(),
          phone: reqPhone.trim(),
          email: reqEmail.trim(),
          type: reqType,
          city: reqCity.trim(),
        }),
      });
      setScreen('requested');
    } catch (e) {
      // Even if API fails, show success — we don't want to lose leads
      setScreen('requested');
    } finally { setLoading(false); }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Logo ── */}
        <View style={s.logoSection}>
          <Animated.View style={[s.logoInner, { opacity: logoOpacity, transform: [{ translateY: logoTranslate }] }]}>
            <Text style={s.logoThe}>THE</Text>
            <Text style={s.logoMain}>Dream Wedding</Text>
            <Animated.View style={[s.logoDivider, { width: dividerWidth }]} />
            <Animated.View style={{ opacity: taglineOpacity, alignItems: 'center', gap: 4 }}>
              <Text style={s.logoTagline}>Not just happily married.</Text>
              <Text style={[s.logoTagline, { color: '#C9A84C' }]}>Getting married happily.</Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* ── Content ── */}
        <Animated.View style={[s.bottomSection, { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }]}>

          {/* ═══ GATE — "Do you have an invite?" ═══ */}
          {screen === 'gate' && (
            <View style={s.gateSection}>
              <Text style={s.gateTitle}>Do you have an invite code?</Text>
              <Text style={s.gateSubtitle}>We are currently in our founding phase</Text>

              <TouchableOpacity
                style={s.gateBtn}
                onPress={() => { setScreen('code'); clearForm(); }}
                activeOpacity={0.85}
              >
                <View style={s.gateBtnInner}>
                  <View style={s.gateBtnIconBox}>
                    <Feather name="key" size={16} color="#C9A84C" />
                  </View>
                  <View style={s.gateBtnText}>
                    <Text style={s.gateBtnLabel}>Yes, I have a code</Text>
                    <Text style={s.gateBtnSub}>Enter your invite code to get started</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#C9A84C" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.gateBtn}
                onPress={() => { setScreen('request'); clearForm(); }}
                activeOpacity={0.85}
              >
                <View style={s.gateBtnInner}>
                  <View style={s.gateBtnIconBox}>
                    <Feather name="mail" size={16} color="#8C7B6E" />
                  </View>
                  <View style={s.gateBtnText}>
                    <Text style={s.gateBtnLabel}>No, I'd like to join</Text>
                    <Text style={s.gateBtnSub}>Request early access to the platform</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color="#C4B8AC" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ═══ CODE ENTRY ═══ */}
          {screen === 'code' && (
            <View style={s.codeSection}>

              {/* Back */}
              <TouchableOpacity onPress={() => { setScreen('gate'); clearForm(); }} style={s.backRow}>
                <Feather name="arrow-left" size={16} color="#8C7B6E" />
                <Text style={s.backText}>Back</Text>
              </TouchableOpacity>

              {/* Tab toggle: Dreamer / Vendor */}
              <View style={s.tabToggle}>
                <TouchableOpacity
                  style={[s.tab, codeTab === 'dreamer' && s.tabActive]}
                  onPress={() => { setCodeTab('dreamer'); clearForm(); setVendorMode('code'); }}
                >
                  <Text style={[s.tabText, codeTab === 'dreamer' && s.tabTextActive]}>Planning a Wedding</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.tab, codeTab === 'vendor' && s.tabActive]}
                  onPress={() => { setCodeTab('vendor'); clearForm(); }}
                >
                  <Text style={[s.tabText, codeTab === 'vendor' && s.tabTextActive]}>Wedding Professional</Text>
                </TouchableOpacity>
              </View>

              {/* ── Dreamer code entry ── */}
              {codeTab === 'dreamer' && (
                <>
                  {/* Dreamer sub-tabs: Sign Up / Sign In */}
                  <View style={s.vendorSubTabs}>
                    <TouchableOpacity
                      style={[s.vendorSubTab, dreamerMode === 'signup' && s.vendorSubTabActive]}
                      onPress={() => { setDreamerMode('signup'); setSignupStep(1); clearForm(); }}
                    >
                      <Text style={[s.vendorSubTabText, dreamerMode === 'signup' && s.vendorSubTabTextActive]}>Sign Up</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.vendorSubTab, dreamerMode === 'login' && s.vendorSubTabActive]}
                      onPress={() => { setDreamerMode('login'); clearForm(); }}
                    >
                      <Text style={[s.vendorSubTabText, dreamerMode === 'login' && s.vendorSubTabTextActive]}>Sign In</Text>
                    </TouchableOpacity>
                  </View>

                  {/* ── Sign Up: Step 1 — invite code ── */}
                  {dreamerMode === 'signup' && signupStep === 1 && (
                    <>
                      <Text style={s.codeLabel}>Invite / Referral Code</Text>
                      <TextInput
                        style={[s.codeInput, error && s.codeInputError]}
                        placeholder="e.g. ABKMNQ"
                        placeholderTextColor="#C4B8AC"
                        value={code}
                        onChangeText={(t) => { setCode(t.toUpperCase()); setError(''); }}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="go"
                        onSubmitEditing={handleDreamerValidateCode}
                      />
                      {error ? <Text style={s.errorText}>{error}</Text> : null}
                      <TouchableOpacity
                        style={[s.submitBtn, (!code.trim() || loading) && s.submitBtnDisabled]}
                        onPress={handleDreamerValidateCode}
                        disabled={!code.trim() || loading}
                      >
                        {loading ? <ActivityIndicator color="#FAF6F0" /> : (
                          <Text style={s.submitBtnText}>Continue</Text>
                        )}
                      </TouchableOpacity>
                      <Text style={s.hintText}>
                        This code was shared by The Dream Wedding team or a vendor you know.
                      </Text>
                    </>
                  )}

                  {/* ── Sign Up: Step 2 — profile fields ── */}
                  {dreamerMode === 'signup' && signupStep === 2 && (
                    <>
                      <Text style={s.codeLabel}>Your Details</Text>
                      <Text style={s.subLabel}>Tell us about yourself.</Text>

                      <TextInput
                        style={s.fieldInput}
                        placeholder="Full Name"
                        placeholderTextColor="#C4B8AC"
                        value={dName}
                        onChangeText={(t) => { setDName(t); setError(''); }}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />

                      <Text style={s.fieldHelper}>I am a...</Text>
                      <View style={s.dreamerTypeRow}>
                        {(['couple', 'family', 'friend'] as const).map(t => (
                          <TouchableOpacity
                            key={t}
                            style={[s.dreamerTypeBtn, dreamerType === t && s.dreamerTypeBtnActive]}
                            onPress={() => { setDreamerType(t); setError(''); }}
                          >
                            <Text style={[s.dreamerTypeText, dreamerType === t && s.dreamerTypeTextActive]}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View style={s.phoneRow}>
                        <View style={s.phonePrefix}><Text style={s.phonePrefixText}>+91</Text></View>
                        <TextInput
                          style={[s.fieldInput, s.phoneInput]}
                          placeholder="10-digit phone"
                          placeholderTextColor="#C4B8AC"
                          value={dPhone}
                          onChangeText={(t) => { setDPhone(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                          keyboardType="phone-pad"
                          returnKeyType="next"
                        />
                      </View>
                      <Text style={s.fieldHelperItalic}>This will be your login ID</Text>

                      <TextInput
                        style={s.fieldInput}
                        placeholder="your@email.com"
                        placeholderTextColor="#C4B8AC"
                        value={dEmail}
                        onChangeText={(t) => { setDEmail(t); setError(''); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                      <Text style={s.fieldHelperItalic}>Or use this to log in</Text>

                      <TextInput
                        style={s.fieldInput}
                        placeholder="@yourhandle"
                        placeholderTextColor="#C4B8AC"
                        value={dInstagram}
                        onChangeText={(t) => { setDInstagram(t); setError(''); }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onBlur={handleDreamerInstagramBlur}
                        returnKeyType="next"
                      />

                      {error ? <Text style={s.errorText}>{error}</Text> : null}

                      <TouchableOpacity style={s.submitBtn} onPress={handleDreamerGoToPassword}>
                        <Text style={s.submitBtnText}>Continue</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.backBtn} onPress={() => { setSignupStep(1); setError(''); }}>
                        <Text style={s.backBtnText}>Back</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── Sign Up: Step 3 — password ── */}
                  {dreamerMode === 'signup' && signupStep === 3 && (
                    <>
                      <Text style={s.codeLabel}>Create Password</Text>
                      <Text style={s.subLabel}>
                        Your email or phone will be your username.
                      </Text>

                      <TextInput
                        style={s.fieldInput}
                        placeholder="Password (min 6 characters)"
                        placeholderTextColor="#C4B8AC"
                        value={dPassword}
                        onChangeText={(t) => { setDPassword(t); setError(''); }}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                      />

                      <TextInput
                        style={s.fieldInput}
                        placeholder="Confirm password"
                        placeholderTextColor="#C4B8AC"
                        value={dConfirmPassword}
                        onChangeText={(t) => { setDConfirmPassword(t); setError(''); }}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="go"
                        onSubmitEditing={handleDreamerCompleteSignup}
                      />

                      {error ? <Text style={s.errorText}>{error}</Text> : null}

                      <TouchableOpacity
                        style={[s.submitBtn, loading && s.submitBtnDisabled]}
                        onPress={handleDreamerCompleteSignup}
                        disabled={loading}
                      >
                        {loading ? <ActivityIndicator color="#FAF6F0" /> : (
                          <Text style={s.submitBtnText}>Create Account</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity style={s.backBtn} onPress={() => { setSignupStep(2); setError(''); }}>
                        <Text style={s.backBtnText}>Back</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ── Sign In: returning dreamer ── */}
                  {dreamerMode === 'login' && (
                    <>
                      <Text style={s.codeLabel}>Sign In</Text>
                      <Text style={s.subLabel}>Enter your email or phone and password.</Text>

                      <TextInput
                        style={s.fieldInput}
                        placeholder="your@email.com or 9876543210"
                        placeholderTextColor="#C4B8AC"
                        value={loginId}
                        onChangeText={(t) => { setLoginId(t); setError(''); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                      />

                      <TextInput
                        style={s.fieldInput}
                        placeholder="Password"
                        placeholderTextColor="#C4B8AC"
                        value={loginPass}
                        onChangeText={(t) => { setLoginPass(t); setError(''); }}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="go"
                        onSubmitEditing={handleDreamerLogin}
                      />

                      {error ? <Text style={s.errorText}>{error}</Text> : null}

                      <TouchableOpacity
                        style={[s.submitBtn, (!loginId.trim() || !loginPass || loading) && s.submitBtnDisabled]}
                        onPress={handleDreamerLogin}
                        disabled={!loginId.trim() || !loginPass || loading}
                      >
                        {loading ? <ActivityIndicator color="#FAF6F0" /> : (
                          <Text style={s.submitBtnText}>Sign In</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

              {/* ── Vendor code entry ── */}
              {codeTab === 'vendor' && (
                <>
                  {/* Vendor sub-tabs: Code / Sign In */}
                  <View style={s.vendorSubTabs}>
                    <TouchableOpacity
                      style={[s.vendorSubTab, vendorMode === 'code' && s.vendorSubTabActive]}
                      onPress={() => { setVendorMode('code'); clearForm(); }}
                    >
                      <Text style={[s.vendorSubTabText, vendorMode === 'code' && s.vendorSubTabTextActive]}>Vendor Code</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.vendorSubTab, vendorMode === 'signin' && s.vendorSubTabActive]}
                      onPress={() => { setVendorMode('signin'); clearForm(); }}
                    >
                      <Text style={[s.vendorSubTabText, vendorMode === 'signin' && s.vendorSubTabTextActive]}>Sign In</Text>
                    </TouchableOpacity>
                  </View>

                  {vendorMode === 'code' ? (
                    <>
                      <Text style={s.codeLabel}>Vendor Code</Text>
                      <TextInput
                        style={[s.codeInput, error && s.codeInputError]}
                        placeholder="e.g. ABKMNQ"
                        placeholderTextColor="#C4B8AC"
                        value={code}
                        onChangeText={(t) => { setCode(t.toUpperCase()); setError(''); }}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="go"
                        onSubmitEditing={handleVendorCode}
                      />
                      {error ? <Text style={s.errorText}>{error}</Text> : null}
                      <TouchableOpacity
                        style={[s.submitBtn, (!code.trim() || loading) && s.submitBtnDisabled]}
                        onPress={handleVendorCode}
                        disabled={!code.trim() || loading}
                      >
                        {loading ? <ActivityIndicator color="#FAF6F0" /> : (
                          <Text style={s.submitBtnText}>Enter Dashboard</Text>
                        )}
                      </TouchableOpacity>
                      <Text style={s.hintText}>
                        This code was provided during your onboarding with The Dream Wedding team.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={s.codeLabel}>Username</Text>
                      <TextInput
                        style={[s.codeInput, { letterSpacing: 0, textAlign: 'left' }, error && s.codeInputError]}
                        placeholder="Your username"
                        placeholderTextColor="#C4B8AC"
                        value={username}
                        onChangeText={(t) => { setUsername(t); setError(''); }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                      <Text style={[s.codeLabel, { marginTop: 12 }]}>Password</Text>
                      <TextInput
                        style={[s.codeInput, { letterSpacing: 0, textAlign: 'left' }, error && s.codeInputError]}
                        placeholder="Your password"
                        placeholderTextColor="#C4B8AC"
                        value={password}
                        onChangeText={(t) => { setPassword(t); setError(''); }}
                        secureTextEntry
                        returnKeyType="go"
                        onSubmitEditing={handleVendorSignIn}
                      />
                      {error ? <Text style={s.errorText}>{error}</Text> : null}
                      <TouchableOpacity
                        style={[s.submitBtn, (!username.trim() || !password.trim() || loading) && s.submitBtnDisabled]}
                        onPress={handleVendorSignIn}
                        disabled={!username.trim() || !password.trim() || loading}
                      >
                        {loading ? <ActivityIndicator color="#FAF6F0" /> : (
                          <Text style={s.submitBtnText}>Sign In</Text>
                        )}
                      </TouchableOpacity>
                      <Text style={s.hintText}>
                        Sign in with the credentials you created during setup.
                      </Text>
                    </>
                  )}
                </>
              )}
            </View>
          )}

          {/* ═══ REQUEST ACCESS ═══ */}
          {screen === 'request' && (
            <View style={s.requestSection}>
              <TouchableOpacity onPress={() => { setScreen('gate'); clearForm(); }} style={s.backRow}>
                <Feather name="arrow-left" size={16} color="#8C7B6E" />
                <Text style={s.backText}>Back</Text>
              </TouchableOpacity>

              <Text style={s.requestTitle}>Request Early Access</Text>
              <Text style={s.requestSubtitle}>Tell us a bit about yourself and we will reach out</Text>

              {/* Type toggle */}
              <View style={s.typeToggle}>
                <TouchableOpacity
                  style={[s.typeBtn, reqType === 'couple' && s.typeBtnActive]}
                  onPress={() => setReqType('couple')}
                >
                  <Feather name="heart" size={14} color={reqType === 'couple' ? '#C9A84C' : '#C4B8AC'} />
                  <Text style={[s.typeText, reqType === 'couple' && s.typeTextActive]}>Planning a Wedding</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.typeBtn, reqType === 'vendor' && s.typeBtnActive]}
                  onPress={() => setReqType('vendor')}
                >
                  <Feather name="briefcase" size={14} color={reqType === 'vendor' ? '#C9A84C' : '#C4B8AC'} />
                  <Text style={[s.typeText, reqType === 'vendor' && s.typeTextActive]}>Wedding Professional</Text>
                </TouchableOpacity>
              </View>

              <View style={s.formCard}>
                <View style={s.fieldBlock}>
                  <Text style={s.fieldLabel}>Your Name</Text>
                  <TextInput
                    style={s.fieldInput}
                    placeholder="Full name"
                    placeholderTextColor="#C4B8AC"
                    value={reqName}
                    onChangeText={setReqName}
                  />
                </View>
                <View style={s.fieldDivider} />
                <View style={s.fieldBlock}>
                  <Text style={s.fieldLabel}>Phone</Text>
                  <TextInput
                    style={s.fieldInput}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#C4B8AC"
                    value={reqPhone}
                    onChangeText={setReqPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                <View style={s.fieldDivider} />
                <View style={s.fieldBlock}>
                  <View style={s.fieldLabelRow}>
                    <Text style={s.fieldLabel}>Email</Text>
                    <Text style={s.fieldOptional}>optional</Text>
                  </View>
                  <TextInput
                    style={s.fieldInput}
                    placeholder="your@email.com"
                    placeholderTextColor="#C4B8AC"
                    value={reqEmail}
                    onChangeText={setReqEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={s.fieldDivider} />
                <View style={s.fieldBlock}>
                  <View style={s.fieldLabelRow}>
                    <Text style={s.fieldLabel}>City</Text>
                    <Text style={s.fieldOptional}>optional</Text>
                  </View>
                  <TextInput
                    style={s.fieldInput}
                    placeholder="e.g. Delhi NCR, Mumbai"
                    placeholderTextColor="#C4B8AC"
                    value={reqCity}
                    onChangeText={setReqCity}
                  />
                </View>
              </View>

              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[s.submitBtn, (!reqName.trim() || !reqPhone.trim() || loading) && s.submitBtnDisabled]}
                onPress={handleRequest}
                disabled={!reqName.trim() || !reqPhone.trim() || loading}
              >
                {loading ? <ActivityIndicator color="#FAF6F0" /> : (
                  <Text style={s.submitBtnText}>Request Access</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ═══ REQUESTED (confirmation) ═══ */}
          {screen === 'requested' && (
            <View style={s.requestedSection}>
              <View style={s.requestedIconWrap}>
                <Feather name="check" size={28} color="#C9A84C" />
              </View>
              <Text style={s.requestedTitle}>Request received</Text>
              <Text style={s.requestedBody}>
                Thank you for your interest in The Dream Wedding. Our team will reach out to you shortly with an invite code.
              </Text>
              <TouchableOpacity
                style={s.requestedBtn}
                onPress={() => setScreen('gate')}
              >
                <Text style={s.requestedBtnText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: '#FAF6F0', paddingHorizontal: 28, paddingBottom: 48, paddingTop: 60,
  },

  // Logo
  logoSection: { minHeight: height * 0.32, justifyContent: 'center', alignItems: 'center' },
  logoInner: { alignItems: 'center', gap: 10 },
  logoThe: { fontSize: 13, color: '#8C7B6E', letterSpacing: 12, textTransform: 'uppercase', fontFamily: 'DMSans_300Light' },
  logoMain: { fontSize: 42, color: '#2C2420', letterSpacing: 0.5, textAlign: 'center', fontFamily: 'PlayfairDisplay_400Regular' },
  logoDivider: { height: 1, backgroundColor: '#C9A84C', marginVertical: 8 },
  logoTagline: { fontSize: 14, color: '#2C2420', letterSpacing: 0.3, fontFamily: 'PlayfairDisplay_400Regular', fontStyle: 'italic', textAlign: 'center' },

  bottomSection: { gap: 16, flex: 1 },

  // Gate screen
  gateSection: { gap: 14 },
  gateTitle: { fontSize: 22, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', textAlign: 'center', letterSpacing: 0.3 },
  gateSubtitle: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', marginTop: -8, marginBottom: 4 },
  gateBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0',
    overflow: 'hidden',
  },
  gateBtnInner: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  gateBtnIconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF8EC',
    borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center',
  },
  gateBtnText: { flex: 1, gap: 3 },
  gateBtnLabel: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', letterSpacing: 0.2 },
  gateBtnSub: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },

  // Code screen
  codeSection: { gap: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  backText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },

  tabToggle: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#EDE8E0', padding: 3,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FAF6F0' },
  tabText: { fontSize: 12, color: '#B8ADA4', fontFamily: 'DMSans_400Regular' },
  tabTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },

  vendorSubTabs: {
    flexDirection: 'row', gap: 0, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EDE8E0',
  },
  vendorSubTab: { flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#FFFFFF' },
  vendorSubTabActive: { backgroundColor: '#2C2420' },
  vendorSubTabText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  vendorSubTabTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },

  codeLabel: {
    fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: -8,
  },
  codeInput: {
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1.5, borderColor: '#EDE8E0',
    paddingVertical: 14, paddingHorizontal: 18, fontSize: 16, fontFamily: 'DMSans_400Regular',
    color: '#2C2420', letterSpacing: 3, textAlign: 'center',
  },
  codeInputError: { borderColor: '#E57373' },

  errorText: { fontSize: 12, color: '#E57373', fontFamily: 'DMSans_400Regular', textAlign: 'center' },

  submitBtn: {
    backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 15, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#C4B8AC' },
  submitBtnText: {
    color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light',
    letterSpacing: 2, textTransform: 'uppercase',
  },

  hintText: {
    fontSize: 11, color: '#C4B8AC', fontFamily: 'DMSans_300Light',
    textAlign: 'center', lineHeight: 17,
  },

  // Request screen
  requestSection: { gap: 14 },
  requestTitle: { fontSize: 24, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3 },
  requestSubtitle: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: -8 },

  typeToggle: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EDE8E0', backgroundColor: '#FFFFFF',
  },
  typeBtnActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  typeText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  typeTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },

  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', overflow: 'hidden',
  },
  fieldBlock: { paddingHorizontal: 18, paddingVertical: 14, gap: 4 },
  fieldDivider: { height: 1, backgroundColor: '#EDE8E0', marginHorizontal: 18 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: {
    fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  fieldOptional: { fontSize: 11, color: '#C4B8AC', fontFamily: 'DMSans_300Light', fontStyle: 'italic' },
  fieldInput: {
    fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular',
    paddingVertical: 4, letterSpacing: 0.2,
  },

  // Requested confirmation
  requestedSection: { alignItems: 'center', paddingVertical: 40, gap: 14 },
  requestedIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF8EC',
    borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  requestedTitle: { fontSize: 22, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  requestedBody: {
    fontSize: 14, color: '#8C7B6E', fontFamily: 'DMSans_300Light',
    textAlign: 'center', lineHeight: 22, maxWidth: 280,
  },
  requestedBtn: {
    marginTop: 12, borderWidth: 1, borderColor: '#E8D9B5', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#FFF8EC',
  },
  requestedBtnText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },

  // ── Dreamer signup additions ────────────────────────────
  subLabel: {
    fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light',
    marginTop: 4, marginBottom: 14, lineHeight: 18,
  },
  fieldInput: {
    width: '100%', backgroundColor: '#FAFAFA',
    borderWidth: 1.5, borderColor: '#E8DDD4', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: '#0F1117', fontFamily: 'DMSans_400Regular',
    marginBottom: 8,
  },
  fieldHelper: {
    fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular',
    letterSpacing: 0.6, textTransform: 'uppercase',
    marginTop: 6, marginBottom: 8,
  },
  fieldHelperItalic: {
    fontSize: 10, color: '#B8ADA4', fontFamily: 'DMSans_300Light',
    fontStyle: 'italic', marginTop: 0, marginBottom: 8,
  },
  dreamerTypeRow: {
    flexDirection: 'row', gap: 8, marginBottom: 14,
  },
  dreamerTypeBtn: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 8,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#E8DDD4',
    backgroundColor: '#FAFAFA', alignItems: 'center',
  },
  dreamerTypeBtnActive: {
    borderColor: '#C9A84C', backgroundColor: 'rgba(201,168,76,0.08)',
  },
  dreamerTypeText: {
    fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_400Regular',
  },
  dreamerTypeTextActive: {
    color: '#C9A84C', fontFamily: 'DMSans_500Medium',
  },
  phoneRow: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
  },
  phonePrefix: {
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: '#FAFAFA', borderWidth: 1.5, borderColor: '#E8DDD4',
    borderRadius: 8,
  },
  phonePrefixText: {
    fontSize: 14, color: '#8C7B6E', fontFamily: 'DMSans_400Regular',
  },
  phoneInput: {
    flex: 1, marginBottom: 0,
  },
  backBtn: {
    width: '100%', paddingVertical: 12, marginTop: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', backgroundColor: 'transparent',
  },
  backBtnText: {
    fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_400Regular',
  },
});

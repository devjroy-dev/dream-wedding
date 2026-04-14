import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Animated, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display/index';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

type UserTypeId = 'couple' | 'parent';

export default function UserTypeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<UserTypeId | null>(null);

  // Form fields
  const [yourName, setYourName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');

  // Input refs for keyboard focus chaining
  const partnerRef = useRef<TextInput>(null);
  const brideRef = useRef<TextInput>(null);
  const groomRef = useRef<TextInput>(null);

  // Animations
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslate = useRef(new Animated.Value(40)).current;
  const cardsOpacity = useRef(new Animated.Value(1)).current;
  const cardsTranslate = useRef(new Animated.Value(0)).current;
  const handleSelect = (type: UserTypeId) => {
    setSelected(type);
    Animated.parallel([
      Animated.timing(cardsOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(cardsTranslate, {
        toValue: -20,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslate, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleBack = () => {
    Animated.parallel([
      Animated.timing(formOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(formTranslate, {
        toValue: 40,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelected(null);
      setYourName('');
      setPartnerName('');
      setBrideName('');
      setGroomName('');
      formOpacity.setValue(0);
      formTranslate.setValue(40);
      Animated.parallel([
        Animated.timing(cardsOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(cardsTranslate, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleContinue = async () => {
    if (!isFormValid()) return;
    try {
      const existing = await AsyncStorage.getItem('user_session');
      const parsed = existing ? JSON.parse(existing) : {};
      await AsyncStorage.setItem('user_session', JSON.stringify({
        ...parsed,
        userType: selected,
        name: yourName.trim(),
        partnerName: selected === 'couple' ? partnerName.trim() : undefined,
        brideName: selected === 'parent' ? brideName.trim() : undefined,
        groomName: selected === 'parent' ? groomName.trim() : undefined,
      }));
    } catch (e) {}
    router.replace('/onboarding');
  };

  // Minimum 2 characters in Your Name to enable Continue
  const isFormValid = () => yourName.trim().length >= 2;

  // fonts load async — render proceeds

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Header — always visible */}
        <View style={styles.header}>
          <Text style={styles.logoTop}>THE</Text>
          <Text style={styles.logoMain}>Dream Wedding</Text>
          <View style={styles.logoDivider} />
        </View>

        {/* Selection cards */}
        {!selected && (
          <Animated.View style={[styles.section, {
            opacity: cardsOpacity,
            transform: [{ translateY: cardsTranslate }],
          }]}>
            <Text style={styles.title}>Who are you?</Text>
            <Text style={styles.subtitle}>Help us personalise your experience</Text>

            <View style={styles.list}>

              <TouchableOpacity
                style={styles.row}
                onPress={() => handleSelect('couple')}
                activeOpacity={0.75}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>We are a Couple</Text>
                  <Text style={styles.rowSub}>Planning our dream wedding together</Text>
                </View>
                <Text style={styles.rowArrow}>›</Text>
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              <TouchableOpacity
                style={styles.row}
                onPress={() => handleSelect('parent')}
                activeOpacity={0.75}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>I am a Parent</Text>
                  <Text style={styles.rowSub}>Planning my child's wedding</Text>
                </View>
                <Text style={styles.rowArrow}>›</Text>
              </TouchableOpacity>

            </View>

            <Text style={styles.note}>
              You can always update this from your profile settings
            </Text>
          </Animated.View>
        )}

        {/* Form — animates in after selection */}
        {selected && (
          <Animated.View style={[styles.section, {
            opacity: formOpacity,
            transform: [{ translateY: formTranslate }],
          }]}>

            {/* Back */}
            <TouchableOpacity onPress={handleBack} style={styles.backRow}>
              <Text style={styles.backArrow}>‹</Text>
              <Text style={styles.backText}>
                {selected === 'couple' ? 'We are a Couple' : 'I am a Parent'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.title}>
              {selected === 'couple' ? 'Tell us about you' : 'Tell us about the couple'}
            </Text>
            <Text style={styles.subtitle}>
              {selected === 'couple'
                ? 'Your names make everything feel personal'
                : 'We\'ll use these throughout your planning journey'}
            </Text>

            <View style={styles.formCard}>

              {/* Your Name — always required */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Your Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter your name"
                  placeholderTextColor="#C4B8AC"
                  value={yourName}
                  onChangeText={setYourName}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    if (selected === 'couple') partnerRef.current?.focus();
                    if (selected === 'parent') brideRef.current?.focus();
                  }}
                />
              </View>

              <View style={styles.fieldDivider} />

              {/* Couple — partner name */}
              {selected === 'couple' && (
                <View style={styles.fieldBlock}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>Your Partner's Name</Text>
                    <Text style={styles.fieldOptional}>optional</Text>
                  </View>
                  <TextInput
                    ref={partnerRef}
                    style={styles.fieldInput}
                    placeholder="Enter their name"
                    placeholderTextColor="#C4B8AC"
                    value={partnerName}
                    onChangeText={setPartnerName}
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                  />
                </View>
              )}

              {/* Parent — bride + groom */}
              {selected === 'parent' && (
                <>
                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>Bride's Name</Text>
                      <Text style={styles.fieldOptional}>optional</Text>
                    </View>
                    <TextInput
                      ref={brideRef}
                      style={styles.fieldInput}
                      placeholder="Enter bride's name"
                      placeholderTextColor="#C4B8AC"
                      value={brideName}
                      onChangeText={setBrideName}
                      returnKeyType="next"
                      onSubmitEditing={() => groomRef.current?.focus()}
                    />
                  </View>

                  <View style={styles.fieldDivider} />

                  <View style={styles.fieldBlock}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>Groom's Name</Text>
                      <Text style={styles.fieldOptional}>optional</Text>
                    </View>
                    <TextInput
                      ref={groomRef}
                      style={styles.fieldInput}
                      placeholder="Enter groom's name"
                      placeholderTextColor="#C4B8AC"
                      value={groomName}
                      onChangeText={setGroomName}
                      returnKeyType="done"
                      onSubmitEditing={handleContinue}
                    />
                  </View>
                </>
              )}

            </View>

            {/* Continue */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                !isFormValid() && styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!isFormValid()}
              activeOpacity={0.85}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              You can always update this from your profile settings
            </Text>

          </Animated.View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  scroll: {
    paddingTop: 80,
    paddingHorizontal: 28,
    paddingBottom: 60,
    flexGrow: 1,
  },

  // Header
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 56,
  },
  logoTop: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 12,
    textTransform: 'uppercase',
  },
  logoMain: {
    fontSize: 28,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 1,
    textAlign: 'center',
  },
  logoDivider: {
    width: 36,
    height: 1,
    backgroundColor: '#C9A84C',
    marginTop: 8,
  },

  // Section
  section: {
    gap: 20,
  },

  // Title / subtitle
  title: {
    fontSize: 34,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
    marginTop: -10,
  },

  // Selection list
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    overflow: 'hidden',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  rowText: {
    gap: 5,
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  rowSub: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
  rowArrow: {
    fontSize: 26,
    color: '#C9A84C',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 20,
  },

  // Back button
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  backArrow: {
    fontSize: 22,
    color: '#C9A84C',
  },
  backText: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },

  // Form card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    overflow: 'hidden',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  fieldBlock: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  fieldOptional: {
    fontSize: 11,
    color: '#C4B8AC',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  fieldInput: {
    fontSize: 16,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    paddingVertical: 4,
    letterSpacing: 0.2,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 20,
  },

  // Continue
  continueButton: {
    width: '100%',
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#C4B8AC',
  },
  continueButtonText: {
    color: '#F5F0E8',
    fontSize: 13,
    letterSpacing: 2,
    fontFamily: 'DMSans_300Light',
    textTransform: 'uppercase',
  },

  // Note
  note: {
    fontSize: 11,
    color: '#8C7B6E',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: 'DMSans_300Light',
  },
});
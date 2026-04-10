import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput, Platform,
  Animated, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUser } from '../services/api';

const { width } = Dimensions.get('window');

const FUNCTIONS = [
  { id: 'roka', label: 'Roka', emoji: '💍' },
  { id: 'haldi', label: 'Haldi', emoji: '🌼' },
  { id: 'mehendi', label: 'Mehendi', emoji: '🪷' },
  { id: 'sangeet', label: 'Sangeet', emoji: '🎶' },
  { id: 'cocktail', label: 'Cocktail', emoji: '🥂' },
  { id: 'wedding', label: 'Wedding', emoji: '💒' },
  { id: 'reception', label: 'Reception', emoji: '✨' },
  { id: 'engagement', label: 'Engagement', emoji: '💎' },
];

const BUDGETS = [
  { id: '500000', label: '₹5L – ₹10L', sub: 'Intimate & elegant' },
  { id: '1000000', label: '₹10L – ₹25L', sub: 'Classic wedding' },
  { id: '2500000', label: '₹25L – ₹50L', sub: 'Premium celebration' },
  { id: '5000000', label: '₹50L – ₹1Cr', sub: 'Grand affair' },
  { id: '10000000', label: '₹1Cr+', sub: 'Destination & luxury' },
];

const CITIES = [
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Chennai',
  'Hyderabad', 'Kolkata', 'Jaipur', 'Pune',
  'Ahmedabad', 'Other',
];

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [weddingDate, setWeddingDate] = useState<Date>(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const toggleFunction = (id: string) => {
    setSelectedFunctions(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    scrollRef.current?.scrollTo({ x: step * width, animated: true });
  };

  const canProceedStep = (step: number) => {
    if (step === 0) return true; // date always set
    if (step === 1) return selectedFunctions.length > 0;
    if (step === 2) return selectedBudget !== '';
    if (step === 3) return selectedCity !== '';
    return false;
  };

  const handleFinish = async () => {
    try {
      setSaving(true);
      const session = await AsyncStorage.getItem('user_session');
      const parsed = session ? JSON.parse(session) : {};
      const userId = parsed.userId || parsed.uid;

      const userData = {
        wedding_date: weddingDate.toISOString(),
        functions: selectedFunctions,
        budget: parseInt(selectedBudget),
        city: selectedCity,
        onboarded: true,
      };

      if (userId) {
        try {
          await updateUser(userId, userData);
        } catch (e) {
          console.log('Backend update failed, continuing');
        }
      }

      // Update session with wedding details
      await AsyncStorage.setItem('user_session', JSON.stringify({
        ...parsed,
        ...userData,
      }));

      router.replace('/home');
    } catch (e) {
      Alert.alert('Error', 'Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const daysUntil = Math.ceil((weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => currentStep > 0 ? goToStep(currentStep - 1) : router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>The Dream Wedding</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentStep && styles.dotActive, i < currentStep && styles.dotDone]}
          />
        ))}
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}
      >

        {/* STEP 1 — Wedding Date */}
        <View style={[styles.slide, { width }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.slideContent}>
            <Text style={styles.stepLabel}>Step 1 of {TOTAL_STEPS}</Text>
            <Text style={styles.title}>When's the{'\n'}big day?</Text>
            <Text style={styles.subtitle}>We'll use this to show you available vendors</Text>

            <TouchableOpacity
              style={styles.dateCard}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dateCardLeft}>
                <Text style={styles.dateCardLabel}>Wedding Date</Text>
                <Text style={styles.dateCardValue}>{formatDate(weddingDate)}</Text>
              </View>
              <Text style={styles.dateCardEdit}>Change →</Text>
            </TouchableOpacity>

            <View style={styles.countdownCard}>
              <Text style={styles.countdownNumber}>{daysUntil}</Text>
              <Text style={styles.countdownLabel}>days to go</Text>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={weddingDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setWeddingDate(date);
                }}
              />
            )}

            <View style={styles.genieTip}>
              <Text style={styles.genieTipText}>
                💡 Vendors check availability by date. Setting this now means you'll only see vendors who are free on your day.
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* STEP 2 — Functions */}
        <View style={[styles.slide, { width }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.slideContent}>
            <Text style={styles.stepLabel}>Step 2 of {TOTAL_STEPS}</Text>
            <Text style={styles.title}>Which functions{'\n'}are you planning?</Text>
            <Text style={styles.subtitle}>Select all that apply</Text>

            <View style={styles.functionGrid}>
              {FUNCTIONS.map(fn => (
                <TouchableOpacity
                  key={fn.id}
                  style={[styles.functionCard, selectedFunctions.includes(fn.id) && styles.functionCardSelected]}
                  onPress={() => toggleFunction(fn.id)}
                >
                  <Text style={styles.functionEmoji}>{fn.emoji}</Text>
                  <Text style={[styles.functionLabel, selectedFunctions.includes(fn.id) && styles.functionLabelSelected]}>
                    {fn.label}
                  </Text>
                  {selectedFunctions.includes(fn.id) && (
                    <View style={styles.functionCheck}>
                      <Text style={styles.functionCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {selectedFunctions.length > 0 && (
              <View style={styles.selectionSummary}>
                <Text style={styles.selectionSummaryText}>
                  {selectedFunctions.length} function{selectedFunctions.length > 1 ? 's' : ''} selected
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* STEP 3 — Budget */}
        <View style={[styles.slide, { width }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.slideContent}>
            <Text style={styles.stepLabel}>Step 3 of {TOTAL_STEPS}</Text>
            <Text style={styles.title}>What's your{'\n'}total budget?</Text>
            <Text style={styles.subtitle}>For all functions combined</Text>

            <View style={styles.budgetList}>
              {BUDGETS.map((b, index) => (
                <View key={b.id}>
                  <TouchableOpacity
                    style={[styles.budgetRow, selectedBudget === b.id && styles.budgetRowSelected]}
                    onPress={() => setSelectedBudget(b.id)}
                  >
                    <View style={styles.budgetLeft}>
                      <Text style={[styles.budgetLabel, selectedBudget === b.id && styles.budgetLabelSelected]}>
                        {b.label}
                      </Text>
                      <Text style={styles.budgetSub}>{b.sub}</Text>
                    </View>
                    {selectedBudget === b.id
                      ? <View style={styles.budgetRadioSelected}><Text style={styles.budgetRadioCheck}>✓</Text></View>
                      : <View style={styles.budgetRadio} />
                    }
                  </TouchableOpacity>
                  {index < BUDGETS.length - 1 && <View style={styles.budgetDivider} />}
                </View>
              ))}
            </View>

            <View style={styles.genieTip}>
              <Text style={styles.genieTipText}>
                💡 Not sure? Pick a range — our Genie will adjust your estimated spend as you save vendors.
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* STEP 4 — City */}
        <View style={[styles.slide, { width }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.slideContent}>
            <Text style={styles.stepLabel}>Step 4 of {TOTAL_STEPS}</Text>
            <Text style={styles.title}>Where's the{'\n'}wedding?</Text>
            <Text style={styles.subtitle}>We'll show you vendors in your city first</Text>

            <View style={styles.cityGrid}>
              {CITIES.map(city => (
                <TouchableOpacity
                  key={city}
                  style={[styles.cityCard, selectedCity === city && styles.cityCardSelected]}
                  onPress={() => setSelectedCity(city)}
                >
                  <Text style={[styles.cityLabel, selectedCity === city && styles.cityLabelSelected]}>
                    {city}
                  </Text>
                  {selectedCity === city && (
                    <Text style={styles.cityCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, (!canProceedStep(currentStep) || saving) && styles.nextBtnDisabled]}
          disabled={!canProceedStep(currentStep) || saving}
          onPress={() => {
            if (currentStep < TOTAL_STEPS - 1) {
              goToStep(currentStep + 1);
            } else {
              handleFinish();
            }
          }}
        >
          {saving ? (
            <ActivityIndicator color="#F5F0E8" />
          ) : (
            <Text style={styles.nextBtnText}>
              {currentStep === TOTAL_STEPS - 1 ? 'Get Started →' : 'Continue →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 20 },
  backBtn: { fontSize: 22, color: '#2C2420', width: 24 },
  logo: { fontSize: 14, color: '#C9A84C', fontWeight: '500', letterSpacing: 2 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8E0D5' },
  dotActive: { width: 24, backgroundColor: '#2C2420' },
  dotDone: { backgroundColor: '#C9A84C' },
  carousel: { flex: 1 },
  slide: { flex: 1 },
  slideContent: { paddingHorizontal: 24, paddingBottom: 40, gap: 24 },
  stepLabel: { fontSize: 12, color: '#8C7B6E', letterSpacing: 1 },
  title: { fontSize: 36, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5, lineHeight: 46, marginTop: -8 },
  subtitle: { fontSize: 14, color: '#8C7B6E', marginTop: -12 },
  dateCard: { backgroundColor: '#2C2420', borderRadius: 16, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateCardLeft: { gap: 6 },
  dateCardLabel: { fontSize: 12, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase' },
  dateCardValue: { fontSize: 20, color: '#F5F0E8', fontWeight: '300', letterSpacing: 0.5 },
  dateCardEdit: { fontSize: 13, color: '#C9A84C' },
  countdownCard: { backgroundColor: '#FFF8EC', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E8D9B5' },
  countdownNumber: { fontSize: 56, color: '#C9A84C', fontWeight: '300', letterSpacing: 2 },
  countdownLabel: { fontSize: 13, color: '#8C7B6E', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 },
  functionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  functionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    position: 'relative',
  },
  functionCardSelected: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  functionEmoji: { fontSize: 28 },
  functionLabel: { fontSize: 15, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  functionLabelSelected: { color: '#F5F0E8' },
  functionCheck: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#C9A84C', justifyContent: 'center', alignItems: 'center' },
  functionCheckText: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
  selectionSummary: { backgroundColor: '#FFF8EC', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E8D9B5' },
  selectionSummaryText: { fontSize: 13, color: '#C9A84C', fontWeight: '500' },
  budgetList: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8E0D5', overflow: 'hidden' },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
  budgetRowSelected: { backgroundColor: '#FFF8EC' },
  budgetLeft: { gap: 3 },
  budgetLabel: { fontSize: 16, color: '#2C2420', fontWeight: '400' },
  budgetLabelSelected: { color: '#C9A84C', fontWeight: '600' },
  budgetSub: { fontSize: 12, color: '#8C7B6E' },
  budgetRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#E8E0D5' },
  budgetRadioSelected: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#C9A84C', justifyContent: 'center', alignItems: 'center' },
  budgetRadioCheck: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  budgetDivider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 20 },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cityCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  cityCardSelected: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  cityLabel: { fontSize: 14, color: '#2C2420', fontWeight: '400' },
  cityLabelSelected: { color: '#F5F0E8', fontWeight: '500' },
  cityCheck: { fontSize: 14, color: '#C9A84C', fontWeight: '700' },
  genieTip: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8D9B5' },
  genieTipText: { fontSize: 13, color: '#8C7B6E', lineHeight: 20 },
  bottomBar: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8' },
  nextBtn: { backgroundColor: '#2C2420', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.3 },
  nextBtnText: { fontSize: 15, color: '#F5F0E8', fontWeight: '500', letterSpacing: 0.5 },
});
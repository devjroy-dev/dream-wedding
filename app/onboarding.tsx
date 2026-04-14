import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput, Platform,
  Animated, ActivityIndicator, Alert, Modal, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { updateUser } from '../services/api';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display/index';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

const { width } = Dimensions.get('window');

const FUNCTIONS: { id: string; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'roka',       label: 'Roka',       icon: 'circle'   },
  { id: 'haldi',      label: 'Haldi',      icon: 'sun'      },
  { id: 'mehendi',    label: 'Mehendi',    icon: 'pen-tool' },
  { id: 'sangeet',    label: 'Sangeet',    icon: 'music'    },
  { id: 'cocktail',   label: 'Cocktail',   icon: 'droplet'  },
  { id: 'wedding',    label: 'Wedding',    icon: 'heart'    },
  { id: 'reception',  label: 'Reception',  icon: 'star'     },
  { id: 'engagement', label: 'Engagement', icon: 'link'     },
];

const BUDGETS = [
  { id: '500000',   label: '₹5L – ₹10L',   sub: 'Intimate celebration' },
  { id: '1000000',  label: '₹10L – ₹25L',  sub: 'Classic wedding'      },
  { id: '2500000',  label: '₹25L – ₹50L',  sub: 'Premium celebration'  },
  { id: '5000000',  label: '₹50L – ₹1Cr',  sub: 'Grand affair'         },
  { id: '10000000', label: '₹1Cr – ₹5Cr',  sub: 'Luxury & destination' },
  { id: '50000000', label: '₹5Cr+',         sub: 'Ultra luxury'         },
];

const QUARTERS = [
  { id: 'q1', label: 'Jan – Mar' },
  { id: 'q2', label: 'Apr – Jun' },
  { id: 'q3', label: 'Jul – Sep' },
  { id: 'q4', label: 'Oct – Dec' },
];

const ALL_LOCATIONS = [
  'Udaipur', 'Jaipur', 'Jodhpur', 'Goa', 'Mussoorie',
  'Shimla', 'Coorg', 'Rishikesh', 'Agra', 'Pushkar',
  'Ranthambore', 'Jim Corbett', 'Lonavala', 'Mahabaleshwar',
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Chennai',
  'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad',
  'Surat', 'Lucknow', 'Chandigarh', 'Indore',
  'Bhopal', 'Nagpur', 'Kochi', 'Bhubaneswar',
  'Patna', 'Varanasi', 'Amritsar', 'Dehradun',
  'Other',
];

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [isFlexible, setIsFlexible] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [daysCount, setDaysCount] = useState(0);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0.6)).current;

  // Step 2
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);

  // Step 3
  const [selectedBudget, setSelectedBudget] = useState('');

  // Step 4
  const [selectedCity, setSelectedCity] = useState('');
  const [cityType, setCityType] = useState<'local' | 'destination' | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const cityTypeOpacity = useRef(new Animated.Value(0)).current;
  const cityTypeTranslate = useRef(new Animated.Value(10)).current;
  const filteredLocations = ALL_LOCATIONS.filter(loc =>
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setWeddingDate(date);
      setSelectedQuarter(null);
      setIsFlexible(false);
      const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      setDaysCount(days);
      setShowCelebration(true);
      celebrationOpacity.setValue(0);
      celebrationScale.setValue(0.6);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(celebrationOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(celebrationScale, { toValue: 1, friction: 5, useNativeDriver: true }),
        ]),
        Animated.delay(1200),
        Animated.timing(celebrationOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => setShowCelebration(false));
    }
  };

  const handleQuarterSelect = (id: string) => {
    if (selectedQuarter === id) {
      setSelectedQuarter(null);
    } else {
      setSelectedQuarter(id);
      setWeddingDate(null);
      setIsFlexible(false);
    }
  };

  const handleFlexible = () => {
    const next = !isFlexible;
    setIsFlexible(next);
    if (next) {
      setSelectedQuarter(null);
      setWeddingDate(null);
    }
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setShowLocationModal(false);
    setLocationSearch('');
    setCityType(null);
    cityTypeOpacity.setValue(0);
    cityTypeTranslate.setValue(10);
    Animated.parallel([
      Animated.timing(cityTypeOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(cityTypeTranslate, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  };

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
    if (step === 0) return true;
    if (step === 1) return selectedFunctions.length > 0;
    if (step === 2) return selectedBudget !== '';
    if (step === 3) return selectedCity !== '';
    return false;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleFinish = async () => {
    try {
      setSaving(true);
      const session = await AsyncStorage.getItem('user_session');
      const parsed = session ? JSON.parse(session) : {};
      const userId = parsed.userId || parsed.uid;

      const userData = {
        wedding_date: weddingDate ? weddingDate.toISOString() : null,
        wedding_quarter: selectedQuarter,
        wedding_flexible: isFlexible,
        functions: selectedFunctions,
        budget: parseInt(selectedBudget),
        city: selectedCity,
        city_type: cityType,
        onboarded: true,
      };

      if (userId) {
        try { await updateUser(userId, userData); } catch (e) {}
      }

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

  // fonts load async — render proceeds

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => currentStep > 0 ? goToStep(currentStep - 1) : router.back()}
        >
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>Dream Wedding</Text>
        <TouchableOpacity onPress={() => router.replace('/home')}>
          <Text style={styles.skipBtn}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentStep && styles.dotActive,
              i < currentStep && styles.dotDone,
            ]}
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.slideContent}
          >
            <Text style={styles.stepLabel}>Step 1 of {TOTAL_STEPS}</Text>
            <Text style={styles.title}>When's the{'\n'}big day?</Text>
            <Text style={styles.subtitle}>Set a date or pick a season — no pressure</Text>

            {/* Date card */}
            <TouchableOpacity
              style={[styles.dateCard, weddingDate && styles.dateCardSelected]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.85}
            >
              <View style={styles.dateCardLeft}>
                <Text style={styles.dateCardLabel}>Wedding Date</Text>
                <Text style={[
                  styles.dateCardValue,
                  !weddingDate && styles.dateCardPlaceholder,
                ]}>
                  {weddingDate ? formatDate(weddingDate) : 'Tap to select a date'}
                </Text>
              </View>
              <Feather name="calendar" size={20} color="#C9A84C" />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={weddingDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}

            {/* Celebration */}
            {showCelebration && (
              <Animated.View style={[styles.celebrationBox, {
                opacity: celebrationOpacity,
                transform: [{ scale: celebrationScale }],
              }]}>
                <Text style={styles.celebrationNumber}>{daysCount}</Text>
                <Text style={styles.celebrationLabel}>days to go</Text>
              </Animated.View>
            )}

            {/* Season divider */}
            <Text style={styles.sectionDividerText}>— or choose a season —</Text>

            {/* Quarter cards — 2x2 grid */}
            <View style={styles.quarterGrid}>
              {QUARTERS.map(q => (
                <TouchableOpacity
                  key={q.id}
                  style={[
                    styles.quarterCard,
                    selectedQuarter === q.id && styles.quarterCardSelected,
                  ]}
                  onPress={() => handleQuarterSelect(q.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.quarterLabel,
                    selectedQuarter === q.id && styles.quarterLabelSelected,
                  ]}>
                    {q.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Flexible card — full width */}
            <TouchableOpacity
              style={[styles.flexibleCard, isFlexible && styles.flexibleCardSelected]}
              onPress={handleFlexible}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.flexibleLabel,
                isFlexible && styles.flexibleLabelSelected,
              ]}>
                We're flexible
              </Text>
              <Text style={[
                styles.flexibleSub,
                isFlexible && styles.flexibleSubSelected,
              ]}>
                Haven't decided yet — just exploring
              </Text>
            </TouchableOpacity>

            <View style={styles.genieTip}>
              <Text style={styles.genieTipText}>
                💡 Setting a date or season means we only show you vendors who are actually available.
              </Text>
            </View>

          </ScrollView>
        </View>

        {/* STEP 2 — Functions */}
        <View style={[styles.slide, { width }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.slideContent}
          >
            <Text style={styles.stepLabel}>Step 2 of {TOTAL_STEPS}</Text>
            <Text style={styles.title}>Which functions{'\n'}are you planning?</Text>
            <Text style={styles.subtitle}>Select all that apply</Text>

            <View style={styles.functionGrid}>
              {FUNCTIONS.map(fn => {
                const isSelected = selectedFunctions.includes(fn.id);
                return (
                  <TouchableOpacity
                    key={fn.id}
                    style={[styles.functionCard, isSelected && styles.functionCardSelected]}
                    onPress={() => toggleFunction(fn.id)}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={fn.icon}
                      size={18}
                      color={isSelected ? '#C9A84C' : '#8C7B6E'}
                    />
                    <Text style={[
                      styles.functionLabel,
                      isSelected && styles.functionLabelSelected,
                    ]}>
                      {fn.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.functionCheck}>
                        <Feather name="check" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.slideContent}
          >
            <Text style={styles.stepLabel}>Step 3 of {TOTAL_STEPS}</Text>
            <Text style={styles.title}>What's your{'\n'}total budget?</Text>
            <Text style={styles.subtitle}>For all functions combined</Text>

            <View style={styles.budgetList}>
              {BUDGETS.map((b, index) => (
                <View key={b.id}>
                  <TouchableOpacity
                    style={[
                      styles.budgetRow,
                      selectedBudget === b.id && styles.budgetRowSelected,
                    ]}
                    onPress={() => setSelectedBudget(b.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.budgetLeft}>
                      <Text style={[
                        styles.budgetLabel,
                        selectedBudget === b.id && styles.budgetLabelSelected,
                      ]}>
                        {b.label}
                      </Text>
                      <Text style={styles.budgetSub}>{b.sub}</Text>
                    </View>
                    {selectedBudget === b.id
                      ? (
                        <View style={styles.budgetRadioSelected}>
                          <Feather name="check" size={12} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View style={styles.budgetRadio} />
                      )
                    }
                  </TouchableOpacity>
                  {index < BUDGETS.length - 1 && (
                    <View style={styles.budgetDivider} />
                  )}
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

        {/* STEP 4 — Location */}
        <View style={[styles.slide, { width }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.slideContent}
          >
            <Text style={styles.stepLabel}>Step 4 of {TOTAL_STEPS}</Text>
            <Text style={styles.title}>Where's the{'\n'}wedding?</Text>
            <Text style={styles.subtitle}>We'll show you vendors in your location first</Text>

            {/* Location selector */}
            <TouchableOpacity
              style={[styles.dateCard, selectedCity && styles.dateCardSelected]}
              onPress={() => setShowLocationModal(true)}
              activeOpacity={0.85}
            >
              <View style={styles.dateCardLeft}>
                <Text style={styles.dateCardLabel}>Wedding Location</Text>
                <Text style={[
                  styles.dateCardValue,
                  !selectedCity && styles.dateCardPlaceholder,
                ]}>
                  {selectedCity || 'Search cities & destinations'}
                </Text>
              </View>
              <Feather name="map-pin" size={20} color="#C9A84C" />
            </TouchableOpacity>

            {/* Local / Destination toggle */}
            {selectedCity ? (
              <Animated.View style={[styles.cityTypeRow, {
                opacity: cityTypeOpacity,
                transform: [{ translateY: cityTypeTranslate }],
              }]}>
                <Text style={styles.cityTypeQuestion}>
                  Planning a wedding here?
                </Text>
                <View style={styles.cityTypePills}>
                  <TouchableOpacity
                    style={[styles.pill, cityType === 'local' && styles.pillSelected]}
                    onPress={() => setCityType('local')}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.pillText,
                      cityType === 'local' && styles.pillTextSelected,
                    ]}>
                      I live here
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pill, cityType === 'destination' && styles.pillSelected]}
                    onPress={() => setCityType('destination')}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.pillText,
                      cityType === 'destination' && styles.pillTextSelected,
                    ]}>
                      Destination wedding
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : null}

            <View style={styles.genieTip}>
              <Text style={styles.genieTipText}>
                💡 Destination wedding? We'll surface specialists who work in that location regularly.
              </Text>
            </View>

          </ScrollView>
        </View>

      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            (!canProceedStep(currentStep) || saving) && styles.nextBtnDisabled,
          ]}
          disabled={!canProceedStep(currentStep) || saving}
          onPress={() => {
            if (currentStep < TOTAL_STEPS - 1) {
              goToStep(currentStep + 1);
            } else {
              handleFinish();
            }
          }}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#F5F0E8" />
          ) : (
            <Text style={styles.nextBtnText}>
              {currentStep === TOTAL_STEPS - 1 ? 'GET STARTED' : 'CONTINUE'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Location Search Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Wedding Location</Text>
            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Feather name="search" size={16} color="#8C7B6E" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cities or destinations..."
              placeholderTextColor="#C4B8AC"
              value={locationSearch}
              onChangeText={setLocationSearch}
              autoFocus
            />
            {locationSearch.length > 0 && (
              <TouchableOpacity onPress={() => setLocationSearch('')}>
                <Feather name="x" size={16} color="#8C7B6E" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredLocations}
            keyExtractor={item => item}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.locationRow,
                  selectedCity === item && styles.locationRowSelected,
                ]}
                onPress={() => handleCitySelect(item)}
                activeOpacity={0.75}
              >
                <Text style={[
                  styles.locationRowText,
                  selectedCity === item && styles.locationRowTextSelected,
                ]}>
                  {item}
                </Text>
                {selectedCity === item && (
                  <Feather name="check" size={16} color="#C9A84C" />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.locationSeparator} />}
          />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    paddingTop: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backBtn: {
    fontSize: 22,
    color: '#2C2420',
    width: 60,
  },
  logo: {
    fontSize: 15,
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 1,
  },
  skipBtn: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
    textDecorationLine: 'underline',
    width: 70,
    textAlign: 'right',
  },

  // Progress dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8E0D5',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#2C2420',
    borderRadius: 4,
  },
  dotDone: {
    backgroundColor: '#C9A84C',
  },

  // Carousel
  carousel: { flex: 1 },
  slide: { flex: 1 },
  slideContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
  },

  // Typography
  stepLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 34,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
    lineHeight: 44,
    marginTop: -4,
  },
  subtitle: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    marginTop: -8,
    letterSpacing: 0.2,
  },

  // Date card
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE8E0',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  dateCardSelected: {
    borderColor: '#C9A84C',
    backgroundColor: '#FFF8EC',
  },
  dateCardLeft: { gap: 6, flex: 1 },
  dateCardLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dateCardValue: {
    fontSize: 17,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  dateCardPlaceholder: {
    color: '#C4B8AC',
    fontFamily: 'DMSans_300Light',
    fontSize: 15,
  },

  // Celebration
  celebrationBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  celebrationNumber: {
    fontSize: 72,
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 2,
  },
  celebrationLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // Season divider
  sectionDividerText: {
    fontSize: 12,
    color: '#C4B8AC',
    fontFamily: 'DMSans_300Light',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Quarter grid — 2x2
  quarterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quarterCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EDE8E0',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  quarterCardSelected: {
    backgroundColor: '#FFF8EC',
    borderColor: '#C9A84C',
  },
  quarterLabel: {
    fontSize: 15,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  quarterLabelSelected: {
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },

  // Flexible card
  flexibleCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE8E0',
    gap: 4,
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  flexibleCardSelected: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  flexibleLabel: {
    fontSize: 15,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  flexibleLabelSelected: { color: '#F5F0E8' },
  flexibleSub: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
  flexibleSubSelected: { color: '#C4B8AC' },

  // Genie tip
  genieTip: {
    backgroundColor: '#FFF8EC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  genieTipText: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    lineHeight: 20,
  },

  // Function cards — horizontal editorial layout
  functionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  functionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    position: 'relative',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  functionCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9A84C',
  },
  functionLabel: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
    flex: 1,
  },
  functionLabelSelected: {
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  functionCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionSummary: {
    backgroundColor: '#FFF8EC',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  selectionSummaryText: {
    fontSize: 13,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
  },

  // Budget
  budgetList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    overflow: 'hidden',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  budgetRowSelected: { backgroundColor: '#FFF8EC' },
  budgetLeft: { gap: 3 },
  budgetLabel: {
    fontSize: 16,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  budgetLabelSelected: {
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  budgetSub: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
  budgetRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#EDE8E0',
  },
  budgetRadioSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetRadioCheck: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  budgetDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 20,
  },

  // Location
  cityTypeRow: { gap: 12 },
  cityTypeQuestion: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  cityTypePills: {
    flexDirection: 'row',
    gap: 12,
  },
  pill: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE8E0',
  },
  pillSelected: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  pillText: {
    fontSize: 13,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
    letterSpacing: 0.3,
  },
  pillTextSelected: { color: '#F5F0E8' },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#EDE8E0',
    backgroundColor: '#FAF6F0',
  },
  nextBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.3 },
  nextBtnText: {
    fontSize: 13,
    color: '#F5F0E8',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8E0',
  },
  modalTitle: {
    fontSize: 20,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  modalClose: {
    fontSize: 14,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  locationRowSelected: { backgroundColor: '#FFF8EC' },
  locationRowText: {
    fontSize: 16,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  locationRowTextSelected: {
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  locationSeparator: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 24,
  },
});
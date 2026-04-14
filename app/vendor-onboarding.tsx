import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput, Alert,
  ActivityIndicator, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { createVendor } from '../services/api';
import { uploadMultipleImages } from '../services/cloudinary';
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

const CATEGORIES = [
  { id: 'photographers',   label: 'Photographer',       desc: 'Candid, traditional & cinematic',     icon: 'camera'    },
  { id: 'venues',          label: 'Venue',               desc: 'Banquets, farmhouses & hotels',       icon: 'home'      },
  { id: 'mua',             label: 'Makeup Artist',       desc: 'Bridal & party makeup',               icon: 'scissors'  },
  { id: 'designers',       label: 'Designer',            desc: 'Bridal & groom wear',                 icon: 'star'      },
  { id: 'choreographers',  label: 'Choreographer',       desc: 'Sangeet & performance prep',          icon: 'music'     },
  { id: 'content-creators',label: 'Content Creator',     desc: 'BTS Reels & short films',             icon: 'video'     },
  { id: 'dj',              label: 'DJ & Music',          desc: 'Live music & DJ services',            icon: 'headphones'},
  { id: 'event-managers',  label: 'Event Manager',       desc: 'Luxury & destination weddings',       icon: 'briefcase' },
  { id: 'jewellery',       label: 'Jewellery Designer',  desc: 'Bridal & custom jewellery',           icon: 'circle'    },
];

const VIBE_TAGS = [
  'Candid', 'Traditional', 'Luxury', 'Cinematic',
  'Boho', 'Festive', 'Minimalist', 'Royal',
];

const CITIES = [
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Chennai',
  'Hyderabad', 'Kolkata', 'Jaipur', 'Pune',
  'Ahmedabad', 'Pan India',
];

export default function VendorOnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;
  const [saving, setSaving] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [extraInfo, setExtraInfo] = useState('');
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  const toggleVibe = (vibe: string) => {
    setSelectedVibes(prev =>
      prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
    );
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 20,
      });
      if (!result.canceled && result.assets.length > 0) {
        setUploadingImages(true);
        try {
          const uris = result.assets.map(a => a.uri);
          const uploaded = await uploadMultipleImages(uris);
          setPortfolioImages(prev => [...prev, ...uploaded]);
        } catch (e) {
          Alert.alert('Upload failed', 'Could not upload images. Please try again.');
        } finally {
          setUploadingImages(false);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const removeImage = (index: number) => {
    setPortfolioImages(prev => prev.filter((_, i) => i !== index));
  };

  const getCategorySpecificLabel = () => {
    switch (selectedCategory) {
      case 'photographers':    return 'What styles do you shoot? (e.g. Candid, Traditional, Drone)';
      case 'venues':           return 'Capacity & catering details (e.g. 500 guests, in-house catering)';
      case 'mua':              return 'Kit brands you use (e.g. MAC, Huda Beauty, Charlotte Tilbury)';
      case 'designers':        return 'Lead time & specialisation (e.g. 3 months, bridal lehenga)';
      case 'choreographers':   return 'Group size & lead time (e.g. up to 20 people, 4 weeks)';
      case 'content-creators': return 'Delivery format & turnaround (e.g. Reels, 3 day delivery)';
      case 'dj':               return 'Setup details & genres (e.g. full sound system, Bollywood & EDM)';
      case 'event-managers':   return 'Team size & specialisation (e.g. 50 person team, destination weddings)';
      case 'jewellery':        return 'Materials & specialisation (e.g. gold, kundan, custom bridal sets)';
      default:                 return 'Tell us more about your services';
    }
  };

  const canProceed = () => {
    if (step === 1) return selectedCategory !== '';
    if (step === 2) return businessName.trim() !== '' && selectedCities.length > 0;
    if (step === 3) return true;
    if (step === 4) return selectedPlan !== '';
    return false;
  };

  const handleGoLive = async () => {
    try {
      setSaving(true);
      const session = await AsyncStorage.getItem('vendor_session');
      const parsed = session ? JSON.parse(session) : {};

      const vendorData = {
        name: businessName.trim(),
        category: selectedCategory,
        city: selectedCities[0] || '',
        instagram_url: instagram.trim(),
        starting_price: parseInt(startingPrice) || 0,
        vibe_tags: selectedVibes,
        about: extraInfo.trim(),
        equipment: extraInfo.trim(),
        delivery_time: 'As discussed',
        portfolio_images: portfolioImages,
        pan_number: panNumber.trim(),
        subscription_active: true,
        is_verified: false,
        rating: 0,
        review_count: 0,
      };

      const result = await createVendor(vendorData);

      if (result.success) {
        await AsyncStorage.setItem('vendor_session', JSON.stringify({
          ...parsed,
          vendorId: result.data.id,
          vendorName: businessName,
          category: selectedCategory,
          plan: selectedPlan,
          onboarded: true,
        }));
        Alert.alert(
          'You\'re live!',
          'Your profile is now visible to couples on The Dream Wedding.',
          [{ text: 'Go to Dashboard', onPress: () => router.replace('/vendor-dashboard') }]
        );
      } else {
        throw new Error('Failed to create profile');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save your profile. Please try again.');
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
          onPress={() => step > 1 ? setStep(step - 1) : router.back()}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={20} color="#2C2420" />
        </TouchableOpacity>
        <Text style={styles.stepText}>Step {step} of {TOTAL_STEPS}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >

        {/* STEP 1 — Category */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>What best describes{'\n'}your business?</Text>
            <Text style={styles.subtitle}>Select your primary category</Text>
            <View style={styles.categoryList}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === cat.id && styles.categoryCardSelected,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.categoryIconBox}>
                    <Feather
                      name={cat.icon as any}
                      size={16}
                      color={selectedCategory === cat.id ? '#C9A84C' : '#8C7B6E'}
                    />
                  </View>
                  <View style={styles.categoryCardText}>
                    <Text style={[
                      styles.categoryCardLabel,
                      selectedCategory === cat.id && styles.categoryCardLabelSelected,
                    ]}>
                      {cat.label}
                    </Text>
                    <Text style={styles.categoryCardDesc}>{cat.desc}</Text>
                  </View>
                  {selectedCategory === cat.id && (
                    <Feather name="check" size={16} color="#C9A84C" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 2 — Basic Info */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Tell us about{'\n'}your business</Text>
            <Text style={styles.subtitle}>This is what couples will see first</Text>

            <View style={styles.formCard}>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Business Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Arjun Mehta Photography"
                  placeholderTextColor="#C4B8AC"
                  value={businessName}
                  onChangeText={setBusinessName}
                />
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Instagram Handle</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="@yourbusiness"
                  placeholderTextColor="#C4B8AC"
                  value={instagram}
                  onChangeText={setInstagram}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Starting Price (₹)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. 50000"
                  placeholderTextColor="#C4B8AC"
                  value={startingPrice}
                  onChangeText={setStartingPrice}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>PAN Number</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. ABCDE1234F"
                  placeholderTextColor="#C4B8AC"
                  value={panNumber}
                  onChangeText={(text) => setPanNumber(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                <Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: 4 }}>
                  Required for TDS deduction and Form 26AS credit
                </Text>
              </View>

            </View>

            <Text style={styles.sectionLabel}>Cities You Serve</Text>
            <View style={styles.tagWrap}>
              {CITIES.map(city => (
                <TouchableOpacity
                  key={city}
                  style={[styles.tag, selectedCities.includes(city) && styles.tagSelected]}
                  onPress={() => toggleCity(city)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.tagText,
                    selectedCities.includes(city) && styles.tagTextSelected,
                  ]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Your Style & Vibe</Text>
            <View style={styles.tagWrap}>
              {VIBE_TAGS.map(vibe => (
                <TouchableOpacity
                  key={vibe}
                  style={[styles.tag, selectedVibes.includes(vibe) && styles.tagSelected]}
                  onPress={() => toggleVibe(vibe)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.tagText,
                    selectedVibes.includes(vibe) && styles.tagTextSelected,
                  ]}>
                    {vibe}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

          </View>
        )}

        {/* STEP 3 — Details + Portfolio */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>A few more{'\n'}details</Text>
            <Text style={styles.subtitle}>This helps couples find the right fit</Text>

            <View style={styles.formCard}>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{getCategorySpecificLabel()}</Text>
                <TextInput
                  style={[styles.fieldInput, styles.textArea]}
                  placeholder="Tell couples what makes you special..."
                  placeholderTextColor="#C4B8AC"
                  value={extraInfo}
                  onChangeText={setExtraInfo}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>Portfolio Photos</Text>
            <Text style={styles.sectionHint}>
              {portfolioImages.length > 0
                ? `${portfolioImages.length} photo${portfolioImages.length > 1 ? 's' : ''} uploaded`
                : 'Add at least 5 photos to attract couples'}
            </Text>

            {portfolioImages.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imagePreviewRow}
              >
                {portfolioImages.map((uri, index) => (
                  <View key={index} style={styles.imagePreviewItem}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.imageRemoveBtn}
                      onPress={() => removeImage(index)}
                    >
                      <Feather name="x" size={10} color="#F5F0E8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.uploadBox}
              onPress={pickImages}
              disabled={uploadingImages}
              activeOpacity={0.8}
            >
              {uploadingImages ? (
                <>
                  <ActivityIndicator color="#C9A84C" />
                  <Text style={styles.uploadBoxText}>Uploading...</Text>
                </>
              ) : (
                <>
                  <Feather name="upload" size={22} color="#C9A84C" />
                  <Text style={styles.uploadBoxText}>
                    {portfolioImages.length > 0 ? 'Add More Photos' : 'Upload Portfolio Photos'}
                  </Text>
                  <Text style={styles.uploadBoxHint}>JPG, PNG up to 10MB each</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.noticeCard}>
              <Feather name="calendar" size={14} color="#C9A84C" />
              <Text style={styles.noticeCardText}>
                You'll manage your availability calendar from your dashboard after going live.
              </Text>
            </View>

          </View>
        )}

        {/* STEP 4 — Plan */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Choose your{'\n'}listing plan</Text>
            <Text style={styles.subtitle}>Start getting discovered by couples</Text>

            {/* Basic plan */}
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'basic' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('basic')}
              activeOpacity={0.85}
            >
              <View style={styles.planTop}>
                <View>
                  <Text style={styles.planName}>Basic</Text>
                  <Text style={styles.planPrice}>₹2,999 / month</Text>
                </View>
                <View style={[
                  styles.planRadio,
                  selectedPlan === 'basic' && styles.planRadioSelected,
                ]}>
                  {selectedPlan === 'basic' && (
                    <Feather name="check" size={12} color="#FFFFFF" />
                  )}
                </View>
              </View>
              <View style={styles.planFeatures}>
                {[
                  'Profile listing on The Dream Wedding',
                  'Up to 10 portfolio photos',
                  'Enquiry messages from couples',
                  'Basic analytics',
                  'Invoice generator',
                  'GST calculation',
                ].map(feature => (
                  <View key={feature} style={styles.planFeatureRow}>
                    <Feather name="check" size={12} color="#C9A84C" />
                    <Text style={styles.planFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            {/* Premium plan */}
            <TouchableOpacity
              style={[styles.planCard, styles.planCardPremium, selectedPlan === 'premium' && styles.planCardPremiumSelected]}
              onPress={() => setSelectedPlan('premium')}
              activeOpacity={0.85}
            >
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Most Popular</Text>
              </View>
              <View style={styles.planTop}>
                <View>
                  <Text style={[styles.planName, { color: '#F5F0E8' }]}>Premium</Text>
                  <Text style={[styles.planPrice, { color: '#C9A84C' }]}>₹5,999 / month</Text>
                </View>
                <View style={[
                  styles.planRadio,
                  styles.planRadioPremium,
                  selectedPlan === 'premium' && styles.planRadioSelected,
                ]}>
                  {selectedPlan === 'premium' && (
                    <Feather name="check" size={12} color="#2C2420" />
                  )}
                </View>
              </View>
              <View style={styles.planFeatures}>
                {[
                  'Priority placement in swipe deck',
                  'Unlimited portfolio photos',
                  'Direct messaging with couples',
                  'Advanced analytics & insights',
                  'Verified Elite badge',
                  'Featured in Spotlight section',
                  'Lead quality scoring',
                  'Competitor benchmarking',
                  'Cancellation protection',
                ].map(feature => (
                  <View key={feature} style={styles.planFeatureRow}>
                    <Feather name="check" size={12} color="#C9A84C" />
                    <Text style={[styles.planFeatureText, { color: '#B8A99A' }]}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            <View style={styles.trialNote}>
              <Feather name="gift" size={14} color="#C9A84C" />
              <Text style={styles.trialNoteText}>
                First 3 months free — no credit card required. We'll reach out before your trial ends.
              </Text>
            </View>

          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            (!canProceed() || saving) && styles.nextBtnDisabled,
          ]}
          disabled={!canProceed() || saving}
          onPress={() => {
            if (step < TOTAL_STEPS) {
              setStep(step + 1);
            } else {
              handleGoLive();
            }
          }}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#F5F0E8" />
          ) : (
            <Text style={styles.nextBtnText}>
              {step === TOTAL_STEPS ? 'GO LIVE' : 'CONTINUE'}
            </Text>
          )}
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
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE8E0',
  },
  stepText: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Progress
  progressBar: {
    height: 2,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 24,
    borderRadius: 1,
    marginBottom: 28,
  },
  progressFill: {
    height: 2,
    backgroundColor: '#C9A84C',
    borderRadius: 1,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  stepContent: { gap: 20 },

  // Typography
  title: {
    fontSize: 34,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
    marginTop: -8,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionHint: {
    fontSize: 12,
    color: '#C4B8AC',
    fontFamily: 'DMSans_300Light',
    marginTop: -10,
  },

  // Category cards
  categoryList: { gap: 10 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryCardSelected: {
    borderColor: '#C9A84C',
    backgroundColor: '#FFF8EC',
  },
  categoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FAF6F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE8E0',
  },
  categoryCardText: { flex: 1, gap: 3 },
  categoryCardLabel: {
    fontSize: 15,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  categoryCardLabelSelected: {
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  categoryCardDesc: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
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
    paddingVertical: 16,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
  },

  // Tags
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderWidth: 1,
    borderColor: '#EDE8E0',
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  tagSelected: {
    borderColor: '#C9A84C',
    backgroundColor: '#C9A84C',
  },
  tagText: {
    fontSize: 13,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
  },
  tagTextSelected: {
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
  },

  // Portfolio
  imagePreviewRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  imagePreviewItem: { position: 'relative' },
  imagePreview: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8D9B5',
    borderStyle: 'dashed',
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  uploadBoxText: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  uploadBoxHint: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF8EC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  noticeCardText: {
    flex: 1,
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    lineHeight: 20,
  },

  // Plan cards
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    gap: 16,
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  planCardSelected: {
    borderColor: '#C9A84C',
    borderWidth: 2,
  },
  planCardPremium: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  planCardPremiumSelected: {
    borderColor: '#C9A84C',
    borderWidth: 2,
  },
  popularBadge: {
    backgroundColor: '#C9A84C',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  popularBadgeText: {
    fontSize: 11,
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },
  planTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 22,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  planPrice: {
    fontSize: 14,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    marginTop: 3,
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EDE8E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioPremium: {
    borderColor: 'rgba(255,255,255,0.2)',
  },
  planRadioSelected: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  planFeatures: { gap: 10 },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    flex: 1,
    lineHeight: 18,
  },
  trialNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF8EC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  trialNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    lineHeight: 20,
  },

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
});
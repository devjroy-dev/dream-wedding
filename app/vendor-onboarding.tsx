import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput, Alert, ActivityIndicator, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createVendor } from '../services/api';
import { uploadMultipleImages } from '../services/cloudinary';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'photographers', label: 'Photographer', desc: 'Candid, traditional & cinematic' },
  { id: 'venues', label: 'Venue', desc: 'Banquets, farmhouses & hotels' },
  { id: 'mua', label: 'Makeup Artist', desc: 'Bridal & party makeup' },
  { id: 'designers', label: 'Designer', desc: 'Bridal & groom wear' },
  { id: 'choreographers', label: 'Choreographer', desc: 'Sangeet & performance prep' },
  { id: 'content-creators', label: 'Content Creator', desc: 'BTS Reels & TikTok' },
  { id: 'dj', label: 'DJ & Music', desc: 'Live music & DJ services' },
  { id: 'event-managers', label: 'Event Manager', desc: 'Luxury & destination weddings' },
  { id: 'jewellery', label: 'Jewellery Designer', desc: 'Bridal & custom jewellery' },
];

const VIBE_TAGS = [
  'Candid', 'Traditional', 'Luxury', 'Cinematic',
  'Boho', 'Festive', 'Minimalist', 'Royal'
];

const CITIES = [
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Chennai',
  'Hyderabad', 'Kolkata', 'Jaipur', 'Pune', 'Ahmedabad', 'Pan India'
];

export default function VendorOnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;
  const [saving, setSaving] = useState(false);

  // Step 1
  const [selectedCategory, setSelectedCategory] = useState('');

  // Step 2
  const [businessName, setBusinessName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

  // Step 3
  const [extraInfo, setExtraInfo] = useState('');
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Step 4
  const [selectedPlan, setSelectedPlan] = useState('');

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
      case 'photographers': return 'What styles do you shoot? (e.g. Candid, Traditional, Drone)';
      case 'venues': return 'Capacity & catering details (e.g. 500 guests, in-house catering)';
      case 'mua': return 'Kit brands you use (e.g. MAC, Huda Beauty, Charlotte Tilbury)';
      case 'designers': return 'Lead time & specialisation (e.g. 3 months, bridal lehenga)';
      case 'choreographers': return 'Group size & lead time (e.g. up to 20 people, 4 weeks)';
      case 'content-creators': return 'Delivery format & turnaround (e.g. Reels, 3 day delivery)';
      case 'dj': return 'Setup details & genres (e.g. full sound system, Bollywood & EDM)';
      case 'event-managers': return 'Team size & specialisation (e.g. 50 person team, destination weddings)';
      case 'jewellery': return 'Materials & specialisation (e.g. gold, kundan, custom bridal sets)';
      default: return 'Tell us more about your services';
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

      // Get vendor phone from session
      const session = await AsyncStorage.getItem('vendor_session');
      const parsed = session ? JSON.parse(session) : {};
      const phone = parsed.phone || '';

      const vendorData = {
        name: businessName.trim(),
        category: selectedCategory,
        cities: selectedCities,
        city: selectedCities[0] || '',
        instagram_url: instagram.trim(),
        starting_price: parseInt(startingPrice) || 0,
        vibe_tags: selectedVibes,
        about: extraInfo.trim(),
        portfolio_images: portfolioImages,
        subscription_plan: selectedPlan,
        subscription_active: true,
        is_verified: false,
        rating: 0,
        review_count: 0,
        phone: phone,
      };

      const result = await createVendor(vendorData);

      if (result.success) {
        // Save vendor session
        await AsyncStorage.setItem('vendor_session', JSON.stringify({
          ...parsed,
          vendorId: result.data.id,
          vendorName: businessName,
          category: selectedCategory,
          plan: selectedPlan,
          onboarded: true,
        }));

        Alert.alert(
          'You\'re live! 🎉',
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

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>Step {step} of {TOTAL_STEPS}</Text>
        <View style={{ width: 24 }} />
      </View>

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
                  style={[styles.categoryCard, selectedCategory === cat.id && styles.categoryCardSelected]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <View style={styles.categoryCardLeft}>
                    <Text style={[styles.categoryCardLabel, selectedCategory === cat.id && styles.categoryCardLabelSelected]}>
                      {cat.label}
                    </Text>
                    <Text style={styles.categoryCardDesc}>{cat.desc}</Text>
                  </View>
                  {selectedCategory === cat.id && <Text style={styles.categoryCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 2 — Basic Info */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Tell us about{'\n'}your business</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Business Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Arjun Mehta Photography"
                placeholderTextColor="#8C7B6E"
                value={businessName}
                onChangeText={setBusinessName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Instagram Handle</Text>
              <TextInput
                style={styles.textInput}
                placeholder="@yourbusiness"
                placeholderTextColor="#8C7B6E"
                value={instagram}
                onChangeText={setInstagram}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Starting Price (₹) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 50000"
                placeholderTextColor="#8C7B6E"
                value={startingPrice}
                onChangeText={setStartingPrice}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cities you serve *</Text>
              <View style={styles.tagWrap}>
                {CITIES.map(city => (
                  <TouchableOpacity
                    key={city}
                    style={[styles.tag, selectedCities.includes(city) && styles.tagSelected]}
                    onPress={() => toggleCity(city)}
                  >
                    <Text style={[styles.tagText, selectedCities.includes(city) && styles.tagTextSelected]}>
                      {city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your Style / Vibe</Text>
              <View style={styles.tagWrap}>
                {VIBE_TAGS.map(vibe => (
                  <TouchableOpacity
                    key={vibe}
                    style={[styles.tag, selectedVibes.includes(vibe) && styles.tagSelected]}
                    onPress={() => toggleVibe(vibe)}
                  >
                    <Text style={[styles.tagText, selectedVibes.includes(vibe) && styles.tagTextSelected]}>
                      {vibe}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* STEP 3 — Details + Portfolio */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>A few more{'\n'}details</Text>
            <Text style={styles.subtitle}>This helps couples find the right fit</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{getCategorySpecificLabel()}</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Tell couples what makes you special..."
                placeholderTextColor="#8C7B6E"
                value={extraInfo}
                onChangeText={setExtraInfo}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Portfolio Photos</Text>
              <Text style={styles.inputHint}>
                {portfolioImages.length > 0
                  ? `${portfolioImages.length} photo${portfolioImages.length > 1 ? 's' : ''} uploaded`
                  : 'Add at least 5 photos to attract couples'}
              </Text>

              {portfolioImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
                  <View style={styles.imagePreviewRow}>
                    {portfolioImages.map((uri, index) => (
                      <View key={index} style={styles.imagePreviewItem}>
                        <Image source={{ uri }} style={styles.imagePreview} />
                        <TouchableOpacity
                          style={styles.imageRemoveBtn}
                          onPress={() => removeImage(index)}
                        >
                          <Text style={styles.imageRemoveBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.uploadBox}
                onPress={pickImages}
                disabled={uploadingImages}
              >
                {uploadingImages ? (
                  <>
                    <ActivityIndicator color="#C9A84C" />
                    <Text style={styles.uploadBoxText}>Uploading...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.uploadBoxIcon}>+</Text>
                    <Text style={styles.uploadBoxText}>
                      {portfolioImages.length > 0 ? 'Add More Photos' : 'Upload Portfolio Photos'}
                    </Text>
                    <Text style={styles.uploadBoxHint}>JPG, PNG up to 10MB each</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.noticeCard}>
              <Text style={styles.noticeCardText}>
                📅 You'll manage your availability calendar from your vendor dashboard after activation.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 4 — Subscription */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Choose your{'\n'}listing plan</Text>
            <Text style={styles.subtitle}>Start getting discovered by couples</Text>

            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'basic' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('basic')}
            >
              <View style={styles.planTop}>
                <Text style={styles.planName}>Basic</Text>
                <Text style={styles.planPrice}>₹2,999 / month</Text>
              </View>
              <View style={styles.planFeatures}>
                {[
                  'Profile listing on The Dream Wedding',
                  'Up to 10 portfolio photos',
                  'Inquiry messages from couples',
                  'Basic analytics',
                  'Invoice generator',
                  'GST calculation',
                ].map(feature => (
                  <Text key={feature} style={styles.planFeature}>✓ {feature}</Text>
                ))}
              </View>
              {selectedPlan === 'basic' && (
                <View style={styles.planSelectedBadge}>
                  <Text style={styles.planSelectedBadgeText}>Selected</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planCard, styles.planCardPremium, selectedPlan === 'premium' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('premium')}
            >
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Most Popular</Text>
              </View>
              <View style={styles.planTop}>
                <Text style={[styles.planName, { color: '#FAF6F0' }]}>Premium</Text>
                <Text style={[styles.planPrice, { color: '#FAF6F0' }]}>₹5,999 / month</Text>
              </View>
              <View style={styles.planFeatures}>
                {[
                  'Priority placement in swipe deck',
                  'Unlimited portfolio photos',
                  'Direct messaging with couples',
                  'Advanced analytics & insights',
                  'Verified Elite badge',
                  'Featured in Trending section',
                  'Lead quality scoring',
                  'Competitor benchmarking',
                  'Cancellation protection',
                ].map(feature => (
                  <Text key={feature} style={[styles.planFeature, { color: '#FAF6F0' }]}>✓ {feature}</Text>
                ))}
              </View>
              {selectedPlan === 'premium' && (
                <View style={[styles.planSelectedBadge, { backgroundColor: '#FAF6F0' }]}>
                  <Text style={[styles.planSelectedBadgeText, { color: '#C9A84C' }]}>Selected</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.trialNote}
              onPress={() => setSelectedPlan('basic')}
            >
              <Text style={styles.trialNoteText}>
                🎁 First 3 months free — no credit card required. We'll reach out before your trial ends.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, (!canProceed() || saving) && styles.nextBtnDisabled]}
          disabled={!canProceed() || saving}
          onPress={() => {
            if (step < TOTAL_STEPS) {
              setStep(step + 1);
            } else {
              handleGoLive();
            }
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FAF6F0" />
          ) : (
            <Text style={styles.nextBtnText}>
              {step === TOTAL_STEPS ? 'Go Live →' : 'Continue →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 12 },
  backBtn: { fontSize: 22, color: '#1C1C1C', width: 24 },
  stepText: { fontSize: 13, color: '#8C7B6E', letterSpacing: 0.5 },
  progressBar: { height: 3, backgroundColor: '#E8DDD4', marginHorizontal: 24, borderRadius: 2, marginBottom: 24 },
  progressFill: { height: 3, backgroundColor: '#C9A84C', borderRadius: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  stepContent: { gap: 20 },
  title: { fontSize: 32, color: '#1C1C1C', fontWeight: '300', letterSpacing: 0.5, lineHeight: 42 },
  subtitle: { fontSize: 13, color: '#8C7B6E', letterSpacing: 0.5, marginTop: -8 },
  categoryList: { gap: 10 },
  categoryCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8DDD4' },
  categoryCardSelected: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  categoryCardLeft: { gap: 4 },
  categoryCardLabel: { fontSize: 15, color: '#1C1C1C', fontWeight: '500' },
  categoryCardLabelSelected: { color: '#3D2314' },
  categoryCardDesc: { fontSize: 12, color: '#8C7B6E' },
  categoryCheck: { color: '#C9A84C', fontSize: 18, fontWeight: '600' },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, color: '#1C1C1C', fontWeight: '500', letterSpacing: 0.3 },
  inputHint: { fontSize: 12, color: '#8C7B6E', marginTop: -4 },
  textInput: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8DDD4', paddingVertical: 14, paddingHorizontal: 16, fontSize: 14, color: '#1C1C1C' },
  textArea: { height: 120, textAlignVertical: 'top' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderWidth: 1, borderColor: '#E8DDD4', borderRadius: 50, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  tagSelected: { borderColor: '#C9A84C', backgroundColor: '#C9A84C' },
  tagText: { fontSize: 13, color: '#1C1C1C' },
  tagTextSelected: { color: '#FAF6F0' },
  imagePreviewScroll: { marginBottom: 12 },
  imagePreviewRow: { flexDirection: 'row', gap: 10 },
  imagePreviewItem: { position: 'relative' },
  imagePreview: { width: 90, height: 90, borderRadius: 8 },
  imageRemoveBtn: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#1C1C1C', justifyContent: 'center', alignItems: 'center' },
  imageRemoveBtnText: { fontSize: 9, color: '#FAF6F0', fontWeight: '700' },
  uploadBox: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8DDD4', borderStyle: 'dashed', paddingVertical: 32, alignItems: 'center', gap: 8 },
  uploadBoxIcon: { fontSize: 28, color: '#C9A84C' },
  uploadBoxText: { fontSize: 14, color: '#1C1C1C', fontWeight: '500' },
  uploadBoxHint: { fontSize: 11, color: '#8C7B6E' },
  noticeCard: { backgroundColor: '#FFF8EC', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#C9A84C' },
  noticeCardText: { fontSize: 13, color: '#3D2314', lineHeight: 20 },
  trialNote: { backgroundColor: '#FFF8EC', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#E8DDD4' },
  trialNoteText: { fontSize: 13, color: '#3D2314', lineHeight: 20, textAlign: 'center' },
  planCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E8DDD4', gap: 16 },
  planCardPremium: { backgroundColor: '#1C1C1C', borderColor: '#1C1C1C' },
  planCardSelected: { borderColor: '#C9A84C', borderWidth: 2 },
  popularBadge: { backgroundColor: '#C9A84C', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  popularBadgeText: { fontSize: 11, color: '#FAF6F0', fontWeight: '600', letterSpacing: 0.5 },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 20, color: '#1C1C1C', fontWeight: '500' },
  planPrice: { fontSize: 15, color: '#C9A84C', fontWeight: '600' },
  planFeatures: { gap: 8 },
  planFeature: { fontSize: 13, color: '#8C7B6E', lineHeight: 20 },
  planSelectedBadge: { backgroundColor: '#C9A84C', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  planSelectedBadgeText: { fontSize: 13, color: '#FAF6F0', fontWeight: '600' },
  bottomBar: { paddingHorizontal: 24, paddingVertical: 24, borderTopWidth: 1, borderTopColor: '#E8DDD4', backgroundColor: '#FAF6F0' },
  nextBtn: { backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { fontSize: 15, color: '#FAF6F0', fontWeight: '500', letterSpacing: 0.5 },
});
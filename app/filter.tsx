import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

const VIBE_TAGS = [
  'Candid', 'Traditional', 'Luxury', 'Cinematic',
  'Boho', 'Festive', 'Minimalist', 'Royal', 'Destination', 'Contemporary'
];

const CITIES = [
  'Delhi NCR', 'Mumbai', 'Bangalore', 'Chennai',
  'Hyderabad', 'Kolkata', 'Jaipur', 'Pune', 'Udaipur', 'Goa',
];

const BUDGET_RANGES = [
  { id: '100000', label: 'Under ₹1L', sub: 'Budget friendly' },
  { id: '300000', label: '₹1L – ₹3L', sub: 'Great value' },
  { id: '500000', label: '₹3L – ₹5L', sub: 'Premium' },
  { id: '1000000', label: '₹5L – ₹10L', sub: 'Luxury' },
  { id: '99999999', label: '₹10L+', sub: 'Ultra premium' },
];

export default function FilterScreen() {
  const router = useRouter();
  const { category, from } = useLocalSearchParams();

  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

  const toggleVibe = (vibe: string) => {
    setSelectedVibes(prev =>
      prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
    );
  };

  const categoryLabel = (category as string)
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase()) || 'Vendors';

  const formatDate = (date: Date) => date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const handleApply = () => {
    const params = new URLSearchParams();
    if (category) params.append('category', category as string);
    if (selectedCity) params.append('city', selectedCity);
    if (selectedBudget) params.append('budget', selectedBudget);
    if (weddingDate) params.append('date', weddingDate.toISOString());
    if (selectedVibes.length > 0) params.append('vibes', selectedVibes.join(','));
    router.push(`/swipe?${params.toString()}`);
  };

  const handleClear = () => {
    setWeddingDate(null);
    setSelectedBudget('');
    setSelectedCity('');
    setSelectedVibes([]);
  };

  const activeFilters = [
    weddingDate, selectedBudget, selectedCity, selectedVibes.length > 0
  ].filter(Boolean).length;

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{categoryLabel}</Text>
          <Text style={styles.headerSub}>Refine your search</Text>
        </View>
        {activeFilters > 0 ? (
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Wedding Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Wedding Date</Text>
          <Text style={styles.sectionHint}>Only available vendors will be shown</Text>

          <TouchableOpacity
            style={styles.dateCard}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.dateCardLeft}>
              <Text style={styles.dateCardIcon}>📅</Text>
              <View>
                <Text style={styles.dateCardLabel}>
                  {weddingDate ? formatDate(weddingDate) : 'Select your wedding date'}
                </Text>
                {!weddingDate && (
                  <Text style={styles.dateCardHint}>Tap to choose</Text>
                )}
              </View>
            </View>
            {weddingDate && (
              <TouchableOpacity onPress={() => setWeddingDate(null)}>
                <Text style={styles.dateCardClear}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={weddingDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                minimumDate={new Date()}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (date) setWeddingDate(date);
                }}
                style={styles.datePicker}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.datePickerDone}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.sectionDivider} />

        {/* Budget */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Budget per Vendor</Text>
          <Text style={styles.sectionHint}>For this category specifically</Text>
          <View style={styles.budgetGrid}>
            {BUDGET_RANGES.map(b => (
              <TouchableOpacity
                key={b.id}
                style={[styles.budgetCard, selectedBudget === b.id && styles.budgetCardSelected]}
                onPress={() => setSelectedBudget(selectedBudget === b.id ? '' : b.id)}
              >
                <Text style={[styles.budgetLabel, selectedBudget === b.id && styles.budgetLabelSelected]}>
                  {b.label}
                </Text>
                <Text style={[styles.budgetSub, selectedBudget === b.id && styles.budgetSubSelected]}>
                  {b.sub}
                </Text>
                {selectedBudget === b.id && (
                  <View style={styles.budgetCheck}>
                    <Text style={styles.budgetCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* City */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>City</Text>
          <View style={styles.cityGrid}>
            {CITIES.map(city => (
              <TouchableOpacity
                key={city}
                style={[styles.cityChip, selectedCity === city && styles.cityChipSelected]}
                onPress={() => setSelectedCity(selectedCity === city ? '' : city)}
              >
                <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextSelected]}>
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* Vibe */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Vibe & Style</Text>
          <Text style={styles.sectionHint}>Select all that match your aesthetic</Text>
          <View style={styles.vibeGrid}>
            {VIBE_TAGS.map(vibe => (
              <TouchableOpacity
                key={vibe}
                style={[styles.vibeChip, selectedVibes.includes(vibe) && styles.vibeChipSelected]}
                onPress={() => toggleVibe(vibe)}
              >
                <Text style={[styles.vibeChipText, selectedVibes.includes(vibe) && styles.vibeChipTextSelected]}>
                  {vibe}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.startBtn} onPress={handleApply}>
          <Text style={styles.startBtnText}>
            Show Vendors{activeFilters > 0 ? ` · ${activeFilters} filter${activeFilters > 1 ? 's' : ''}` : ''}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D5',
  },
  headerBackBtn: { width: 34, height: 34, justifyContent: 'center' },
  headerBackText: { fontSize: 22, color: '#2C2420' },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 17, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  headerSub: { fontSize: 11, color: '#8C7B6E', letterSpacing: 0.5 },
  clearText: { fontSize: 13, color: '#C9A84C', fontWeight: '500', width: 56, textAlign: 'right' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  section: { paddingHorizontal: 24, paddingVertical: 24, gap: 14 },
  sectionLabel: { fontSize: 13, color: '#2C2420', fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionHint: { fontSize: 12, color: '#8C7B6E', marginTop: -8 },
  sectionDivider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 24 },
  dateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  dateCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dateCardIcon: { fontSize: 22 },
  dateCardLabel: { fontSize: 15, color: '#2C2420', fontWeight: '400' },
  dateCardHint: { fontSize: 12, color: '#8C7B6E', marginTop: 2 },
  dateCardClear: { fontSize: 16, color: '#8C7B6E', padding: 4 },
  datePickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    overflow: 'hidden',
  },
  datePicker: { backgroundColor: '#FFFFFF' },
  datePickerDone: {
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    paddingVertical: 14,
    alignItems: 'center',
  },
  datePickerDoneText: { fontSize: 15, color: '#C9A84C', fontWeight: '500' },
  budgetGrid: { gap: 10 },
  budgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  budgetCardSelected: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  budgetLabel: { fontSize: 16, color: '#2C2420', fontWeight: '400' },
  budgetLabelSelected: { color: '#F5F0E8', fontWeight: '500' },
  budgetSub: { fontSize: 12, color: '#8C7B6E' },
  budgetSubSelected: { color: '#8C7B6E' },
  budgetCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetCheckText: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cityChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    backgroundColor: '#FFFFFF',
  },
  cityChipSelected: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  cityChipText: { fontSize: 13, color: '#2C2420', letterSpacing: 0.2 },
  cityChipTextSelected: { color: '#F5F0E8', fontWeight: '500' },
  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vibeChip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    backgroundColor: '#FFFFFF',
  },
  vibeChipSelected: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  vibeChipText: { fontSize: 13, color: '#2C2420', letterSpacing: 0.2 },
  vibeChipTextSelected: { color: '#FFFFFF', fontWeight: '500' },
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    backgroundColor: '#F5F0E8',
  },
  startBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  startBtnText: { fontSize: 15, color: '#F5F0E8', fontWeight: '500', letterSpacing: 0.5 },
});
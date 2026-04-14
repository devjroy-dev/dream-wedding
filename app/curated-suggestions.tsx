import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Dimensions, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVendors } from '../services/api';

const { width } = Dimensions.get('window');

const VENDOR_CATEGORIES = [
  { id: 'venues',           label: 'Venues',           icon: 'home' },
  { id: 'photographers',    label: 'Photographers',    icon: 'camera' },
  { id: 'mua',              label: 'Makeup Artists',    icon: 'scissors' },
  { id: 'designers',        label: 'Designers',         icon: 'star' },
  { id: 'choreographers',   label: 'Choreographers',   icon: 'music' },
  { id: 'content-creators', label: 'Content Creators',  icon: 'video' },
  { id: 'dj',               label: 'DJ & Music',        icon: 'headphones' },
  { id: 'event-managers',   label: 'Event Managers',    icon: 'briefcase' },
  { id: 'jewellery',        label: 'Jewellery',         icon: 'circle' },
  { id: 'bridal-wellness',  label: 'Bridal Wellness',   icon: 'heart' },
];

type BudgetEntry = { categoryId: string; label: string; budget: string };
type VendorResult = { id: string; name: string; category: string; starting_price: number; city: string; rating: number };
type Combination = { vendors: VendorResult[]; totalCost: number };

const formatAmount = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
};

export default function CuratedSuggestionsScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'category' | 'total' | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<BudgetEntry[]>([]);
  const [totalBudget, setTotalBudget] = useState('');
  const [totalSelectedCategories, setTotalSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [userCity, setUserCity] = useState('');

  const toggleCategory = (catId: string, isTotal: boolean) => {
    if (isTotal) {
      setTotalSelectedCategories(prev =>
        prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
      );
    } else {
      const cat = VENDOR_CATEGORIES.find(c => c.id === catId);
      if (!cat) return;
      if (selectedCategories.includes(catId)) {
        setSelectedCategories(prev => prev.filter(c => c !== catId));
        setCategoryBudgets(prev => prev.filter(b => b.categoryId !== catId));
      } else {
        setSelectedCategories(prev => [...prev, catId]);
        setCategoryBudgets(prev => [...prev, { categoryId: catId, label: cat.label, budget: '' }]);
      }
    }
  };

  const updateBudget = (catId: string, value: string) => {
    setCategoryBudgets(prev =>
      prev.map(b => b.categoryId === catId ? { ...b, budget: value } : b)
    );
  };

  const findCombinations = async () => {
    try {
      setLoading(true);
      const session = await AsyncStorage.getItem('user_session');
      let city = '';
      if (session) {
        const parsed = JSON.parse(session);
        city = parsed.city || parsed.wedding_city || '';
        setUserCity(city);
      }

      let categoriesToSearch: { id: string; maxBudget: number }[] = [];

      if (mode === 'category') {
        categoriesToSearch = categoryBudgets
          .filter(b => b.budget && parseInt(b.budget) > 0)
          .map(b => ({ id: b.categoryId, maxBudget: parseInt(b.budget) }));
      } else {
        const total = parseInt(totalBudget);
        if (!total || totalSelectedCategories.length === 0) {
          Alert.alert('Missing info', 'Please enter a budget and select at least one category.');
          return;
        }
        const perCategory = Math.floor(total / totalSelectedCategories.length);
        categoriesToSearch = totalSelectedCategories.map(id => ({ id, maxBudget: perCategory }));
      }

      if (categoriesToSearch.length === 0) {
        Alert.alert('Missing info', 'Please set budgets for at least one category.');
        return;
      }

      const allVendors: Record<string, VendorResult[]> = {};
      for (const cat of categoriesToSearch) {
        try {
          const result = await getVendors(cat.id, city);
          if (result.success && result.data) {
            allVendors[cat.id] = result.data
              .filter((v: any) => v.starting_price <= cat.maxBudget)
              .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
              .slice(0, 5);
          } else {
            allVendors[cat.id] = [];
          }
        } catch (e) {
          allVendors[cat.id] = [];
        }
      }

      const combos: Combination[] = [];
      const categoryKeys = Object.keys(allVendors).filter(k => allVendors[k].length > 0);

      if (categoryKeys.length === 0) {
        Alert.alert('No vendors found', 'Try increasing your budget or changing your city in wedding details.');
        return;
      }

      const bestCombo: VendorResult[] = [];
      categoryKeys.forEach(key => {
        if (allVendors[key][0]) bestCombo.push(allVendors[key][0]);
      });
      if (bestCombo.length > 0) {
        combos.push({ vendors: bestCombo, totalCost: bestCombo.reduce((s, v) => s + (v.starting_price || 0), 0) });
      }

      const valueCombo: VendorResult[] = [];
      categoryKeys.forEach(key => {
        const sorted = [...allVendors[key]].sort((a, b) => a.starting_price - b.starting_price);
        if (sorted[0]) valueCombo.push(sorted[0]);
      });
      if (valueCombo.length > 0 && JSON.stringify(valueCombo) !== JSON.stringify(bestCombo)) {
        combos.push({ vendors: valueCombo, totalCost: valueCombo.reduce((s, v) => s + (v.starting_price || 0), 0) });
      }

      const mixCombo: VendorResult[] = [];
      categoryKeys.forEach(key => {
        const vendor = allVendors[key][1] || allVendors[key][0];
        if (vendor) mixCombo.push(vendor);
      });
      if (mixCombo.length > 0 && JSON.stringify(mixCombo) !== JSON.stringify(bestCombo)) {
        combos.push({ vendors: mixCombo, totalCost: mixCombo.reduce((s, v) => s + (v.starting_price || 0), 0) });
      }

      setCombinations(combos);
      setShowResults(true);
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showResults) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowResults(false)} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#2C2420" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Curated Teams</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.resultsSubtitle}>
            {combinations.length} combination{combinations.length !== 1 ? 's' : ''} within your budget{userCity ? ` in ${userCity}` : ''}
          </Text>
          {combinations.map((combo, idx) => (
            <View key={idx} style={styles.comboCard}>
              <View style={styles.comboHeader}>
                <Text style={styles.comboLabel}>
                  {idx === 0 ? 'Top Rated' : idx === 1 ? 'Best Value' : 'Alternative'}
                </Text>
                <Text style={styles.comboTotal}>{formatAmount(combo.totalCost)}</Text>
              </View>
              {combo.vendors.map((vendor, vIdx) => {
                const catLabel = VENDOR_CATEGORIES.find(c => c.id === vendor.category)?.label || vendor.category;
                return (
                  <View key={vIdx}>
                    {vIdx > 0 && <View style={styles.comboDivider} />}
                    <TouchableOpacity
                      style={styles.vendorRow}
                      onPress={() => router.push(`/vendor-profile?id=${vendor.id}` as any)}
                    >
                      <View style={styles.vendorIconBox}>
                        <Feather name={VENDOR_CATEGORIES.find(c => c.id === vendor.category)?.icon as any || 'star'} size={14} color="#C9A84C" />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.vendorName}>{vendor.name}</Text>
                        <Text style={styles.vendorMeta}>{catLabel} · {vendor.city}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={styles.vendorPrice}>{formatAmount(vendor.starting_price)}</Text>
                        <Text style={styles.vendorRating}>{vendor.rating ? `${vendor.rating}` : ''}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}
          {combinations.length === 0 && (
            <View style={styles.emptyCard}>
              <Feather name="search" size={28} color="#C4B8AC" />
              <Text style={styles.emptyTitle}>No combinations found</Text>
              <Text style={styles.emptySub}>Try increasing your budget or selecting fewer categories</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => mode ? setMode(null) : router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#2C2420" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Curated Suggestions</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {!mode && (
          <View style={styles.modeSection}>
            <Text style={styles.modeTitle}>How would you like to plan?</Text>
            <Text style={styles.modeSub}>We'll find the perfect vendor combinations for you</Text>
            <TouchableOpacity style={styles.modeCard} onPress={() => setMode('category')}>
              <View style={styles.modeIconBox}>
                <Feather name="sliders" size={18} color="#C9A84C" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.modeCardTitle}>Budget per category</Text>
                <Text style={styles.modeCardSub}>Set individual budgets for each vendor type you need</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#C9A84C" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.modeCard} onPress={() => setMode('total')}>
              <View style={styles.modeIconBox}>
                <Feather name="pie-chart" size={18} color="#C9A84C" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.modeCardTitle}>Total budget</Text>
                <Text style={styles.modeCardSub}>Enter your total budget and pick the categories — we split it smartly</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#C9A84C" />
            </TouchableOpacity>
          </View>
        )}
        {mode === 'category' && (
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Select categories and set budgets</Text>
            <Text style={styles.formSub}>Tap a category to add it, then enter your max budget</Text>
            <View style={styles.categoryGrid}>
              {VENDOR_CATEGORIES.map(cat => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                    onPress={() => toggleCategory(cat.id, false)}
                  >
                    <Feather name={cat.icon as any} size={12} color={isSelected ? '#F5F0E8' : '#8C7B6E'} />
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {categoryBudgets.length > 0 && (
              <View style={styles.budgetList}>
                {categoryBudgets.map(entry => (
                  <View key={entry.categoryId} style={styles.budgetRow}>
                    <Text style={styles.budgetLabel}>{entry.label}</Text>
                    <View style={styles.budgetInputWrap}>
                      <Text style={styles.budgetRupee}>₹</Text>
                      <TextInput style={styles.budgetInput} placeholder="Max budget" placeholderTextColor="#C4B8AC" keyboardType="numeric" value={entry.budget} onChangeText={(v) => updateBudget(entry.categoryId, v)} />
                    </View>
                  </View>
                ))}
              </View>
            )}
            {categoryBudgets.length > 0 && (
              <TouchableOpacity style={styles.findBtn} onPress={findCombinations} disabled={loading}>
                {loading ? <ActivityIndicator color="#F5F0E8" /> : <Text style={styles.findBtnText}>FIND COMBINATIONS</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}
        {mode === 'total' && (
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Enter your total budget</Text>
            <Text style={styles.formSub}>We'll distribute it across the categories you choose</Text>
            <View style={styles.totalInputWrap}>
              <Text style={styles.totalRupee}>₹</Text>
              <TextInput style={styles.totalInput} placeholder="e.g. 2500000" placeholderTextColor="#C4B8AC" keyboardType="numeric" value={totalBudget} onChangeText={setTotalBudget} />
            </View>
            <Text style={[styles.formTitle, { marginTop: 24 }]}>Which vendors do you need?</Text>
            <View style={styles.categoryGrid}>
              {VENDOR_CATEGORIES.map(cat => {
                const isSelected = totalSelectedCategories.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                    onPress={() => toggleCategory(cat.id, true)}
                  >
                    <Feather name={cat.icon as any} size={12} color={isSelected ? '#F5F0E8' : '#8C7B6E'} />
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {totalBudget && totalSelectedCategories.length > 0 && (
              <View style={styles.splitPreview}>
                <Text style={styles.splitTitle}>Budget split</Text>
                {totalSelectedCategories.map(catId => {
                  const cat = VENDOR_CATEGORIES.find(c => c.id === catId);
                  const perCat = Math.floor(parseInt(totalBudget) / totalSelectedCategories.length);
                  return (
                    <View key={catId} style={styles.splitRow}>
                      <Text style={styles.splitLabel}>{cat?.label}</Text>
                      <Text style={styles.splitAmount}>{formatAmount(perCat)}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            {totalBudget && totalSelectedCategories.length > 0 && (
              <TouchableOpacity style={styles.findBtn} onPress={findCombinations} disabled={loading}>
                {loading ? <ActivityIndicator color="#F5F0E8" /> : <Text style={styles.findBtnText}>FIND COMBINATIONS</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EDE8E0' },
  headerTitle: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3 },
  modeSection: { paddingHorizontal: 24, gap: 16 },
  modeTitle: { fontSize: 28, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3, lineHeight: 36 },
  modeSub: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: -8 },
  modeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', padding: 20 },
  modeIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF8EC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8D9B5' },
  modeCardTitle: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  modeCardSub: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 18 },
  formSection: { paddingHorizontal: 24, gap: 16 },
  formTitle: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  formSub: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: -8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, borderWidth: 1, borderColor: '#EDE8E0', backgroundColor: '#FFFFFF' },
  categoryChipActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  categoryChipText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  categoryChipTextActive: { color: '#F5F0E8', fontFamily: 'DMSans_500Medium' },
  budgetList: { gap: 10 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E0', paddingLeft: 16, overflow: 'hidden' },
  budgetLabel: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular', flex: 1 },
  budgetInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8EC', paddingHorizontal: 12, paddingVertical: 14 },
  budgetRupee: { fontSize: 14, color: '#C9A84C', fontFamily: 'DMSans_500Medium', marginRight: 4 },
  budgetInput: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular', minWidth: 100, textAlign: 'right' },
  totalInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E0', paddingHorizontal: 16, paddingVertical: 16 },
  totalRupee: { fontSize: 18, color: '#C9A84C', fontFamily: 'DMSans_500Medium', marginRight: 8 },
  totalInput: { flex: 1, fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  splitPreview: { backgroundColor: '#FFF8EC', borderRadius: 12, borderWidth: 1, borderColor: '#E8D9B5', padding: 16, gap: 8 },
  splitTitle: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  splitLabel: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  splitAmount: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  findBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  findBtnText: { color: '#F5F0E8', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 2, textTransform: 'uppercase' },
  resultsSubtitle: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', paddingHorizontal: 24, marginBottom: 16 },
  comboCard: { marginHorizontal: 24, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', overflow: 'hidden' },
  comboHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EDE8E0', backgroundColor: '#FFF8EC' },
  comboLabel: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium', letterSpacing: 0.3 },
  comboTotal: { fontSize: 15, color: '#C9A84C', fontFamily: 'PlayfairDisplay_400Regular' },
  comboDivider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 16 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  vendorIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF8EC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8D9B5' },
  vendorName: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  vendorMeta: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  vendorPrice: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  vendorRating: { fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },
  emptyCard: { marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', padding: 40, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptySub: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center' },
});

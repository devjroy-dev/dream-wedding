import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { TIER_CONTENT, type BudgetTier } from '../../constants/journeyConfig';

const { width } = Dimensions.get('window');

const formatAmount = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
};

interface Props {
  userId: string;
  session: any;
  tier: BudgetTier;
  onBack: () => void;
}

export default function BudgetTool({ userId, session, tier, onBack }: Props) {
  const totalBudget = session?.budget || 2500000;
  const defaults = TIER_CONTENT[tier].budgetDefaults;
  const [categories, setCategories] = useState(
    defaults.map((c, i) => ({ id: String(i + 1), ...c, spent: 0 }))
  );
  const [showAdd, setShowAdd] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatAmount, setNewCatAmount] = useState('');

  useEffect(() => {
    loadBudget();
  }, []);

  const loadBudget = async () => {
    try {
      const stored = await AsyncStorage.getItem(`budget_${userId}`);
      if (stored) setCategories(JSON.parse(stored));
    } catch (e) {}
  };

  const saveBudget = async (cats: any[]) => {
    try { await AsyncStorage.setItem(`budget_${userId}`, JSON.stringify(cats)); } catch (e) {}
  };

  const totalAllocated = categories.reduce((sum, c) => sum + c.amount, 0);
  const totalSpent = categories.reduce((sum, c) => sum + (c.spent || 0), 0);
  const remaining = totalBudget - totalSpent;

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const updated = [...categories, {
      id: Date.now().toString(),
      category: newCatName.trim(),
      amount: parseInt(newCatAmount) || 0,
      icon: 'tag',
      spent: 0,
    }];
    setCategories(updated);
    saveBudget(updated);
    setNewCatName(''); setNewCatAmount('');
    setShowAdd(false);
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#2C2420" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Budget</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* Donut hero — simplified as ring */}
        <View style={s.heroCard}>
          <View style={s.ringWrap}>
            <View style={s.ringOuter}>
              <View style={s.ringInner}>
                <Text style={s.ringAmount}>{formatAmount(remaining)}</Text>
                <Text style={s.ringLabel}>remaining</Text>
              </View>
            </View>
          </View>
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{formatAmount(totalBudget)}</Text>
              <Text style={s.heroStatLabel}>Total</Text>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{formatAmount(totalSpent)}</Text>
              <Text style={s.heroStatLabel}>Spent</Text>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroStat}>
              <Text style={[s.heroStatNum, { color: '#C9A84C' }]}>{formatAmount(totalAllocated)}</Text>
              <Text style={s.heroStatLabel}>Allocated</Text>
            </View>
          </View>
        </View>

        {/* Category cards */}
        {categories.map((cat) => {
          const pct = cat.amount > 0 ? Math.min((cat.spent || 0) / cat.amount, 1) : 0;
          return (
            <TouchableOpacity
              key={cat.id}
              style={s.catCard}
              onPress={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              activeOpacity={0.8}
            >
              <View style={s.catRow}>
                <View style={s.catIconBox}>
                  <Feather name={cat.icon as any} size={14} color="#C9A84C" />
                </View>
                <View style={s.catInfo}>
                  <Text style={s.catName}>{cat.category}</Text>
                  <Text style={s.catAmounts}>
                    {formatAmount(cat.spent || 0)} of {formatAmount(cat.amount)}
                  </Text>
                </View>
                <Feather name={expandedCat === cat.id ? 'chevron-up' : 'chevron-down'} size={14} color="#C4B8AC" />
              </View>
              {/* Progress bar */}
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${pct * 100}%` }, pct > 0.9 && { backgroundColor: '#E57373' }]} />
              </View>
              {expandedCat === cat.id && (
                <View style={s.catExpanded}>
                  <Text style={s.catExpandedHint}>Tap to add line items (coming next update)</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Add category */}
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Feather name="plus" size={14} color="#C9A84C" />
          <Text style={s.addBtnText}>Add Category</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Budget Category</Text>
            <TextInput style={s.modalInput} placeholder="Category name" placeholderTextColor="#C4B8AC" value={newCatName} onChangeText={setNewCatName} />
            <TextInput style={s.modalInput} placeholder="Allocated amount" placeholderTextColor="#C4B8AC" value={newCatAmount} onChangeText={setNewCatAmount} keyboardType="number-pad" />
            <TouchableOpacity style={s.modalBtn} onPress={addCategory}>
              <Text style={s.modalBtnText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={s.modalCancel}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingBottom: 16,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  // Hero
  heroCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', padding: 24, marginBottom: 16, alignItems: 'center' },
  ringWrap: { marginBottom: 20 },
  ringOuter: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#C9A84C', justifyContent: 'center', alignItems: 'center' },
  ringInner: { alignItems: 'center', gap: 2 },
  ringAmount: { fontSize: 22, color: '#2C2420', fontFamily: 'PlayfairDisplay_600SemiBold' },
  ringLabel: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  heroStat: { alignItems: 'center', gap: 2 },
  heroStatNum: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  heroStatLabel: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.5 },
  heroDivider: { width: 1, height: 30, backgroundColor: '#EDE8E0' },

  // Category cards
  catCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE8E0', padding: 16, marginBottom: 10, gap: 10 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5', justifyContent: 'center', alignItems: 'center' },
  catInfo: { flex: 1, gap: 2 },
  catName: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular', letterSpacing: 0.2 },
  catAmounts: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  progressTrack: { height: 3, backgroundColor: '#EDE8E0', borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: '#C9A84C', borderRadius: 2 },
  catExpanded: { paddingTop: 6 },
  catExpandedHint: { fontSize: 11, color: '#C4B8AC', fontFamily: 'DMSans_300Light', fontStyle: 'italic', textAlign: 'center' },

  // Add
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderWidth: 1, borderColor: '#EDE8E0', borderRadius: 12, backgroundColor: '#FFFFFF' },
  addBtnText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', marginBottom: 4 },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});

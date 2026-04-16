"""
Session 6 — Patch 4: Planner Rewrite
Replaces bts-planner.tsx with Journey View shell.
Creates components/planner/ directory with all tool components.
This is the big one.
"""
import os

os.makedirs('components/planner', exist_ok=True)

# ══════════════════════════════════════════════════════════════════════════════
# MAIN PLANNER SHELL — bts-planner.tsx
# ══════════════════════════════════════════════════════════════════════════════

planner_shell = r'''import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Animated, BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import BudgetTool from '../components/planner/BudgetTool';
import GuestsTool from '../components/planner/GuestsTool';
import ChecklistTool from '../components/planner/ChecklistTool';
import DecisionLogTool from '../components/planner/DecisionLogTool';
import MyVendorsTool from '../components/planner/MyVendorsTool';
import PaymentsTool from '../components/planner/PaymentsTool';
import RegistryTool from '../components/planner/RegistryTool';
import WebsiteTool from '../components/planner/WebsiteTool';
import DreamAiTool from '../components/planner/DreamAiTool';
import {
  JOURNEY_PHASES, QUICK_ACCESS_TOOLS, PROGRESS_LABELS,
  getCurrentPhase, getProgressIndex, getBudgetTier,
  type BudgetTier, type PhaseId,
} from '../constants/journeyConfig';

const { width } = Dimensions.get('window');

export default function BTSPlannerScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'journey' | 'tools'>('journey');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [userSession, setUserSession] = useState<any>(null);
  const [budgetTier, setBudgetTier] = useState<BudgetTier>('essential');
  const [daysUntil, setDaysUntil] = useState<number | null>(null);
  const [currentPhase, setCurrentPhase] = useState<PhaseId>('foundation');
  const [progressIdx, setProgressIdx] = useState(0);
  const [coupleName, setCoupleName] = useState('');
  const [weddingDateStr, setWeddingDateStr] = useState('');

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTool) { setActiveTool(null); return true; }
      router.replace('/home');
      return true;
    });
    return () => backHandler.remove();
  }, [activeTool]);

  useEffect(() => {
    loadSession();
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadSession = async () => {
    try {
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const p = JSON.parse(session);
        setUserId(p.userId || p.uid || '');
        setUserSession(p);
        const budget = p.budget || 0;
        setBudgetTier(getBudgetTier(budget));
        const name = p.name || '';
        const partner = p.partnerName || '';
        setCoupleName(partner ? `${name.split(' ')[0]} & ${partner.split(' ')[0]}` : name.split(' ')[0]);
        if (p.wedding_date) {
          const days = Math.max(0, Math.ceil(
            (new Date(p.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ));
          setDaysUntil(days);
          setCurrentPhase(getCurrentPhase(days));
          setProgressIdx(getProgressIndex(days));
          setWeddingDateStr(new Date(p.wedding_date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
          }));
        }
      }
    } catch (e) {}
  };

  // ── Tool routing ───────────────────────────────────────────────────────────

  const handleToolPress = (route: string) => {
    if (route === 'discover') { router.push('/swipe' as any); return; }
    if (route === 'moodboard') { router.push('/moodboard' as any); return; }
    if (route === 'destination') { router.push('/destination-weddings' as any); return; }
    setActiveTool(route);
  };

  const renderTool = () => {
    switch (activeTool) {
      case 'budget':       return <BudgetTool userId={userId} session={userSession} tier={budgetTier} onBack={() => setActiveTool(null)} />;
      case 'guests':       return <GuestsTool userId={userId} onBack={() => setActiveTool(null)} />;
      case 'checklist':    return <ChecklistTool userId={userId} onBack={() => setActiveTool(null)} />;
      case 'decision-log': return <DecisionLogTool userId={userId} session={userSession} onBack={() => setActiveTool(null)} />;
      case 'my-vendors':   return <MyVendorsTool userId={userId} session={userSession} onBack={() => setActiveTool(null)} />;
      case 'payments':     return <PaymentsTool userId={userId} onBack={() => setActiveTool(null)} />;
      case 'registry':     return <RegistryTool userId={userId} onBack={() => setActiveTool(null)} />;
      case 'website':      return <WebsiteTool userId={userId} session={userSession} onBack={() => setActiveTool(null)} />;
      case 'dream-ai':     return <DreamAiTool userId={userId} session={userSession} onBack={() => setActiveTool(null)} />;
      default:             return null;
    }
  };

  // ── If a tool is open, render it full-screen ───────────────────────────────

  if (activeTool) {
    return (
      <View style={s.container}>
        {renderTool()}
      </View>
    );
  }

  // ── Main Planner View ─────────────────────────────────────────────────────

  const isPhaseActive = (phase: typeof JOURNEY_PHASES[0]) => {
    if (!daysUntil) return phase.activatesAt >= 365;
    return daysUntil <= phase.activatesAt;
  };

  const isCurrentPhaseCard = (phase: typeof JOURNEY_PHASES[0]) => phase.id === currentPhase;

  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <Animated.View style={[s.header, { opacity: fadeIn }]}>
        <View style={s.headerLeft}>
          {coupleName ? (
            <Text style={s.coupleNames}>{coupleName}</Text>
          ) : (
            <Text style={s.title}>Planner</Text>
          )}
          {daysUntil !== null ? (
            <View style={s.countdownRow}>
              <Text style={s.countdownNum}>{daysUntil}</Text>
              <Text style={s.countdownLabel}> days to your wedding</Text>
            </View>
          ) : (
            <Text style={s.subtitle}>Plan your dream wedding</Text>
          )}
        </View>
        <TouchableOpacity
          style={s.avatarBtn}
          onPress={() => router.push('/profile' as any)}
        >
          <Text style={s.avatarText}>{coupleName?.[0]?.toUpperCase() || 'D'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Progress Strip ── */}
      {daysUntil !== null && (
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${((progressIdx + 0.5) / PROGRESS_LABELS.length) * 100}%` }]} />
          </View>
          <View style={s.progressLabels}>
            {PROGRESS_LABELS.map((label, i) => (
              <View key={label} style={s.progressLabelWrap}>
                <View style={[s.progressDot, i <= progressIdx && s.progressDotActive]} />
                <Text style={[s.progressLabelText, i <= progressIdx && s.progressLabelActive]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Mode Toggle ── */}
      <View style={s.modeToggleWrap}>
        <TouchableOpacity
          style={[s.modeTab, viewMode === 'journey' && s.modeTabActive]}
          onPress={() => setViewMode('journey')}
        >
          <Text style={[s.modeTabText, viewMode === 'journey' && s.modeTabTextActive]}>Journey</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeTab, viewMode === 'tools' && s.modeTabActive]}
          onPress={() => setViewMode('tools')}
        >
          <Text style={[s.modeTabText, viewMode === 'tools' && s.modeTabTextActive]}>Tools</Text>
        </TouchableOpacity>
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
      >

        {viewMode === 'journey' ? (
          <>
            {JOURNEY_PHASES.map((phase) => {
              const active = isPhaseActive(phase);
              const isCurrent = isCurrentPhaseCard(phase);
              return (
                <View
                  key={phase.id}
                  style={[
                    s.phaseCard,
                    !active && s.phaseCardMuted,
                    isCurrent && s.phaseCardCurrent,
                  ]}
                >
                  <View style={s.phaseHeader}>
                    <View style={[s.phaseIconBox, isCurrent && s.phaseIconBoxCurrent]}>
                      <Feather name={phase.icon as any} size={16} color={isCurrent ? '#C9A84C' : '#8C7B6E'} />
                    </View>
                    <View style={s.phaseTitleWrap}>
                      <Text style={[s.phaseTitle, !active && s.phaseTitleMuted]}>{phase.label}</Text>
                      <Text style={s.phaseSubtitle}>{phase.subtitle}</Text>
                    </View>
                  </View>

                  {active ? (
                    <View style={s.toolsGrid}>
                      {phase.tools.map((tool) => (
                        <TouchableOpacity
                          key={tool.id}
                          style={[s.toolCard, tool.comingSoon && s.toolCardMuted]}
                          onPress={() => !tool.comingSoon && handleToolPress(tool.route)}
                          activeOpacity={tool.comingSoon ? 1 : 0.7}
                        >
                          <View style={s.toolIconBox}>
                            <Feather name={tool.icon as any} size={15} color="#C9A84C" />
                          </View>
                          <Text style={s.toolLabel}>{tool.label}</Text>
                          {tool.platinumOnly && (
                            <View style={s.platinumBadge}>
                              <Text style={s.platinumText}>Platinum</Text>
                            </View>
                          )}
                          {tool.comingSoon && (
                            <Text style={s.comingSoonText}>Coming soon</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={s.comingSoonWrap}>
                      <Text style={s.comingSoonLabel}>Coming soon in your journey</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        ) : (
          /* Quick Access Grid */
          <View style={s.quickGrid}>
            {QUICK_ACCESS_TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={s.quickCard}
                onPress={() => handleToolPress(tool.route)}
                activeOpacity={0.7}
              >
                <View style={s.quickIconBox}>
                  <Feather name={tool.icon as any} size={18} color="#C9A84C" />
                </View>
                <Text style={s.quickLabel}>{tool.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', paddingTop: 60 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, marginBottom: 16,
  },
  headerLeft: { flex: 1, gap: 4 },
  coupleNames: {
    fontSize: 26, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3,
  },
  title: {
    fontSize: 26, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3,
  },
  countdownRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  countdownNum: {
    fontSize: 20, color: '#C9A84C', fontFamily: 'PlayfairDisplay_600SemiBold', letterSpacing: 0.5,
  },
  countdownLabel: {
    fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2,
  },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#2C2420',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#C9A84C', fontSize: 15, fontFamily: 'DMSans_500Medium' },

  // Progress strip
  progressWrap: { paddingHorizontal: 24, marginBottom: 20 },
  progressTrack: {
    height: 2, backgroundColor: '#EDE8E0', borderRadius: 1, marginBottom: 8,
  },
  progressFill: {
    height: 2, backgroundColor: '#C9A84C', borderRadius: 1,
  },
  progressLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
  },
  progressLabelWrap: { alignItems: 'center', gap: 4 },
  progressDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#EDE8E0',
  },
  progressDotActive: { backgroundColor: '#C9A84C' },
  progressLabelText: {
    fontSize: 9, color: '#C4B8AC', fontFamily: 'DMSans_300Light', letterSpacing: 0.3,
  },
  progressLabelActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },

  // Mode toggle
  modeToggleWrap: {
    flexDirection: 'row', marginHorizontal: 24, marginBottom: 16,
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#EDE8E0',
    padding: 3,
  },
  modeTab: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#FAF6F0',
  },
  modeTabText: {
    fontSize: 12, color: '#B8ADA4', fontFamily: 'DMSans_400Regular', letterSpacing: 0.5,
  },
  modeTabTextActive: {
    color: '#C9A84C', fontFamily: 'DMSans_500Medium',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  // Phase cards
  phaseCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0',
    padding: 20, marginBottom: 14,
  },
  phaseCardMuted: { opacity: 0.45 },
  phaseCardCurrent: { borderColor: '#E8D9B5', backgroundColor: '#FFFBF3' },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  phaseIconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FAF6F0',
    borderWidth: 1, borderColor: '#EDE8E0',
    justifyContent: 'center', alignItems: 'center',
  },
  phaseIconBoxCurrent: { backgroundColor: '#FFF8EC', borderColor: '#E8D9B5' },
  phaseTitleWrap: { flex: 1, gap: 2 },
  phaseTitle: {
    fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2,
  },
  phaseTitleMuted: { color: '#B8ADA4' },
  phaseSubtitle: {
    fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2,
  },

  // Tools within a phase card
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolCard: {
    width: (width - 48 - 40 - 20) / 3, alignItems: 'center', gap: 6, paddingVertical: 10,
  },
  toolCardMuted: { opacity: 0.4 },
  toolIconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF8EC',
    borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center',
  },
  toolLabel: {
    fontSize: 11, color: '#2C2420', fontFamily: 'DMSans_400Regular',
    letterSpacing: 0.2, textAlign: 'center',
  },
  platinumBadge: {
    backgroundColor: '#FFF8EC', borderRadius: 50, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#E8D9B5',
  },
  platinumText: { fontSize: 8, color: '#C9A84C', fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 },
  comingSoonText: {
    fontSize: 9, color: '#C4B8AC', fontFamily: 'DMSans_300Light', fontStyle: 'italic',
  },
  comingSoonWrap: { paddingVertical: 8, alignItems: 'center' },
  comingSoonLabel: {
    fontSize: 11, color: '#C4B8AC', fontFamily: 'DMSans_300Light', fontStyle: 'italic', letterSpacing: 0.3,
  },

  // Quick access grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: {
    width: (width - 48 - 12) / 2, backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EDE8E0', padding: 20, alignItems: 'center', gap: 10,
  },
  quickIconBox: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF8EC',
    borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center',
  },
  quickLabel: {
    fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular', letterSpacing: 0.2,
  },
});
'''

with open('app/bts-planner.tsx', 'w') as f:
    f.write(planner_shell)

print("✓ app/bts-planner.tsx — rewritten as Journey View shell")

# ══════════════════════════════════════════════════════════════════════════════
# TOOL COMPONENTS
# ══════════════════════════════════════════════════════════════════════════════

# ── Budget Tool ───────────────────────────────────────────────────────────────

budget_tool = r'''import { useState, useEffect } from 'react';
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
'''

with open('components/planner/BudgetTool.tsx', 'w') as f:
    f.write(budget_tool)

print("✓ components/planner/BudgetTool.tsx — donut hero, category cards, gold progress bars")

# ── Guests Tool ───────────────────────────────────────────────────────────────

guests_tool = r'''import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { getGuests, addGuest } from '../../services/api';

const GROUPS = ['Family', 'Friends', 'Work', 'Plus Ones', 'Other'];
const RSVP_COLORS: Record<string, string> = { confirmed: '#4CAF50', declined: '#E57373', pending: '#C9A84C' };

interface Props { userId: string; onBack: () => void; }

export default function GuestsTool({ userId, onBack }: Props) {
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('Family');
  const [newDietary, setNewDietary] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadGuests(); }, []);

  const loadGuests = async () => {
    try {
      setLoading(true);
      const r = await getGuests(userId);
      if (r.success) setGuests(r.data || []);
    } catch (e) { setGuests([]); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      setSaving(true);
      const r = await addGuest({ user_id: userId, name: newName.trim(), group: newGroup, dietary: newDietary.trim() || 'Not specified', rsvp: 'pending' });
      if (r.success) { setGuests(prev => [...prev, r.data]); setNewName(''); setNewDietary(''); setShowAdd(false); }
    } catch (e) { Alert.alert('Error', 'Could not add guest.'); }
    finally { setSaving(false); }
  };

  const groupCounts = GROUPS.map(g => ({
    group: g,
    total: guests.filter(gu => (gu.group || 'Other') === g).length,
    confirmed: guests.filter(gu => (gu.group || 'Other') === g && gu.rsvp === 'confirmed').length,
  }));

  const totalGuests = guests.length;
  const totalConfirmed = guests.filter(g => g.rsvp === 'confirmed').length;
  const filteredGuests = activeGroup ? guests.filter(g => (g.group || 'Other') === activeGroup) : guests;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#2C2420" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Guest List</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.backBtn}>
          <Feather name="plus" size={18} color="#C9A84C" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* Summary */}
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryNum}>{totalGuests}</Text>
            <Text style={s.summaryLabel}>Total</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: '#4CAF50' }]}>{totalConfirmed}</Text>
            <Text style={s.summaryLabel}>Confirmed</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: '#C9A84C' }]}>{totalGuests - totalConfirmed}</Text>
            <Text style={s.summaryLabel}>Pending</Text>
          </View>
        </View>

        {/* Group tiles */}
        <View style={s.groupGrid}>
          {groupCounts.map((gc) => (
            <TouchableOpacity
              key={gc.group}
              style={[s.groupTile, activeGroup === gc.group && s.groupTileActive]}
              onPress={() => setActiveGroup(activeGroup === gc.group ? null : gc.group)}
            >
              <Text style={s.groupName}>{gc.group}</Text>
              <Text style={s.groupCount}>{gc.total}</Text>
              {gc.total > 0 && (
                <View style={s.rsvpRing}>
                  <View style={[s.rsvpFill, { width: `${gc.total > 0 ? (gc.confirmed / gc.total) * 100 : 0}%` }]} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Guest cards */}
        {filteredGuests.map((g) => (
          <View key={g.id || g.name} style={s.guestCard}>
            <View style={s.guestAvatar}>
              <Text style={s.guestInitial}>{g.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={s.guestInfo}>
              <Text style={s.guestName}>{g.name}</Text>
              <Text style={s.guestMeta}>{g.group || 'Other'}{g.dietary && g.dietary !== 'Not specified' ? ` · ${g.dietary}` : ''}</Text>
            </View>
            <View style={[s.rsvpBadge, { backgroundColor: (RSVP_COLORS[g.rsvp] || '#C9A84C') + '18' }]}>
              <Text style={[s.rsvpText, { color: RSVP_COLORS[g.rsvp] || '#C9A84C' }]}>{g.rsvp || 'pending'}</Text>
            </View>
          </View>
        ))}

        {filteredGuests.length === 0 && (
          <View style={s.emptyWrap}>
            <Feather name="users" size={28} color="#E8D9B5" />
            <Text style={s.emptyText}>{loading ? 'Loading guests...' : 'No guests yet'}</Text>
            {!loading && <Text style={s.emptyHint}>Tap + to add your first guest</Text>}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Guest Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Guest</Text>
            <TextInput style={s.modalInput} placeholder="Full name" placeholderTextColor="#C4B8AC" value={newName} onChangeText={setNewName} />
            <View style={s.groupPills}>
              {GROUPS.map(g => (
                <TouchableOpacity key={g} style={[s.groupPill, newGroup === g && s.groupPillActive]} onPress={() => setNewGroup(g)}>
                  <Text style={[s.groupPillText, newGroup === g && s.groupPillTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.modalInput} placeholder="Dietary preference (optional)" placeholderTextColor="#C4B8AC" value={newDietary} onChangeText={setNewDietary} />
            <TouchableOpacity style={[s.modalBtn, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
              <Text style={s.modalBtnText}>{saving ? 'Adding...' : 'Add Guest'}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', padding: 20, marginBottom: 16 },
  summaryItem: { alignItems: 'center', gap: 2 },
  summaryNum: { fontSize: 22, color: '#2C2420', fontFamily: 'PlayfairDisplay_600SemiBold' },
  summaryLabel: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.5 },

  groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  groupTile: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E0', padding: 14, width: '48%' as any, gap: 6 },
  groupTileActive: { borderColor: '#C9A84C', backgroundColor: '#FFFBF3' },
  groupName: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  groupCount: { fontSize: 20, color: '#C9A84C', fontFamily: 'PlayfairDisplay_600SemiBold' },
  rsvpRing: { height: 3, backgroundColor: '#EDE8E0', borderRadius: 2 },
  rsvpFill: { height: 3, backgroundColor: '#4CAF50', borderRadius: 2 },

  guestCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E0', padding: 14, marginBottom: 8 },
  guestAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  guestInitial: { fontSize: 14, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  guestInfo: { flex: 1, gap: 2 },
  guestName: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  guestMeta: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  rsvpBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  rsvpText: { fontSize: 10, fontFamily: 'DMSans_500Medium', letterSpacing: 0.5, textTransform: 'uppercase' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  emptyHint: { fontSize: 12, color: '#C4B8AC', fontFamily: 'DMSans_300Light' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', marginBottom: 4 },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  groupPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupPill: { borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#EDE8E0', backgroundColor: '#FFFFFF' },
  groupPillActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  groupPillText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  groupPillTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});
'''

with open('components/planner/GuestsTool.tsx', 'w') as f:
    f.write(guests_tool)

print("✓ components/planner/GuestsTool.tsx — group tiles with RSVP rings, guest cards")

# ── Checklist Tool ────────────────────────────────────────────────────────────

checklist_tool = r'''import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const DEFAULT_TASKS = [
  { id: '1', text: 'Book venue', done: false, phase: 'This month' },
  { id: '2', text: 'Finalise photographer', done: false, phase: 'This month' },
  { id: '3', text: 'Book makeup artist for trial', done: false, phase: 'Next two weeks' },
  { id: '4', text: 'Send save the dates', done: false, phase: 'This week' },
  { id: '5', text: 'Confirm choreographer', done: false, phase: 'This month' },
  { id: '6', text: 'Finalise bridal outfit', done: false, phase: 'Next two weeks' },
];

interface Props { userId: string; onBack: () => void; }

export default function ChecklistTool({ userId, onBack }: Props) {
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState('');

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try {
      const s = await AsyncStorage.getItem(`checklist_${userId}`);
      if (s) setTasks(JSON.parse(s));
    } catch (e) {}
  };

  const save = async (t: any[]) => {
    setTasks(t);
    try { await AsyncStorage.setItem(`checklist_${userId}`, JSON.stringify(t)); } catch (e) {}
  };

  const toggle = (id: string) => save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) => save(tasks.filter(t => t.id !== id));
  const add = () => {
    if (!newTask.trim()) return;
    save([...tasks, { id: Date.now().toString(), text: newTask.trim(), done: false, phase: 'This week' }]);
    setNewTask(''); setShowAdd(false);
  };

  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const groups = ['This week', 'Next two weeks', 'This month'];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#2C2420" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Checklist</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.backBtn}>
          <Feather name="plus" size={18} color="#C9A84C" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Progress */}
        <View style={s.progressCard}>
          <Text style={s.progressNum}>{done.length}/{tasks.length}</Text>
          <Text style={s.progressLabel}>tasks completed</Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${tasks.length > 0 ? (done.length / tasks.length) * 100 : 0}%` }]} />
          </View>
        </View>

        {groups.map(group => {
          const groupTasks = pending.filter(t => t.phase === group);
          if (groupTasks.length === 0) return null;
          return (
            <View key={group}>
              <Text style={s.groupLabel}>{group}</Text>
              {groupTasks.map(t => (
                <TouchableOpacity key={t.id} style={s.taskCard} onPress={() => toggle(t.id)} activeOpacity={0.8}>
                  <View style={s.checkbox}>
                    {t.done && <Feather name="check" size={12} color="#C9A84C" />}
                  </View>
                  <Text style={s.taskText}>{t.text}</Text>
                  <TouchableOpacity onPress={() => remove(t.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="x" size={14} color="#C4B8AC" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {done.length > 0 && (
          <View>
            <Text style={s.groupLabel}>Done</Text>
            {done.map(t => (
              <View key={t.id} style={[s.taskCard, { opacity: 0.4 }]}>
                <View style={[s.checkbox, s.checkboxDone]}>
                  <Feather name="check" size={12} color="#C9A84C" />
                </View>
                <Text style={[s.taskText, { textDecorationLine: 'line-through' }]}>{t.text}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Task</Text>
            <TextInput style={s.modalInput} placeholder="What needs to be done?" placeholderTextColor="#C4B8AC" value={newTask} onChangeText={setNewTask} />
            <TouchableOpacity style={s.modalBtn} onPress={add}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  progressCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', padding: 20, marginBottom: 20, alignItems: 'center', gap: 6 },
  progressNum: { fontSize: 28, color: '#C9A84C', fontFamily: 'PlayfairDisplay_600SemiBold' },
  progressLabel: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  progressTrack: { height: 3, backgroundColor: '#EDE8E0', borderRadius: 2, width: '100%', marginTop: 8 },
  progressFill: { height: 3, backgroundColor: '#C9A84C', borderRadius: 2 },

  groupLabel: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 16 },

  taskCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E0', padding: 14, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#E8D9B5', justifyContent: 'center', alignItems: 'center' },
  checkboxDone: { backgroundColor: '#FFF8EC' },
  taskText: { flex: 1, fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});
'''

with open('components/planner/ChecklistTool.tsx', 'w') as f:
    f.write(checklist_tool)

print("✓ components/planner/ChecklistTool.tsx — phase-grouped tasks, 40% opacity done section")

# ── Decision Log Tool ─────────────────────────────────────────────────────────

decision_log = r'''import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

interface Decision {
  id: string;
  heading: string;
  context: string;
  people: string[];
  date: string;
  category: string;
}

interface Props { userId: string; session: any; onBack: () => void; }

export default function DecisionLogTool({ userId, session, onBack }: Props) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [heading, setHeading] = useState('');
  const [context, setContext] = useState('');
  const [people, setPeople] = useState('');
  const [category, setCategory] = useState('General');

  const CATEGORIES = ['Venue', 'Outfits', 'Photography', 'Decor', 'Food', 'Music', 'General'];

  useEffect(() => { loadDecisions(); }, []);

  const loadDecisions = async () => {
    try {
      const s = await AsyncStorage.getItem(`decisions_${userId}`);
      if (s) setDecisions(JSON.parse(s));
    } catch (e) {}
  };

  const save = async (d: Decision[]) => {
    setDecisions(d);
    try { await AsyncStorage.setItem(`decisions_${userId}`, JSON.stringify(d)); } catch (e) {}
  };

  const add = () => {
    if (!heading.trim()) return;
    const coupleName = session?.name?.split(' ')[0] || 'You';
    const newD: Decision = {
      id: Date.now().toString(),
      heading: heading.trim(),
      context: context.trim(),
      people: people.trim() ? people.split(',').map((p: string) => p.trim()) : [coupleName],
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      category,
    };
    save([newD, ...decisions]);
    setHeading(''); setContext(''); setPeople(''); setCategory('General');
    setShowAdd(false);
  };

  const remove = (id: string) => save(decisions.filter(d => d.id !== id));

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#2C2420" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Decision Log</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.backBtn}>
          <Feather name="plus" size={18} color="#C9A84C" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {decisions.length === 0 ? (
          <View style={s.emptyWrap}>
            <Feather name="book-open" size={32} color="#E8D9B5" />
            <Text style={s.emptyTitle}>Your decision diary</Text>
            <Text style={s.emptyHint}>Record every wedding decision so you never lose context. Who decided what, when, and why.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAdd(true)}>
              <Text style={s.emptyBtnText}>Add first decision</Text>
            </TouchableOpacity>
          </View>
        ) : (
          decisions.map((d) => (
            <View key={d.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardDate}>{d.date}</Text>
                <View style={s.catBadge}>
                  <Text style={s.catBadgeText}>{d.category}</Text>
                </View>
              </View>
              <Text style={s.cardHeading}>{d.heading}</Text>
              {d.context ? <Text style={s.cardContext}>{d.context}</Text> : null}
              <View style={s.peoplePills}>
                {d.people.map((p, i) => (
                  <View key={i} style={s.personPill}>
                    <Text style={s.personText}>{p}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity onPress={() => remove(d.id)} style={s.removeBtn}>
                <Feather name="trash-2" size={12} color="#C4B8AC" />
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Record a Decision</Text>
            <TextInput style={s.modalInput} placeholder="What was decided?" placeholderTextColor="#C4B8AC" value={heading} onChangeText={setHeading} />
            <TextInput style={[s.modalInput, { height: 60 }]} placeholder="Why? Any context..." placeholderTextColor="#C4B8AC" value={context} onChangeText={setContext} multiline />
            <TextInput style={s.modalInput} placeholder="Who was involved? (comma separated)" placeholderTextColor="#C4B8AC" value={people} onChangeText={setPeople} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.catPills}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[s.catPill, category === c && s.catPillActive]} onPress={() => setCategory(c)}>
                    <Text style={[s.catPillText, category === c && s.catPillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={s.modalBtn} onPress={add}>
              <Text style={s.modalBtnText}>Save Decision</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptyHint: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  emptyBtn: { marginTop: 12, borderWidth: 1, borderColor: '#E8D9B5', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#FFF8EC' },
  emptyBtnText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', padding: 20, marginBottom: 12, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 11, color: '#C4B8AC', fontFamily: 'DMSans_300Light', letterSpacing: 0.3 },
  catBadge: { backgroundColor: '#FFF8EC', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#E8D9B5' },
  catBadgeText: { fontSize: 9, color: '#C9A84C', fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 },
  cardHeading: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  cardContext: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 19 },
  peoplePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  personPill: { backgroundColor: '#FAF6F0', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#EDE8E0' },
  personText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  removeBtn: { position: 'absolute', top: 16, right: 16 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  catPills: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catPill: { borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#EDE8E0' },
  catPillActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  catPillText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  catPillTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});
'''

with open('components/planner/DecisionLogTool.tsx', 'w') as f:
    f.write(decision_log)

print("✓ components/planner/DecisionLogTool.tsx — diary-style cards, category badges, people pills")

# ── My Vendors Tool ───────────────────────────────────────────────────────────

my_vendors = r'''import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Linking, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { VENDOR_CATEGORIES, getVendorInviteMessage } from '../../constants/journeyConfig';

interface ExternalVendor {
  id: string;
  name: string;
  phone: string;
  category: string;
  notes: string;
  addedAt: string;
}

interface Props { userId: string; session: any; onBack: () => void; }

export default function MyVendorsTool({ userId, session, onBack }: Props) {
  const [filter, setFilter] = useState<'all' | 'tdw' | 'external'>('all');
  const [externalVendors, setExternalVendors] = useState<ExternalVendor[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Photographer');
  const [notes, setNotes] = useState('');

  useEffect(() => { loadExternal(); }, []);

  const loadExternal = async () => {
    try {
      const s = await AsyncStorage.getItem(`ext_vendors_${userId}`);
      if (s) setExternalVendors(JSON.parse(s));
    } catch (e) {}
  };

  const save = async (v: ExternalVendor[]) => {
    setExternalVendors(v);
    try { await AsyncStorage.setItem(`ext_vendors_${userId}`, JSON.stringify(v)); } catch (e) {}
  };

  const addVendor = () => {
    if (!name.trim() || !phone.trim()) { Alert.alert('Missing info', 'Please enter vendor name and phone.'); return; }
    const v: ExternalVendor = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim().replace(/\s/g, ''),
      category,
      notes: notes.trim(),
      addedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    };
    save([v, ...externalVendors]);
    setName(''); setPhone(''); setNotes(''); setShowAdd(false);
  };

  const removeVendor = (id: string) => {
    Alert.alert('Remove Vendor', 'Remove this vendor from your list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => save(externalVendors.filter(v => v.id !== id)) },
    ]);
  };

  const inviteVendor = (v: ExternalVendor) => {
    const coupleName = session?.name?.split(' ')[0] || 'We';
    const msg = getVendorInviteMessage(v.name, coupleName);
    const cleaned = v.phone.replace(/[^0-9]/g, '');
    const num = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    Linking.openURL(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`);
  };

  const callVendor = (phone: string) => Linking.openURL(`tel:${phone}`);
  const whatsappVendor = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    const num = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    Linking.openURL(`https://wa.me/${num}`);
  };

  // TDW vendors placeholder — will come from Supabase bookings
  const tdwVendors: any[] = [];

  const showTdw = filter === 'all' || filter === 'tdw';
  const showExt = filter === 'all' || filter === 'external';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#2C2420" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Vendors</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.backBtn}>
          <Feather name="plus" size={18} color="#C9A84C" />
        </TouchableOpacity>
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {(['all', 'tdw', 'external'] as const).map(f => (
          <TouchableOpacity key={f} style={[s.filterPill, filter === f && s.filterPillActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'tdw' ? 'On TDW' : 'My Own'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* TDW vendors */}
        {showTdw && tdwVendors.length > 0 && tdwVendors.map((v: any) => (
          <View key={v.id} style={s.vendorCard}>
            <Text style={s.vendorName}>{v.name}</Text>
          </View>
        ))}

        {showTdw && tdwVendors.length === 0 && filter === 'tdw' && (
          <View style={s.emptyWrap}>
            <Feather name="search" size={24} color="#E8D9B5" />
            <Text style={s.emptyText}>No TDW vendors booked yet</Text>
            <Text style={s.emptyHint}>Discover and book vendors from the Discover tab</Text>
          </View>
        )}

        {/* External vendors */}
        {showExt && externalVendors.map((v) => (
          <View key={v.id} style={s.vendorCard}>
            <View style={s.vendorTop}>
              <View style={s.vendorAvatar}>
                <Text style={s.vendorInitial}>{v.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={s.vendorInfo}>
                <Text style={s.vendorName}>{v.name}</Text>
                <Text style={s.vendorMeta}>{v.category} · Added {v.addedAt}</Text>
              </View>
              <View style={s.notOnTdw}>
                <Text style={s.notOnTdwText}>Not on TDW</Text>
              </View>
            </View>
            {v.notes ? <Text style={s.vendorNotes}>{v.notes}</Text> : null}
            <View style={s.vendorActions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => callVendor(v.phone)}>
                <Feather name="phone" size={14} color="#8C7B6E" />
                <Text style={s.actionText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => whatsappVendor(v.phone)}>
                <Feather name="message-circle" size={14} color="#25D366" />
                <Text style={[s.actionText, { color: '#25D366' }]}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.inviteBtn]} onPress={() => inviteVendor(v)}>
                <Feather name="send" size={12} color="#C9A84C" />
                <Text style={s.inviteText}>Invite to TDW</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeVendor(v.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="trash-2" size={14} color="#E57373" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {showExt && externalVendors.length === 0 && filter !== 'tdw' && (
          <View style={s.emptyWrap}>
            <Feather name="briefcase" size={28} color="#E8D9B5" />
            <Text style={s.emptyText}>Add vendors not on TDW</Text>
            <Text style={s.emptyHint}>Keep all your vendors — TDW or not — in one place. Tap + to add.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add vendor modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add External Vendor</Text>
            <TextInput style={s.modalInput} placeholder="Vendor name" placeholderTextColor="#C4B8AC" value={name} onChangeText={setName} />
            <TextInput style={s.modalInput} placeholder="Phone number" placeholderTextColor="#C4B8AC" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.catPills}>
                {VENDOR_CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[s.catPill, category === c && s.catPillActive]} onPress={() => setCategory(c)}>
                    <Text style={[s.catPillText, category === c && s.catPillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TextInput style={s.modalInput} placeholder="Notes (optional)" placeholderTextColor="#C4B8AC" value={notes} onChangeText={setNotes} />
            <TouchableOpacity style={s.modalBtn} onPress={addVendor}>
              <Text style={s.modalBtnText}>Add Vendor</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  filterPill: { borderRadius: 50, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1, borderColor: '#EDE8E0', backgroundColor: '#FFFFFF' },
  filterPillActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  filterText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  filterTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  vendorCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE8E0', padding: 16, marginBottom: 10, gap: 10 },
  vendorTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vendorAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  vendorInitial: { fontSize: 16, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  vendorInfo: { flex: 1, gap: 2 },
  vendorName: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  vendorMeta: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  notOnTdw: { backgroundColor: '#FAF6F0', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#EDE8E0' },
  notOnTdwText: { fontSize: 9, color: '#C4B8AC', fontFamily: 'DMSans_400Regular' },
  vendorNotes: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', fontStyle: 'italic' },

  vendorActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#EDE8E0', backgroundColor: '#FFFFFF' },
  actionText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  inviteBtn: { borderColor: '#E8D9B5', backgroundColor: '#FFF8EC' },
  inviteText: { fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptyHint: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', maxWidth: 250 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  catPills: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catPill: { borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#EDE8E0' },
  catPillActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  catPillText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  catPillTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});
'''

with open('components/planner/MyVendorsTool.tsx', 'w') as f:
    f.write(my_vendors)

print("✓ components/planner/MyVendorsTool.tsx — TDW + external combined, WhatsApp invite, DPDP-safe")

# ── Payments Tool (shell) ────────────────────────────────────────────────────

payments_tool = r'''import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props { userId: string; onBack: () => void; }

export default function PaymentsTool({ userId, onBack }: Props) {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#2C2420" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Payments</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.emptyWrap}>
          <Feather name="credit-card" size={28} color="#E8D9B5" />
          <Text style={s.emptyTitle}>Payment Shield</Text>
          <Text style={s.emptyHint}>Track vendor payments, instalments, and receipts. Connects with your booked vendors automatically.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  scrollContent: { paddingHorizontal: 24 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptyHint: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
});
'''

with open('components/planner/PaymentsTool.tsx', 'w') as f:
    f.write(payments_tool)

print("✓ components/planner/PaymentsTool.tsx — shell with empty state")

# ── Registry Tool (shell) ────────────────────────────────────────────────────

registry_tool = r'''import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

interface Props { userId: string; onBack: () => void; }

export default function RegistryTool({ userId, onBack }: Props) {
  const [registry, setRegistry] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [giftName, setGiftName] = useState('');
  const [giftPrice, setGiftPrice] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const s = await AsyncStorage.getItem(`registry_${userId}`); if (s) setRegistry(JSON.parse(s)); } catch (e) {}
  };

  const save = async (r: any[]) => {
    setRegistry(r);
    try { await AsyncStorage.setItem(`registry_${userId}`, JSON.stringify(r)); } catch (e) {}
  };

  const add = () => {
    if (!giftName.trim()) return;
    save([...registry, { id: Date.now().toString(), name: giftName.trim(), price: giftPrice.trim(), claimed: false }]);
    setGiftName(''); setGiftPrice(''); setShowAdd(false);
  };

  const claim = (id: string) => save(registry.map(g => g.id === id ? { ...g, claimed: true } : g));

  const shareRegistry = () => {
    const list = registry.filter(g => !g.claimed).map(g => `• ${g.name}${g.price ? ` (Rs.${g.price})` : ''}`).join('\n');
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(`Our Wedding Gift Registry\n\n${list}\n\nWith love`)}`);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Feather name="arrow-left" size={18} color="#2C2420" /></TouchableOpacity>
        <Text style={s.headerTitle}>Registry</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.backBtn}><Feather name="plus" size={18} color="#C9A84C" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.scrollContent}>
        {registry.length > 0 && (
          <TouchableOpacity style={s.shareBtn} onPress={shareRegistry}>
            <Feather name="share" size={14} color="#C9A84C" />
            <Text style={s.shareBtnText}>Share Registry via WhatsApp</Text>
          </TouchableOpacity>
        )}
        {registry.map(g => (
          <View key={g.id} style={[s.giftCard, g.claimed && { opacity: 0.4 }]}>
            <View style={s.giftInfo}>
              <Text style={s.giftName}>{g.name}</Text>
              {g.price ? <Text style={s.giftPrice}>Rs.{g.price}</Text> : null}
            </View>
            {!g.claimed && (
              <TouchableOpacity onPress={() => claim(g.id)} style={s.claimBtn}>
                <Text style={s.claimText}>Mark Claimed</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {registry.length === 0 && (
          <View style={s.emptyWrap}>
            <Feather name="gift" size={28} color="#E8D9B5" />
            <Text style={s.emptyText}>Your gift registry</Text>
            <Text style={s.emptyHint}>Add gifts you'd love to receive and share the list with family</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Gift</Text>
            <TextInput style={s.modalInput} placeholder="Gift name" placeholderTextColor="#C4B8AC" value={giftName} onChangeText={setGiftName} />
            <TextInput style={s.modalInput} placeholder="Price (optional)" placeholderTextColor="#C4B8AC" value={giftPrice} onChangeText={setGiftPrice} keyboardType="number-pad" />
            <TouchableOpacity style={s.modalBtn} onPress={add}><Text style={s.modalBtnText}>Add Gift</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={s.modalCancel}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderColor: '#E8D9B5', borderRadius: 12, backgroundColor: '#FFF8EC', marginBottom: 16 },
  shareBtnText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },
  giftCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E0', padding: 16, marginBottom: 8 },
  giftInfo: { flex: 1, gap: 2 },
  giftName: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  giftPrice: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_300Light' },
  claimBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#EDE8E0' },
  claimText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptyHint: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', maxWidth: 240 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});
'''

with open('components/planner/RegistryTool.tsx', 'w') as f:
    f.write(registry_tool)

print("✓ components/planner/RegistryTool.tsx — gift list with WhatsApp share")

# ── Website Tool (shell) ─────────────────────────────────────────────────────

website_tool = r'''import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props { userId: string; session: any; onBack: () => void; }

export default function WebsiteTool({ userId, session, onBack }: Props) {
  const coupleName = session?.name || 'Your';
  const handleSaveTheDate = () => {
    const date = session?.wedding_date
      ? new Date(session.wedding_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'soon';
    const msg = `Save the Date!\n\n${coupleName} is getting married on ${date}.\n\nFormal invitation to follow.\n\nWith love`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Feather name="arrow-left" size={18} color="#2C2420" /></TouchableOpacity>
        <Text style={s.headerTitle}>Wedding Website</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.emptyWrap}>
          <Feather name="globe" size={32} color="#E8D9B5" />
          <Text style={s.emptyTitle}>Coming soon</Text>
          <Text style={s.emptyHint}>A beautiful wedding website to share with guests — RSVP, directions, your story, and more.</Text>
          <TouchableOpacity style={s.stdBtn} onPress={handleSaveTheDate}>
            <Feather name="send" size={14} color="#C9A84C" />
            <Text style={s.stdText}>Send Save the Date via WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  scrollContent: { paddingHorizontal: 24 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptyHint: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  stdBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#E8D9B5', borderRadius: 12, backgroundColor: '#FFF8EC', marginTop: 8 },
  stdText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },
});
'''

with open('components/planner/WebsiteTool.tsx', 'w') as f:
    f.write(website_tool)

print("✓ components/planner/WebsiteTool.tsx — shell with Save the Date WhatsApp")

# ── DreamAi Tool (shell) ─────────────────────────────────────────────────────

dreamai_tool = r'''import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props { userId: string; session: any; onBack: () => void; }

export default function DreamAiTool({ userId, session, onBack }: Props) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hello! I\'m DreamAi, your wedding planning companion. Ask me anything about your wedding — vendors, timelines, ideas, or logistics.' },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input.trim() }]);
    setInput('');
    // AI response placeholder
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: 'DreamAi is getting ready. Full AI responses coming with the next update — powered by the same intelligence as TDW-Ai on WhatsApp.' }]);
    }, 800);
  };

  const SUGGESTIONS = ['Help me plan the sangeet', 'What vendors do I still need?', 'Create a day-of timeline'];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Feather name="arrow-left" size={18} color="#2C2420" /></TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>DreamAi</Text>
          <Text style={s.headerSub}>Your wedding companion</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.chat} contentContainerStyle={s.chatContent}>
        {messages.map((m, i) => (
          <View key={i} style={[s.bubble, m.role === 'user' ? s.userBubble : s.aiBubble]}>
            <Text style={[s.bubbleText, m.role === 'user' ? s.userText : s.aiText]}>{m.text}</Text>
          </View>
        ))}

        {messages.length <= 1 && (
          <View style={s.suggestWrap}>
            {SUGGESTIONS.map(sg => (
              <TouchableOpacity key={sg} style={s.suggestPill} onPress={() => { setInput(sg); }}>
                <Text style={s.suggestText}>{sg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Ask DreamAi anything..."
          placeholderTextColor="#C4B8AC"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
        />
        <TouchableOpacity style={s.sendBtn} onPress={send}>
          <Feather name="send" size={16} color="#C9A84C" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  headerSub: { fontSize: 10, color: '#C9A84C', fontFamily: 'DMSans_300Light', letterSpacing: 0.5 },

  chat: { flex: 1 },
  chatContent: { paddingHorizontal: 24, paddingBottom: 20 },

  bubble: { maxWidth: '80%', borderRadius: 16, padding: 14, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  aiText: { color: '#2C2420', fontFamily: 'DMSans_300Light' },

  suggestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  suggestPill: { borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E8D9B5', backgroundColor: '#FFF8EC' },
  suggestText: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EDE8E0', backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', paddingVertical: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5', justifyContent: 'center', alignItems: 'center' },
});
'''

with open('components/planner/DreamAiTool.tsx', 'w') as f:
    f.write(dreamai_tool)

print("✓ components/planner/DreamAiTool.tsx — chat UI shell, suggestion pills, cream aesthetic")

print()
print("═" * 60)
print("PATCH 4 COMPLETE")
print("═" * 60)
print()
print("Files created/modified:")
print("  ✓ app/bts-planner.tsx — Journey View shell (rewritten)")
print("  ✓ constants/journeyConfig.ts — phases + tiers (from Patch 3)")
print("  ✓ components/planner/BudgetTool.tsx")
print("  ✓ components/planner/GuestsTool.tsx")
print("  ✓ components/planner/ChecklistTool.tsx")
print("  ✓ components/planner/DecisionLogTool.tsx")
print("  ✓ components/planner/MyVendorsTool.tsx")
print("  ✓ components/planner/PaymentsTool.tsx")
print("  ✓ components/planner/RegistryTool.tsx")
print("  ✓ components/planner/WebsiteTool.tsx")
print("  ✓ components/planner/DreamAiTool.tsx")
print()
print("Run: npx tsc --noEmit -p tsconfig.json")
print("Then test the Planner tab — should show Journey View with phase cards")

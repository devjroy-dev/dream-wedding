import { useState, useEffect, useRef } from 'react';
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

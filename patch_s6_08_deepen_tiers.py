"""
Session 6 — Patch 8: Deepen Tier Personalization
1. journeyConfig.ts — add per-phase subtitle variants by budget tier
2. bts-planner.tsx — read couple sub tier, gate Platinum tools, show upgrade modal, tier-aware phase copy
3. home.tsx — budget-tier-aware category ordering on Discover
"""

# ══════════════════════════════════════════════════════════════════════════════
# 1. UPDATE journeyConfig.ts — add tier-aware phase subtitles
# ══════════════════════════════════════════════════════════════════════════════

with open('constants/journeyConfig.ts', 'r') as f:
    content = f.read()

# Add phase subtitle variants to TierContent interface and data
old_tier_interface = """interface TierContent {
  greeting: string;
  budgetDefaults: { category: string; amount: number; icon: string }[];
}"""

new_tier_interface = """interface TierContent {
  greeting: string;
  phaseSubtitles: Record<string, string>;
  budgetDefaults: { category: string; amount: number; icon: string }[];
}"""

assert old_tier_interface in content, "ERROR: Could not find TierContent interface"
content = content.replace(old_tier_interface, new_tier_interface)

# Add phaseSubtitles to essential tier
old_essential = """  essential: {
    greeting: 'Every detail matters, and it will be beautiful.',"""

new_essential = """  essential: {
    greeting: 'Every detail matters, and it will be beautiful.',
    phaseSubtitles: {
      foundation: 'Set a realistic budget and start smart',
      search: 'Find vendors who deliver magic within your range',
      team: 'Every rupee counts — choose wisely',
      coordination: 'Streamline everything, waste nothing',
      final: 'You\\'ve planned beautifully — now enjoy it',
      wedding_week: 'This is your moment',
    },"""

assert old_essential in content, "ERROR: Could not find essential tier"
content = content.replace(old_essential, new_essential)

# Add phaseSubtitles to signature tier
old_signature = """  signature: {
    greeting: 'Balance quality across every moment.',"""

new_signature = """  signature: {
    greeting: 'Balance quality across every moment.',
    phaseSubtitles: {
      foundation: 'The essentials that shape everything',
      search: 'Discover vendors who bring your vision to life',
      team: 'Assemble the people who make the dream real',
      coordination: 'Every detail, beautifully managed',
      final: 'Almost there — make it perfect',
      wedding_week: 'This is your moment',
    },"""

assert old_signature in content, "ERROR: Could not find signature tier"
content = content.replace(old_signature, new_signature)

# Add phaseSubtitles to luxe tier
old_luxe = """  luxe: {
    greeting: 'This will be remarkable.',"""

new_luxe = """  luxe: {
    greeting: 'This will be remarkable.',
    phaseSubtitles: {
      foundation: 'Architect an extraordinary celebration',
      search: 'Curate India\\'s finest for your vision',
      team: 'Orchestrate with precision and taste',
      coordination: 'Every element, flawlessly composed',
      final: 'Perfection is in the details',
      wedding_week: 'Your legacy begins',
    },"""

assert old_luxe in content, "ERROR: Could not find luxe tier"
content = content.replace(old_luxe, new_luxe)

with open('constants/journeyConfig.ts', 'w') as f:
    f.write(content)

print("✓ journeyConfig.ts — added per-phase subtitle variants for all 3 budget tiers")

# ══════════════════════════════════════════════════════════════════════════════
# 2. UPDATE bts-planner.tsx — couple sub tier, Platinum gating, tier-aware copy
# ══════════════════════════════════════════════════════════════════════════════

with open('app/bts-planner.tsx', 'r') as f:
    content = f.read()

# Add couple subscription tier state + imports
old_imports = """import {
  JOURNEY_PHASES, QUICK_ACCESS_TOOLS, PROGRESS_LABELS,
  getCurrentPhase, getProgressIndex, getBudgetTier,
  type BudgetTier, type PhaseId,
} from '../constants/journeyConfig';"""

new_imports = """import {
  JOURNEY_PHASES, QUICK_ACCESS_TOOLS, PROGRESS_LABELS,
  getCurrentPhase, getProgressIndex, getBudgetTier, TIER_CONTENT,
  type BudgetTier, type PhaseId,
} from '../constants/journeyConfig';"""

assert old_imports in content, "ERROR: Could not find imports block"
content = content.replace(old_imports, new_imports)

# Add coupleTier state
old_state = """  const [budgetTier, setBudgetTier] = useState<BudgetTier>('essential');
  const [daysUntil, setDaysUntil] = useState<number | null>(null);"""

new_state = """  const [budgetTier, setBudgetTier] = useState<BudgetTier>('essential');
  const [coupleTier, setCoupleTier] = useState<'free' | 'premium' | 'elite'>('free');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [daysUntil, setDaysUntil] = useState<number | null>(null);"""

assert old_state in content, "ERROR: Could not find state block"
content = content.replace(old_state, new_state)

# Add couple tier loading in loadSession
old_load = """        setBudgetTier(getBudgetTier(budget));"""

new_load = """        setBudgetTier(getBudgetTier(budget));
        // Load couple subscription tier
        const storedTier = await AsyncStorage.getItem('tdw_couple_tier');
        if (storedTier) setCoupleTier(storedTier as any);"""

assert old_load in content, "ERROR: Could not find setBudgetTier in loadSession"
content = content.replace(old_load, new_load)

# Update tool press to gate Platinum tools
old_tool_press = """  const handleToolPress = (route: string) => {
    if (route === 'discover') { router.push('/swipe' as any); return; }
    if (route === 'moodboard') { router.push('/moodboard' as any); return; }
    if (route === 'destination') { router.push('/destination-weddings' as any); return; }
    setActiveTool(route);
  };"""

new_tool_press = """  const handleToolPress = (route: string, isPlatinumOnly?: boolean) => {
    if (route === 'discover') { router.push('/swipe' as any); return; }
    if (route === 'moodboard') { router.push('/moodboard' as any); return; }
    if (route === 'destination') { router.push('/destination-weddings' as any); return; }
    // Gate Platinum-only tools
    if (isPlatinumOnly && coupleTier !== 'elite') {
      setShowUpgradeModal(true);
      return;
    }
    setActiveTool(route);
  };"""

assert old_tool_press in content, "ERROR: Could not find handleToolPress"
content = content.replace(old_tool_press, new_tool_press)

# Update tool card onPress to pass platinumOnly flag
old_tool_onpress = """                          onPress={() => !tool.comingSoon && handleToolPress(tool.route)}"""
new_tool_onpress = """                          onPress={() => !tool.comingSoon && handleToolPress(tool.route, tool.platinumOnly)}"""

assert old_tool_onpress in content, "ERROR: Could not find tool onPress"
content = content.replace(old_tool_onpress, new_tool_onpress)

# Update phase subtitle to use tier-aware copy
old_phase_subtitle = """                      <Text style={s.phaseSubtitle}>{phase.subtitle}</Text>"""
new_phase_subtitle = """                      <Text style={s.phaseSubtitle}>{TIER_CONTENT[budgetTier].phaseSubtitles[phase.id] || phase.subtitle}</Text>"""

assert old_phase_subtitle in content, "ERROR: Could not find phaseSubtitle render"
content = content.replace(old_phase_subtitle, new_phase_subtitle)

# Add import for Modal
old_rn_import = """import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Animated, BackHandler,
} from 'react-native';"""

new_rn_import = """import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Animated, BackHandler, Modal,
} from 'react-native';"""

assert old_rn_import in content, "ERROR: Could not find RN imports"
content = content.replace(old_rn_import, new_rn_import)

# Add upgrade modal before closing </View> and <BottomNav />
old_bottomnav = """      <BottomNav />
    </View>
  );
}"""

new_bottomnav = """      {/* Upgrade Modal */}
      <Modal visible={showUpgradeModal} transparent animationType="fade">
        <View style={s.upgradeOverlay}>
          <View style={s.upgradeCard}>
            <View style={s.upgradeIconWrap}>
              <Feather name="zap" size={24} color="#C9A84C" />
            </View>
            <Text style={s.upgradeTitle}>Unlock with Platinum</Text>
            <Text style={s.upgradeBody}>
              DreamAi, Memory Box, and premium planning tools are available with the Platinum plan.
            </Text>
            <View style={s.upgradePriceRow}>
              <Text style={s.upgradePrice}>Rs.2,999</Text>
              <Text style={s.upgradePriceLabel}> one-time</Text>
            </View>
            <TouchableOpacity
              style={s.upgradeBtn}
              onPress={() => {
                setShowUpgradeModal(false);
                router.push('/profile' as any);
              }}
            >
              <Text style={s.upgradeBtnText}>View Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowUpgradeModal(false)} style={s.upgradeCancel}>
              <Text style={s.upgradeCancelText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNav />
    </View>
  );
}"""

assert old_bottomnav in content, "ERROR: Could not find BottomNav closing"
content = content.replace(old_bottomnav, new_bottomnav)

# Add upgrade modal styles before the closing });
old_styles_end = """  quickLabel: {
    fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular', letterSpacing: 0.2,
  },
});"""

new_styles_end = """  quickLabel: {
    fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular', letterSpacing: 0.2,
  },

  // Upgrade modal
  upgradeOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  upgradeCard: {
    backgroundColor: '#FAF6F0', borderRadius: 20, padding: 28, width: '100%',
    maxWidth: 320, alignItems: 'center', gap: 12,
  },
  upgradeIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF8EC',
    borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  upgradeTitle: {
    fontSize: 20, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', textAlign: 'center',
  },
  upgradeBody: {
    fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light',
    textAlign: 'center', lineHeight: 20,
  },
  upgradePriceRow: {
    flexDirection: 'row', alignItems: 'baseline', marginTop: 4,
  },
  upgradePrice: {
    fontSize: 22, color: '#C9A84C', fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  upgradePriceLabel: {
    fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light',
  },
  upgradeBtn: {
    width: '100%', backgroundColor: '#2C2420', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  upgradeBtnText: {
    color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  upgradeCancel: { paddingVertical: 8 },
  upgradeCancelText: {
    fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light',
  },
});"""

assert old_styles_end in content, "ERROR: Could not find styles end"
content = content.replace(old_styles_end, new_styles_end)

with open('app/bts-planner.tsx', 'w') as f:
    f.write(content)

print("✓ bts-planner.tsx — couple tier loaded, Platinum gating with upgrade modal, tier-aware phase copy")

# ══════════════════════════════════════════════════════════════════════════════
# 3. UPDATE home.tsx — budget-tier-aware category ordering
# ══════════════════════════════════════════════════════════════════════════════

with open('app/home.tsx', 'r') as f:
    content = f.read()

# Add tier-aware category reordering logic
old_categories = """const CATEGORIES = [
  { id: 'venues',           label: 'Venues',          icon: 'home'       },
  { id: 'photographers',    label: 'Photographers',   icon: 'camera'     },
  { id: 'mua',              label: 'Makeup Artists',   icon: 'scissors'   },
  { id: 'designers',        label: 'Designers',        icon: 'star'       },
  { id: 'jewellery',        label: 'Jewellery',        icon: 'circle'     },
  { id: 'choreographers',   label: 'Choreographers',  icon: 'music'      },
  { id: 'content-creators', label: 'Content Creators', icon: 'video'      },
  { id: 'dj',               label: 'DJ & Music',       icon: 'headphones' },
  { id: 'event-managers',   label: 'Event Managers',   icon: 'briefcase'  },
  { id: 'bridal-wellness',  label: 'Bridal Wellness',  icon: 'heart'      },
];"""

new_categories = """const ALL_CATEGORIES = [
  { id: 'venues',           label: 'Venues',          icon: 'home'       },
  { id: 'photographers',    label: 'Photographers',   icon: 'camera'     },
  { id: 'mua',              label: 'Makeup Artists',   icon: 'scissors'   },
  { id: 'designers',        label: 'Designers',        icon: 'star'       },
  { id: 'jewellery',        label: 'Jewellery',        icon: 'circle'     },
  { id: 'choreographers',   label: 'Choreographers',  icon: 'music'      },
  { id: 'content-creators', label: 'Content Creators', icon: 'video'      },
  { id: 'dj',               label: 'DJ & Music',       icon: 'headphones' },
  { id: 'event-managers',   label: 'Event Managers',   icon: 'briefcase'  },
  { id: 'bridal-wellness',  label: 'Bridal Wellness',  icon: 'heart'      },
];

// Budget-tier category priority — what matters most at each budget level
const TIER_CATEGORY_ORDER: Record<string, string[]> = {
  essential: ['venues', 'photographers', 'mua', 'designers', 'choreographers', 'dj', 'content-creators', 'jewellery', 'bridal-wellness', 'event-managers'],
  signature: ['venues', 'photographers', 'designers', 'mua', 'event-managers', 'choreographers', 'dj', 'content-creators', 'jewellery', 'bridal-wellness'],
  luxe: ['event-managers', 'venues', 'photographers', 'designers', 'mua', 'choreographers', 'content-creators', 'dj', 'jewellery', 'bridal-wellness'],
};

const getCategoriesForTier = (tier: string) => {
  const order = TIER_CATEGORY_ORDER[tier] || TIER_CATEGORY_ORDER.signature;
  return order.map(id => ALL_CATEGORIES.find(c => c.id === id)!).filter(Boolean);
};"""

assert old_categories in content, "ERROR: Could not find CATEGORIES in home.tsx"
content = content.replace(old_categories, new_categories)

# Add tier state
old_home_state = """  const [tierGreeting, setTierGreeting] = useState('');
  const fadeIn = useRef(new Animated.Value(0)).current;"""

new_home_state = """  const [tierGreeting, setTierGreeting] = useState('');
  const [budgetTierName, setBudgetTierName] = useState('signature');
  const fadeIn = useRef(new Animated.Value(0)).current;"""

assert old_home_state in content, "ERROR: Could not find home state block"
content = content.replace(old_home_state, new_home_state)

# Save tier name in loadSession
old_tier_load = """        if (parsed.budget) {
          const tier = getBudgetTier(parsed.budget);
          setTierGreeting(TIER_CONTENT[tier].greeting);
        }"""

new_tier_load = """        if (parsed.budget) {
          const tier = getBudgetTier(parsed.budget);
          setTierGreeting(TIER_CONTENT[tier].greeting);
          setBudgetTierName(tier);
        }"""

assert old_tier_load in content, "ERROR: Could not find tier load in home.tsx"
content = content.replace(old_tier_load, new_tier_load)

# Update category pills to use tier-ordered categories
old_pills = """          {CATEGORIES.map(cat => ("""
new_pills = """          {getCategoriesForTier(budgetTierName).map(cat => ("""

assert old_pills in content, "ERROR: Could not find CATEGORIES.map in home.tsx"
content = content.replace(old_pills, new_pills)

with open('app/home.tsx', 'w') as f:
    f.write(content)

print("✓ home.tsx — budget-tier-aware category ordering on Discover")

print()
print("PATCH 8 COMPLETE — Tier Personalization Deepened")
print("  Essential: reassuring copy, budget-first category order")
print("  Signature: balanced copy, quality-first order")
print("  Luxe: confident copy, event-manager-first order")
print("  Platinum gating: DreamAi + Memory Box show upgrade modal for Basic/Gold")
print()
print("Run: npx tsc --noEmit -p tsconfig.json")

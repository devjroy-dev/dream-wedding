import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Animated, BackHandler, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import { getBudgetTier, TIER_CONTENT } from '../constants/journeyConfig';

const { width } = Dimensions.get('window');

const ALL_CATEGORIES = [
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
};

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [daysToGo, setDaysToGo] = useState<number | null>(null);
  const [greeting, setGreeting] = useState('Good morning');
  const [tierGreeting, setTierGreeting] = useState('');
  const [budgetTierName, setBudgetTierName] = useState('signature');
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [backPressCount, setBackPressCount] = useState(0);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (backPressCount === 0) {
        setBackPressCount(1);
        Alert.alert('Exit', 'Press back again to exit the app');
        setTimeout(() => setBackPressCount(0), 2000);
        return true;
      }
      BackHandler.exitApp();
      return true;
    });
    return () => backHandler.remove();
  }, [backPressCount]);

  useEffect(() => {
    loadSession();
    setTimeGreeting();
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const setTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  };

  const loadSession = async () => {
    try {
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.name) setUserName(parsed.name.split(' ')[0]);
        if (parsed.wedding_date) {
          const days = Math.ceil(
            (new Date(parsed.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (days > 0) setDaysToGo(days);
        }
        if (parsed.budget) {
          const tier = getBudgetTier(parsed.budget);
          setTierGreeting(TIER_CONTENT[tier].greeting);
          setBudgetTierName(tier);
        }
      }
    } catch (e) {}
  };

  return (
    <View style={s.container}>

      {/* Header */}
      <Animated.View style={[s.header, { opacity: fadeIn }]}>
        <View style={s.headerLeft}>
          <Text style={s.greeting}>
            {greeting}{userName ? `, ${userName}` : ''}
          </Text>
          {daysToGo ? (
            <View style={s.countdownRow}>
              <Text style={s.countdownNumber}>{daysToGo}</Text>
              <Text style={s.countdownLabel}> days to your wedding</Text>
            </View>
          ) : (
            <Text style={s.subGreeting}>Find your dream wedding team</Text>
          )}
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity onPress={() => router.push('/notifications' as any)} style={s.iconBtn}>
            <Feather name="bell" size={16} color="#2C2420" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile' as any)} style={s.avatar}>
            <Text style={s.avatarText}>{userName?.[0]?.toUpperCase() || 'D'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Tier greeting */}
        {tierGreeting ? (
          <View style={s.tierWrap}>
            <View style={s.tierLine} />
            <Text style={s.tierText}>{tierGreeting}</Text>
            <View style={s.tierLine} />
          </View>
        ) : (
          <View style={s.tierWrap}>
            <View style={s.tierLine} />
            <Text style={s.tierText}>Not just happily married. Getting married happily.</Text>
            <View style={s.tierLine} />
          </View>
        )}

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillsContent}
          style={s.pillsScroll}
        >
          {getCategoriesForTier(budgetTierName).map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={s.pill}
              onPress={() => router.push(`/swipe?category=${cat.id}` as any)}
              activeOpacity={0.8}
            >
              <Feather name={cat.icon as any} size={11} color="#C9A84C" />
              <Text style={s.pillText}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Discover hero */}
        <View style={s.actionsSection}>
          <TouchableOpacity style={s.heroCard} onPress={() => router.push('/swipe' as any)} activeOpacity={0.85}>
            <View style={s.heroIconBox}>
              <Feather name="compass" size={20} color="#C9A84C" />
            </View>
            <View style={s.heroTextWrap}>
              <Text style={s.heroTitle}>Discover Vendors</Text>
              <Text style={s.heroSub}>Swipe through India's finest wedding professionals</Text>
            </View>
            <Feather name="arrow-right" size={16} color="#C9A84C" />
          </TouchableOpacity>

          {/* Couture */}
          <TouchableOpacity style={s.secondaryCard} onPress={() => router.push('/luxury-browse' as any)} activeOpacity={0.85}>
            <View style={s.secondaryIconBox}>
              <Feather name="award" size={16} color="#C9A84C" />
            </View>
            <View style={s.secondaryTextWrap}>
              <Text style={s.secondaryTitle}>Couture</Text>
              <Text style={s.secondarySub}>India's most distinguished wedding professionals</Text>
            </View>
            <Feather name="chevron-right" size={14} color="#C9A84C" />
          </TouchableOpacity>

          {/* Destination Weddings */}
          <TouchableOpacity style={s.secondaryCard} onPress={() => router.push('/destination-weddings' as any)} activeOpacity={0.85}>
            <View style={s.secondaryIconBox}>
              <Feather name="map-pin" size={16} color="#C9A84C" />
            </View>
            <View style={s.secondaryTextWrap}>
              <Text style={s.secondaryTitle}>Destination Weddings</Text>
              <Text style={s.secondarySub}>Udaipur, Goa, Jaipur, Mussoorie</Text>
            </View>
            <Feather name="chevron-right" size={14} color="#C9A84C" />
          </TouchableOpacity>
        </View>

        {/* Featured boards */}
        <View style={s.exploreSection}>
          <Text style={s.exploreLabel}>E X P L O R E</Text>
          <View style={s.exploreGrid}>
            {[
              { title: 'Get Inspired', sub: 'Venues, decor, ideas', route: '/get-inspired', icon: 'compass' },
              { title: 'Look Book', sub: 'Designers, MUAs', route: '/look-book', icon: 'book-open' },
              { title: 'Spotlight', sub: 'Top vendors this month', route: '/spotlight', icon: 'award' },
              { title: 'Special Offers', sub: 'Exclusive deals', route: '/special-offers', icon: 'gift' },
            ].map(item => (
              <TouchableOpacity
                key={item.title}
                style={s.exploreCard}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.85}
              >
                <View style={s.exploreIconBox}>
                  <Feather name={item.icon as any} size={15} color="#C9A84C" />
                </View>
                <Text style={s.exploreTitle}>{item.title}</Text>
                <Text style={s.exploreSub}>{item.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', paddingTop: 60 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, marginBottom: 16 },
  headerLeft: { flex: 1, gap: 4 },
  greeting: { fontSize: 26, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3 },
  countdownRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  countdownNumber: { fontSize: 20, color: '#C9A84C', fontFamily: 'PlayfairDisplay_600SemiBold', letterSpacing: 0.5 },
  countdownLabel: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2 },
  subGreeting: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EDE8E0' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#C9A84C', fontSize: 14, fontFamily: 'DMSans_500Medium' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Tier greeting
  tierWrap: { paddingHorizontal: 40, marginBottom: 24, alignItems: 'center', gap: 12 },
  tierLine: { width: 24, height: 1, backgroundColor: '#C9A84C', opacity: 0.35 },
  tierText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'PlayfairDisplay_400Regular', textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },

  // Pills
  pillsScroll: { marginBottom: 24 },
  pillsContent: { paddingHorizontal: 24, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, borderWidth: 1, borderColor: '#EDE8E0', backgroundColor: '#FFFFFF' },
  pillText: { fontSize: 12, color: '#2C2420', fontFamily: 'DMSans_400Regular', letterSpacing: 0.2 },

  // Actions
  actionsSection: { paddingHorizontal: 24, gap: 10, marginBottom: 28 },

  heroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#FFFBF3', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#E8D9B5',
  },
  heroIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center',
  },
  heroTextWrap: { flex: 1, gap: 3 },
  heroTitle: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  heroSub: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2 },

  secondaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE8E0', padding: 16,
  },
  secondaryIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center',
  },
  secondaryTextWrap: { flex: 1, gap: 2 },
  secondaryTitle: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  secondarySub: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2 },

  // Explore
  exploreSection: { paddingHorizontal: 24 },
  exploreLabel: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 4, textAlign: 'center', marginBottom: 14 },
  exploreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  exploreCard: {
    width: (width - 58) / 2, backgroundColor: '#FFFFFF',
    borderRadius: 14, borderWidth: 1, borderColor: '#EDE8E0', padding: 18, gap: 6,
  },
  exploreIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  exploreTitle: { fontSize: 13, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  exploreSub: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2, lineHeight: 15 },
});

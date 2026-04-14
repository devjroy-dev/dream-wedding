import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display/index';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';
import BottomNav from '../components/BottomNav';
import { registerForPushNotifications, savePushToken } from '../services/notifications';

const { width } = Dimensions.get('window');

const CATEGORIES = [
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

const QUOTES = [
  'Every love story is beautiful, but yours will be extraordinary.',
  'The best thing to hold onto in life is each other.',
  'Together is a wonderful place to be.',
  'Where there is love, there is life.',
  'In all the world, there is no heart for me like yours.',
  'Two souls, one journey.',
  'Love is the bridge between two hearts.',
];

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [daysToGo, setDaysToGo] = useState<number | null>(null);
  const [greeting, setGreeting] = useState('Good morning');

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    loadSession();
    setTimeGreeting();
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
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
        registerForPushNotifications().then(token => {
          if (token && parsed.userId) savePushToken(token, parsed.userId);
        });
        if (parsed.wedding_date) {
          const days = Math.ceil(
            (new Date(parsed.wedding_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
          );
          if (days > 0) setDaysToGo(days);
        }
      }
    } catch (e) {}
  };

  const todayQuote = QUOTES[new Date().getDate() % QUOTES.length];

  return (
    <View style={s.container}>

      {/* Header */}
      <Animated.View style={[s.header, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
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
          <TouchableOpacity onPress={() => router.push('/notifications')} style={s.iconBtn}>
            <Feather name="bell" size={18} color="#2C2420" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')} style={s.avatar}>
            <Text style={s.avatarText}>{userName?.[0]?.toUpperCase() || 'D'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Daily quote */}
        <View style={s.quoteWrap}>
          <View style={s.quoteDivider} />
          <Text style={s.quoteText}>{todayQuote}</Text>
          <View style={s.quoteDivider} />
        </View>

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillsContent}
          style={s.pillsScroll}
        >
          {CATEGORIES.map(cat => (
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

        {/* Primary actions */}
        <View style={s.actionsSection}>

          {/* Discover Vendors — primary CTA */}
          <TouchableOpacity style={s.primaryCard} onPress={() => router.push('/swipe' as any)} activeOpacity={0.85}>
            <View style={s.primaryIconBox}>
              <Feather name="search" size={18} color="#C9A84C" />
            </View>
            <View style={s.primaryTextWrap}>
              <Text style={s.primaryTitle}>Discover Vendors</Text>
              <Text style={s.primarySub}>Swipe through India's finest wedding professionals</Text>
            </View>
            <Feather name="arrow-right" size={16} color="#C9A84C" />
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
            <Feather name="chevron-right" size={16} color="#C9A84C" />
          </TouchableOpacity>

          {/* Curated For You */}
          <TouchableOpacity style={s.secondaryCard} onPress={() => router.push('/curated-suggestions' as any)} activeOpacity={0.85}>
            <View style={s.secondaryIconBox}>
              <Feather name="zap" size={16} color="#C9A84C" />
            </View>
            <View style={s.secondaryTextWrap}>
              <Text style={s.secondaryTitle}>Curated For You</Text>
              <Text style={s.secondarySub}>Smart vendor combinations within your budget</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#C9A84C" />
          </TouchableOpacity>

        </View>

        {/* Explore */}
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
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, marginBottom: 20 },
  headerLeft: { flex: 1, gap: 6 },
  greeting: { fontSize: 28, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3 },
  countdownRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  countdownNumber: { fontSize: 22, color: '#C9A84C', fontFamily: 'PlayfairDisplay_600SemiBold', letterSpacing: 0.5 },
  countdownLabel: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2 },
  subGreeting: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8E0D5' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#C9A84C', fontSize: 15, fontFamily: 'DMSans_500Medium' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Quote
  quoteWrap: { paddingHorizontal: 40, marginBottom: 28, alignItems: 'center', gap: 14 },
  quoteDivider: { width: 28, height: 1, backgroundColor: '#C9A84C', opacity: 0.4 },
  quoteText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'PlayfairDisplay_400Regular', textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },

  // Pills
  pillsScroll: { marginBottom: 28 },
  pillsContent: { paddingHorizontal: 24, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50, borderWidth: 1, borderColor: '#E8E0D5', backgroundColor: '#FFFFFF' },
  pillText: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular', letterSpacing: 0.2 },

  // Primary actions
  actionsSection: { paddingHorizontal: 24, gap: 12, marginBottom: 32 },

  primaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#FFFBF3', borderRadius: 16, padding: 22,
    borderWidth: 1, borderColor: '#E8D9B5',
  },
  primaryIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#C9A84C', borderWidth: 0, borderColor: 'transparent',
    justifyContent: 'center', alignItems: 'center',
  },
  primaryTextWrap: { flex: 1, gap: 4 },
  primaryTitle: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3 },
  primarySub: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2 },

  secondaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8E0D5', padding: 20,
  },
  secondaryIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center',
  },
  secondaryTextWrap: { flex: 1, gap: 3 },
  secondaryTitle: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  secondarySub: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2 },

  // Explore
  exploreSection: { paddingHorizontal: 24 },
  exploreLabel: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 4, textAlign: 'center', marginBottom: 16 },
  exploreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  exploreCard: {
    width: (width - 60) / 2, backgroundColor: '#FFFFFF',
    borderRadius: 16, borderWidth: 1, borderColor: '#E8E0D5', padding: 20, gap: 8,
  },
  exploreIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  exploreTitle: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  exploreSub: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2, lineHeight: 16 },
});

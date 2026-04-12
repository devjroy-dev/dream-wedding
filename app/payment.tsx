import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVendors } from '../services/api';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'venues', label: 'Venues', sub: 'Palaces, farmhouses & luxury hotels' },
  { id: 'photographers', label: 'Photographers', sub: 'Candid, traditional & cinematic' },
  { id: 'mua', label: 'Makeup Artists', sub: 'Bridal & party makeup' },
  { id: 'designers', label: 'Designers', sub: 'Bridal & groom wear' },
  { id: 'choreographers', label: 'Choreographers', sub: 'Sangeet & performance prep' },
  { id: 'content-creators', label: 'Content Creators', sub: 'BTS Reels & short films' },
  { id: 'dj', label: 'DJ & Music', sub: 'Live music & DJ services' },
  { id: 'event-managers', label: 'Event Managers', sub: 'Luxury & destination weddings' },
  { id: 'jewellery', label: 'Jewellery Designers', sub: 'Bridal & custom jewellery' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('there');
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [daysUntil, setDaysUntil] = useState<number | null>(null);
  const [coPlannerOnline] = useState(false);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.name) setUserName(parsed.name.split(' ')[0]);
        if (parsed.wedding_date) {
          const date = new Date(parsed.wedding_date);
          setWeddingDate(date);
          const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          setDaysUntil(days);
        }
      }
    } catch (e) {}
  };

  const filteredCategories = CATEGORIES.filter(cat =>
    cat.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#2C2420" />
        </TouchableOpacity>
        <View>
          <Text style={styles.greeting}>Hello, {userName}</Text>
          <Text style={styles.subGreeting}>Find your dream wedding team</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifBtn}>
            <Text style={styles.notifIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatar}>
            <Text style={styles.avatarText}>{userName[0]?.toUpperCase() || 'D'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {/* Wedding Countdown — clean minimal version */}
        {daysUntil !== null && (
          <View style={styles.countdownStrip}>
            <View style={styles.countdownLeft}>
              <Text style={styles.countdownNumber}>{daysUntil}</Text>
              <Text style={styles.countdownLabel}>days to go</Text>
            </View>
            <View style={styles.countdownDivider} />
            <View style={styles.countdownRight}>
              <Text style={styles.countdownDate}>
                {weddingDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Text style={styles.countdownSub}>Your wedding day ✨</Text>
            </View>
          </View>
        )}

        {/* Genie Budget */}
        <TouchableOpacity style={styles.genieBar} onPress={() => router.push('/bts-planner')}>
          <View style={styles.genieLeft}>
            <Text style={styles.genieTitle}>Genie Budget</Text>
            <Text style={styles.genieSubtitle}>Heart vendors to track your estimated spend</Text>
          </View>
          <Text style={styles.genieArrow}>›</Text>
        </TouchableOpacity>

        {/* Search */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors, categories..."
            placeholderTextColor="#8C7B6E"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {filteredCategories.map((cat, index) => (
            <View key={cat.id}>
              <TouchableOpacity
                style={styles.categoryRow}
                onPress={() => router.push(`/filter?category=${cat.id}`)}
              >
                <View style={styles.categoryText}>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  <Text style={styles.categorySub}>{cat.sub}</Text>
                </View>
                <Text style={styles.categoryArrow}>›</Text>
              </TouchableOpacity>
              {index < filteredCategories.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* Trending This Week — as a button at bottom of categories */}
        <TouchableOpacity
          style={styles.trendingBtn}
          onPress={() => router.push('/swipe')}
        >
          <View style={styles.trendingBtnLeft}>
            <Text style={styles.trendingBtnTitle}>✨ Trending This Week</Text>
            <Text style={styles.trendingBtnSub}>See who couples are saving right now</Text>
          </View>
          <Text style={styles.trendingBtnArrow}>›</Text>
        </TouchableOpacity>

        {/* Referral Banner */}
        <TouchableOpacity style={styles.referralBanner}>
          <View style={styles.referralLeft}>
            <Text style={styles.referralTitle}>Invite a friend</Text>
            <Text style={styles.referralSub}>Get 1 month Premium free when they sign up</Text>
          </View>
          <Text style={styles.referralArrow}>›</Text>
        </TouchableOpacity>

        {/* Post Wedding */}
        <TouchableOpacity style={styles.postWeddingCard}>
          <View style={styles.postWeddingLeft}>
            <Text style={styles.postWeddingTitle}>After the wedding</Text>
            <Text style={styles.postWeddingSubtitle}>Book your anniversary shoot, honeymoon photographer & more</Text>
          </View>
          <Text style={styles.postWeddingArrow}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navDot} />
          <Text style={[styles.navLabel, styles.navActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/moodboard')}>
          <Text style={styles.navLabel}>Moodboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/bts-planner')}>
          <Text style={styles.navLabel}>Planner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8E0D5' },
  greeting: { fontSize: 28, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  subGreeting: { fontSize: 13, color: '#8C7B6E', marginTop: 4, letterSpacing: 0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8E0D5' },
  notifIcon: { fontSize: 16 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#C9A84C', fontSize: 16, fontWeight: '500' },
  scroll: { flex: 1 },

  // Countdown — clean minimal strip
  countdownStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    gap: 16,
  },
  countdownLeft: { alignItems: 'center', minWidth: 60 },
  countdownNumber: { fontSize: 32, color: '#C9A84C', fontWeight: '300', letterSpacing: 1 },
  countdownLabel: { fontSize: 10, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  countdownDivider: { width: 1, height: 40, backgroundColor: '#E8E0D5' },
  countdownRight: { flex: 1, gap: 4 },
  countdownDate: { fontSize: 15, color: '#2C2420', fontWeight: '400', letterSpacing: 0.3 },
  countdownSub: { fontSize: 12, color: '#8C7B6E' },

  genieBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, marginBottom: 16, paddingVertical: 14, paddingHorizontal: 18, backgroundColor: '#FFF8EC', borderRadius: 10, borderWidth: 1, borderColor: '#E8D9B5' },
  genieLeft: { gap: 3 },
  genieTitle: { fontSize: 14, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  genieSubtitle: { fontSize: 12, color: '#8C7B6E' },
  genieArrow: { fontSize: 20, color: '#C9A84C' },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 24, borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D5', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24, gap: 8 },
  searchIcon: { fontSize: 18, color: '#8C7B6E' },
  searchInput: { flex: 1, fontSize: 14, color: '#2C2420' },
  searchClear: { fontSize: 12, color: '#8C7B6E', padding: 4 },

  categoriesSection: { paddingHorizontal: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 11, color: '#8C7B6E', letterSpacing: 2, textTransform: 'uppercase', fontWeight: '500', marginBottom: 16 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  categoryText: { gap: 5 },
  categoryLabel: { fontSize: 20, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  categorySub: { fontSize: 12, color: '#8C7B6E', letterSpacing: 0.2 },
  categoryArrow: { fontSize: 22, color: '#C9A84C' },
  rowDivider: { height: 1, backgroundColor: '#E8E0D5' },

  trendingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 18,
    backgroundColor: '#2C2420',
    borderRadius: 14,
  },
  trendingBtnLeft: { gap: 4 },
  trendingBtnTitle: { fontSize: 15, color: '#C9A84C', fontWeight: '500' },
  trendingBtnSub: { fontSize: 12, color: '#8C7B6E' },
  trendingBtnArrow: { fontSize: 22, color: '#C9A84C' },

  referralBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, padding: 18, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E0D5', marginBottom: 12 },
  referralLeft: { flex: 1, gap: 4 },
  referralTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  referralSub: { fontSize: 12, color: '#8C7B6E', lineHeight: 18 },
  referralArrow: { fontSize: 20, color: '#C9A84C' },

  postWeddingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, padding: 18, backgroundColor: '#FFF8EC', borderRadius: 12, borderWidth: 1, borderColor: '#E8D9B5', marginBottom: 12 },
  postWeddingLeft: { flex: 1, gap: 4 },
  postWeddingTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  postWeddingSubtitle: { fontSize: 12, color: '#8C7B6E', lineHeight: 18 },
  postWeddingArrow: { fontSize: 20, color: '#C9A84C' },

  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8', position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center', gap: 4 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C9A84C' },
  navLabel: { fontSize: 12, color: '#8C7B6E', letterSpacing: 0.3 },
  navActive: { color: '#2C2420', fontWeight: '600' },
});
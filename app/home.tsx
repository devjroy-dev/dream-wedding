import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, TextInput, Image, ActivityIndicator } from 'react-native';
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

const FALLBACK_TRENDING = [
  { id: '1', name: 'Joseph Radhik', category: 'Photographer', city: 'Mumbai', image: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400', rating: 5.0 },
  { id: '5', name: 'Sabyasachi', category: 'Designer', city: 'Kolkata', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400', rating: 5.0 },
  { id: '2', name: 'The Leela Palace', category: 'Venue', city: 'Delhi NCR', image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400', rating: 4.9 },
];

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('there');
  const [trending, setTrending] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState(false);
  const [coPlannerOnline] = useState(false);

  useEffect(() => {
    loadSession();
    loadTrending();
  }, []);

  const loadSession = async () => {
    try {
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.name) setUserName(parsed.name.split(' ')[0]);
      }
    } catch (e) {}
  };

  const loadTrending = async () => {
    try {
      setTrendingLoading(true);
      setTrendingError(false);
      const result = await getVendors();
      if (result.success && result.data?.length > 0) {
        setTrending(result.data.slice(0, 3));
      } else {
        setTrending(FALLBACK_TRENDING);
      }
    } catch (e) {
      setTrendingError(true);
      setTrending(FALLBACK_TRENDING);
    } finally {
      setTrendingLoading(false);
    }
  };

  const filteredCategories = CATEGORIES.filter(cat =>
    cat.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const TrendingCard = ({ vendor }: { vendor: any }) => (
    <TouchableOpacity
      style={styles.trendingCard}
      onPress={() => router.push(`/vendor-profile?id=${vendor.id}`)}
    >
      <Image
        source={{ uri: vendor.portfolio_images?.[0] || vendor.image }}
        style={styles.trendingImage}
      />
      <View style={styles.trendingInfo}>
        <Text style={styles.trendingName} numberOfLines={1}>{vendor.name}</Text>
        <Text style={styles.trendingCategory}>{vendor.category} · {vendor.city}</Text>
        <Text style={styles.trendingRating}>★ {vendor.rating}</Text>
      </View>
    </TouchableOpacity>
  );

  const TrendingSkeletonCard = () => (
    <View style={[styles.trendingCard, styles.skeletonCard]}>
      <View style={styles.skeletonImage} />
      <View style={styles.trendingInfo}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: 80 }]} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {userName}</Text>
          <Text style={styles.subGreeting}>Find your dream wedding team</Text>
        </View>
        <View style={styles.headerRight}>
          {coPlannerOnline && (
            <View style={styles.coPlannerIndicator}>
              <View style={styles.coPlannerDot} />
              <Text style={styles.coPlannerText}>Partner online</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifBtn}>
            <Text style={styles.notifIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatar}>
            <Text style={styles.avatarText}>{userName[0]?.toUpperCase() || 'D'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {/* Wedding Countdown */}
        <View style={styles.countdownCard}>
          <View style={styles.countdownLeft}>
            <Text style={styles.countdownNumber}>247</Text>
            <Text style={styles.countdownLabel}>days to go</Text>
          </View>
          <View style={styles.countdownDivider} />
          <View style={styles.countdownRight}>
            <Text style={styles.countdownDate}>December 2025</Text>
            <Text style={styles.countdownSub}>Your wedding day</Text>
            <TouchableOpacity style={styles.anniversaryBtn} onPress={() => router.push('/profile')}>
              <Text style={styles.anniversaryBtnText}>Set anniversary reminder →</Text>
            </TouchableOpacity>
          </View>
        </View>

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

        {/* Trending */}
        {searchQuery.length === 0 && (
          <View style={styles.trendingSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending This Week</Text>
              <TouchableOpacity onPress={() => router.push('/swipe')}>
                <Text style={styles.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>

            {trendingError && (
              <TouchableOpacity style={styles.retryRow} onPress={loadTrending}>
                <Text style={styles.retryText}>Couldn't load vendors. Tap to retry →</Text>
              </TouchableOpacity>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.trendingRow}>
                {trendingLoading
                  ? [0, 1, 2].map(i => <TrendingSkeletonCard key={i} />)
                  : trending.map(vendor => <TrendingCard key={vendor.id} vendor={vendor} />)
                }
              </View>
            </ScrollView>
          </View>
        )}

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
  greeting: { fontSize: 28, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  subGreeting: { fontSize: 13, color: '#8C7B6E', marginTop: 4, letterSpacing: 0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coPlannerIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#E8E0D5' },
  coPlannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  coPlannerText: { fontSize: 10, color: '#4CAF50', fontWeight: '500' },
  notifBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8E0D5' },
  notifIcon: { fontSize: 16 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#C9A84C', fontSize: 16, fontWeight: '500' },
  scroll: { flex: 1 },
  countdownCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2420', marginHorizontal: 24, borderRadius: 14, padding: 20, marginBottom: 16, gap: 20 },
  countdownLeft: { alignItems: 'center' },
  countdownNumber: { fontSize: 36, color: '#C9A84C', fontWeight: '300', letterSpacing: 1 },
  countdownLabel: { fontSize: 11, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase' },
  countdownDivider: { width: 1, height: 60, backgroundColor: '#3C3430' },
  countdownRight: { flex: 1, gap: 4 },
  countdownDate: { fontSize: 18, color: '#F5F0E8', fontWeight: '300', letterSpacing: 0.5 },
  countdownSub: { fontSize: 12, color: '#8C7B6E' },
  anniversaryBtn: { marginTop: 6 },
  anniversaryBtnText: { fontSize: 11, color: '#C9A84C', letterSpacing: 0.3 },
  genieBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, marginBottom: 16, paddingVertical: 14, paddingHorizontal: 18, backgroundColor: '#FFF8EC', borderRadius: 10, borderWidth: 1, borderColor: '#E8D9B5' },
  genieLeft: { gap: 3 },
  genieTitle: { fontSize: 14, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  genieSubtitle: { fontSize: 12, color: '#8C7B6E' },
  genieArrow: { fontSize: 20, color: '#C9A84C' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 24, borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D5', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24, gap: 8 },
  searchIcon: { fontSize: 18, color: '#8C7B6E' },
  searchInput: { flex: 1, fontSize: 14, color: '#2C2420' },
  searchClear: { fontSize: 12, color: '#8C7B6E', padding: 4 },
  trendingSection: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 14 },
  sectionTitle: { fontSize: 12, color: '#8C7B6E', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '500' },
  sectionLink: { fontSize: 13, color: '#C9A84C' },
  retryRow: { paddingHorizontal: 24, marginBottom: 10 },
  retryText: { fontSize: 13, color: '#C9A84C' },
  trendingRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12 },
  trendingCard: { width: 160, backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E8E0D5' },
  skeletonCard: { opacity: 0.6 },
  skeletonImage: { width: 160, height: 110, backgroundColor: '#E8E0D5' },
  skeletonLine: { height: 10, backgroundColor: '#E8E0D5', borderRadius: 5, width: 120, marginBottom: 6 },
  trendingImage: { width: 160, height: 110, resizeMode: 'cover' },
  trendingInfo: { padding: 10, gap: 3 },
  trendingName: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  trendingCategory: { fontSize: 11, color: '#8C7B6E' },
  trendingRating: { fontSize: 11, color: '#C9A84C', fontWeight: '500' },
  categoriesSection: { paddingHorizontal: 24, marginBottom: 24 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
  categoryText: { gap: 3 },
  categoryLabel: { fontSize: 16, color: '#2C2420', fontWeight: '400', letterSpacing: 0.2 },
  categorySub: { fontSize: 12, color: '#8C7B6E' },
  categoryArrow: { fontSize: 20, color: '#C9A84C' },
  rowDivider: { height: 1, backgroundColor: '#E8E0D5' },
  referralBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, padding: 18, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E0D5', marginBottom: 12 },
  referralLeft: { flex: 1, gap: 4 },
  referralTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  referralSub: { fontSize: 12, color: '#8C7B6E', lineHeight: 18 },
  referralArrow: { fontSize: 20, color: '#C9A84C' },
  postWeddingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, padding: 18, backgroundColor: '#2C2420', borderRadius: 12, marginBottom: 12 },
  postWeddingLeft: { flex: 1, gap: 4 },
  postWeddingTitle: { fontSize: 15, color: '#C9A84C', fontWeight: '500' },
  postWeddingSubtitle: { fontSize: 12, color: '#8C7B6E', lineHeight: 18 },
  postWeddingArrow: { fontSize: 20, color: '#C9A84C' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8', position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center', gap: 4 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C9A84C' },
  navLabel: { fontSize: 12, color: '#8C7B6E', letterSpacing: 0.3 },
  navActive: { color: '#2C2420', fontWeight: '600' },
});
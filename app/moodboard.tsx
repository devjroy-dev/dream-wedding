import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Image, ActivityIndicator,
  Alert, Share
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { getMoodboard, removeFromMoodboard } from '../services/api';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

// Mock popular vendors — replace with real aggregation query post-launch
const POPULAR_IN_BUDGET = [
  { id: 'p1', name: 'Joseph Radhik', category: 'Photographer', saves: 847, image: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400' },
  { id: 'p2', name: 'The Leela Palace', category: 'Venue', saves: 623, image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400' },
  { id: 'p3', name: 'Namrata Soni', category: 'Makeup Artist', saves: 541, image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400' },
  { id: 'p4', name: 'Wizcraft', category: 'Event Manager', saves: 389, image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400' },
  { id: 'p5', name: 'DJ Chetas', category: 'DJ & Music', saves: 312, image: 'https://images.unsplash.com/photo-1571266028243-d220c6a5d70b?w=400' },
];

const FUNCTIONS = ['All', 'Roka', 'Haldi', 'Mehendi', 'Sangeet', 'Cocktail', 'Wedding', 'Reception'];

export default function MoodboardScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [userBudgetLabel, setUserBudgetLabel] = useState('your budget');
  const [removing, setRemoving] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  useFocusEffect(
    useCallback(() => {
      loadMoodboard();
    }, [])
  );

  const loadMoodboard = async () => {
    try {
      setLoading(true);
      const session = await AsyncStorage.getItem('user_session');
      if (!session) return;
      const parsed = JSON.parse(session);
      const uid = parsed.userId || parsed.uid;
      setUserId(uid);

      // Set budget label for "Popular in your budget" section
      if (parsed.budget) {
        const b = parsed.budget;
        if (b >= 10000000) setUserBudgetLabel('₹1Cr+');
        else if (b >= 5000000) setUserBudgetLabel('₹50L–₹1Cr');
        else if (b >= 2500000) setUserBudgetLabel('₹25L–₹50L');
        else if (b >= 1000000) setUserBudgetLabel('₹10L–₹25L');
        else setUserBudgetLabel('₹5L–₹10L');
      }

      const result = await getMoodboard(uid);
      if (result.success) setSaved(result.data || []);
    } catch (e) {
      setSaved([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    Alert.alert(
      'Remove vendor',
      'Remove from your wedding team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemoving(id);
              await removeFromMoodboard(id);
              setSaved(prev => prev.filter(s => s.id !== id));
            } catch (e) {
              Alert.alert('Error', 'Could not remove. Please try again.');
            } finally {
              setRemoving(null);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My wedding team on The Dream Wedding — ${saved.length} vendors saved. 💍\n\nthedreamwedding.in`,
        title: 'My Dream Wedding Team',
      });
    } catch (e) {}
  };

  // Check if booking prompt should show
  const getBookingPromptCategory = () => {
    const categoryCounts: Record<string, number> = {};
    saved.forEach(s => {
      const cat = s.vendors?.category || 'other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const entry = Object.entries(categoryCounts).find(([_, count]) => count >= 3);
    return entry ? entry[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null;
  };

  const filtered = activeFilter === 'All'
    ? saved
    : saved.filter(s => s.function_tag === activeFilter);

  const getVendorImage = (item: any) =>
    item.vendors?.portfolio_images?.[0] ||
    item.image_url ||
    item.vendors?.image ||
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400';

  const getVendorName = (item: any) => item.vendors?.name || 'Vendor';

  const getVendorCategory = (item: any) =>
    item.vendors?.category
      ?.replace(/-/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase()) || '';

  const bookingPromptCategory = getBookingPromptCategory();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>My Wedding Team</Text>
            <Text style={styles.count}>
              {saved.length} vendor{saved.length !== 1 ? 's' : ''} saved
            </Text>
          </View>
          {saved.length > 0 && (
            <TouchableOpacity onPress={handleShare} style={styles.shareIconBtn}>
              <Feather name="share-2" size={16} color="#2C2420" />
            </TouchableOpacity>
          )}
        </View>

        {/* Popular in your budget — replaces Trending */}
        <View style={styles.popularSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Popular in {userBudgetLabel}</Text>
              <Text style={styles.sectionSubtitle}>
                What couples like you are saving
              </Text>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularScroll}
          >
            {POPULAR_IN_BUDGET.map(v => (
              <TouchableOpacity
                key={v.id}
                style={styles.popularCard}
                onPress={() => router.push(`/vendor-profile?id=${v.id}` as any)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: v.image }}
                  style={styles.popularImage}
                  resizeMode="cover"
                />
                <View style={styles.popularOverlay} />
                <View style={styles.popularInfo}>
                  <Text style={styles.popularName} numberOfLines={1}>
                    {v.name}
                  </Text>
                  <View style={styles.popularMeta}>
                    <Feather name="heart" size={9} color="#C9A84C" />
                    <Text style={styles.popularSaves}>{v.saves} saves</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Function filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {FUNCTIONS.map(fn => (
            <TouchableOpacity
              key={fn}
              style={[
                styles.filterTab,
                activeFilter === fn && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(fn)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.filterTabText,
                activeFilter === fn && styles.filterTabTextActive,
              ]}>
                {fn}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Booking prompt — shows when 3+ in same category */}
        {bookingPromptCategory && (
          <TouchableOpacity
            style={styles.bookingPrompt}
            onPress={() => router.push('/swipe' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.bookingPromptLeft}>
              <Text style={styles.bookingPromptTitle}>
                Ready to secure your {bookingPromptCategory}?
              </Text>
              <Text style={styles.bookingPromptSub}>
                Book with ₹999 protection — fully refundable if vendor declines
              </Text>
            </View>
            <Feather name="arrow-right" size={16} color="#C9A84C" />
          </TouchableOpacity>
        )}

        {/* Saved vendor grid */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="heart" size={32} color="#E8E0D5" />
            <Text style={styles.emptyTitle}>
              {saved.length === 0
                ? 'Your team is empty'
                : `No ${activeFilter} vendors saved`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {saved.length === 0
                ? 'Save vendors while swiping to build your dream wedding team'
                : 'Switch filter or discover more vendors'}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/home' as any)}
            >
              <Text style={styles.emptyBtnText}>DISCOVER VENDORS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map(item => (
              <View key={item.id} style={styles.card}>

                {/* Vendor image */}
                <TouchableOpacity
                  onPress={() => router.push(`/vendor-profile?id=${item.vendor_id}` as any)}
                  activeOpacity={0.92}
                >
                  <Image
                    source={{ uri: getVendorImage(item) }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.cardImageOverlay} />
                </TouchableOpacity>

                {/* Remove button — top right */}
                {removing === item.id ? (
                  <View style={styles.removeBtn}>
                    <ActivityIndicator size="small" color="#F5F0E8" />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemove(item.id)}
                  >
                    <Feather name="x" size={10} color="#F5F0E8" />
                  </TouchableOpacity>
                )}

                {/* Function tag — top left */}
                <View style={styles.functionTag}>
                  <Text style={styles.functionTagText}>
                    {item.function_tag || 'Wedding'}
                  </Text>
                </View>

                {/* Card info + actions */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {getVendorName(item)}
                  </Text>
                  <Text style={styles.cardCategory} numberOfLines={1}>
                    {getVendorCategory(item)}
                  </Text>

                  {/* Quick action pills */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => router.push(`/messaging?vendorId=${item.vendor_id}` as any)}
                      activeOpacity={0.8}
                    >
                      <Feather name="message-circle" size={11} color="#2C2420" />
                      <Text style={styles.actionPillText}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionPill, styles.actionPillGold]}
                      onPress={() => router.push(`/inquiry?vendorId=${item.vendor_id}` as any)}
                      activeOpacity={0.8}
                    >
                      <Feather name="send" size={11} color="#2C2420" />
                      <Text style={styles.actionPillText}>Enquire</Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </View>
            ))}
          </View>
        )}

        {/* Compare + share bar */}
        {saved.length > 1 && (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.compareBtn}
              onPress={() => router.push('/compare' as any)}
              activeOpacity={0.85}
            >
              <Feather name="columns" size={14} color="#2C2420" />
              <Text style={styles.compareBtnText}>Compare</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Feather name="share-2" size={14} color="#F5F0E8" />
              <Text style={styles.shareBtnText}>Share Team</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={{
            marginHorizontal: 24,
            marginBottom: 12,
            backgroundColor: '#FAFAF8',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#E8E0D5',
            borderStyle: 'dashed',
            opacity: 0.8,
            padding: 16,
          }}
          onPress={() => Alert.alert(
            'Live Activity Signals — Build 2',
            'Coming in Build 2: Real-time signals on every saved vendor — Booked 3 times this week, 12 couples comparing right now, Price increased last month. The same psychological mechanic that drives Booking.com conversions. Makes every card in your Moodboard feel alive and urgent.',
            [{ text: 'Perfect!' }]
          )}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5', justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="activity" size={16} color="#C9A84C" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' }}>Live Activity Signals</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: '#C9A84C', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Feather name="lock" size={9} color="#C9A84C" />
                  <Text style={{ fontSize: 9, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>Build 2</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: 3 }}>See real-time booking activity on every saved vendor — Booked 3 times this week, 12 couples comparing now.</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={{ height: 120 }} />

      </ScrollView>

      {/* Bottom Nav — 5 items with Messages */}
      <View style={styles.bottomNav}>
        {[
          { label: 'Home',      icon: 'home',           route: '/home'        },
          { label: 'Moodboard', icon: 'heart',          route: null           },
          { label: 'Messages',  icon: 'message-circle', route: '/messaging'   },
          { label: 'Planner',   icon: 'calendar',       route: '/bts-planner' },
          { label: 'Profile',   icon: 'user',           route: '/profile'     },
        ].map((item, index) => {
          const isActive = index === 1; // Moodboard is active
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <Feather
                name={item.icon as any}
                size={20}
                color={isActive ? '#2C2420' : '#8C7B6E'}
              />
              <Text style={[
                styles.navLabel,
                isActive && styles.navLabelActive,
              ]}>
                {item.label}
              </Text>
              {isActive && <View style={styles.navDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerLeft: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  count: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },
  shareIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },

  // Popular section
  popularSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    gap: 3,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF8EC',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C9A84C',
  },
  liveText: {
    fontSize: 10,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },
  popularScroll: {
    paddingHorizontal: 24,
    gap: 10,
  },
  popularCard: {
    width: 120,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  popularImage: {
    width: '100%',
    height: '100%',
  },
  popularOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(10,6,3,0.72)',
  },
  popularInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    gap: 3,
  },
  popularName: {
    fontSize: 12,
    color: '#F5F0E8',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  popularMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  popularSaves: {
    fontSize: 10,
    color: '#C9A84C',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },

  // Filter pills
  filterScroll: {
    maxHeight: 44,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    backgroundColor: '#FFFFFF',
  },
  filterTabActive: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  filterTabText: {
    fontSize: 13,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
  },
  filterTabTextActive: {
    color: '#F5F0E8',
    fontFamily: 'DMSans_500Medium',
  },

  // Booking prompt
  bookingPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFF8EC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  bookingPromptLeft: {
    flex: 1,
    gap: 3,
    paddingRight: 12,
  },
  bookingPromptTitle: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  bookingPromptSub: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
    lineHeight: 16,
  },

  // Vendor grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(10,6,3,0.15)',
  },

  // Remove button
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Function tag
  functionTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(44,36,32,0.85)',
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  functionTagText: {
    fontSize: 9,
    color: '#F5F0E8',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },

  // Card info
  cardInfo: {
    padding: 10,
    gap: 4,
  },
  cardName: {
    fontSize: 13,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  cardCategory: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },

  // Quick action pills
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F5F0E8',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  actionPillGold: {
    backgroundColor: '#FFF8EC',
    borderColor: '#E8D9B5',
  },
  actionPillText: {
    fontSize: 10,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
    letterSpacing: 0.2,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  compareBtnText: {
    fontSize: 13,
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 13,
  },
  shareBtnText: {
    fontSize: 13,
    color: '#F5F0E8',
    fontFamily: 'DMSans_500Medium',
  },

  // Empty state
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  emptyBtnText: {
    fontSize: 13,
    color: '#F5F0E8',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 2,
  },

  // Bottom nav — 5 items
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    backgroundColor: '#F5F0E8',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 10,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
  navLabelActive: {
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C9A84C',
  },
});
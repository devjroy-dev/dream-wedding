import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput, ImageBackground
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import {
  useFonts,
  PlayfairDisplay_300Light,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display/index';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 2;

const CATEGORIES = [
  { id: 'venues',           label: 'Venues',             sub: 'Palaces, farmhouses & luxury hotels',  icon: 'home'       },
  { id: 'photographers',   label: 'Photographers',       sub: 'Candid, traditional & cinematic',      icon: 'camera'     },
  { id: 'mua',             label: 'Makeup Artists',      sub: 'Bridal & party makeup',                icon: 'scissors'   },
  { id: 'designers',       label: 'Designers',           sub: 'Bridal & groom wear',                  icon: 'star'       },
  { id: 'jewellery',       label: 'Jewellery',           sub: 'Bridal & custom jewellery',            icon: 'circle'     },
  { id: 'choreographers',  label: 'Choreographers',      sub: 'Sangeet & performance prep',           icon: 'music'      },
  { id: 'content-creators',label: 'Content Creators',    sub: 'BTS Reels & short films',              icon: 'video'      },
  { id: 'dj',              label: 'DJ & Music',          sub: 'Live music & DJ services',             icon: 'headphones' },
  { id: 'event-managers',  label: 'Event Managers',      sub: 'Luxury & destination weddings',        icon: 'briefcase'  },
  { id: 'bridal-wellness', label: 'Bridal Wellness',     sub: 'Skin, hair, health & dermatology',     icon: 'heart'      },
];

// FEATURED CARDS — swap image URIs for real vendor images when confirmed
const QUICK_CARDS = [
  {
    id: 'get-inspired',
    title: 'Get Inspired',
    sub: 'Venues · Décor · Photography',
    route: '/get-inspired',
    // SWAP: Replace with curated venue/decor/photographer image
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800',
  },
  {
    id: 'look-book',
    title: 'Look Book',
    sub: 'Designers · MUAs · Jewellers',
    route: '/look-book',
    // SWAP: Replace with designer/bridal look image
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800',
  },
  {
    id: 'event-managers',
    title: 'Event Managers',
    sub: 'Grand weddings · Full service',
    route: '/destination-weddings',
    // SWAP: Replace with event manager's best wedding setup image
    image: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800',
  },
  {
    id: 'special-offers',
    title: 'Special Offers',
    sub: 'Exclusive deals from top vendors',
    route: '/special-offers',
    // SWAP: Replace with curated offer visual
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('');
  const [daysToGo, setDaysToGo] = useState<number | null>(null);
  const [greeting, setGreeting] = useState('Good morning');

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_300Light,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  useEffect(() => {
    loadSession();
    setTimeGreeting();
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
            (new Date(parsed.wedding_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
          );
          if (days > 0) setDaysToGo(days);
        }
      }
    } catch (e) {}
  };

  const filteredCategories = CATEGORIES.filter(cat =>
    cat.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.sub.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // fonts load async — render proceeds

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {greeting}{userName ? `, ${userName}` : ''}
          </Text>
          {daysToGo ? (
            <View style={styles.countdownRow}>
              <Text style={styles.countdownNumber}>{daysToGo}</Text>
              <Text style={styles.countdownLabel}> days to your wedding</Text>
            </View>
          ) : (
            <Text style={styles.subGreeting}>Find your dream wedding team</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={styles.iconBtn}
          >
            <Feather name="bell" size={18} color="#2C2420" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {userName?.[0]?.toUpperCase() || 'D'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Search */}
        <View style={styles.searchBar}>
          <Feather name="search" size={15} color="#8C7B6E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors, categories..."
            placeholderTextColor="#8C7B6E"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={14} color="#8C7B6E" />
            </TouchableOpacity>
          )}
        </View>

        {/* Featured Cards — 2x2 premium placement */}
        <View style={styles.cardGrid}>
          {QUICK_CARDS.map((card, index) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.quickCard,
                // First card is full width — editorial anchor
                index === 0 && styles.quickCardFull,
              ]}
              onPress={() => router.push(card.route as any)}
              activeOpacity={0.9}
            >
              <ImageBackground
                source={{ uri: card.image }}
                style={styles.cardBg}
                imageStyle={styles.cardBgImage}
              >
                <View style={styles.cardOverlay}>
                  <View>
                    <Text style={styles.quickCardTitle}>{card.title}</Text>
                    <Text style={styles.quickCardSub}>{card.sub}</Text>
                  </View>
                  <View style={styles.cardArrowBox}>
                    <Feather name="arrow-right" size={12} color="#C9A84C" />
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories */}
        {searchQuery.length === 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <View style={styles.sectionDivider} />
          </View>
        )}

        <View style={styles.categoriesCard}>
          {filteredCategories.map((cat, index) => (
            <View key={cat.id}>
              <TouchableOpacity
                style={styles.categoryRow}
                onPress={() => router.push(`/filter?category=${cat.id}` as any)}
                activeOpacity={0.75}
              >
                <View style={styles.categoryIconBox}>
                  <Feather
                    name={cat.icon as any}
                    size={16}
                    color="#C9A84C"
                  />
                </View>
                <View style={styles.categoryText}>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  <Text style={styles.categorySub}>{cat.sub}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#C9A84C" />
              </TouchableOpacity>
              {index < filteredCategories.length - 1 && (
                <View style={styles.rowDivider} />
              )}
            </View>
          ))}
        </View>

        {/* Bottom padding for nav */}
        <View style={{ height: 100 }} />

      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {[
          { label: 'Home',      icon: 'home',           route: null           },
          { label: 'Moodboard', icon: 'heart',          route: '/moodboard'   },
          { label: 'Messages',  icon: 'message-circle', route: '/messaging'   },
          { label: 'Planner',   icon: 'calendar',       route: '/bts-planner' },
          { label: 'Spotlight', icon: 'star',           route: '/spotlight'   },
        ].map((item, index) => {
          const isActive = index === 0;
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  greeting: {
    fontSize: 24,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_300Light',
    letterSpacing: 0.3,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  countdownNumber: {
    fontSize: 22,
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_600SemiBold',
    letterSpacing: 0.5,
  },
  countdownLabel: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },
  subGreeting: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#C9A84C',
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 20,
    gap: 10,
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
  },

  // Featured cards
  cardGrid: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 28,
  },
  quickCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
  },
  // First card is full width — editorial anchor
  quickCardFull: {
    width: '100%',
    height: CARD_SIZE * 1.1,
  },
  cardBg: {
    width: '100%',
    height: '100%',
  },
  cardBgImage: {
    borderRadius: 16,
  },
  cardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,12,4,0.42)',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  quickCardTitle: {
    fontSize: 16,
    color: '#F5F0E8',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  quickCardSub: {
    fontSize: 11,
    color: 'rgba(245,240,232,0.75)',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
    marginTop: 3,
  },
  cardArrowBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
  },

  // Categories section header
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
  },

  // Categories as a unified card
  categoriesCard: {
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    overflow: 'hidden',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
  },
  categoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF8EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  categoryText: {
    flex: 1,
    gap: 3,
  },
  categoryLabel: {
    fontSize: 15,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  categorySub: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 18,
  },

  // Bottom nav
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
    fontSize: 11,
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
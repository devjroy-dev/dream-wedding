import { useState, useRef, useEffect } from 'react';
import {
  Alert, View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated, PanResponder, Image,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { getVendors, addToMoodboard } from '../services/api';
import {
  useFonts,
  PlayfairDisplay_300Light,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

const { width, height } = Dimensions.get('window');

const MOCK_VENDORS = [
  { id: '1', name: 'Joseph Radhik', category: 'photographers', city: 'Mumbai', starting_price: 300000, vibe_tags: ['Candid', 'Luxury'], rating: 5.0, is_verified: true, portfolio_images: ['https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800'] },
  { id: '2', name: 'The Leela Palace', category: 'venues', city: 'Delhi NCR', starting_price: 1500000, vibe_tags: ['Luxury', 'Royal'], rating: 4.9, is_verified: true, portfolio_images: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'] },
  { id: '3', name: 'Namrata Soni', category: 'mua', city: 'Mumbai', starting_price: 150000, vibe_tags: ['Luxury', 'Cinematic'], rating: 4.9, is_verified: true, portfolio_images: ['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800'] },
  { id: '4', name: 'Sabyasachi Mukherjee', category: 'designers', city: 'Kolkata', starting_price: 500000, vibe_tags: ['Luxury', 'Traditional'], rating: 5.0, is_verified: true, portfolio_images: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'] },
  { id: '5', name: 'DJ Chetas', category: 'dj', city: 'Mumbai', starting_price: 500000, vibe_tags: ['Festive', 'Luxury'], rating: 4.9, is_verified: true, portfolio_images: ['https://images.unsplash.com/photo-1571266028243-d220c6a5d70b?w=800'] },
  { id: '6', name: 'Wizcraft International', category: 'event-managers', city: 'Mumbai', starting_price: 2000000, vibe_tags: ['Luxury', 'Destination'], rating: 5.0, is_verified: true, portfolio_images: ['https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800'] },
  { id: '7', name: 'Anmol Jewellers', category: 'jewellery', city: 'Delhi NCR', starting_price: 200000, vibe_tags: ['Luxury', 'Traditional'], rating: 4.8, is_verified: true, portfolio_images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800'] },
  { id: '8', name: 'Shakti Mohan', category: 'choreographers', city: 'Delhi NCR', starting_price: 200000, vibe_tags: ['Festive', 'Candid'], rating: 4.9, is_verified: true, portfolio_images: ['https://images.unsplash.com/photo-1547153760-18fc86324498?w=800'] },
  { id: '9', name: 'BTS by Zara', category: 'content-creators', city: 'Mumbai', starting_price: 80000, vibe_tags: ['Candid', 'Cinematic'], rating: 4.8, is_verified: true, portfolio_images: ['https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800'] },
];

export default function SwipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const category = params.category as string;
  const city = params.city as string;
  const budget = params.budget as string;

  const [vendors, setVendors] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userBudget, setUserBudget] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // Freemium limits
  const DAILY_SWIPE_LIMIT = 20;
  const MOODBOARD_SAVE_LIMIT = 3;
  const [swipeCount, setSwipeCount] = useState(0);
  const [moodboardCount, setMoodboardCount] = useState(0);
  const [showSwipeWall, setShowSwipeWall] = useState(false);
  const [showMoodboardWall, setShowMoodboardWall] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Blind mode
  const [blindMode, setBlindMode] = useState(false);
  const [revealName, setRevealName] = useState<string | null>(null);

  // Swipe position — useNativeDriver: false required for x/y interpolation
  const position = useRef(new Animated.ValueXY()).current;

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_300Light,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  useEffect(() => {
    loadVendors();
  }, [category, city, budget]);

  const loadSession = async () => {
    try {
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const parsed = JSON.parse(session);
        setUserId(parsed.userId || parsed.uid || null);
        if (parsed.budget) setUserBudget(parsed.budget);
      }
      // Load today's freemium counts
      const today = new Date().toDateString();
      const swipeData = await AsyncStorage.getItem('swipe_count_date');
      const swipeDataParsed = swipeData ? JSON.parse(swipeData) : null;
      if (swipeDataParsed && swipeDataParsed.date === today) {
        setSwipeCount(swipeDataParsed.count);
      } else {
        await AsyncStorage.setItem('swipe_count_date', JSON.stringify({ date: today, count: 0 }));
        setSwipeCount(0);
      }
      const moodData = await AsyncStorage.getItem('moodboard_count');
      if (moodData) setMoodboardCount(parseInt(moodData));
    } catch (e) {}
  };

  const incrementSwipeCount = async () => {
    const today = new Date().toDateString();
    const newCount = swipeCount + 1;
    setSwipeCount(newCount);
    await AsyncStorage.setItem('swipe_count_date', JSON.stringify({ date: today, count: newCount }));
  };

  const incrementMoodboardCount = async () => {
    const newCount = moodboardCount + 1;
    setMoodboardCount(newCount);
    await AsyncStorage.setItem('moodboard_count', String(newCount));
  };

  const loadVendors = async () => {
    try {
      setLoading(true);
      setError(false);
      const result = await getVendors(category, city);
      if (result.success && result.data?.length > 0) {
        let filtered = result.data;
        if (budget) {
          const budgetNum = parseInt(budget);
          filtered = filtered.filter((v: any) => v.starting_price <= budgetNum);
        }
        setVendors(filtered.length > 0 ? filtered : getFallback());
      } else {
        setVendors(getFallback());
      }
    } catch (e) {
      setError(true);
      setVendors(getFallback());
    } finally {
      setLoading(false);
    }
  };

  const getFallback = () => {
    if (!category) return MOCK_VENDORS;
    return MOCK_VENDORS.filter(v => v.category === category);
  };

  // ─── Swipe interpolations ───────────────────────────────────────────────────
  const rotation = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const saveOverlayOpacity = position.x.interpolate({
    inputRange: [0, width / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const passOverlayOpacity = position.x.interpolate({
    inputRange: [-width / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ─── Swipe action refs — fixes stale closure in PanResponder ─────────────────
  const swipeRightRef = useRef<() => void>(() => {});
  const swipeLeftRef = useRef<() => void>(() => {});

  // ─── PanResponder — card only, no TouchableOpacity conflict ────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only take over if movement is significant — prevents tap/swipe conflict
        return Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 8;
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 120) {
          swipeRightRef.current();
        } else if (gesture.dx < -120) {
          swipeLeftRef.current();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  // ─── Toast helper ───────────────────────────────────────────────────────────
  const fireToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowToast(false));
  };

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleSwipeRight = () => {
    const vendor = vendors[currentIndex];
    if (!vendor) return;

    // Check moodboard limit BEFORE saving
    if (moodboardCount >= MOODBOARD_SAVE_LIMIT) {
      setShowMoodboardWall(true);
      // Still animate card out — don't save it
      Animated.timing(position, {
        toValue: { x: width + 100, y: 0 },
        duration: 250,
        useNativeDriver: false,
      }).start(() => nextCard());
      incrementSwipeCount();
      return;
    }

    // Animate card out right
    Animated.timing(position, {
      toValue: { x: width + 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => nextCard());

    setSavedCount(prev => prev + 1);
    incrementMoodboardCount();

    // Save to moodboard
    if (userId) {
      try {
        const imageUrl = vendor.portfolio_images?.[0] || '';
        addToMoodboard(userId, vendor.id, imageUrl).catch(() => {});
      } catch (e) {
        // Fail silently — don't break the swipe experience
      }
    }

    // Blind mode reveal
    if (blindMode) {
      setRevealName(vendor.name);
      fireToast(`You loved their work ✦`);
      setTimeout(() => setRevealName(null), 3000);
    } else {
      fireToast('Saved to Moodboard ✦');
    }
  };

  const handleSwipeLeft = () => {
    // Check daily swipe limit
    if (swipeCount >= DAILY_SWIPE_LIMIT) {
      setShowSwipeWall(true);
      return;
    }
    incrementSwipeCount();
    Animated.timing(position, {
      toValue: { x: -width - 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => nextCard());
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false,
    }).start();
  };

  const nextCard = () => {
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(prev => {
      currentIndexRef.current = prev + 1;
      return prev + 1;
    });
  };

  // Keep refs pointing to latest handlers — fixes stale closure in PanResponder
  useEffect(() => {
    swipeRightRef.current = handleSwipeRight;
    swipeLeftRef.current = handleSwipeLeft;
  });

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
    return `₹${(price / 1000).toFixed(0)}K`;
  };

  const categoryLabel = category
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase()) || 'All Vendors';

  const vendor = vendors[currentIndex];
  const nextVendor = vendors[currentIndex + 1];

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#2C2420" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryLabel}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color="#C9A84C" size="large" />
          <Text style={styles.loadingText}>Finding vendors...</Text>
        </View>
      </View>
    );
  }

  // ─── Empty / error states ───────────────────────────────────────────────────
  if (!vendor) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#2C2420" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryLabel}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptySubtitle}>
            You've seen all vendors in this category.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()}>
            <Text style={styles.emptyBtnText}>GO BACK</Text>
          </TouchableOpacity>
          {savedCount > 0 && (
            <TouchableOpacity
              style={styles.moodboardBtn}
              onPress={() => router.push('/moodboard')}
            >
              <Text style={styles.moodboardBtnText}>
                View {savedCount} saved vendor{savedCount > 1 ? 's' : ''} →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ─── Main swipe screen ──────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Swipe Limit Wall ── */}
      {showSwipeWall && (
        <View style={freemiumStyles.wall}>
          <View style={freemiumStyles.card}>
            <Text style={freemiumStyles.emoji}>✦</Text>
            <Text style={freemiumStyles.title}>Daily limit reached</Text>
            <Text style={freemiumStyles.sub}>You've seen {DAILY_SWIPE_LIMIT} vendors today. Come back tomorrow — or unlock unlimited swipes with Premium.</Text>
            <View style={freemiumStyles.countdownRow}>
              <Feather name="clock" size={13} color="#C9A84C" />
              <Text style={freemiumStyles.countdown}>Resets at midnight</Text>
            </View>
            <TouchableOpacity style={freemiumStyles.upgradeBtn} onPress={() => setShowSwipeWall(false)}>
              <Text style={freemiumStyles.upgradeBtnText}>UPGRADE TO PREMIUM — Rs.499/mo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={freemiumStyles.dismissBtn} onPress={() => { setShowSwipeWall(false); router.back(); }}>
              <Text style={freemiumStyles.dismissBtnText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Moodboard Full Wall ── */}
      {showMoodboardWall && (
        <View style={freemiumStyles.wall}>
          <View style={freemiumStyles.card}>
            <Text style={freemiumStyles.emoji}>♡</Text>
            <Text style={freemiumStyles.title}>Moodboard is full</Text>
            <Text style={freemiumStyles.sub}>Free accounts can save up to {MOODBOARD_SAVE_LIMIT} vendors. Upgrade to save up to 30 and build your dream team.</Text>
            <TouchableOpacity style={freemiumStyles.upgradeBtn} onPress={() => setShowMoodboardWall(false)}>
              <Text style={freemiumStyles.upgradeBtnText}>UPGRADE TO PREMIUM — Rs.499/mo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={freemiumStyles.dismissBtn} onPress={() => setShowMoodboardWall(false)}>
              <Text style={freemiumStyles.dismissBtnText}>Continue browsing</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Toast */}
      {showToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Blind mode reveal */}
      {revealName && (
        <Animated.View style={[styles.revealBanner, { opacity: toastOpacity }]}>
          <Text style={styles.revealLabel}>You just saved</Text>
          <Text style={styles.revealName}>{revealName}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#2C2420" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{categoryLabel}</Text>
          <Text style={styles.headerCount}>
            {currentIndex + 1} of {vendors.length}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {/* Blind mode toggle */}
          <TouchableOpacity
            style={[styles.blindToggle, blindMode && styles.blindToggleActive]}
            onPress={() => setBlindMode(prev => !prev)}
            activeOpacity={0.8}
          >
            <Feather
              name={blindMode ? 'eye-off' : 'eye'}
              size={12}
              color={blindMode ? '#F5F0E8' : '#8C7B6E'}
            />
            <Text style={[
              styles.blindToggleText,
              blindMode && styles.blindToggleTextActive,
            ]}>
              Blind
            </Text>
          </TouchableOpacity>

          {/* Filter */}
          <TouchableOpacity
            onPress={() => router.push('/filter?from=swipe' as any)}
            style={styles.filterBtn}
          >
            <Feather name="sliders" size={16} color="#C9A84C" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Card stack */}
      <View style={styles.cardContainer}>

        {/* Card behind — next vendor preview */}
        {nextVendor && (
          <View style={[styles.card, styles.cardBehind]}>
            <Image
              source={{ uri: nextVendor.portfolio_images?.[0] || '' }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.cardOverlay} />
          </View>
        )}

        {/* Active card — panResponder ONLY, no TouchableOpacity */}
        <Animated.View
          style={[styles.card, {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate: rotation },
            ],
          }]}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri: vendor.portfolio_images?.[0] || '' }}
            style={styles.cardImage}
            resizeMode="cover"
          />

          {/* Bottom gradient */}
          <View style={styles.cardGradient} />

          {/* Verified badge — top left */}
          {vendor.is_verified && (
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={10} color="#2C2420" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}

          {/* Rating — top right */}
          <View style={styles.ratingBadge}>
            <Feather name="star" size={10} color="#C9A84C" />
            <Text style={styles.ratingText}>{vendor.rating}</Text>
          </View>

          {/* SAVE overlay stamp */}
          <Animated.View style={[
            styles.overlayStamp,
            styles.saveStamp,
            { opacity: saveOverlayOpacity },
          ]}>
            <Text style={styles.saveStampText}>SAVE</Text>
          </Animated.View>

          {/* PASS overlay stamp */}
          <Animated.View style={[
            styles.overlayStamp,
            styles.passStamp,
            { opacity: passOverlayOpacity },
          ]}>
            <Text style={styles.passStampText}>PASS</Text>
          </Animated.View>

          {/* Card info — bottom */}
          <View style={styles.cardInfo}>

            {/* Blind mode — show only vibe tags */}
            {blindMode ? (
              <View style={styles.blindModeInfo}>
                <Text style={styles.blindModeLabel}>Blind Mode — judge the work</Text>
                <View style={styles.vibeTags}>
                  {vendor.vibe_tags?.slice(0, 3).map((v: string) => (
                    <View key={v} style={styles.vibeTag}>
                      <Text style={styles.vibeTagText}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{vendor.name}</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert(
                    'Social Proof Signals — Build 2',
                    'Coming in Build 2: Real-time activity signals on every vendor card. Couples will see how many others have saved or booked this vendor this month — the same psychological mechanic that drives Amazon purchases. Zero extra data needed, just a query on existing saves.',
                    [{ text: 'Got it' }]
                  )}
                  activeOpacity={0.8}
                >
                  <View style={styles.socialProofBadge}>
                    <Feather name="lock" size={8} color="#C9A84C" />
                    <Text style={styles.socialProofText}>47 couples saved this month</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.vendorMeta}>
                  <Feather name="map-pin" size={11} color="#C9A84C" />
                  <Text style={styles.vendorCity}>{vendor.city}</Text>
                </View>
                <View style={styles.vendorBottom}>
                  <Text style={styles.vendorPrice}>
                    {formatPrice(vendor.starting_price)} onwards
                  </Text>
                  <View style={styles.vibeTags}>
                    {vendor.vibe_tags?.slice(0, 2).map((v: string) => (
                      <View key={v} style={styles.vibeTag}>
                        <Text style={styles.vibeTagText}>{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

          </View>
        </Animated.View>
      </View>

      {/* Three action buttons */}
      <View style={styles.actions}>

        {/* Pass — smallest, muted */}
        <TouchableOpacity
          style={styles.passBtn}
          onPress={handleSwipeLeft}
          activeOpacity={0.8}
        >
          <Feather name="x" size={22} color="#8C7B6E" />
        </TouchableOpacity>

        {/* Profile — medium, dark with gold icon */}
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push(`/vendor-profile?id=${vendor.id}` as any)}
          activeOpacity={0.8}
        >
          <Feather name="eye" size={20} color="#C9A84C" />
        </TouchableOpacity>

        {/* Save — largest, gold fill */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSwipeRight}
          activeOpacity={0.8}
        >
          <Feather name="heart" size={26} color="#2C2420" />
        </TouchableOpacity>

      </View>

      {/* Genie budget bar */}
      <View style={styles.genieBar}>
        <Feather name="zap" size={11} color="#C9A84C" />
        <Text style={styles.genieText}>
          {userBudget
            ? `Genie · ${savedCount} saved · Budget ₹${formatPrice(userBudget)}`
            : `Genie · ${savedCount} vendor${savedCount !== 1 ? 's' : ''} saved`
          }
        </Text>
      </View>

    </View>
  );
}

const CARD_HEIGHT = height * 0.56;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 16,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  headerCount: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Blind mode toggle
  blindToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    backgroundColor: '#FFFFFF',
  },
  blindToggleActive: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  blindToggleText: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_400Regular',
    letterSpacing: 0.3,
  },
  blindToggleTextActive: {
    color: '#F5F0E8',
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },

  // Card stack
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: width - 32,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1A1008',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  cardBehind: {
    transform: [{ scale: 0.94 }],
    top: 16,
    opacity: 0.8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,6,3,0.15)',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '52%',
    backgroundColor: 'rgba(10,6,3,0.74)',
  },

  // Badges
  verifiedBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C9A84C',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  verifiedText: {
    fontSize: 10,
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },
  ratingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20,12,4,0.75)',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
  },
  ratingText: {
    fontSize: 12,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
  },

  // Overlay stamps
  overlayStamp: {
    position: 'absolute',
    top: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2.5,
  },
  saveStamp: {
    right: 20,
    borderColor: '#C9A84C',
  },
  saveStampText: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 3,
    color: '#C9A84C',
  },
  passStamp: {
    left: 20,
    borderColor: '#F5F0E8',
  },
  passStampText: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 3,
    color: '#F5F0E8',
  },

  // Card info
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  vendorInfo: {
    gap: 6,
  },
  vendorName: {
    fontSize: 26,
    color: '#F5F0E8',
    fontFamily: 'PlayfairDisplay_300Light',
    letterSpacing: 0.3,
  },
  vendorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vendorCity: {
    fontSize: 13,
    color: '#C9A84C',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
  vendorBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  vendorPrice: {
    fontSize: 14,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.3,
  },

  // Blind mode info
  blindModeInfo: {
    gap: 10,
  },
  blindModeLabel: {
    fontSize: 12,
    color: 'rgba(245,240,232,0.5)',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 1,
    fontStyle: 'italic',
  },

  // Vibe tags
  vibeTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  vibeTag: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  vibeTagText: {
    fontSize: 10,
    color: 'rgba(245,240,232,0.85)',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.5,
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 16,
  },

  // Pass — smallest, white, muted
  passBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Profile — medium, dark, gold icon
  profileBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2C2420',
    borderWidth: 1.5,
    borderColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },

  // Save — largest, gold fill, dark icon
  saveBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },

  // Genie bar
  genieBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  genieText: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 108,
    alignSelf: 'center',
    backgroundColor: '#2C2420',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toastText: {
    fontSize: 13,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.3,
  },

  // Blind mode reveal banner
  revealBanner: {
    position: 'absolute',
    top: 108,
    alignSelf: 'center',
    backgroundColor: '#C9A84C',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 100,
    alignItems: 'center',
    gap: 2,
  },
  revealLabel: {
    fontSize: 10,
    color: '#2C2420',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  revealName: {
    fontSize: 16,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_600SemiBold',
    letterSpacing: 0.3,
  },

  // Loading / empty states
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.5,
  },
  emptyTitle: {
    fontSize: 28,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_300Light',
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 8,
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
  moodboardBtn: {
    marginTop: 8,
  },
  moodboardBtnText: {
    fontSize: 14,
    color: '#C9A84C',
    fontFamily: 'DMSans_400Regular',
    letterSpacing: 0.3,
  },
  socialProofBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    alignSelf: 'flex-start',
  },
  socialProofText: {
    fontSize: 9,
    color: '#C9A84C',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
});

const freemiumStyles = StyleSheet.create({
  wall: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(20,12,4,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#F5F0E8',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  emoji: {
    fontSize: 36,
    color: '#C9A84C',
  },
  title: {
    fontSize: 26,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_300Light',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    textAlign: 'center',
    lineHeight: 22,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdown: {
    fontSize: 13,
    color: '#C9A84C',
    fontFamily: 'DMSans_400Regular',
  },
  upgradeBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  upgradeBtnText: {
    fontSize: 12,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1,
  },
  dismissBtn: {
    paddingVertical: 8,
  },
  dismissBtnText: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
});

import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated, PanResponder, Image, Platform, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getVendors } from '../services/api';

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
  const [savedCount, setSavedCount] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    loadVendors();
  }, [category, city, budget]);

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

  const rotation = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, width / 4],
    outputRange: [0, 1],
  });

  const passOpacity = position.x.interpolate({
    inputRange: [-width / 4, 0],
    outputRange: [1, 0],
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 120) swipeRight();
        else if (gesture.dx < -120) swipeLeft();
        else resetPosition();
      },
    })
  ).current;

  const handleMouseDown = (e: any) => {
    isDragging.current = true;
    startX.current = e.clientX || e.touches?.[0]?.clientX || 0;
    startY.current = e.clientY || e.touches?.[0]?.clientY || 0;
  };

  const handleMouseMove = (e: any) => {
    if (!isDragging.current) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    position.setValue({ x: clientX - startX.current, y: clientY - startY.current });
  };

  const handleMouseUp = (e: any) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const clientX = e.clientX || e.changedTouches?.[0]?.clientX || 0;
    const dx = clientX - startX.current;
    if (dx > 120) swipeRight();
    else if (dx < -120) swipeLeft();
    else resetPosition();
  };

  const showSaveToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const swipeRight = () => {
    setSavedCount(prev => prev + 1);
    showSaveToast();
    Animated.timing(position, {
      toValue: { x: width + 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => nextCard());
  };

  const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -width - 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => nextCard());
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const nextCard = () => {
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(prev => prev + 1);
  };

  const vendor = vendors[currentIndex];
  const nextVendor = vendors[currentIndex + 1];

  const categoryLabel = category
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase()) || 'All Vendors';

  const webHandlers = Platform.OS === 'web' ? {
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp,
    onTouchStart: handleMouseDown,
    onTouchMove: handleMouseMove,
    onTouchEnd: handleMouseUp,
  } : {};

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{categoryLabel}</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#C9A84C" size="large" />
          <Text style={styles.loadingText}>Finding vendors...</Text>
        </View>
      </View>
    );
  }

  if (error && vendors.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.emptySubtitle}>We couldn't load vendors right now.</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={loadVendors}>
          <Text style={styles.emptyBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#8C7B6E', fontSize: 14 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>All caught up</Text>
        <Text style={styles.emptySubtitle}>No more vendors in this category. Check back soon.</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()}>
          <Text style={styles.emptyBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {showToast && (
        <Animated.View style={styles.toast}>
          <Text style={styles.toastText}>Saved to Moodboard ✓</Text>
        </Animated.View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{categoryLabel}</Text>
          <Text style={styles.headerCount}>{currentIndex + 1} of {vendors.length}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/filter?from=swipe')}>
          <Text style={styles.filterBtn}>Filter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.hintRow}>
        <Text style={styles.hint}>Pass ←</Text>
        <View style={styles.hintDot} />
        <Text style={styles.hint}>→ Save</Text>
      </View>

      <View style={styles.cardContainer}>
        {nextVendor && (
          <View style={[styles.card, styles.cardBehind]}>
            <Image
              source={{ uri: nextVendor.portfolio_images?.[0] || nextVendor.image }}
              style={styles.cardImage}
            />
          </View>
        )}

        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate: rotation },
              ],
            },
          ]}
          {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
          {...(Platform.OS === 'web' ? webHandlers : {})}
        >
          <View style={styles.cardTapArea}>
            <Image
              source={{ uri: vendor.portfolio_images?.[0] || vendor.image }}
              style={styles.cardImage}
            />

            {vendor.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}

            <Animated.View style={[styles.overlayLabel, styles.saveLabel, { opacity: likeOpacity }]}>
              <Text style={styles.overlayText}>SAVE</Text>
            </Animated.View>

            <Animated.View style={[styles.overlayLabel, styles.passLabel, { opacity: passOpacity }]}>
              <Text style={styles.overlayText}>PASS</Text>
            </Animated.View>

            <View style={styles.cardInfo}>
              <View style={styles.cardInfoTop}>
                <View style={styles.cardInfoLeft}>
                  <Text style={styles.vendorName}>{vendor.name}</Text>
                  <Text style={styles.vendorCity}>{vendor.city}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>★ {vendor.rating}</Text>
                </View>
              </View>

              <View style={styles.cardInfoBottom}>
                <Text style={styles.vendorPrice}>
                  ₹{(vendor.starting_price / 100000).toFixed(0)}L onwards
                </Text>
                <View style={styles.vibeTags}>
                  {vendor.vibe_tags?.slice(0, 2).map((v: string) => (
                    <View key={v} style={styles.vibeTag}>
                      <Text style={styles.vibeTagText}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.lookalikeBtn}
                onPress={() => router.push(`/lookalike?vendorName=${vendor.name}&category=${vendor.category}`)}
              >
                <Text style={styles.lookalikeBtnText}>Find similar style in my budget →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.passBtn} onPress={swipeLeft}>
          <Text style={styles.passBtnText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.heartBtn} onPress={swipeRight}>
          <Text style={styles.heartBtnText}>♥</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.genieBar}>
        <Text style={styles.genieText}>Genie · Estimated spend: ₹0 of ₹25L budget</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: '#8C7B6E', letterSpacing: 0.5 },
  toast: { position: 'absolute', top: 110, alignSelf: 'center', backgroundColor: '#2C2420', borderRadius: 50, paddingHorizontal: 20, paddingVertical: 10, zIndex: 100 },
  toastText: { fontSize: 13, color: '#C9A84C', fontWeight: '500', letterSpacing: 0.3 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 8 },
  backBtn: { fontSize: 22, color: '#2C2420' },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 17, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  headerCount: { fontSize: 11, color: '#8C7B6E', letterSpacing: 0.5 },
  filterBtn: { fontSize: 13, color: '#C9A84C', fontWeight: '500' },
  hintRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 12 },
  hint: { fontSize: 12, color: '#8C7B6E', letterSpacing: 0.5 },
  hintDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#8C7B6E', opacity: 0.5 },
  cardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', width: width - 40, height: height * 0.54, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  cardBehind: { transform: [{ scale: 0.95 }], top: 14 },
  cardTapArea: { flex: 1 },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  verifiedBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: '#C9A84C', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  verifiedText: { fontSize: 10, color: '#FFFFFF', fontWeight: '600', letterSpacing: 0.5 },
  overlayLabel: { position: 'absolute', top: 36, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4, borderWidth: 2 },
  saveLabel: { right: 20, borderColor: '#C9A84C' },
  passLabel: { left: 20, borderColor: '#F5F0E8' },
  overlayText: { fontSize: 16, fontWeight: '700', letterSpacing: 2, color: '#F5F0E8' },
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20,15,10,0.85)', padding: 18, gap: 10 },
  cardInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfoLeft: { gap: 3 },
  vendorName: { fontSize: 18, color: '#F5F0E8', fontWeight: '500', letterSpacing: 0.2 },
  vendorCity: { fontSize: 12, color: '#B8A99A' },
  ratingBadge: { backgroundColor: '#C9A84C', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ratingText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  cardInfoBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendorPrice: { fontSize: 13, color: '#C9A84C', fontWeight: '500' },
  vibeTags: { flexDirection: 'row', gap: 6 },
  vibeTag: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 },
  vibeTagText: { fontSize: 10, color: '#F5F0E8', letterSpacing: 0.3 },
  lookalikeBtn: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10 },
  lookalikeBtnText: { fontSize: 12, color: '#C9A84C', letterSpacing: 0.2 },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40, paddingVertical: 20 },
  passBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E0D5', justifyContent: 'center', alignItems: 'center' },
  passBtnText: { fontSize: 18, color: '#8C7B6E' },
  heartBtn: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  heartBtnText: { fontSize: 24, color: '#C9A84C' },
  genieBar: { paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
  genieText: { fontSize: 12, color: '#8C7B6E', letterSpacing: 0.3 },
  emptyContainer: { flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center', gap: 14, padding: 40 },
  emptyTitle: { fontSize: 26, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  emptySubtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', lineHeight: 22 },
  emptyBtn: { marginTop: 16, backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32 },
  emptyBtnText: { fontSize: 14, color: '#F5F0E8', fontWeight: '500' },
});
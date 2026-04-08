import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated, PanResponder, Image, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

const ALL_VENDORS = [
  {
    id: '1',
    name: 'Arjun Mehta Photography',
    category: 'photographers',
    city: 'Delhi NCR',
    price: '₹80,000 onwards',
    vibe: ['Candid', 'Cinematic'],
    rating: 4.9,
    reviews: 124,
    image: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
  },
  {
    id: '2',
    name: 'The Grand Celebration',
    category: 'venues',
    city: 'Delhi NCR',
    price: '₹5,00,000 onwards',
    vibe: ['Luxury', 'Royal'],
    rating: 4.8,
    reviews: 89,
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800',
  },
  {
    id: '3',
    name: 'Priya Bridal Studio',
    category: 'mua',
    city: 'Delhi NCR',
    price: '₹25,000 onwards',
    vibe: ['Traditional', 'Luxury'],
    rating: 4.7,
    reviews: 203,
    image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
  },
  {
    id: '4',
    name: 'Reel Moments',
    category: 'content-creators',
    city: 'Mumbai',
    price: '₹15,000 onwards',
    vibe: ['Candid', 'Cinematic'],
    rating: 4.9,
    reviews: 67,
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
  },
  {
    id: '5',
    name: 'House of Threads',
    category: 'designers',
    city: 'Mumbai',
    price: '₹1,50,000 onwards',
    vibe: ['Luxury', 'Minimalist'],
    rating: 4.8,
    reviews: 45,
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
  },
  {
    id: '6',
    name: 'Rhythm & Grace',
    category: 'choreographers',
    city: 'Mumbai',
    price: '₹40,000 onwards',
    vibe: ['Festive', 'Traditional'],
    rating: 4.6,
    reviews: 38,
    image: 'https://images.unsplash.com/photo-1545959570-a94084071b5d?w=800',
  },
  {
    id: '7',
    name: 'Kapoor Wedding Films',
    category: 'photographers',
    city: 'Mumbai',
    price: '₹1,20,000 onwards',
    vibe: ['Cinematic', 'Luxury'],
    rating: 4.9,
    reviews: 91,
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
  },
  {
    id: '8',
    name: 'The Rosewood Manor',
    category: 'venues',
    city: 'Jaipur',
    price: '₹8,00,000 onwards',
    vibe: ['Royal', 'Luxury'],
    rating: 4.9,
    reviews: 112,
    image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
  },
  {
    id: '9',
    name: 'Naina Beauty Atelier',
    category: 'mua',
    city: 'Mumbai',
    price: '₹35,000 onwards',
    vibe: ['Luxury', 'Minimalist'],
    rating: 4.8,
    reviews: 156,
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
  },
  {
    id: '10',
    name: 'BTS by Zara',
    category: 'content-creators',
    city: 'Delhi NCR',
    price: '₹20,000 onwards',
    vibe: ['Candid', 'Boho'],
    rating: 4.7,
    reviews: 43,
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
  },
  {
    id: '11',
    name: 'Bass & Beats',
    category: 'dj',
    city: 'Delhi NCR',
    price: '₹30,000 onwards',
    vibe: ['Festive', 'Luxury'],
    rating: 4.7,
    reviews: 55,
    image: 'https://images.unsplash.com/photo-1571266028243-d220c6a5d70b?w=800',
  },
];

export default function SwipeScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);

  const vendors = ALL_VENDORS.filter(v => v.category === category);

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

  // Native mobile swipe
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

  // Web mouse/touch handlers
  const handleMouseDown = (e: any) => {
    isDragging.current = true;
    startX.current = e.clientX || e.touches?.[0]?.clientX || 0;
    startY.current = e.clientY || e.touches?.[0]?.clientY || 0;
  };

  const handleMouseMove = (e: any) => {
    if (!isDragging.current) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    const dx = clientX - startX.current;
    const dy = clientY - startY.current;
    position.setValue({ x: dx, y: dy });
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

  const swipeRight = () => {
    setSavedCount(prev => prev + 1);
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

  const categoryLabel = (category as string)
    ?.replace('-', ' ')
    .replace(/\b\w/g, l => l.toUpperCase()) || 'Vendors';

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

  const webHandlers = Platform.OS === 'web' ? {
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp,
    onTouchStart: handleMouseDown,
    onTouchMove: handleMouseMove,
    onTouchEnd: handleMouseUp,
  } : {};

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryLabel}</Text>
        <TouchableOpacity onPress={() => router.push('/moodboard')}>
          <Text style={styles.savedCount}>
            {savedCount > 0 ? `Saved ${savedCount}` : 'Saved'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <View style={styles.hintRow}>
        <Text style={styles.hint}>Pass ←</Text>
        <View style={styles.hintDot} />
        <Text style={styles.hint}>→ Save</Text>
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>

        {nextVendor && (
          <View style={[styles.card, styles.cardBehind]}>
            <Image source={{ uri: nextVendor.image }} style={styles.cardImage} />
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
          <TouchableOpacity
            style={styles.cardTapArea}
            onPress={() => router.push(`/vendor-profile?id=${vendor.id}`)}
            activeOpacity={1}
          >
            <Image source={{ uri: vendor.image }} style={styles.cardImage} />

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
                <Text style={styles.vendorPrice}>{vendor.price}</Text>
                <View style={styles.vibeTags}>
                  {vendor.vibe.map(v => (
                    <View key={v} style={styles.vibeTag}>
                      <Text style={styles.vibeTagText}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.lookalikeBtn}>
                <Text style={styles.lookalikeBtnText}>Find similar style in my budget →</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.passBtn} onPress={swipeLeft}>
          <Text style={styles.passBtnText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.heartBtn} onPress={swipeRight}>
          <Text style={styles.heartBtnText}>♥</Text>
        </TouchableOpacity>
      </View>

      {/* Genie Bar */}
      <View style={styles.genieBar}>
        <Text style={styles.genieText}>Genie · Estimated spend: ₹0 of ₹25L budget</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  backBtn: {
    fontSize: 22,
    color: '#1C1C1C',
  },
  headerTitle: {
    fontSize: 17,
    color: '#1C1C1C',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  savedCount: {
    fontSize: 13,
    color: '#C9A84C',
    fontWeight: '500',
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 0.5,
  },
  hintDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#8C7B6E',
    opacity: 0.5,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: width - 40,
    height: height * 0.54,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    cursor: 'grab',
  },
  cardBehind: {
    transform: [{ scale: 0.95 }],
    top: 14,
  },
  cardTapArea: {
    flex: 1,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlayLabel: {
    position: 'absolute',
    top: 36,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 2,
  },
  saveLabel: {
    right: 20,
    borderColor: '#C9A84C',
  },
  passLabel: {
    left: 20,
    borderColor: '#FAF6F0',
  },
  overlayText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#FAF6F0',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,10,10,0.8)',
    padding: 18,
    gap: 10,
  },
  cardInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfoLeft: {
    gap: 3,
  },
  vendorName: {
    fontSize: 18,
    color: '#FAF6F0',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  vendorCity: {
    fontSize: 12,
    color: '#B8A99A',
  },
  ratingBadge: {
    backgroundColor: '#C9A84C',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingText: {
    fontSize: 12,
    color: '#FAF6F0',
    fontWeight: '600',
  },
  cardInfoBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorPrice: {
    fontSize: 13,
    color: '#C9A84C',
    fontWeight: '500',
  },
  vibeTags: {
    flexDirection: 'row',
    gap: 6,
  },
  vibeTag: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  vibeTagText: {
    fontSize: 10,
    color: '#FAF6F0',
    letterSpacing: 0.3,
  },
  lookalikeBtn: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
  },
  lookalikeBtnText: {
    fontSize: 12,
    color: '#C9A84C',
    letterSpacing: 0.2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    paddingVertical: 20,
  },
  passBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DDD4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passBtnText: {
    fontSize: 18,
    color: '#8C7B6E',
  },
  heartBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBtnText: {
    fontSize: 24,
    color: '#C9A84C',
  },
  genieBar: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  genieText: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 40,
  },
  emptyTitle: {
    fontSize: 26,
    color: '#1C1C1C',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: '#1C1C1C',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  emptyBtnText: {
    fontSize: 14,
    color: '#FAF6F0',
    fontWeight: '500',
  },
});
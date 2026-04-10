import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getVendor } from '../services/api';

const { width, height } = Dimensions.get('window');
const HERO_HEIGHT = height * 0.52;

const MOCK_VENDOR = {
  id: '1',
  name: 'Joseph Radhik',
  category: 'photographers',
  city: 'Mumbai',
  starting_price: 300000,
  vibe_tags: ['Candid', 'Luxury', 'Cinematic'],
  rating: 5.0,
  review_count: 312,
  is_verified: true,
  about: 'One of India\'s most celebrated wedding photographers. Known for timeless, emotion-driven imagery that tells the complete story of your day.',
  equipment: 'Sony A1, Leica Q2, DJI Mavic 3',
  delivery_time: '8–10 weeks',
  instagram_url: '@josephradhik',
  portfolio_images: [
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
    'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=800',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
  ],
};

export default function VendorProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [vendor, setVendor] = useState<any>(null);
  const [hearted, setHearted] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadVendor();
  }, [id]);

  const loadVendor = async () => {
    try {
      setLoading(true);
      const result = await getVendor(id as string);
      if (result.success && result.data) {
        setVendor(result.data);
      } else {
        setVendor(MOCK_VENDOR);
      }
    } catch {
      setVendor(MOCK_VENDOR);
    } finally {
      setLoading(false);
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 100, HERO_HEIGHT - 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C9A84C" />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Vendor not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorBack}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = vendor.portfolio_images || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Floating Header — appears on scroll */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <Text style={styles.floatingHeaderName} numberOfLines={1}>{vendor.name}</Text>
      </Animated.View>

      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      {/* Heart Button */}
      <TouchableOpacity
        style={[styles.heartBtn, hearted && styles.heartBtnActive]}
        onPress={() => setHearted(!hearted)}
      >
        <Text style={[styles.heartBtnText, hearted && styles.heartBtnTextActive]}>
          {hearted ? '♥' : '♡'}
        </Text>
      </TouchableOpacity>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Gallery */}
        <View style={styles.heroContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={e => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImage(index);
            }}
            scrollEventThrottle={16}
          >
            {images.length > 0 ? images.map((img: string, i: number) => (
              <Image key={i} source={{ uri: img }} style={styles.heroImage} />
            )) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <Text style={styles.heroPlaceholderText}>{vendor.name[0]}</Text>
              </View>
            )}
          </ScrollView>

          {/* Gradient overlay */}
          <View style={styles.heroGradient} />

          {/* Verified badge on image */}
          {vendor.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified Elite</Text>
            </View>
          )}

          {/* Image dots */}
          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_: any, i: number) => (
                <View key={i} style={[styles.imageDot, activeImage === i && styles.imageDotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>

          {/* Name + Rating Row */}
          <View style={styles.nameSection}>
            <View style={styles.nameLeft}>
              <Text style={styles.vendorName}>{vendor.name}</Text>
              <Text style={styles.vendorMeta}>
                {vendor.category?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} · {vendor.city}
              </Text>
            </View>
            <View style={styles.ratingPill}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingScore}>{vendor.rating}</Text>
              <Text style={styles.ratingCount}>({vendor.review_count})</Text>
            </View>
          </View>

          {/* Price + Vibes */}
          <View style={styles.priceVibeRow}>
            <View style={styles.priceTag}>
              <Text style={styles.priceLabel}>Starting from</Text>
              <Text style={styles.priceValue}>
                ₹{(vendor.starting_price / 100000).toFixed(0)}L
              </Text>
            </View>
            <View style={styles.vibeTags}>
              {vendor.vibe_tags?.slice(0, 3).map((v: string) => (
                <View key={v} style={styles.vibeTag}>
                  <Text style={styles.vibeTagText}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* About */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>About</Text>
            <Text style={styles.cardText}>{vendor.about}</Text>
          </View>

          {/* Details */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Details</Text>
            <View style={styles.detailsGrid}>
              {vendor.equipment && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailKey}>Equipment</Text>
                  <Text style={styles.detailValue}>{vendor.equipment}</Text>
                </View>
              )}
              {vendor.delivery_time && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailKey}>Delivery</Text>
                  <Text style={styles.detailValue}>{vendor.delivery_time}</Text>
                </View>
              )}
              {vendor.instagram_url && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailKey}>Instagram</Text>
                  <Text style={[styles.detailValue, { color: '#C9A84C' }]}>{vendor.instagram_url}</Text>
                </View>
              )}
              {vendor.cities && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailKey}>Serves</Text>
                  <Text style={styles.detailValue}>
                    {Array.isArray(vendor.cities) ? vendor.cities.join(', ') : vendor.city}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Video Reviews */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Video Reviews</Text>
            <Text style={styles.cardSubtext}>Only couples who booked via The Dream Wedding can leave reviews</Text>
            <View style={styles.reviewPlaceholder}>
              <Text style={styles.reviewPlaceholderIcon}>▶</Text>
              <Text style={styles.reviewPlaceholderText}>No reviews yet</Text>
            </View>
          </View>

          {/* Find Similar */}
          <TouchableOpacity
            style={styles.lookalikeCard}
            onPress={() => router.push(`/lookalike?vendorName=${vendor.name}&category=${vendor.category}`)}
          >
            <View style={styles.lookalikeLeft}>
              <Text style={styles.lookalikeTitle}>Find similar vendors</Text>
              <Text style={styles.lookalikeSubtitle}>Same style, different budget</Text>
            </View>
            <Text style={styles.lookalikeArrow}>→</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.msgBtn}
          onPress={() => router.push(`/inquiry?id=${vendor.id}&type=inquiry`)}
        >
          <Text style={styles.msgBtnText}>Enquire</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quoteBtn}
          onPress={() => router.push(`/inquiry?id=${vendor.id}&type=quote`)}
        >
          <Text style={styles.quoteBtnText}>Get Quote</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.lockBtn}
          onPress={() => router.push(`/payment?id=${vendor.id}`)}
        >
          <Text style={styles.lockBtnText}>Lock Date</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  loadingContainer: { flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { fontSize: 16, color: '#8C7B6E' },
  errorBack: { fontSize: 14, color: '#C9A84C', marginTop: 8 },

  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 88,
    backgroundColor: '#F5F0E8',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
    zIndex: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D5',
  },
  floatingHeaderName: { fontSize: 16, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },

  backBtn: {
    position: 'absolute',
    top: 52,
    left: 20,
    zIndex: 30,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(20,15,10,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: { fontSize: 18, color: '#FFFFFF' },

  heartBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 30,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(20,15,10,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBtnActive: { backgroundColor: '#2C2420' },
  heartBtnText: { fontSize: 18, color: '#FFFFFF' },
  heartBtnTextActive: { color: '#C9A84C' },

  heroContainer: { position: 'relative', height: HERO_HEIGHT },
  heroImage: { width, height: HERO_HEIGHT, resizeMode: 'cover' },
  heroPlaceholder: { backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  heroPlaceholderText: { fontSize: 80, color: '#C9A84C', fontWeight: '300' },

  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(transparent, rgba(20,15,10,0.6))',
  },

  verifiedBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#C9A84C',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  verifiedText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600', letterSpacing: 0.5 },

  imageDots: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
  },
  imageDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.4)' },
  imageDotActive: { width: 16, backgroundColor: '#FFFFFF' },

  content: { paddingHorizontal: 24, paddingTop: 24, gap: 16 },

  nameSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameLeft: { flex: 1, gap: 5 },
  vendorName: { fontSize: 26, color: '#2C2420', fontWeight: '300', letterSpacing: 0.3, lineHeight: 32 },
  vendorMeta: { fontSize: 13, color: '#8C7B6E', letterSpacing: 0.3 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#2C2420',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ratingStar: { fontSize: 12, color: '#C9A84C' },
  ratingScore: { fontSize: 13, color: '#F5F0E8', fontWeight: '600' },
  ratingCount: { fontSize: 11, color: '#8C7B6E' },

  priceVibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceTag: { gap: 2 },
  priceLabel: { fontSize: 11, color: '#8C7B6E', letterSpacing: 0.5, textTransform: 'uppercase' },
  priceValue: { fontSize: 22, color: '#2C2420', fontWeight: '400', letterSpacing: 0.5 },
  vibeTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: 12 },
  vibeTag: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  vibeTagText: { fontSize: 11, color: '#8C7B6E', letterSpacing: 0.3 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardLabel: { fontSize: 11, color: '#8C7B6E', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  cardText: { fontSize: 15, color: '#2C2420', lineHeight: 26, fontWeight: '300' },
  cardSubtext: { fontSize: 12, color: '#8C7B6E', lineHeight: 18, marginTop: -4 },

  detailsGrid: { gap: 0 },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
  },
  detailKey: { fontSize: 13, color: '#8C7B6E' },
  detailValue: { fontSize: 13, color: '#2C2420', flex: 1, textAlign: 'right', marginLeft: 16 },

  reviewPlaceholder: {
    height: 80,
    backgroundColor: '#F5F0E8',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  reviewPlaceholderIcon: { fontSize: 20, color: '#8C7B6E' },
  reviewPlaceholderText: { fontSize: 13, color: '#8C7B6E' },

  lookalikeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8EC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  lookalikeLeft: { gap: 4 },
  lookalikeTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  lookalikeSubtitle: { fontSize: 12, color: '#8C7B6E' },
  lookalikeArrow: { fontSize: 20, color: '#C9A84C' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#F5F0E8',
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
  },
  msgBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  msgBtnText: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  quoteBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#2C2420',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  quoteBtnText: { fontSize: 13, color: '#2C2420', fontWeight: '600' },
  lockBtn: {
    flex: 1.2,
    backgroundColor: '#2C2420',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  lockBtnText: { fontSize: 13, color: '#C9A84C', fontWeight: '600', letterSpacing: 0.3 },
});
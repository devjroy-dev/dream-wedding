import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Image, ScrollView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display/index';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

const { width } = Dimensions.get('window');

// SWAP: Replace image URIs with real vendor images when confirmed
const VENDORS = [
  // VENUES
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800',
    vendorName: 'The Leela Palace',
    vendorLocation: 'New Delhi',
    category: 'Venues',
    tagline: 'Iconic luxury palace weddings',
    vendorId: 'leela-palace-delhi',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
    vendorName: 'Oberoi Udaivilas',
    vendorLocation: 'Udaipur',
    category: 'Venues',
    tagline: 'Royal lakeside celebrations',
    vendorId: 'oberoi-udaivilas',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800',
    vendorName: 'Taj Falaknuma Palace',
    vendorLocation: 'Hyderabad',
    category: 'Venues',
    tagline: 'Nizam\'s palace, your wedding',
    vendorId: 'taj-falaknuma',
  },
  // DECORATORS
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
    vendorName: 'Wizcraft',
    vendorLocation: 'Mumbai',
    category: 'Decorators',
    tagline: 'Bollywood-grade grand setups',
    vendorId: 'wizcraft',
  },
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
    vendorName: 'Cineyug',
    vendorLocation: 'Mumbai',
    category: 'Decorators',
    tagline: 'Cinematic wedding experiences',
    vendorId: 'cineyug',
  },
  {
    id: '6',
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
    vendorName: 'Ferns N Petals Events',
    vendorLocation: 'Pan India',
    category: 'Decorators',
    tagline: 'Floral luxury at every scale',
    vendorId: 'fnp-events',
  },
  // PHOTOGRAPHERS
  {
    id: '7',
    image: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
    vendorName: 'Joseph Radhik',
    vendorLocation: 'Mumbai',
    category: 'Photographers',
    tagline: 'India\'s most celebrated wedding photographer',
    vendorId: 'joseph-radhik',
  },
  {
    id: '8',
    image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800',
    vendorName: 'WeddingNama',
    vendorLocation: 'Delhi NCR',
    category: 'Photographers',
    tagline: 'Candid storytelling at its finest',
    vendorId: 'weddingnama',
  },
  {
    id: '9',
    image: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800',
    vendorName: 'Colston Julian',
    vendorLocation: 'Bangalore',
    category: 'Photographers',
    tagline: 'Fine art wedding photography',
    vendorId: 'colston-julian',
  },
];

const FILTERS = ['All', 'Venues', 'Decorators', 'Photographers'];

export default function GetInspiredScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);

  const [fontsLoaded] = useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const filtered = activeFilter === 'All'
    ? VENDORS
    : VENDORS.filter(v => v.category === activeFilter);

  const current = filtered[currentIndex];

  const handleEnquiry = () => {
    if (!current) return;
    router.push({
      pathname: '/inquiry',
      params: {
        vendorId: current.vendorId,
        vendorName: current.vendorName,
      },
    } as any);
  };

  // fonts load async — render proceeds

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#2C2420" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Get Inspired</Text>
          <Text style={styles.subtitle}>Venues · Décor · Photography</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
            onPress={() => { setActiveFilter(f); setCurrentIndex(0); }}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.filterPillText,
              activeFilter === f && styles.filterPillTextActive,
            ]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main photo card */}
      {current && (
        <View style={styles.photoWrapper}>
          <Image
            source={{ uri: current.image }}
            style={styles.photo}
            resizeMode="cover"
          />

          {/* Gradient overlay */}
          <View style={styles.overlayTop} />
          <View style={styles.overlayBottom} />

          {/* Counter top right */}
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {filtered.length}
            </Text>
          </View>

          {/* Category tag top left */}
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{current.category}</Text>
          </View>

          {/* Vendor info + enquiry button bottom */}
          <View style={styles.vendorBlock}>
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName}>{current.vendorName}</Text>
              <View style={styles.vendorLocationRow}>
                <Feather name="map-pin" size={11} color="#C9A84C" />
                <Text style={styles.vendorLocation}>{current.vendorLocation}</Text>
              </View>
              <Text style={styles.vendorTagline}>{current.tagline}</Text>
            </View>
            <TouchableOpacity
              style={styles.enquiryBtn}
              onPress={handleEnquiry}
              activeOpacity={0.85}
            >
              <Text style={styles.enquiryBtnText}>Send Enquiry</Text>
              <Feather name="arrow-right" size={13} color="#2C2420" />
            </TouchableOpacity>
          </View>

          {/* Nav arrows + dots */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
              onPress={() => currentIndex > 0 && setCurrentIndex(p => p - 1)}
              activeOpacity={0.8}
            >
              <Feather name="chevron-left" size={20} color="#2C2420" />
            </TouchableOpacity>

            <View style={styles.dots}>
              {filtered.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dot, currentIndex === i && styles.dotActive]}
                  onPress={() => setCurrentIndex(i)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.navBtn, currentIndex === filtered.length - 1 && styles.navBtnDisabled]}
              onPress={() => currentIndex < filtered.length - 1 && setCurrentIndex(p => p + 1)}
              activeOpacity={0.8}
            >
              <Feather name="chevron-right" size={20} color="#2C2420" />
            </TouchableOpacity>
          </View>

        </View>
      )}

      {/* Premium upgrade card */}
      <View style={styles.bottomCard}>
        <View style={styles.bottomLeft}>
          <Text style={styles.premiumTitle}>Unlock All Vendors</Text>
          <Text style={styles.premiumSub}>
            Upgrade to Premium for unlimited access
          </Text>
        </View>
        <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.85}>
          <Text style={styles.upgradeBtnText}>Upgrade</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 3,
  },
  title: {
    fontSize: 18,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.5,
  },

  // Filters
  filterScroll: {
    maxHeight: 44,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  filterPillText: {
    fontSize: 13,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
  },
  filterPillTextActive: {
    color: '#F5F0E8',
    fontFamily: 'DMSans_500Medium',
  },

  // Photo card
  photoWrapper: {
    flex: 1,
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },

  // Overlays
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '25%',
    backgroundColor: 'rgba(20,12,4,0.35)',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(20,12,4,0.72)',
  },

  // Counter
  counter: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(245,240,232,0.9)',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  counterText: {
    fontSize: 11,
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },

  // Category tag
  categoryTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(201,168,76,0.9)',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryTagText: {
    fontSize: 11,
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },

  // Vendor info block
  vendorBlock: {
    position: 'absolute',
    bottom: 64,
    left: 20,
    right: 20,
    gap: 14,
  },
  vendorInfo: {
    gap: 5,
  },
  vendorName: {
    fontSize: 26,
    color: '#F5F0E8',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  vendorLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vendorLocation: {
    fontSize: 12,
    color: '#C9A84C',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
  vendorTagline: {
    fontSize: 13,
    color: 'rgba(245,240,232,0.75)',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },

  // Enquiry button — gold, prominent
  enquiryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C9A84C',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    minWidth: 160,
  },
  enquiryBtnText: {
    fontSize: 13,
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },

  // Navigation
  navRow: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245,240,232,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(245,240,232,0.4)',
  },
  dotActive: {
    width: 20,
    borderRadius: 3,
    backgroundColor: '#C9A84C',
  },

  // Bottom upgrade card
  bottomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginTop: 14,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  bottomLeft: {
    flex: 1,
    gap: 3,
  },
  premiumTitle: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  premiumSub: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
  upgradeBtn: {
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  upgradeBtnText: {
    fontSize: 13,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.3,
  },
});
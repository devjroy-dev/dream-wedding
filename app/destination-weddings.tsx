import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Image, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
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

const { width } = Dimensions.get('window');

// SWAP: Replace image URIs with real event manager wedding images when confirmed
const VENDORS = [
  // FULL SERVICE
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800',
    vendorName: 'Wizcraft International',
    vendorLocation: 'Mumbai · Pan India',
    category: 'Full Service',
    caption: 'Grand Ballroom Wedding',
    tagline: 'India\'s most celebrated event production house',
    vendorId: 'wizcraft',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800',
    vendorName: 'Cineyug',
    vendorLocation: 'Mumbai · Pan India',
    category: 'Full Service',
    caption: 'Cinematic Wedding Experience',
    tagline: 'Bollywood-grade production for your wedding',
    vendorId: 'cineyug',
  },
  // DESTINATION
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800',
    vendorName: 'The Wedding Co.',
    vendorLocation: 'Delhi NCR',
    category: 'Destination',
    caption: 'Udaipur Palace Wedding',
    tagline: 'Specialists in royal destination weddings',
    vendorId: 'the-wedding-co',
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
    vendorName: 'Shaadi Squad',
    vendorLocation: 'Jaipur',
    category: 'Destination',
    caption: 'Heritage Haveli Wedding',
    tagline: 'Rajasthan\'s finest destination wedding planners',
    vendorId: 'shaadi-squad',
  },
  // LUXURY
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800',
    vendorName: 'Bling Events',
    vendorLocation: 'Delhi NCR',
    category: 'Luxury',
    caption: 'Five-Star Grand Reception',
    tagline: 'Where luxury meets flawless execution',
    vendorId: 'bling-events',
  },
  {
    id: '6',
    image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
    vendorName: 'Ferns N Petals Weddings',
    vendorLocation: 'Pan India',
    category: 'Luxury',
    caption: 'Grand Floral Mandap Setup',
    tagline: 'India\'s largest wedding planning network',
    vendorId: 'fnp-weddings',
  },
  // INTIMATE
  {
    id: '7',
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
    vendorName: 'The Wedding Story',
    vendorLocation: 'Mumbai',
    category: 'Intimate',
    caption: 'Garden Micro Wedding',
    tagline: 'Curated intimate weddings with soul',
    vendorId: 'the-wedding-story',
  },
  {
    id: '8',
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
    vendorName: 'Little Big Weddings',
    vendorLocation: 'Bangalore',
    category: 'Intimate',
    caption: 'Intimate Poolside Ceremony',
    tagline: 'Small guest list, big memories',
    vendorId: 'little-big-weddings',
  },
];

const FILTERS = ['All', 'Full Service', 'Destination', 'Luxury', 'Intimate'];

export default function DestinationWeddingsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);
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
          <Text style={styles.title}>Event Managers</Text>
          <Text style={styles.subtitle}>Grand weddings · Full service · Destination</Text>
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

          <View style={styles.overlayTop} />
          <View style={styles.overlayBottom} />

          {/* Counter */}
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {filtered.length}
            </Text>
          </View>

          {/* Category tag */}
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{current.category}</Text>
          </View>

          {/* Vendor info + enquiry */}
          <View style={styles.vendorBlock}>
            <View style={styles.vendorInfo}>
              <Text style={styles.caption}>{current.caption}</Text>
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

          {/* Nav */}
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

      {/* Bottom card */}
      <View style={styles.bottomCard}>
        <View style={styles.bottomLeft}>
          <Text style={styles.premiumTitle}>Plan Your Grand Wedding</Text>
          <Text style={styles.premiumSub}>
            Connect with India's finest event managers
          </Text>
        </View>
        <TouchableOpacity
          style={styles.exploreBtn}
          onPress={() => router.push('/filter?category=event-managers' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.exploreBtnText}>Explore All</Text>
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
    letterSpacing: 0.3,
  },
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
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '20%',
    backgroundColor: 'rgba(20,12,4,0.3)',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(20,12,4,0.78)',
  },
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
  vendorBlock: {
    position: 'absolute',
    bottom: 64,
    left: 20,
    right: 20,
    gap: 14,
  },
  vendorInfo: {
    gap: 4,
  },
  caption: {
    fontSize: 13,
    color: 'rgba(245,240,232,0.6)',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
    marginBottom: 2,
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
    color: 'rgba(245,240,232,0.7)',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },
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
  exploreBtn: {
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exploreBtnText: {
    fontSize: 13,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.3,
  },
});
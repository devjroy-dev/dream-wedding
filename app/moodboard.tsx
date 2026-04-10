import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Image, ActivityIndicator,
  Alert, Share
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMoodboard, removeFromMoodboard } from '../services/api';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 48 - 12) / 2;

const FUNCTIONS = ['All', 'Roka', 'Haldi', 'Mehendi', 'Sangeet', 'Cocktail', 'Wedding', 'Reception'];

export default function MoodboardScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

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
      const result = await getMoodboard(uid);
      if (result.success) {
        setSaved(result.data || []);
      }
    } catch (e) {
      setSaved([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    Alert.alert(
      'Remove from Moodboard',
      'Are you sure?',
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
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my wedding moodboard on The Dream Wedding! ${saved.length} amazing vendors saved. 💍\n\nthedreamwedding.in`,
        title: 'My Dream Wedding Moodboard',
      });
    } catch (e) {}
  };

  const filtered = activeFilter === 'All'
    ? saved
    : saved.filter(s => s.function_tag === activeFilter);

  const getVendorImage = (item: any) => {
    return item.vendors?.portfolio_images?.[0]
      || item.image_url
      || item.vendors?.image
      || 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400';
  };

  const getVendorName = (item: any) => item.vendors?.name || 'Vendor';
  const getVendorCategory = (item: any) => item.vendors?.category
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (l: string) => l.toUpperCase()) || '';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>Moodboard</Text>
        <Text style={styles.count}>{saved.length} saved</Text>
      </View>

      {/* Trending This Week */}
      <TouchableOpacity
        style={styles.trendingBtn}
        onPress={() => router.push('/swipe')}
      >
        <View style={styles.trendingLeft}>
          <Text style={styles.trendingTitle}>✨ Trending This Week</Text>
          <Text style={styles.trendingSub}>See who couples are saving right now</Text>
        </View>
        <Text style={styles.trendingArrow}>›</Text>
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FUNCTIONS.map(fn => (
          <TouchableOpacity
            key={fn}
            style={[styles.filterTab, activeFilter === fn && styles.filterTabActive]}
            onPress={() => setActiveFilter(fn)}
          >
            <Text style={[styles.filterTabText, activeFilter === fn && styles.filterTabTextActive]}>
              {fn}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {saved.length === 0 ? 'Nothing saved yet' : `No ${activeFilter} vendors saved`}
          </Text>
          <Text style={styles.emptySubtitle}>
            {saved.length === 0
              ? 'Heart vendors while swiping to save them here'
              : 'Switch filter or go discover more vendors'}
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/home')}>
            <Text style={styles.emptyBtnText}>Discover Vendors</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.grid}
        >
          {filtered.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push(`/vendor-profile?id=${item.vendor_id}`)}
            >
              <Image
                source={{ uri: getVendorImage(item) }}
                style={styles.cardImage}
              />

              {removing === item.id ? (
                <View style={styles.removeBtn}>
                  <ActivityIndicator size="small" color="#F5F0E8" />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item.id)}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              )}

              <View style={styles.functionTag}>
                <Text style={styles.functionTagText}>
                  {item.function_tag || 'Wedding'}
                </Text>
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {getVendorName(item)}
                </Text>
                <Text style={styles.cardCategory}>
                  {getVendorCategory(item)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 160, width: '100%' }} />
        </ScrollView>
      )}

      {saved.length > 0 && (
        <View style={styles.shareBar}>
          <TouchableOpacity
            style={styles.compareBtn}
            onPress={() => router.push('/compare')}
          >
            <Text style={styles.compareBtnText}>Compare</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
          >
            <Text style={styles.shareBtnText}>Share Moodboard</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navDot} />
          <Text style={[styles.navLabel, styles.navActive]}>Moodboard</Text>
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
  loadingContainer: { flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 12 },
  title: { fontSize: 28, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  count: { fontSize: 13, color: '#8C7B6E' },
  trendingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, marginBottom: 14, padding: 16, backgroundColor: '#2C2420', borderRadius: 14 },
  trendingLeft: { gap: 3 },
  trendingTitle: { fontSize: 14, color: '#C9A84C', fontWeight: '600' },
  trendingSub: { fontSize: 12, color: '#8C7B6E' },
  trendingArrow: { fontSize: 20, color: '#C9A84C' },
  filterScroll: { maxHeight: 44, marginBottom: 16 },
  filterContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  filterTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, borderWidth: 1, borderColor: '#E8E0D5', backgroundColor: '#FFFFFF' },
  filterTabActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  filterTabText: { fontSize: 13, color: '#2C2420' },
  filterTabTextActive: { color: '#F5F0E8', fontWeight: '500' },
  scroll: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, gap: 12 },
  card: { width: IMAGE_SIZE, borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E0D5' },
  cardImage: { width: IMAGE_SIZE, height: IMAGE_SIZE, resizeMode: 'cover' },
  removeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { color: '#F5F0E8', fontSize: 9, fontWeight: '700' },
  functionTag: { position: 'absolute', top: 8, left: 8, backgroundColor: '#2C2420', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  functionTagText: { fontSize: 9, color: '#F5F0E8', fontWeight: '500', letterSpacing: 0.5 },
  cardInfo: { padding: 10, gap: 3 },
  cardName: { fontSize: 12, color: '#2C2420', fontWeight: '500' },
  cardCategory: { fontSize: 11, color: '#8C7B6E' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 24, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  emptySubtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', lineHeight: 22 },
  emptyBtn: { marginTop: 16, backgroundColor: '#2C2420', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  emptyBtnText: { fontSize: 14, color: '#F5F0E8', fontWeight: '500' },
  shareBar: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 90, paddingTop: 12 },
  compareBtn: { borderWidth: 1, borderColor: '#2C2420', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', backgroundColor: '#FFFFFF' },
  compareBtnText: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  shareBtn: { flex: 1, backgroundColor: '#2C2420', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { fontSize: 13, color: '#F5F0E8', fontWeight: '500' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8', position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center', gap: 4 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C9A84C' },
  navLabel: { fontSize: 12, color: '#8C7B6E', letterSpacing: 0.3 },
  navActive: { color: '#2C2420', fontWeight: '600' },
});
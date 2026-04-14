import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Image, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVendors } from '../services/api';

const { width } = Dimensions.get('window');

export default function LookAlikeScreen() {
  const router = useRouter();
  const { vendorName, category, vendorId } = useLocalSearchParams();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBudget, setUserBudget] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [category]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get user budget from session
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.budget) setUserBudget(parsed.budget);
      }

      // Load vendors in same category
      const result = await getVendors(category as string);
      if (result.success && result.data?.length > 0) {
        // Filter out the current vendor and sort by rating
        const filtered = result.data
          .filter((v: any) => v.id !== vendorId)
          .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 6);
        setVendors(filtered);
      } else {
        setVendors([]);
      }
    } catch (e) {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate match score based on vibe tags and price
  const getMatchScore = (vendor: any) => {
    let score = 70; // base score
    if (vendor.rating >= 4.9) score += 15;
    else if (vendor.rating >= 4.7) score += 10;
    if (vendor.is_verified) score += 10;
    if (userBudget && vendor.starting_price <= userBudget * 0.2) score += 5;
    return Math.min(score, 99);
  };

  const categoryLabel = (category as string)
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase()) || 'Vendors';

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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Similar Style</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>
          {categoryLabel} with similar vibe to{'\n'}
          <Text style={styles.subHeaderBold}>{vendorName || 'this vendor'}</Text>
          {userBudget ? ' within your budget' : ''}
        </Text>
      </View>

      {vendors.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No similar vendors yet</Text>
          <Text style={styles.emptySubtitle}>
            More {categoryLabel} are joining The Dream Wedding soon
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push(`/filter?category=${category}`)}
          >
            <Text style={styles.emptyBtnText}>Browse All {categoryLabel}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {vendors.map(vendor => (
            <TouchableOpacity
              key={vendor.id}
              style={styles.vendorCard}
              onPress={() => router.push(`/vendor-profile?id=${vendor.id}`)}
            >
              <Image
                source={{ uri: vendor.portfolio_images?.[0] || vendor.image }}
                style={styles.vendorImage}
              />

              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>{getMatchScore(vendor)}% match</Text>
              </View>

              {vendor.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}

              <View style={styles.vendorInfo}>
                <View style={styles.vendorInfoTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vendorName}>{vendor.name}</Text>
                    <Text style={styles.vendorCity}>{vendor.city}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>★ {vendor.rating}</Text>
                  </View>
                </View>
                <View style={styles.vendorInfoBottom}>
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
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.inquireBtn}
                    onPress={() => router.push(`/inquiry?id=${vendor.id}&type=inquiry`)}
                  >
                    <Text style={styles.inquireBtnText}>Enquire</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.lockBtn}
                    onPress={() => router.push(`/payment?id=${vendor.id}`)}
                  >
                    <Text style={styles.lockBtnText}>Lock Date</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', paddingTop: 60 },
  loadingContainer: { flex: 1, backgroundColor: '#FAF6F0', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 8 },
  backBtn: { fontSize: 22, color: '#2C2420', width: 24 },
  title: { fontSize: 17, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  subHeader: { paddingHorizontal: 24, paddingBottom: 20 },
  subHeaderText: { fontSize: 14, color: '#8C7B6E', lineHeight: 22 },
  subHeaderBold: { color: '#2C2420', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, gap: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 22, color: '#2C2420', fontWeight: '300' },
  emptySubtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', lineHeight: 22 },
  emptyBtn: { marginTop: 16, backgroundColor: '#2C2420', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  emptyBtnText: { fontSize: 14, color: '#F5F0E8', fontWeight: '500' },
  vendorCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0' },
  vendorImage: { width: '100%', height: 200, resizeMode: 'cover' },
  matchBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: '#2C2420', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5 },
  matchBadgeText: { fontSize: 11, color: '#C9A84C', fontWeight: '600', letterSpacing: 0.3 },
  verifiedBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: '#C9A84C', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  verifiedText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  vendorInfo: { padding: 16, gap: 10 },
  vendorInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vendorName: { fontSize: 16, color: '#2C2420', fontWeight: '500' },
  vendorCity: { fontSize: 12, color: '#8C7B6E', marginTop: 2 },
  ratingBadge: { backgroundColor: '#C9A84C', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ratingText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  vendorInfoBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendorPrice: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  vibeTags: { flexDirection: 'row', gap: 6 },
  vibeTag: { borderWidth: 1, borderColor: '#EDE8E0', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  vibeTagText: { fontSize: 11, color: '#8C7B6E' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  inquireBtn: { flex: 1, borderWidth: 1, borderColor: '#EDE8E0', borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#FAF6F0' },
  inquireBtnText: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  lockBtn: { flex: 1, backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  lockBtnText: { fontSize: 13, color: '#C9A84C', fontWeight: '500' },
});
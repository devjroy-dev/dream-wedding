import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMoodboard, getVendor } from '../services/api';

const { width } = Dimensions.get('window');

const COMPARE_FIELDS = [
  { key: 'starting_price', label: 'Starting Price', format: (v: any) => v ? `₹${(v/100000).toFixed(0)}L` : '—' },
  { key: 'rating', label: 'Rating', format: (v: any) => v ? `★ ${v}` : '—' },
  { key: 'review_count', label: 'Reviews', format: (v: any) => v ? `${v} reviews` : '—' },
  { key: 'delivery_time', label: 'Delivery', format: (v: any) => v || '—' },
  { key: 'city', label: 'City', format: (v: any) => v || '—' },
  { key: 'equipment', label: 'Equipment', format: (v: any) => v || '—' },
];

export default function CompareScreen() {
  const router = useRouter();
  const { ids } = useLocalSearchParams();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendors();
  }, [ids]);

  const loadVendors = async () => {
    try {
      setLoading(true);

      // If vendor IDs passed as params, use those
      if (ids) {
        const idList = (ids as string).split(',');
        const results = await Promise.all(idList.map(id => getVendor(id)));
        const loaded = results.filter(r => r.success).map(r => r.data);
        if (loaded.length > 0) {
          setVendors(loaded);
          return;
        }
      }

      // Otherwise load from moodboard
      const session = await AsyncStorage.getItem('user_session');
      if (!session) return;
      const parsed = JSON.parse(session);
      const uid = parsed.userId || parsed.uid;
      const result = await getMoodboard(uid);
      if (result.success && result.data?.length > 0) {
        // Take first 2-3 saved vendors for comparison
        const moodboardItems = result.data.slice(0, 3);
        const vendorResults = await Promise.all(
          moodboardItems.map((item: any) => getVendor(item.vendor_id))
        );
        const loaded = vendorResults.filter(r => r.success).map(r => r.data);
        setVendors(loaded);
      } else {
        // Fallback to mock
        setVendors(MOCK_VENDORS);
      }
    } catch (e) {
      setVendors(MOCK_VENDORS);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  if (vendors.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Compare</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nothing to compare</Text>
          <Text style={styles.emptySubtitle}>Save vendors to your moodboard to compare them</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/home')}>
            <Text style={styles.emptyBtnText}>Discover Vendors</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const colWidth = (width - 48 - 90 - (12 * vendors.length)) / vendors.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Compare · {vendors.length} vendors</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Vendor Names */}
        <View style={styles.vendorRow}>
          <View style={styles.labelCol} />
          {vendors.map(vendor => (
            <View key={vendor.id} style={[styles.vendorCol, { width: colWidth }]}>
              <View style={styles.vendorAvatar}>
                <Text style={styles.vendorAvatarText}>{vendor.name?.[0]}</Text>
              </View>
              <Text style={styles.vendorName} numberOfLines={2}>{vendor.name}</Text>
              {vendor.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ Verified</Text>
                </View>
              )}
              <Text style={styles.vendorCategory}>
                {vendor.category?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Comparison Fields */}
        {COMPARE_FIELDS.map((field, fIndex) => (
          <View key={field.key}>
            <View style={styles.compareRow}>
              <View style={styles.labelCol}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
              </View>
              {vendors.map(vendor => (
                <View key={vendor.id} style={[styles.valueCol, { width: colWidth }]}>
                  <Text style={styles.fieldValue} numberOfLines={2}>
                    {field.format(vendor[field.key])}
                  </Text>
                </View>
              ))}
            </View>
            {fIndex < COMPARE_FIELDS.length - 1 && <View style={styles.rowDivider} />}
          </View>
        ))}

        {/* Vibe Tags */}
        <View style={styles.divider} />
        <View style={styles.compareRow}>
          <View style={styles.labelCol}>
            <Text style={styles.fieldLabel}>Vibe</Text>
          </View>
          {vendors.map(vendor => (
            <View key={vendor.id} style={[styles.valueCol, { width: colWidth }]}>
              {vendor.vibe_tags?.slice(0, 2).map((v: string) => (
                <View key={v} style={styles.vibeTag}>
                  <Text style={styles.vibeTagText}>{v}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.divider} />
        <View style={styles.compareRow}>
          <View style={styles.labelCol} />
          {vendors.map(vendor => (
            <View key={vendor.id} style={[styles.valueCol, { width: colWidth }]}>
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => router.push(`/vendor-profile?id=${vendor.id}`)}
              >
                <Text style={styles.profileBtnText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.lockBtn}
                onPress={() => router.push(`/payment?id=${vendor.id}`)}
              >
                <Text style={styles.lockBtnText}>Lock Date</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const MOCK_VENDORS = [
  {
    id: '1',
    name: 'Joseph Radhik',
    category: 'photographers',
    city: 'Mumbai',
    starting_price: 300000,
    rating: 5.0,
    review_count: 312,
    is_verified: true,
    vibe_tags: ['Candid', 'Luxury'],
    delivery_time: '8–12 weeks',
    equipment: 'Leica, Nikon D6',
  },
  {
    id: '8',
    name: 'Arjun Mehta Photography',
    category: 'photographers',
    city: 'Delhi NCR',
    starting_price: 150000,
    rating: 4.8,
    review_count: 156,
    is_verified: true,
    vibe_tags: ['Candid', 'Editorial'],
    delivery_time: '6–8 weeks',
    equipment: 'Canon R5, Sony A7IV',
  },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', paddingTop: 60 },
  loadingContainer: { flex: 1, backgroundColor: '#FAF6F0', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 24 },
  backBtn: { fontSize: 22, color: '#2C2420', width: 24 },
  title: { fontSize: 17, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 24, color: '#2C2420', fontWeight: '300' },
  emptySubtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', lineHeight: 22 },
  emptyBtn: { marginTop: 16, backgroundColor: '#2C2420', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  emptyBtnText: { fontSize: 14, color: '#F5F0E8', fontWeight: '500' },
  vendorRow: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 20, gap: 12 },
  labelCol: { width: 90 },
  vendorCol: { alignItems: 'center', gap: 6 },
  vendorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  vendorAvatarText: { fontSize: 20, color: '#C9A84C', fontWeight: '300' },
  vendorName: { fontSize: 12, color: '#2C2420', fontWeight: '500', textAlign: 'center', lineHeight: 16 },
  vendorCategory: { fontSize: 10, color: '#8C7B6E', textAlign: 'center' },
  verifiedBadge: { backgroundColor: '#C9A84C', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 },
  verifiedText: { fontSize: 9, color: '#FFFFFF', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 24 },
  compareRow: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, gap: 12, alignItems: 'flex-start' },
  rowDivider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 24 },
  fieldLabel: { fontSize: 12, color: '#8C7B6E', width: 90, paddingTop: 2 },
  valueCol: { alignItems: 'center', gap: 4 },
  fieldValue: { fontSize: 13, color: '#2C2420', fontWeight: '500', textAlign: 'center' },
  vibeTag: { borderWidth: 1, borderColor: '#EDE8E0', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  vibeTagText: { fontSize: 10, color: '#8C7B6E' },
  profileBtn: { backgroundColor: '#FFFFFF', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#EDE8E0', alignItems: 'center', width: '100%' },
  profileBtnText: { fontSize: 11, color: '#2C2420', fontWeight: '500' },
  lockBtn: { backgroundColor: '#2C2420', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', width: '100%', marginTop: 6 },
  lockBtnText: { fontSize: 11, color: '#C9A84C', fontWeight: '500' },
});
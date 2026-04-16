"""
Session 6 — Patch 6: Moodboard Pinterest Overhaul
Transforms moodboard from saved-vendor list into Pinterest-style
inspiration board with folders, tags, masonry grid.
Preserves saved vendor data + actions (message, enquire).
"""

moodboard = r'''import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, ScrollView, Image, ActivityIndicator,
  Alert, Share, TextInput, Modal,
  BackHandler,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { getMoodboard, removeFromMoodboard } from '../services/api';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');
const COL_WIDTH = (width - 56) / 2;

const FOLDERS = ['All', 'Venues', 'Outfits', 'Decor', 'Photography', 'Food', 'Music', 'Ideas'];
const FUNCTIONS = ['All', 'Roka', 'Haldi', 'Mehendi', 'Sangeet', 'Cocktail', 'Wedding', 'Reception'];

interface Pin {
  id: string;
  image: string;
  title: string;
  folder: string;
  tags: string[];
  source: 'vendor' | 'upload' | 'link';
  vendorId?: string;
  vendorName?: string;
  vendorCategory?: string;
}

export default function MoodboardScreen() {
  const router = useRouter();
  const [activeFolder, setActiveFolder] = useState('All');
  const [activeFunction, setActiveFunction] = useState('All');
  const [saved, setSaved] = useState<any[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddPin, setShowAddPin] = useState(false);
  const [newPinTitle, setNewPinTitle] = useState('');
  const [newPinFolder, setNewPinFolder] = useState('Ideas');

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/home');
      return true;
    });
    return () => backHandler.remove();
  }, []);

  useFocusEffect(useCallback(() => { loadMoodboard(); }, []));

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
        const items = result.data || [];
        setSaved(items);
        // Convert saved vendors to pins
        const vendorPins: Pin[] = items.map((item: any) => ({
          id: item.id,
          image: item.vendors?.portfolio_images?.[0] || item.image_url || 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400',
          title: item.vendors?.name || 'Vendor',
          folder: getCategoryFolder(item.vendors?.category),
          tags: [item.function_tag || 'Wedding'],
          source: 'vendor' as const,
          vendorId: item.vendor_id,
          vendorName: item.vendors?.name,
          vendorCategory: item.vendors?.category?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        }));
        setPins(vendorPins);
      }

      // Load custom pins
      const customPins = await AsyncStorage.getItem(`custom_pins_${uid}`);
      if (customPins) {
        setPins(prev => [...prev, ...JSON.parse(customPins)]);
      }
    } catch (e) { setSaved([]); }
    finally { setLoading(false); }
  };

  const getCategoryFolder = (cat?: string): string => {
    if (!cat) return 'Ideas';
    if (cat.includes('venue')) return 'Venues';
    if (cat.includes('photo') || cat.includes('content')) return 'Photography';
    if (cat.includes('mua') || cat.includes('designer')) return 'Outfits';
    if (cat.includes('dj') || cat.includes('choreo')) return 'Music';
    if (cat.includes('decor')) return 'Decor';
    return 'Ideas';
  };

  const removeAnimations = useRef<Record<string, Animated.Value>>({}).current;
  const getRemoveAnim = (id: string) => {
    if (!removeAnimations[id]) removeAnimations[id] = new Animated.Value(1);
    return removeAnimations[id];
  };

  const handleRemove = async (id: string, isVendor: boolean) => {
    Alert.alert('Remove', 'Remove this from your moodboard?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            setRemoving(id);
            if (isVendor) await removeFromMoodboard(id);
            Animated.timing(getRemoveAnim(id), { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
              setPins(prev => prev.filter(p => p.id !== id));
              setSaved(prev => prev.filter(s => s.id !== id));
              delete removeAnimations[id];
              setRemoving(null);
            });
          } catch (e) {
            Alert.alert('Error', 'Could not remove.');
            setRemoving(null);
          }
        },
      },
    ]);
  };

  const addCustomPin = async () => {
    if (!newPinTitle.trim()) return;
    const pin: Pin = {
      id: Date.now().toString(),
      image: '',
      title: newPinTitle.trim(),
      folder: newPinFolder,
      tags: [],
      source: 'upload',
    };
    const updated = [...pins, pin];
    setPins(updated);
    // Save custom pins separately
    const customOnly = updated.filter(p => p.source !== 'vendor');
    await AsyncStorage.setItem(`custom_pins_${userId}`, JSON.stringify(customOnly));
    setNewPinTitle(''); setShowAddPin(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My wedding inspiration on The Dream Wedding — ${pins.length} ideas saved.\n\nthedreamwedding.in`,
      });
    } catch (e) {}
  };

  const filtered = pins.filter(p => {
    if (activeFolder !== 'All' && p.folder !== activeFolder) return false;
    if (activeFunction !== 'All' && !p.tags.includes(activeFunction)) return false;
    return true;
  });

  // Masonry split — alternate between left and right columns
  const leftCol = filtered.filter((_, i) => i % 2 === 0);
  const rightCol = filtered.filter((_, i) => i % 2 === 1);

  // Folder counts
  const folderCounts = FOLDERS.map(f => ({
    folder: f,
    count: f === 'All' ? pins.length : pins.filter(p => p.folder === f).length,
  }));

  if (loading) {
    return (
      <View style={s.container}>
        <View style={{ paddingHorizontal: 24, paddingTop: 60, marginBottom: 24 }}>
          <View style={{ width: 160, height: 26, borderRadius: 8, backgroundColor: '#EDE8E0', opacity: 0.5, marginBottom: 8 }} />
          <View style={{ width: 100, height: 12, borderRadius: 6, backgroundColor: '#EDE8E0', opacity: 0.3 }} />
        </View>
        <BottomNav />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.title}>Moodboard</Text>
            <Text style={s.subtitle}>{pins.length} inspiration{pins.length !== 1 ? 's' : ''} saved</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={() => setShowAddPin(true)} style={s.headerBtn}>
              <Feather name="plus" size={16} color="#C9A84C" />
            </TouchableOpacity>
            {pins.length > 0 && (
              <TouchableOpacity onPress={handleShare} style={s.headerBtn}>
                <Feather name="share-2" size={16} color="#8C7B6E" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Folder pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.folderScroll} contentContainerStyle={s.folderContent}>
          {folderCounts.map(fc => (
            <TouchableOpacity
              key={fc.folder}
              style={[s.folderPill, activeFolder === fc.folder && s.folderPillActive]}
              onPress={() => setActiveFolder(fc.folder)}
            >
              <Text style={[s.folderText, activeFolder === fc.folder && s.folderTextActive]}>{fc.folder}</Text>
              {fc.count > 0 && <Text style={[s.folderCount, activeFolder === fc.folder && s.folderCountActive]}>{fc.count}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Function tags */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.funcScroll} contentContainerStyle={s.funcContent}>
          {FUNCTIONS.map(fn => (
            <TouchableOpacity
              key={fn}
              style={[s.funcPill, activeFunction === fn && s.funcPillActive]}
              onPress={() => setActiveFunction(fn)}
            >
              <Text style={[s.funcText, activeFunction === fn && s.funcTextActive]}>{fn}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Masonry grid */}
        {filtered.length > 0 ? (
          <View style={s.masonry}>
            <View style={s.masonryCol}>
              {leftCol.map((pin, i) => renderPin(pin, i * 2))}
            </View>
            <View style={s.masonryCol}>
              {rightCol.map((pin, i) => renderPin(pin, i * 2 + 1))}
            </View>
          </View>
        ) : (
          <View style={s.emptyWrap}>
            <Feather name="heart" size={32} color="#E8D9B5" />
            <Text style={s.emptyTitle}>
              {pins.length === 0 ? 'Start pinning inspiration' : 'No pins in this folder'}
            </Text>
            <Text style={s.emptyHint}>
              {pins.length === 0
                ? 'Save vendors from Discover, add your own ideas, or pin from anywhere'
                : 'Try a different folder or tag filter'}
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/swipe' as any)}>
              <Text style={s.emptyBtnText}>Discover Vendors</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav />

      {/* Add Pin Modal */}
      <Modal visible={showAddPin} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Inspiration</Text>
            <TextInput style={s.modalInput} placeholder="What's this about?" placeholderTextColor="#C4B8AC" value={newPinTitle} onChangeText={setNewPinTitle} />
            <Text style={s.modalLabel}>Folder</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.folderPickRow}>
                {FOLDERS.filter(f => f !== 'All').map(f => (
                  <TouchableOpacity key={f} style={[s.folderPickPill, newPinFolder === f && s.folderPickActive]} onPress={() => setNewPinFolder(f)}>
                    <Text style={[s.folderPickText, newPinFolder === f && s.folderPickTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={s.modalPhotoBtn} onPress={() => Alert.alert('Coming Soon', 'Photo upload coming in the next update.')}>
              <Feather name="image" size={16} color="#8C7B6E" />
              <Text style={s.modalPhotoBtnText}>Add Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalBtn} onPress={addCustomPin}>
              <Text style={s.modalBtnText}>Save to Moodboard</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddPin(false)} style={s.modalCancel}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  function renderPin(pin: Pin, index: number) {
    // Vary heights for masonry effect
    const heights = [180, 220, 160, 240, 200];
    const h = pin.image ? heights[index % heights.length] : 100;

    return (
      <Animated.View
        key={pin.id}
        style={[s.pinCard, { opacity: getRemoveAnim(pin.id), transform: [{ scale: getRemoveAnim(pin.id) }] }]}
      >
        {pin.image ? (
          <TouchableOpacity
            onPress={() => pin.vendorId ? router.push(`/vendor-profile?id=${pin.vendorId}` as any) : null}
            activeOpacity={0.9}
          >
            <Image source={{ uri: pin.image }} style={[s.pinImage, { height: h }]} resizeMode="cover" />
          </TouchableOpacity>
        ) : (
          <View style={[s.pinPlaceholder, { height: h }]}>
            <Feather name="image" size={24} color="#E8D9B5" />
          </View>
        )}

        {/* Remove button */}
        <TouchableOpacity style={s.pinRemove} onPress={() => handleRemove(pin.id, pin.source === 'vendor')}>
          {removing === pin.id
            ? <ActivityIndicator size="small" color="#FAF6F0" />
            : <Feather name="x" size={10} color="#FAF6F0" />
          }
        </TouchableOpacity>

        {/* Folder tag */}
        <View style={s.pinFolderTag}>
          <Text style={s.pinFolderTagText}>{pin.folder}</Text>
        </View>

        {/* Info */}
        <View style={s.pinInfo}>
          <Text style={s.pinTitle} numberOfLines={2}>{pin.title}</Text>
          {pin.vendorCategory && <Text style={s.pinCategory}>{pin.vendorCategory}</Text>}
          {pin.source === 'vendor' && (
            <View style={s.pinActions}>
              <TouchableOpacity
                style={s.pinActionBtn}
                onPress={() => router.push(`/messaging?vendorId=${pin.vendorId}` as any)}
              >
                <Feather name="message-circle" size={10} color="#8C7B6E" />
                <Text style={s.pinActionText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.pinActionBtn, s.pinActionGold]}
                onPress={() => router.push(`/inquiry?vendorId=${pin.vendorId}` as any)}
              >
                <Feather name="send" size={10} color="#C9A84C" />
                <Text style={[s.pinActionText, { color: '#C9A84C' }]}>Enquire</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', paddingTop: 60 },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, marginBottom: 16 },
  headerLeft: { flex: 1, gap: 3 },
  title: { fontSize: 26, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3 },
  subtitle: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },

  // Folder pills
  folderScroll: { marginBottom: 8 },
  folderContent: { paddingHorizontal: 24, gap: 8 },
  folderPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, borderWidth: 1, borderColor: '#EDE8E0', backgroundColor: '#FFFFFF' },
  folderPillActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  folderText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  folderTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  folderCount: { fontSize: 10, color: '#C4B8AC', fontFamily: 'DMSans_300Light' },
  folderCountActive: { color: '#C9A84C' },

  // Function tags
  funcScroll: { marginBottom: 16 },
  funcContent: { paddingHorizontal: 24, gap: 6 },
  funcPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 50, backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#EDE8E0' },
  funcPillActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  funcText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  funcTextActive: { color: '#FAF6F0', fontFamily: 'DMSans_500Medium' },

  // Masonry
  masonry: { flexDirection: 'row', paddingHorizontal: 24, gap: 10 },
  masonryCol: { flex: 1, gap: 10 },

  // Pin card
  pinCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE8E0', overflow: 'hidden' },
  pinImage: { width: '100%' },
  pinPlaceholder: { width: '100%', backgroundColor: '#FAF6F0', justifyContent: 'center', alignItems: 'center' },
  pinRemove: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  pinFolderTag: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(44,36,32,0.8)', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  pinFolderTagText: { fontSize: 9, color: '#FAF6F0', fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 },

  pinInfo: { padding: 10, gap: 3 },
  pinTitle: { fontSize: 13, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  pinCategory: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },

  pinActions: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pinActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 5, borderRadius: 6, backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#EDE8E0' },
  pinActionGold: { backgroundColor: '#FFF8EC', borderColor: '#E8D9B5' },
  pinActionText: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', textAlign: 'center' },
  emptyHint: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 12, borderWidth: 1, borderColor: '#E8D9B5', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#FFF8EC' },
  emptyBtnText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  modalLabel: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  folderPickRow: { flexDirection: 'row', gap: 8 },
  folderPickPill: { borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#EDE8E0' },
  folderPickActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  folderPickText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  folderPickTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  modalPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderColor: '#EDE8E0', borderRadius: 10, borderStyle: 'dashed' },
  modalPhotoBtnText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});
'''

with open('app/moodboard.tsx', 'w') as f:
    f.write(moodboard)

print("✓ app/moodboard.tsx — Pinterest-style moodboard")
print("  Masonry grid, folder pills with counts, function tags")
print("  Vendor pins: message + enquire actions preserved")
print("  Custom pins: add ideas, assign to folders")
print("  Animated remove, share support")
print()
print("PATCH 6 COMPLETE")
print("Run: npx tsc --noEmit -p tsconfig.json")

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

interface Props { userId: string; onBack: () => void; }

export default function RegistryTool({ userId, onBack }: Props) {
  const [registry, setRegistry] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [giftName, setGiftName] = useState('');
  const [giftPrice, setGiftPrice] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const s = await AsyncStorage.getItem(`registry_${userId}`); if (s) setRegistry(JSON.parse(s)); } catch (e) {}
  };

  const save = async (r: any[]) => {
    setRegistry(r);
    try { await AsyncStorage.setItem(`registry_${userId}`, JSON.stringify(r)); } catch (e) {}
  };

  const add = () => {
    if (!giftName.trim()) return;
    save([...registry, { id: Date.now().toString(), name: giftName.trim(), price: giftPrice.trim(), claimed: false }]);
    setGiftName(''); setGiftPrice(''); setShowAdd(false);
  };

  const claim = (id: string) => save(registry.map(g => g.id === id ? { ...g, claimed: true } : g));

  const shareRegistry = () => {
    const list = registry.filter(g => !g.claimed).map(g => `• ${g.name}${g.price ? ` (Rs.${g.price})` : ''}`).join('\n');
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(`Our Wedding Gift Registry\n\n${list}\n\nWith love`)}`);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Feather name="arrow-left" size={18} color="#2C2420" /></TouchableOpacity>
        <Text style={s.headerTitle}>Registry</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.backBtn}><Feather name="plus" size={18} color="#C9A84C" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.scrollContent}>
        {registry.length > 0 && (
          <TouchableOpacity style={s.shareBtn} onPress={shareRegistry}>
            <Feather name="share" size={14} color="#C9A84C" />
            <Text style={s.shareBtnText}>Share Registry via WhatsApp</Text>
          </TouchableOpacity>
        )}
        {registry.map(g => (
          <View key={g.id} style={[s.giftCard, g.claimed && { opacity: 0.4 }]}>
            <View style={s.giftInfo}>
              <Text style={s.giftName}>{g.name}</Text>
              {g.price ? <Text style={s.giftPrice}>Rs.{g.price}</Text> : null}
            </View>
            {!g.claimed && (
              <TouchableOpacity onPress={() => claim(g.id)} style={s.claimBtn}>
                <Text style={s.claimText}>Mark Claimed</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {registry.length === 0 && (
          <View style={s.emptyWrap}>
            <Feather name="gift" size={28} color="#E8D9B5" />
            <Text style={s.emptyText}>Your gift registry</Text>
            <Text style={s.emptyHint}>Add gifts you'd love to receive and share the list with family</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Gift</Text>
            <TextInput style={s.modalInput} placeholder="Gift name" placeholderTextColor="#C4B8AC" value={giftName} onChangeText={setGiftName} />
            <TextInput style={s.modalInput} placeholder="Price (optional)" placeholderTextColor="#C4B8AC" value={giftPrice} onChangeText={setGiftPrice} keyboardType="number-pad" />
            <TouchableOpacity style={s.modalBtn} onPress={add}><Text style={s.modalBtnText}>Add Gift</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={s.modalCancel}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderColor: '#E8D9B5', borderRadius: 12, backgroundColor: '#FFF8EC', marginBottom: 16 },
  shareBtnText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },
  giftCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E0', padding: 16, marginBottom: 8 },
  giftInfo: { flex: 1, gap: 2 },
  giftName: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  giftPrice: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_300Light' },
  claimBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#EDE8E0' },
  claimText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptyHint: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', maxWidth: 240 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});

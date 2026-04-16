import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Linking, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { VENDOR_CATEGORIES, getVendorInviteMessage } from '../../constants/journeyConfig';

interface ExternalVendor {
  id: string;
  name: string;
  phone: string;
  category: string;
  notes: string;
  addedAt: string;
}

interface Props { userId: string; session: any; onBack: () => void; }

export default function MyVendorsTool({ userId, session, onBack }: Props) {
  const [filter, setFilter] = useState<'all' | 'tdw' | 'external'>('all');
  const [externalVendors, setExternalVendors] = useState<ExternalVendor[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Photographer');
  const [notes, setNotes] = useState('');

  useEffect(() => { loadExternal(); }, []);

  const loadExternal = async () => {
    try {
      const s = await AsyncStorage.getItem(`ext_vendors_${userId}`);
      if (s) setExternalVendors(JSON.parse(s));
    } catch (e) {}
  };

  const save = async (v: ExternalVendor[]) => {
    setExternalVendors(v);
    try { await AsyncStorage.setItem(`ext_vendors_${userId}`, JSON.stringify(v)); } catch (e) {}
  };

  const addVendor = () => {
    if (!name.trim() || !phone.trim()) { Alert.alert('Missing info', 'Please enter vendor name and phone.'); return; }
    const v: ExternalVendor = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim().replace(/\s/g, ''),
      category,
      notes: notes.trim(),
      addedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    };
    save([v, ...externalVendors]);
    setName(''); setPhone(''); setNotes(''); setShowAdd(false);
  };

  const removeVendor = (id: string) => {
    Alert.alert('Remove Vendor', 'Remove this vendor from your list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => save(externalVendors.filter(v => v.id !== id)) },
    ]);
  };

  const inviteVendor = (v: ExternalVendor) => {
    const coupleName = session?.name?.split(' ')[0] || 'We';
    const msg = getVendorInviteMessage(v.name, coupleName);
    const cleaned = v.phone.replace(/[^0-9]/g, '');
    const num = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    Linking.openURL(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`);
  };

  const callVendor = (phone: string) => Linking.openURL(`tel:${phone}`);
  const whatsappVendor = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    const num = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    Linking.openURL(`https://wa.me/${num}`);
  };

  // TDW vendors placeholder — will come from Supabase bookings
  const tdwVendors: any[] = [];

  const showTdw = filter === 'all' || filter === 'tdw';
  const showExt = filter === 'all' || filter === 'external';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#2C2420" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Vendors</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.backBtn}>
          <Feather name="plus" size={18} color="#C9A84C" />
        </TouchableOpacity>
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {(['all', 'tdw', 'external'] as const).map(f => (
          <TouchableOpacity key={f} style={[s.filterPill, filter === f && s.filterPillActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'tdw' ? 'On TDW' : 'My Own'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* TDW vendors */}
        {showTdw && tdwVendors.length > 0 && tdwVendors.map((v: any) => (
          <View key={v.id} style={s.vendorCard}>
            <Text style={s.vendorName}>{v.name}</Text>
          </View>
        ))}

        {showTdw && tdwVendors.length === 0 && filter === 'tdw' && (
          <View style={s.emptyWrap}>
            <Feather name="search" size={24} color="#E8D9B5" />
            <Text style={s.emptyText}>No TDW vendors booked yet</Text>
            <Text style={s.emptyHint}>Discover and book vendors from the Discover tab</Text>
          </View>
        )}

        {/* External vendors */}
        {showExt && externalVendors.map((v) => (
          <View key={v.id} style={s.vendorCard}>
            <View style={s.vendorTop}>
              <View style={s.vendorAvatar}>
                <Text style={s.vendorInitial}>{v.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={s.vendorInfo}>
                <Text style={s.vendorName}>{v.name}</Text>
                <Text style={s.vendorMeta}>{v.category} · Added {v.addedAt}</Text>
              </View>
              <View style={s.notOnTdw}>
                <Text style={s.notOnTdwText}>Not on TDW</Text>
              </View>
            </View>
            {v.notes ? <Text style={s.vendorNotes}>{v.notes}</Text> : null}
            <View style={s.vendorActions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => callVendor(v.phone)}>
                <Feather name="phone" size={14} color="#8C7B6E" />
                <Text style={s.actionText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => whatsappVendor(v.phone)}>
                <Feather name="message-circle" size={14} color="#25D366" />
                <Text style={[s.actionText, { color: '#25D366' }]}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.inviteBtn]} onPress={() => inviteVendor(v)}>
                <Feather name="send" size={12} color="#C9A84C" />
                <Text style={s.inviteText}>Invite to TDW</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeVendor(v.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="trash-2" size={14} color="#E57373" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {showExt && externalVendors.length === 0 && (
          <View style={s.emptyWrap}>
            <Feather name="briefcase" size={28} color="#E8D9B5" />
            <Text style={s.emptyText}>Add vendors not on TDW</Text>
            <Text style={s.emptyHint}>Keep all your vendors — TDW or not — in one place. Tap + to add.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add vendor modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add External Vendor</Text>
            <TextInput style={s.modalInput} placeholder="Vendor name" placeholderTextColor="#C4B8AC" value={name} onChangeText={setName} />
            <TextInput style={s.modalInput} placeholder="Phone number" placeholderTextColor="#C4B8AC" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.catPills}>
                {VENDOR_CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[s.catPill, category === c && s.catPillActive]} onPress={() => setCategory(c)}>
                    <Text style={[s.catPillText, category === c && s.catPillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TextInput style={s.modalInput} placeholder="Notes (optional)" placeholderTextColor="#C4B8AC" value={notes} onChangeText={setNotes} />
            <TouchableOpacity style={s.modalBtn} onPress={addVendor}>
              <Text style={s.modalBtnText}>Add Vendor</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={s.modalCancel}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  filterPill: { borderRadius: 50, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1, borderColor: '#EDE8E0', backgroundColor: '#FFFFFF' },
  filterPillActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  filterText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  filterTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  vendorCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE8E0', padding: 16, marginBottom: 10, gap: 10 },
  vendorTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vendorAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  vendorInitial: { fontSize: 16, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  vendorInfo: { flex: 1, gap: 2 },
  vendorName: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  vendorMeta: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  notOnTdw: { backgroundColor: '#FAF6F0', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#EDE8E0' },
  notOnTdwText: { fontSize: 9, color: '#C4B8AC', fontFamily: 'DMSans_400Regular' },
  vendorNotes: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', fontStyle: 'italic' },

  vendorActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#EDE8E0', backgroundColor: '#FFFFFF' },
  actionText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  inviteBtn: { borderColor: '#E8D9B5', backgroundColor: '#FFF8EC' },
  inviteText: { fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptyHint: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', maxWidth: 250 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  catPills: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catPill: { borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#EDE8E0' },
  catPillActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  catPillText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  catPillTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});

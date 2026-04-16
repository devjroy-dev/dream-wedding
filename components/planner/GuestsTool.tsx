import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { getGuests, addGuest } from '../../services/api';

const GROUPS = ['Family', 'Friends', 'Work', 'Plus Ones', 'Other'];
const RSVP_COLORS: Record<string, string> = { confirmed: '#4CAF50', declined: '#E57373', pending: '#C9A84C' };

interface Props { userId: string; onBack: () => void; }

export default function GuestsTool({ userId, onBack }: Props) {
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('Family');
  const [newDietary, setNewDietary] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadGuests(); }, []);

  const loadGuests = async () => {
    try {
      setLoading(true);
      const r = await getGuests(userId);
      if (r.success) setGuests(r.data || []);
    } catch (e) { setGuests([]); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      setSaving(true);
      const r = await addGuest({ user_id: userId, name: newName.trim(), group: newGroup, dietary: newDietary.trim() || 'Not specified', rsvp: 'pending' });
      if (r.success) { setGuests(prev => [...prev, r.data]); setNewName(''); setNewDietary(''); setShowAdd(false); }
    } catch (e) { Alert.alert('Error', 'Could not add guest.'); }
    finally { setSaving(false); }
  };

  const groupCounts = GROUPS.map(g => ({
    group: g,
    total: guests.filter(gu => (gu.group || 'Other') === g).length,
    confirmed: guests.filter(gu => (gu.group || 'Other') === g && gu.rsvp === 'confirmed').length,
  }));

  const totalGuests = guests.length;
  const totalConfirmed = guests.filter(g => g.rsvp === 'confirmed').length;
  const filteredGuests = activeGroup ? guests.filter(g => (g.group || 'Other') === activeGroup) : guests;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#2C2420" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Guest List</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.backBtn}>
          <Feather name="plus" size={18} color="#C9A84C" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* Summary */}
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryNum}>{totalGuests}</Text>
            <Text style={s.summaryLabel}>Total</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: '#4CAF50' }]}>{totalConfirmed}</Text>
            <Text style={s.summaryLabel}>Confirmed</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: '#C9A84C' }]}>{totalGuests - totalConfirmed}</Text>
            <Text style={s.summaryLabel}>Pending</Text>
          </View>
        </View>

        {/* Group tiles */}
        <View style={s.groupGrid}>
          {groupCounts.map((gc) => (
            <TouchableOpacity
              key={gc.group}
              style={[s.groupTile, activeGroup === gc.group && s.groupTileActive]}
              onPress={() => setActiveGroup(activeGroup === gc.group ? null : gc.group)}
            >
              <Text style={s.groupName}>{gc.group}</Text>
              <Text style={s.groupCount}>{gc.total}</Text>
              {gc.total > 0 && (
                <View style={s.rsvpRing}>
                  <View style={[s.rsvpFill, { width: `${gc.total > 0 ? (gc.confirmed / gc.total) * 100 : 0}%` }]} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Guest cards */}
        {filteredGuests.map((g) => (
          <View key={g.id || g.name} style={s.guestCard}>
            <View style={s.guestAvatar}>
              <Text style={s.guestInitial}>{g.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={s.guestInfo}>
              <Text style={s.guestName}>{g.name}</Text>
              <Text style={s.guestMeta}>{g.group || 'Other'}{g.dietary && g.dietary !== 'Not specified' ? ` · ${g.dietary}` : ''}</Text>
            </View>
            <View style={[s.rsvpBadge, { backgroundColor: (RSVP_COLORS[g.rsvp] || '#C9A84C') + '18' }]}>
              <Text style={[s.rsvpText, { color: RSVP_COLORS[g.rsvp] || '#C9A84C' }]}>{g.rsvp || 'pending'}</Text>
            </View>
          </View>
        ))}

        {filteredGuests.length === 0 && (
          <View style={s.emptyWrap}>
            <Feather name="users" size={28} color="#E8D9B5" />
            <Text style={s.emptyText}>{loading ? 'Loading guests...' : 'No guests yet'}</Text>
            {!loading && <Text style={s.emptyHint}>Tap + to add your first guest</Text>}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Guest Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Guest</Text>
            <TextInput style={s.modalInput} placeholder="Full name" placeholderTextColor="#C4B8AC" value={newName} onChangeText={setNewName} />
            <View style={s.groupPills}>
              {GROUPS.map(g => (
                <TouchableOpacity key={g} style={[s.groupPill, newGroup === g && s.groupPillActive]} onPress={() => setNewGroup(g)}>
                  <Text style={[s.groupPillText, newGroup === g && s.groupPillTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.modalInput} placeholder="Dietary preference (optional)" placeholderTextColor="#C4B8AC" value={newDietary} onChangeText={setNewDietary} />
            <TouchableOpacity style={[s.modalBtn, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
              <Text style={s.modalBtnText}>{saving ? 'Adding...' : 'Add Guest'}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', padding: 20, marginBottom: 16 },
  summaryItem: { alignItems: 'center', gap: 2 },
  summaryNum: { fontSize: 22, color: '#2C2420', fontFamily: 'PlayfairDisplay_600SemiBold' },
  summaryLabel: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.5 },

  groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  groupTile: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E0', padding: 14, width: '48%' as any, gap: 6 },
  groupTileActive: { borderColor: '#C9A84C', backgroundColor: '#FFFBF3' },
  groupName: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  groupCount: { fontSize: 20, color: '#C9A84C', fontFamily: 'PlayfairDisplay_600SemiBold' },
  rsvpRing: { height: 3, backgroundColor: '#EDE8E0', borderRadius: 2 },
  rsvpFill: { height: 3, backgroundColor: '#4CAF50', borderRadius: 2 },

  guestCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E0', padding: 14, marginBottom: 8 },
  guestAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  guestInitial: { fontSize: 14, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  guestInfo: { flex: 1, gap: 2 },
  guestName: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  guestMeta: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  rsvpBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  rsvpText: { fontSize: 10, fontFamily: 'DMSans_500Medium', letterSpacing: 0.5, textTransform: 'uppercase' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  emptyHint: { fontSize: 12, color: '#C4B8AC', fontFamily: 'DMSans_300Light' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', marginBottom: 4 },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  groupPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupPill: { borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#EDE8E0', backgroundColor: '#FFFFFF' },
  groupPillActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  groupPillText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  groupPillTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});

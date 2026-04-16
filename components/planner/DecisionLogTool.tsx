import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

interface Decision {
  id: string;
  heading: string;
  context: string;
  people: string[];
  date: string;
  category: string;
}

interface Props { userId: string; session: any; onBack: () => void; }

export default function DecisionLogTool({ userId, session, onBack }: Props) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [heading, setHeading] = useState('');
  const [context, setContext] = useState('');
  const [people, setPeople] = useState('');
  const [category, setCategory] = useState('General');

  const CATEGORIES = ['Venue', 'Outfits', 'Photography', 'Decor', 'Food', 'Music', 'General'];

  useEffect(() => { loadDecisions(); }, []);

  const loadDecisions = async () => {
    try {
      const s = await AsyncStorage.getItem(`decisions_${userId}`);
      if (s) setDecisions(JSON.parse(s));
    } catch (e) {}
  };

  const save = async (d: Decision[]) => {
    setDecisions(d);
    try { await AsyncStorage.setItem(`decisions_${userId}`, JSON.stringify(d)); } catch (e) {}
  };

  const add = () => {
    if (!heading.trim()) return;
    const coupleName = session?.name?.split(' ')[0] || 'You';
    const newD: Decision = {
      id: Date.now().toString(),
      heading: heading.trim(),
      context: context.trim(),
      people: people.trim() ? people.split(',').map((p: string) => p.trim()) : [coupleName],
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      category,
    };
    save([newD, ...decisions]);
    setHeading(''); setContext(''); setPeople(''); setCategory('General');
    setShowAdd(false);
  };

  const remove = (id: string) => save(decisions.filter(d => d.id !== id));

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#2C2420" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Decision Log</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.backBtn}>
          <Feather name="plus" size={18} color="#C9A84C" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {decisions.length === 0 ? (
          <View style={s.emptyWrap}>
            <Feather name="book-open" size={32} color="#E8D9B5" />
            <Text style={s.emptyTitle}>Your decision diary</Text>
            <Text style={s.emptyHint}>Record every wedding decision so you never lose context. Who decided what, when, and why.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAdd(true)}>
              <Text style={s.emptyBtnText}>Add first decision</Text>
            </TouchableOpacity>
          </View>
        ) : (
          decisions.map((d) => (
            <View key={d.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardDate}>{d.date}</Text>
                <View style={s.catBadge}>
                  <Text style={s.catBadgeText}>{d.category}</Text>
                </View>
              </View>
              <Text style={s.cardHeading}>{d.heading}</Text>
              {d.context ? <Text style={s.cardContext}>{d.context}</Text> : null}
              <View style={s.peoplePills}>
                {d.people.map((p, i) => (
                  <View key={i} style={s.personPill}>
                    <Text style={s.personText}>{p}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity onPress={() => remove(d.id)} style={s.removeBtn}>
                <Feather name="trash-2" size={12} color="#C4B8AC" />
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Record a Decision</Text>
            <TextInput style={s.modalInput} placeholder="What was decided?" placeholderTextColor="#C4B8AC" value={heading} onChangeText={setHeading} />
            <TextInput style={[s.modalInput, { height: 60 }]} placeholder="Why? Any context..." placeholderTextColor="#C4B8AC" value={context} onChangeText={setContext} multiline />
            <TextInput style={s.modalInput} placeholder="Who was involved? (comma separated)" placeholderTextColor="#C4B8AC" value={people} onChangeText={setPeople} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.catPills}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[s.catPill, category === c && s.catPillActive]} onPress={() => setCategory(c)}>
                    <Text style={[s.catPillText, category === c && s.catPillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={s.modalBtn} onPress={add}>
              <Text style={s.modalBtnText}>Save Decision</Text>
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

  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptyHint: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  emptyBtn: { marginTop: 12, borderWidth: 1, borderColor: '#E8D9B5', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#FFF8EC' },
  emptyBtnText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', padding: 20, marginBottom: 12, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 11, color: '#C4B8AC', fontFamily: 'DMSans_300Light', letterSpacing: 0.3 },
  catBadge: { backgroundColor: '#FFF8EC', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#E8D9B5' },
  catBadgeText: { fontSize: 9, color: '#C9A84C', fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 },
  cardHeading: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  cardContext: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 19 },
  peoplePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  personPill: { backgroundColor: '#FAF6F0', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#EDE8E0' },
  personText: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  removeBtn: { position: 'absolute', top: 16, right: 16 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  catPills: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catPill: { borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#EDE8E0' },
  catPillActive: { borderColor: '#C9A84C', backgroundColor: '#FFF8EC' },
  catPillText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  catPillTextActive: { color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});

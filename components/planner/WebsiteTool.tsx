import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props { userId: string; session: any; onBack: () => void; }

export default function WebsiteTool({ userId, session, onBack }: Props) {
  const coupleName = session?.name || 'Your';
  const handleSaveTheDate = () => {
    const date = session?.wedding_date
      ? new Date(session.wedding_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'soon';
    const msg = `Save the Date!\n\n${coupleName} is getting married on ${date}.\n\nFormal invitation to follow.\n\nWith love`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Feather name="arrow-left" size={18} color="#2C2420" /></TouchableOpacity>
        <Text style={s.headerTitle}>Wedding Website</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.emptyWrap}>
          <Feather name="globe" size={32} color="#E8D9B5" />
          <Text style={s.emptyTitle}>Coming soon</Text>
          <Text style={s.emptyHint}>A beautiful wedding website to share with guests — RSVP, directions, your story, and more.</Text>
          <TouchableOpacity style={s.stdBtn} onPress={handleSaveTheDate}>
            <Feather name="send" size={14} color="#C9A84C" />
            <Text style={s.stdText}>Send Save the Date via WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  scrollContent: { paddingHorizontal: 24 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptyHint: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  stdBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#E8D9B5', borderRadius: 12, backgroundColor: '#FFF8EC', marginTop: 8 },
  stdText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },
});

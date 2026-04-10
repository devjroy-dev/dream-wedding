import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
  Alert, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVendor, addLead, sendMessage } from '../services/api';
import { sendSocketMessage } from '../services/socket';

const FUNCTIONS = ['Roka', 'Haldi', 'Mehendi', 'Sangeet', 'Cocktail', 'Wedding', 'Reception'];

export default function InquiryScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams();
  const isQuote = type === 'quote';

  const [vendor, setVendor] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [selectedFunction, setSelectedFunction] = useState('Wedding');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_session');
      if (stored) setSession(JSON.parse(stored));
      const result = await getVendor(id as string);
      if (result.success) setVendor(result.data);
    } catch (e) {}
  };

  const formatDate = (date: Date) => date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const weddingDate = session?.wedding_date
    ? new Date(session.wedding_date)
    : null;

  const displayDate = eventDate
    ? formatDate(eventDate)
    : weddingDate
    ? formatDate(weddingDate)
    : '[date]';

  const userName = session?.name || 'there';
  const vendorName = vendor?.name || 'the vendor';

  const autoMessage = `Hi, I'm ${userName}. I'm interested in your services for my ${selectedFunction} on ${displayDate}. ${isQuote ? 'Could you please share your pricing and packages?' : 'Are you available on this date?'}`;

  const handleSend = async () => {
    try {
      setLoading(true);

      const userId = session?.userId || session?.uid;
      const vendorId = id as string;
      const finalMessage = message.trim() || autoMessage;
      const finalDate = eventDate || weddingDate;

      // 1. Save as lead in vendor's pipeline
      try {
        await addLead({
          vendor_id: vendorId,
          user_id: userId,
          name: userName,
          function: selectedFunction,
          date: finalDate?.toISOString(),
          message: finalMessage,
          type: isQuote ? 'quote' : 'inquiry',
          stage: 'New Inquiry',
          value: vendor?.starting_price || 0,
        });
      } catch (e) {
        console.log('Lead creation failed:', e);
      }

      // 2. Send message via backend
      try {
        await sendMessage({
          user_id: userId,
          vendor_id: vendorId,
          message: finalMessage,
          sender_type: 'user',
        });
      } catch (e) {
        console.log('Message send failed:', e);
      }

      setSent(true);
    } catch (e) {
      Alert.alert('Error', 'Could not send your inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>
          {isQuote ? 'Quote Requested!' : 'Inquiry Sent!'}
        </Text>
        <Text style={styles.successSubtitle}>
          {isQuote
            ? `${vendorName} will send you a detailed quote within 24 hours.`
            : `${vendorName} will respond within 24 hours.`}
        </Text>
        <View style={styles.successActions}>
          <TouchableOpacity
            style={styles.messagingBtn}
            onPress={() => router.replace('/messaging')}
          >
            <Text style={styles.messagingBtnText}>Open Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isQuote ? 'Request Quote' : 'Send Inquiry'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Vendor */}
        {vendor && (
          <View style={styles.vendorCard}>
            <View style={styles.vendorAvatar}>
              <Text style={styles.vendorAvatarText}>{vendor.name[0]}</Text>
            </View>
            <View>
              <Text style={styles.vendorName}>{vendor.name}</Text>
              <Text style={styles.vendorMeta}>{vendor.category} · {vendor.city}</Text>
            </View>
          </View>
        )}

        {/* Auto message preview */}
        <View style={styles.prefilledCard}>
          <Text style={styles.prefilledLabel}>Your message preview</Text>
          <Text style={styles.prefilledText}>{autoMessage}</Text>
        </View>

        {/* Function */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Function</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pillRow}>
              {FUNCTIONS.map(fn => (
                <TouchableOpacity
                  key={fn}
                  style={[styles.pill, selectedFunction === fn && styles.pillSelected]}
                  onPress={() => setSelectedFunction(fn)}
                >
                  <Text style={[styles.pillText, selectedFunction === fn && styles.pillTextSelected]}>
                    {fn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Event Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={eventDate ? styles.dateInputSelected : styles.dateInputPlaceholder}>
              {eventDate
                ? formatDate(eventDate)
                : weddingDate
                ? `${formatDate(weddingDate)} (your wedding date)`
                : 'Select date'}
            </Text>
            <Text style={styles.dateChevron}>›</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={eventDate || weddingDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(event, date) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (date) setEventDate(date);
              }}
            />
          )}
          {showDatePicker && Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.datePickerDone}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Additional message */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Additional Details (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Guest count, specific requirements, questions..."
            placeholderTextColor="#8C7B6E"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            Your contact details will be shared with the vendor when you send this {isQuote ? 'request' : 'inquiry'}.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#F5F0E8" />
            : <Text style={styles.sendBtnText}>
                {isQuote ? 'Request Quote' : 'Send Inquiry'} →
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 24 },
  backBtn: { fontSize: 22, color: '#2C2420', width: 24 },
  title: { fontSize: 17, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, gap: 20 },
  vendorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', gap: 14 },
  vendorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  vendorAvatarText: { fontSize: 18, color: '#C9A84C', fontWeight: '300' },
  vendorName: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  vendorMeta: { fontSize: 12, color: '#8C7B6E', marginTop: 2 },
  prefilledCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E8E0D5', gap: 8 },
  prefilledLabel: { fontSize: 11, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase', fontWeight: '500' },
  prefilledText: { fontSize: 14, color: '#2C2420', lineHeight: 22, fontStyle: 'italic' },
  section: { gap: 10 },
  sectionLabel: { fontSize: 13, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 50, paddingVertical: 9, paddingHorizontal: 18, backgroundColor: '#FFFFFF' },
  pillSelected: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  pillText: { fontSize: 13, color: '#2C2420' },
  pillTextSelected: { color: '#F5F0E8' },
  dateInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E8E0D5' },
  dateInputPlaceholder: { fontSize: 14, color: '#8C7B6E' },
  dateInputSelected: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  dateChevron: { fontSize: 20, color: '#C9A84C' },
  datePickerDone: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E8E0D5', marginTop: 8 },
  datePickerDoneText: { fontSize: 14, color: '#C9A84C', fontWeight: '500' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 14, paddingHorizontal: 16, fontSize: 14, color: '#2C2420' },
  textArea: { height: 120, textAlignVertical: 'top' },
  noteCard: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E8D9B5' },
  noteText: { fontSize: 12, color: '#8C7B6E', lineHeight: 18 },
  bottomBar: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8' },
  sendBtn: { backgroundColor: '#2C2420', borderRadius: 14, paddingVertical: 17, alignItems: 'center', shadowColor: '#2C2420', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { fontSize: 15, color: '#F5F0E8', fontWeight: '500', letterSpacing: 0.5 },
  successContainer: { flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 40 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  successIconText: { fontSize: 32, color: '#C9A84C', fontWeight: '300' },
  successTitle: { fontSize: 28, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  successSubtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', lineHeight: 22 },
  successActions: { width: '100%', gap: 12, marginTop: 8 },
  messagingBtn: { backgroundColor: '#2C2420', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  messagingBtnText: { fontSize: 15, color: '#F5F0E8', fontWeight: '500' },
  backLink: { fontSize: 14, color: '#C9A84C', textAlign: 'center' },
});
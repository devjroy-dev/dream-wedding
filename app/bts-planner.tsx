import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput, Modal,
  ActivityIndicator, Alert, Linking, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import {
  getGuests, addGuest, getUserBookings
} from '../services/api';
import * as Contacts from 'expo-contacts';
import {
  useFonts,
  PlayfairDisplay_300Light,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display/index';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

const { width } = Dimensions.get('window');

const TABS = ['Budget', 'Guests', 'Registry', 'To Do', 'Payments', 'Journey'];

const DEFAULT_BUDGET_CATEGORIES = [
  { id: '1', category: 'Venue', budgeted: 800000, icon: 'home' },
  { id: '2', category: 'Photography', budgeted: 150000, icon: 'camera' },
  { id: '3', category: 'Makeup Artist', budgeted: 50000, icon: 'scissors' },
  { id: '4', category: 'Designer', budgeted: 200000, icon: 'star' },
  { id: '5', category: 'Choreographer', budgeted: 60000, icon: 'music' },
  { id: '6', category: 'Content Creator', budgeted: 30000, icon: 'video' },
  { id: '7', category: 'DJ & Music', budgeted: 80000, icon: 'headphones' },
  { id: '8', category: 'Event Manager', budgeted: 200000, icon: 'briefcase' },
];

const DEFAULT_TODOS = [
  { id: '1', text: 'Book photographer', done: true, reminder: 'Dec 1, 2025' },
  { id: '2', text: 'Finalise venue', done: false, reminder: 'Dec 5, 2025' },
  { id: '3', text: 'Send save the dates', done: false, reminder: 'Dec 10, 2025' },
  { id: '4', text: 'Book MUA for trial', done: false, reminder: 'Dec 8, 2025' },
  { id: '5', text: 'Confirm choreographer', done: false, reminder: '' },
  { id: '6', text: 'Finalise bridal outfit', done: false, reminder: 'Dec 15, 2025' },
];

const SMART_CHECKLIST = [
  { id: '1', text: '12 months before — Book venue', done: true },
  { id: '2', text: '10 months before — Book photographer', done: true },
  { id: '3', text: '8 months before — Book MUA & designer', done: false },
  { id: '4', text: '6 months before — Send save the dates', done: false },
  { id: '5', text: '4 months before — Finalise guest list', done: false },
  { id: '6', text: '2 months before — Send e-invites', done: false },
  { id: '7', text: '1 month before — Confirm all vendors', done: false },
];

const JOURNEY_PROMPTS = [
  'Venue scouting day 🏛️',
  'Bridal trial 💄',
  'Outfit fitting 👗',
  'Mehendi practice 🪷',
  'Dinner with family 🍽️',
  'Ring shopping 💍',
  'Cake tasting 🎂',
  'A quiet moment together ✨',
];

const formatAmount = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
};

const getRSVPColor = (rsvp: string) => {
  if (rsvp === 'confirmed') return '#4CAF50';
  if (rsvp === 'declined') return '#E57373';
  return '#C9A84C';
};

export default function BTSPlannerScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Budget');
  const [userId, setUserId] = useState('');
  const [userSession, setUserSession] = useState<any>(null);

  // Guests
  const [guests, setGuests] = useState<any[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestGroup, setNewGuestGroup] = useState('');
  const [newGuestDietary, setNewGuestDietary] = useState('');
  const [savingGuest, setSavingGuest] = useState(false);

  // Bookings
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Todos
  const [todos, setTodos] = useState(DEFAULT_TODOS);
  const [newTodo, setNewTodo] = useState('');
  const [newReminder, setNewReminder] = useState('');
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [showSmartChecklist, setShowSmartChecklist] = useState(false);

  // Registry
  const [registry, setRegistry] = useState<any[]>([]);
  const [showAddGift, setShowAddGift] = useState(false);
  const [newGiftName, setNewGiftName] = useState('');
  const [newGiftDesc, setNewGiftDesc] = useState('');
  const [newGiftPrice, setNewGiftPrice] = useState('');
  const [newGiftLink, setNewGiftLink] = useState('');

  // Journey memories
  const [memories, setMemories] = useState<any[]>([]);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemoryCaption, setNewMemoryCaption] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_300Light,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (userId) {
      if (activeTab === 'Guests') loadGuests();
      if (activeTab === 'Payments') loadBookings();
      if (activeTab === 'Registry') loadRegistry();
      if (activeTab === 'Journey') loadMemories();
    }
  }, [activeTab, userId]);

  const loadSession = async () => {
    try {
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const parsed = JSON.parse(session);
        setUserId(parsed.userId || parsed.uid || '');
        setUserSession(parsed);
      }
    } catch (e) {}
  };

  const loadGuests = async () => {
    try {
      setGuestsLoading(true);
      const result = await getGuests(userId);
      if (result.success) setGuests(result.data || []);
    } catch (e) { setGuests([]); }
    finally { setGuestsLoading(false); }
  };

  const loadBookings = async () => {
    try {
      setBookingsLoading(true);
      const result = await getUserBookings(userId);
      if (result.success) setBookings(result.data || []);
    } catch (e) { setBookings([]); }
    finally { setBookingsLoading(false); }
  };

  const loadRegistry = async () => {
    try {
      const stored = await AsyncStorage.getItem(`registry_${userId}`);
      if (stored) setRegistry(JSON.parse(stored));
    } catch (e) {}
  };

  const saveRegistry = async (items: any[]) => {
    try {
      await AsyncStorage.setItem(`registry_${userId}`, JSON.stringify(items));
    } catch (e) {}
  };

  const loadMemories = async () => {
    try {
      const stored = await AsyncStorage.getItem(`journey_${userId}`);
      if (stored) setMemories(JSON.parse(stored));
    } catch (e) {}
  };

  const saveMemories = async (items: any[]) => {
    try {
      await AsyncStorage.setItem(`journey_${userId}`, JSON.stringify(items));
    } catch (e) {}
  };

  const handleAddMemory = async () => {
    if (!newMemoryCaption.trim() && !selectedPrompt) return;
    const newMemory = {
      id: Date.now().toString(),
      caption: newMemoryCaption.trim() || selectedPrompt,
      prompt: selectedPrompt,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      hasMedia: false,
    };
    const updated = [newMemory, ...memories];
    setMemories(updated);
    await saveMemories(updated);
    setNewMemoryCaption('');
    setSelectedPrompt('');
    setShowAddMemory(false);
  };

  const handleAddGift = async () => {
    if (!newGiftName.trim()) {
      Alert.alert('Missing info', 'Please enter a gift name.');
      return;
    }
    const newGift = {
      id: Date.now().toString(),
      name: newGiftName.trim(),
      description: newGiftDesc.trim(),
      price: newGiftPrice.trim(),
      link: newGiftLink.trim(),
      claimed: false,
    };
    const updated = [...registry, newGift];
    setRegistry(updated);
    await saveRegistry(updated);
    setNewGiftName(''); setNewGiftDesc('');
    setNewGiftPrice(''); setNewGiftLink('');
    setShowAddGift(false);
  };

  const handleClaimGift = async (giftId: string) => {
    const updated = registry.map(g => g.id === giftId ? { ...g, claimed: true } : g);
    setRegistry(updated);
    await saveRegistry(updated);
  };

  const handleRemoveGift = async (giftId: string) => {
    Alert.alert('Remove Gift', 'Remove this from your registry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updated = registry.filter(g => g.id !== giftId);
          setRegistry(updated);
          await saveRegistry(updated);
        }
      }
    ]);
  };

  const handleShareRegistry = () => {
    const giftList = registry
      .filter(g => !g.claimed)
      .map(g => `• ${g.name}${g.price ? ` (₹${g.price})` : ''}${g.link ? `\n  ${g.link}` : ''}`)
      .join('\n');
    const message = `💍 Our Wedding Gift Registry\n\nHi! We've put together a list of gifts we'd love for our wedding. No pressure at all — your presence is the greatest gift!\n\n${giftList}\n\nWith love ❤️`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
  };

  const handleSendSaveTheDate = () => {
    const weddingDate = userSession?.wedding_date
      ? new Date(userSession.wedding_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'soon';
    const coupleName = userSession?.name
      ? `${userSession.name}${userSession.partnerName ? ` & ${userSession.partnerName}` : ''}`
      : 'We';
    const message = `💍 Save the Date!\n\n${coupleName} are getting married on ${weddingDate}.\n\nWe'd love for you to be part of our celebration. Formal invitation to follow.\n\nWith love ❤️\n\n— Sent via The Dream Wedding`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
  };

  const handleImportContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your contacts.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });
      if (data.length === 0) {
        Alert.alert('No contacts', 'No contacts found on your device.');
        return;
      }
      const contact = data[0];
      setNewGuestName(contact.name || '');
      setShowAddGuest(true);
    } catch (e) {
      Alert.alert('Error', 'Could not access contacts.');
    }
  };

  const handleAddGuest = async () => {
    if (!newGuestName.trim()) {
      Alert.alert('Missing info', 'Please enter the guest name.');
      return;
    }
    try {
      setSavingGuest(true);
      const result = await addGuest({
        user_id: userId,
        name: newGuestName.trim(),
        group: newGuestGroup.trim() || 'General',
        dietary: newGuestDietary.trim() || 'Not specified',
        rsvp: 'pending',
      });
      if (result.success) {
        setGuests(prev => [...prev, result.data]);
        setNewGuestName(''); setNewGuestGroup(''); setNewGuestDietary('');
        setShowAddGuest(false);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not add guest. Please try again.');
    } finally {
      setSavingGuest(false);
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos(prev => [...prev, {
      id: Date.now().toString(),
      text: newTodo.trim(),
      done: false,
      reminder: newReminder.trim(),
    }]);
    setNewTodo(''); setNewReminder('');
    setShowAddTodo(false);
  };

  const removeTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const totalBudget = userSession?.budget || 2500000;
  const confirmedGuests = guests.filter(g => g.rsvp === 'confirmed').length;
  const pendingGuests = guests.filter(g => g.rsvp === 'pending').length;
  const completedTodos = todos.filter(t => t.done).length;
  const totalInEscrow = bookings.reduce((sum, b) =>
    b.status === 'pending_confirmation' ? sum + (b.token_amount || 0) : sum, 0);
  const unclaimedGifts = registry.filter(g => !g.claimed).length;
  const claimedGifts = registry.filter(g => g.claimed).length;

  const weddingDateFormatted = userSession?.wedding_date
    ? new Date(userSession.wedding_date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    : null;

  const daysUntil = userSession?.wedding_date
    ? Math.max(0, Math.ceil(
        (new Date(userSession.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : null;

  // fonts load async — render proceeds

  return (
    <View style={styles.container}>

      {/* Add Guest Modal */}
      <Modal visible={showAddGuest} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Guest</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Full name"
              placeholderTextColor="#C4B8AC"
              value={newGuestName}
              onChangeText={setNewGuestName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Group (e.g. Family, College Friends)"
              placeholderTextColor="#C4B8AC"
              value={newGuestGroup}
              onChangeText={setNewGuestGroup}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Dietary preference"
              placeholderTextColor="#C4B8AC"
              value={newGuestDietary}
              onChangeText={setNewGuestDietary}
            />
            <TouchableOpacity
              style={[styles.modalBtn, savingGuest && { opacity: 0.6 }]}
              onPress={handleAddGuest}
              disabled={savingGuest}
            >
              {savingGuest
                ? <ActivityIndicator color="#F5F0E8" />
                : <Text style={styles.modalBtnText}>Add Guest</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddGuest(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Gift Modal */}
      <Modal visible={showAddGift} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to Registry</Text>
            <Text style={styles.modalSubtitle}>Add gifts you'd love to receive</Text>
            <TextInput style={styles.modalInput} placeholder="Gift name" placeholderTextColor="#C4B8AC" value={newGiftName} onChangeText={setNewGiftName} />
            <TextInput style={styles.modalInput} placeholder="Description (optional)" placeholderTextColor="#C4B8AC" value={newGiftDesc} onChangeText={setNewGiftDesc} />
            <TextInput style={styles.modalInput} placeholder="Price (optional)" placeholderTextColor="#C4B8AC" value={newGiftPrice} onChangeText={setNewGiftPrice} keyboardType="number-pad" />
            <TextInput style={styles.modalInput} placeholder="Link (optional)" placeholderTextColor="#C4B8AC" value={newGiftLink} onChangeText={setNewGiftLink} autoCapitalize="none" />
            <TouchableOpacity style={styles.modalBtn} onPress={handleAddGift}>
              <Text style={styles.modalBtnText}>Add Gift</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddGift(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Memory Modal */}
      <Modal visible={showAddMemory} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to Your Journey</Text>
            <Text style={styles.modalSubtitle}>What's happening today?</Text>

            {/* Prompt chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promptScroll}>
              {JOURNEY_PROMPTS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.promptChip, selectedPrompt === p && styles.promptChipActive]}
                  onPress={() => setSelectedPrompt(selectedPrompt === p ? '' : p)}
                >
                  <Text style={[styles.promptChipText, selectedPrompt === p && styles.promptChipTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Add a note... (optional)"
              placeholderTextColor="#C4B8AC"
              value={newMemoryCaption}
              onChangeText={setNewMemoryCaption}
              multiline
            />

            {/* Media buttons */}
            <View style={styles.mediaRow}>
              <TouchableOpacity
                style={styles.mediaBtn}
                onPress={() => Alert.alert('Coming Soon', 'Photo upload coming in the next update.')}
              >
                <Feather name="image" size={16} color="#8C7B6E" />
                <Text style={styles.mediaBtnText}>Add Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mediaBtn}
                onPress={() => Alert.alert('Coming Soon', '5-second clips coming in the next update.')}
              >
                <Feather name="video" size={16} color="#8C7B6E" />
                <Text style={styles.mediaBtnText}>Add Clip</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalBtn} onPress={handleAddMemory}>
              <Text style={styles.modalBtnText}>Save to Journey</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddMemory(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Planner</Text>
          {daysUntil !== null ? (
            <View style={styles.countdownRow}>
              <Text style={styles.countdownNumber}>{daysUntil}</Text>
              <Text style={styles.countdownLabel}> days to go · {weddingDateFormatted}</Text>
            </View>
          ) : (
            <Text style={styles.subtitle}>Not just happily married — getting married happily.</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.coplannerBtn}
          onPress={() => Alert.alert('Co-Planner', 'Share this link with your partner:\n\nthedreamwedding.in/join/your-code\n\n(Live sync coming soon)')}
        >
          <Feather name="users" size={14} color="#8C7B6E" />
          <Text style={styles.coplannerText}>Co-plan</Text>
        </TouchableOpacity>
      </View>

      {/* Tab scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ── BUDGET ── */}
        {activeTab === 'Budget' && (
          <View style={styles.tabPane}>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Genie Budget Overview</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryAmount}>{formatAmount(totalBudget)}</Text>
                  <Text style={styles.summaryLabel}>Total Budget</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: '#C9A84C' }]}>₹0</Text>
                  <Text style={styles.summaryLabel}>Hearted</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
                    {formatAmount(totalInEscrow)}
                  </Text>
                  <Text style={styles.summaryLabel}>In Escrow</Text>
                </View>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: totalInEscrow > 0 ? `${Math.min((totalInEscrow / totalBudget) * 100, 100)}%` : '2%' }]} />
              </View>
              <Text style={styles.progressLabel}>Heart vendors to track your spend</Text>
            </View>

            <View style={styles.intelligenceCard}>
              <View style={styles.intelligenceHeader}>
                <Feather name="zap" size={13} color="#C9A84C" />
                <Text style={styles.intelligenceTitle}>Budget Intelligence</Text>
              </View>
              <Text style={styles.intelligenceText}>
                Couples in {userSession?.city || 'your city'} typically spend 40% on venue, 15% on photography and 12% on designer wear. Your current allocation looks on track.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>By Category</Text>
            <View style={styles.listCard}>
              {DEFAULT_BUDGET_CATEGORIES.map((cat, index) => (
                <View key={cat.id}>
                  <TouchableOpacity
                    style={styles.budgetRow}
                    onPress={() => router.push(`/filter?category=${cat.category.toLowerCase().replace(/ /g, '-')}` as any)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.budgetIconBox}>
                      <Feather name={cat.icon as any} size={14} color="#C9A84C" />
                    </View>
                    <View style={styles.budgetInfo}>
                      <Text style={styles.budgetCategoryName}>{cat.category}</Text>
                      <Text style={styles.budgetCategoryDetail}>
                        Budget: {formatAmount(cat.budgeted)}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#C9A84C" />
                  </TouchableOpacity>
                  {index < DEFAULT_BUDGET_CATEGORIES.length - 1 && (
                    <View style={styles.listDivider} />
                  )}
                </View>
              ))}
            </View>

          </View>
        )}

        {/* ── GUESTS ── */}
        {activeTab === 'Guests' && (
          <View style={styles.tabPane}>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryAmount}>{guests.length}</Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>{confirmedGuests}</Text>
                  <Text style={styles.summaryLabel}>Confirmed</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: '#C9A84C' }]}>{pendingGuests}</Text>
                  <Text style={styles.summaryLabel}>Pending</Text>
                </View>
              </View>
            </View>

            {/* Action row */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnBorder]}
                onPress={() => setShowAddGuest(true)}
              >
                <Feather name="user-plus" size={14} color="#C9A84C" />
                <Text style={styles.actionBtnText}>Add Guest</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnBorder]}
                onPress={handleImportContacts}
              >
                <Feather name="smartphone" size={14} color="#C9A84C" />
                <Text style={styles.actionBtnText}>From Contacts</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleSendSaveTheDate}
              >
                <Feather name="send" size={14} color="#C9A84C" />
                <Text style={styles.actionBtnText}>Save the Date</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Guest List ({guests.length})</Text>

            {guestsLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#C9A84C" />
              </View>
            ) : guests.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="users" size={28} color="#E8E0D5" />
                <Text style={styles.emptyStateTitle}>No guests yet</Text>
                <Text style={styles.emptyStateText}>
                  Add guests manually or import from your contacts
                </Text>
                <TouchableOpacity style={styles.emptyStateBtn} onPress={() => setShowAddGuest(true)}>
                  <Text style={styles.emptyStateBtnText}>Add First Guest</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.listCard}>
                {guests.map((guest, index) => (
                  <View key={guest.id}>
                    <View style={styles.guestRow}>
                      <View style={styles.guestAvatar}>
                        <Text style={styles.guestAvatarText}>{guest.name[0]}</Text>
                      </View>
                      <View style={styles.guestInfo}>
                        <Text style={styles.guestName}>{guest.name}</Text>
                        <Text style={styles.guestGroup}>
                          {guest.group} · {guest.dietary}
                        </Text>
                      </View>
                      <Text style={[styles.rsvpText, { color: getRSVPColor(guest.rsvp) }]}>
                        {guest.rsvp.charAt(0).toUpperCase() + guest.rsvp.slice(1)}
                      </Text>
                    </View>
                    {index < guests.length - 1 && <View style={styles.listDivider} />}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── REGISTRY ── */}
        {activeTab === 'Registry' && (
          <View style={styles.tabPane}>

            <View style={styles.registryHeroCard}>
              <Text style={styles.registryHeroTitle}>Gift Registry</Text>
              <Text style={styles.registryHeroText}>
                Create your wish list and share it with family and friends. A thoughtful tradition, made effortless.
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryAmount}>{registry.length}</Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: '#C9A84C' }]}>{unclaimedGifts}</Text>
                  <Text style={styles.summaryLabel}>Available</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>{claimedGifts}</Text>
                  <Text style={styles.summaryLabel}>Claimed</Text>
                </View>
              </View>
            </View>

            <View style={styles.registryActions}>
              <TouchableOpacity style={styles.addGiftBtn} onPress={() => setShowAddGift(true)}>
                <Feather name="plus" size={16} color="#C9A84C" />
                <Text style={styles.addGiftBtnText}>Add Gift</Text>
              </TouchableOpacity>
              {registry.length > 0 && (
                <TouchableOpacity style={styles.shareRegistryBtn} onPress={handleShareRegistry}>
                  <Feather name="message-circle" size={16} color="#25D366" />
                  <Text style={styles.shareRegistryBtnText}>Share via WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>

            {registry.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="gift" size={28} color="#E8E0D5" />
                <Text style={styles.emptyStateTitle}>No gifts yet</Text>
                <Text style={styles.emptyStateText}>
                  Add gifts you'd love and share with guests
                </Text>
                <TouchableOpacity style={styles.emptyStateBtn} onPress={() => setShowAddGift(true)}>
                  <Text style={styles.emptyStateBtnText}>Add First Gift</Text>
                </TouchableOpacity>
              </View>
            ) : (
              registry.map(gift => (
                <View key={gift.id} style={[styles.giftCard, gift.claimed && styles.giftCardClaimed]}>
                  <View style={styles.giftInfo}>
                    <Text style={[styles.giftName, gift.claimed && styles.giftNameClaimed]}>
                      {gift.name}
                    </Text>
                    {gift.description ? <Text style={styles.giftDesc}>{gift.description}</Text> : null}
                    {gift.price ? (
                      <Text style={styles.giftPrice}>
                        ₹{parseInt(gift.price).toLocaleString('en-IN')}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.giftActions}>
                    {gift.claimed ? (
                      <View style={styles.claimedBadge}>
                        <Text style={styles.claimedBadgeText}>✓ Claimed</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaimGift(gift.id)}>
                        <Text style={styles.claimBtnText}>Claimed</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleRemoveGift(gift.id)}>
                      <Feather name="x" size={14} color="#8C7B6E" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── TO DO ── */}
        {activeTab === 'To Do' && (
          <View style={styles.tabPane}>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {completedTodos} of {todos.length} tasks completed
              </Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: todos.length > 0
                    ? `${(completedTodos / todos.length) * 100}%`
                    : '0%'
                }]} />
              </View>
            </View>

            <TouchableOpacity
              style={styles.smartChecklistToggle}
              onPress={() => setShowSmartChecklist(!showSmartChecklist)}
              activeOpacity={0.8}
            >
              <View style={styles.smartChecklistHeader}>
                <Feather name="check-circle" size={14} color="#C9A84C" />
                <Text style={styles.smartChecklistToggleText}>Smart Wedding Checklist</Text>
              </View>
              <Feather
                name={showSmartChecklist ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#8C7B6E"
              />
            </TouchableOpacity>

            {showSmartChecklist && (
              <View style={styles.listCard}>
                {SMART_CHECKLIST.map((item, index) => (
                  <View key={item.id}>
                    <View style={styles.smartChecklistRow}>
                      <View style={[styles.smartCheckbox, item.done && styles.smartCheckboxDone]}>
                        {item.done && <Feather name="check" size={10} color="#C9A84C" />}
                      </View>
                      <Text style={[
                        styles.smartChecklistText,
                        item.done && styles.smartChecklistTextDone,
                      ]}>
                        {item.text}
                      </Text>
                    </View>
                    {index < SMART_CHECKLIST.length - 1 && <View style={styles.listDivider} />}
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>My Tasks</Text>

            {todos.filter(t => !t.done).length > 0 && (
              <View style={styles.listCard}>
                {todos.filter(t => !t.done).map((todo, index, arr) => (
                  <View key={todo.id}>
                    <View style={styles.todoRow}>
                      <TouchableOpacity style={styles.todoCheckbox} onPress={() => toggleTodo(todo.id)}>
                        <View style={styles.todoCheckboxInner} />
                      </TouchableOpacity>
                      <View style={styles.todoContent}>
                        <Text style={styles.todoText}>{todo.text}</Text>
                        {todo.reminder ? (
                          <View style={styles.reminderRow}>
                            <Feather name="clock" size={10} color="#C9A84C" />
                            <Text style={styles.todoReminder}>{todo.reminder}</Text>
                          </View>
                        ) : null}
                      </View>
                      <TouchableOpacity onPress={() => removeTodo(todo.id)}>
                        <Feather name="x" size={14} color="#8C7B6E" />
                      </TouchableOpacity>
                    </View>
                    {index < arr.length - 1 && <View style={styles.listDivider} />}
                  </View>
                ))}
              </View>
            )}

            {todos.filter(t => t.done).length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Completed</Text>
                <View style={styles.listCard}>
                  {todos.filter(t => t.done).map((todo, index, arr) => (
                    <View key={todo.id}>
                      <View style={styles.todoRow}>
                        <TouchableOpacity
                          style={[styles.todoCheckbox, styles.todoCheckboxDone]}
                          onPress={() => toggleTodo(todo.id)}
                        >
                          <Feather name="check" size={10} color="#C9A84C" />
                        </TouchableOpacity>
                        <View style={styles.todoContent}>
                          <Text style={[styles.todoText, styles.todoTextDone]}>{todo.text}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeTodo(todo.id)}>
                          <Feather name="x" size={14} color="#8C7B6E" />
                        </TouchableOpacity>
                      </View>
                      {index < arr.length - 1 && <View style={styles.listDivider} />}
                    </View>
                  ))}
                </View>
              </>
            )}

            {showAddTodo ? (
              <View style={styles.addTodoCard}>
                <TextInput
                  style={styles.addTodoInput}
                  placeholder="What needs to be done?"
                  placeholderTextColor="#C4B8AC"
                  value={newTodo}
                  onChangeText={setNewTodo}
                  autoFocus
                />
                <TextInput
                  style={styles.addTodoInput}
                  placeholder="Reminder date (optional)"
                  placeholderTextColor="#C4B8AC"
                  value={newReminder}
                  onChangeText={setNewReminder}
                />
                <View style={styles.addTodoActions}>
                  <TouchableOpacity style={styles.addTodoCancelBtn} onPress={() => setShowAddTodo(false)}>
                    <Text style={styles.addTodoCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addTodoSaveBtn} onPress={addTodo}>
                    <Text style={styles.addTodoSaveText}>Add Task</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addTodoBtn} onPress={() => setShowAddTodo(true)}>
                <Feather name="plus" size={14} color="#C9A84C" />
                <Text style={styles.addTodoBtnText}>Add Task</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── PAYMENTS ── */}
        {activeTab === 'Payments' && (
          <View style={styles.tabPane}>
            {bookingsLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#C9A84C" />
              </View>
            ) : bookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="shield" size={28} color="#E8E0D5" />
                <Text style={styles.emptyStateTitle}>No payments yet</Text>
                <Text style={styles.emptyStateText}>
                  Lock a vendor date to see your escrow payments here
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateBtn}
                  onPress={() => router.push('/home' as any)}
                >
                  <Text style={styles.emptyStateBtnText}>Browse Vendors</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>Token Payments</Text>
                <View style={styles.listCard}>
                  {bookings.map((booking, index) => (
                    <View key={booking.id}>
                      <View style={styles.paymentRow}>
                        <View style={styles.paymentLeft}>
                          <Text style={styles.paymentVendor}>{booking.vendor_name}</Text>
                          <Text style={styles.paymentDate}>{booking.vendor_category}</Text>
                        </View>
                        <View style={styles.paymentRight}>
                          <Text style={styles.paymentAmount}>
                            {formatAmount(booking.token_amount || 0)}
                          </Text>
                          <Text style={[styles.paymentStatus, {
                            color: booking.status === 'pending_confirmation' ? '#C9A84C' : '#4CAF50'
                          }]}>
                            {booking.status === 'pending_confirmation' ? 'In Escrow' : 'Confirmed'}
                          </Text>
                        </View>
                      </View>
                      {index < bookings.length - 1 && <View style={styles.listDivider} />}
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* ── JOURNEY (formerly Memories) ── */}
        {activeTab === 'Journey' && (
          <View style={styles.tabPane}>

            {/* Hero */}
            <View style={styles.journeyHeroCard}>
              <Text style={styles.journeyHeroTitle}>The Journey</Text>
              <Text style={styles.journeyHeroQuote}>
                "The wedding ends. The memories don't."
              </Text>
              <Text style={styles.journeyHeroText}>
                Capture the trials, the venue scouts, the dinners, the quiet moments. On your wedding day, we'll turn them into your story.
              </Text>
            </View>

            {/* Add memory CTA */}
            <TouchableOpacity
              style={styles.addMemoryBtn}
              onPress={() => setShowAddMemory(true)}
              activeOpacity={0.85}
            >
              <Feather name="plus-circle" size={18} color="#C9A84C" />
              <Text style={styles.addMemoryBtnText}>Add a Moment</Text>
            </TouchableOpacity>

            {/* Story collage teaser */}
            <View style={styles.collageTeaser}>
              <View style={styles.collageTeaserLeft}>
                <Feather name="film" size={16} color="#C9A84C" />
                <View style={styles.collageTeaserText}>
                  <Text style={styles.collageTeaserTitle}>Story Collage</Text>
                  <Text style={styles.collageTeaserSub}>
                    We'll create a short film from your journey moments — delivered on your wedding day.
                  </Text>
                </View>
              </View>
              <View style={styles.collageTeaserBadge}>
                <Text style={styles.collageTeaserBadgeText}>Soon</Text>
              </View>
            </View>

            {/* Memory cards */}
            {memories.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="camera" size={28} color="#E8E0D5" />
                <Text style={styles.emptyStateTitle}>Your journey starts here</Text>
                <Text style={styles.emptyStateText}>
                  Add your first moment — a trial, a dinner, anything that's part of getting married happily.
                </Text>
              </View>
            ) : (
              <View style={styles.memoriesGrid}>
                {memories.map(memory => (
                  <View key={memory.id} style={styles.memoryCard}>
                    <View style={styles.memoryCardContent}>
                      <View style={styles.memoryIconBox}>
                        <Feather name="heart" size={14} color="#C9A84C" />
                      </View>
                      <View style={styles.memoryText}>
                        <Text style={styles.memoryCaption}>{memory.caption}</Text>
                        <Text style={styles.memoryDate}>{memory.date}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {[
          { label: 'Home',      icon: 'home',           route: '/home'        },
          { label: 'Moodboard', icon: 'heart',          route: '/moodboard'   },
          { label: 'Messages',  icon: 'message-circle', route: '/messaging'   },
          { label: 'Planner',   icon: 'calendar',       route: null           },
          { label: 'Spotlight', icon: 'star',           route: '/spotlight'   },
        ].map((item, index) => {
          const isActive = index === 3;
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <Feather
                name={item.icon as any}
                size={20}
                color={isActive ? '#2C2420' : '#8C7B6E'}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
              {isActive && <View style={styles.navDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerLeft: { flex: 1, gap: 5 },
  title: {
    fontSize: 28,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_300Light',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    letterSpacing: 0.2,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  countdownNumber: {
    fontSize: 18,
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  countdownLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },
  coplannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  coplannerText: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },

  // Tabs
  tabScroll: { maxHeight: 44, marginBottom: 16 },
  tabContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    backgroundColor: '#FFFFFF',
  },
  tabActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  tabText: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  tabTextActive: { color: '#F5F0E8', fontFamily: 'DMSans_500Medium' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  tabPane: { gap: 14 },

  // Summary card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#E8E0D5' },
  summaryAmount: {
    fontSize: 22,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_300Light',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
  progressBg: { height: 3, backgroundColor: '#E8E0D5', borderRadius: 1.5 },
  progressFill: { height: 3, backgroundColor: '#C9A84C', borderRadius: 1.5 },
  progressLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    textAlign: 'right',
  },

  // Intelligence card
  intelligenceCard: {
    backgroundColor: '#2C2420',
    borderRadius: 14,
    padding: 18,
    gap: 10,
  },
  intelligenceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  intelligenceTitle: {
    fontSize: 13,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },
  intelligenceText: {
    fontSize: 13,
    color: '#B8A99A',
    fontFamily: 'DMSans_300Light',
    lineHeight: 20,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // List card
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    overflow: 'hidden',
  },
  listDivider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 16 },

  // Budget rows
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  budgetIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF8EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  budgetInfo: { flex: 1, gap: 2 },
  budgetCategoryName: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  budgetCategoryDetail: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },

  // Guest action row
  actionRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    overflow: 'hidden',
  },
  actionBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', gap: 4 },
  actionBtnBorder: { borderRightWidth: 1, borderRightColor: '#E8E0D5' },
  actionBtnText: {
    fontSize: 11,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.2,
  },

  // Guest rows
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  guestAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestAvatarText: {
    fontSize: 14,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
  },
  guestInfo: { flex: 1, gap: 2 },
  guestName: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  guestGroup: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
  rsvpText: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
  },

  // Registry
  registryHeroCard: {
    backgroundColor: '#2C2420',
    borderRadius: 14,
    padding: 20,
    gap: 8,
  },
  registryHeroTitle: {
    fontSize: 22,
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.5,
  },
  registryHeroText: {
    fontSize: 13,
    color: '#B8A99A',
    fontFamily: 'DMSans_300Light',
    lineHeight: 20,
  },
  registryActions: { flexDirection: 'row', gap: 10 },
  addGiftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 13,
  },
  addGiftBtnText: {
    fontSize: 14,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
  },
  shareRegistryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 13,
    backgroundColor: '#FFFFFF',
  },
  shareRegistryBtnText: {
    fontSize: 13,
    color: '#25D366',
    fontFamily: 'DMSans_500Medium',
  },
  giftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  giftCardClaimed: { opacity: 0.6 },
  giftInfo: { flex: 1, gap: 3 },
  giftName: {
    fontSize: 15,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  giftNameClaimed: {
    textDecorationLine: 'line-through',
    color: '#8C7B6E',
  },
  giftDesc: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
  giftPrice: {
    fontSize: 13,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
  },
  giftActions: { alignItems: 'center', gap: 8 },
  claimedBadge: {
    backgroundColor: '#4CAF5020',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  claimedBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    fontFamily: 'DMSans_500Medium',
  },
  claimBtn: {
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  claimBtnText: {
    fontSize: 11,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
  },

  // To Do
  smartChecklistToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  smartChecklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smartChecklistToggleText: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  smartChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  smartCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8E0D5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartCheckboxDone: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  smartChecklistText: {
    fontSize: 13,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
    flex: 1,
  },
  smartChecklistTextDone: {
    textDecorationLine: 'line-through',
    color: '#8C7B6E',
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  todoCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todoCheckboxDone: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  todoCheckboxInner: { width: 8, height: 8, borderRadius: 4 },
  todoContent: { flex: 1, gap: 2 },
  todoText: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
  },
  todoTextDone: {
    textDecorationLine: 'line-through',
    color: '#8C7B6E',
  },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  todoReminder: {
    fontSize: 11,
    color: '#C9A84C',
    fontFamily: 'DMSans_300Light',
  },
  addTodoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    gap: 10,
  },
  addTodoInput: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
    backgroundColor: '#F5F0E8',
  },
  addTodoActions: { flexDirection: 'row', gap: 10 },
  addTodoCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addTodoCancelText: {
    fontSize: 14,
    color: '#8C7B6E',
    fontFamily: 'DMSans_400Regular',
  },
  addTodoSaveBtn: {
    flex: 1,
    backgroundColor: '#2C2420',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addTodoSaveText: {
    fontSize: 14,
    color: '#F5F0E8',
    fontFamily: 'DMSans_500Medium',
  },
  addTodoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  addTodoBtnText: {
    fontSize: 14,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
  },

  // Payments
  loadingRow: { paddingVertical: 40, alignItems: 'center' },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  paymentLeft: { flex: 1, gap: 3 },
  paymentVendor: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  paymentDate: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
  paymentRight: { alignItems: 'flex-end', gap: 3 },
  paymentAmount: {
    fontSize: 15,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  paymentStatus: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
  },

  // Journey
  journeyHeroCard: {
    backgroundColor: '#2C2420',
    borderRadius: 16,
    padding: 22,
    gap: 10,
  },
  journeyHeroTitle: {
    fontSize: 26,
    color: '#F5F0E8',
    fontFamily: 'PlayfairDisplay_300Light',
    letterSpacing: 0.3,
  },
  journeyHeroQuote: {
    fontSize: 14,
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    letterSpacing: 0.3,
  },
  journeyHeroText: {
    fontSize: 13,
    color: '#B8A99A',
    fontFamily: 'DMSans_300Light',
    lineHeight: 20,
  },
  addMemoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E8D9B5',
    borderStyle: 'dashed',
  },
  addMemoryBtnText: {
    fontSize: 15,
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  collageTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8EC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  collageTeaserLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  collageTeaserText: { flex: 1, gap: 3 },
  collageTeaserTitle: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  collageTeaserSub: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    lineHeight: 18,
  },
  collageTeaserBadge: {
    backgroundColor: '#2C2420',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  collageTeaserBadgeText: {
    fontSize: 10,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },
  memoriesGrid: { gap: 10 },
  memoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  memoryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  memoryText: { flex: 1, gap: 3 },
  memoryCaption: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  memoryDate: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_300Light',
    letterSpacing: 0.3,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  emptyStateBtnText: {
    fontSize: 13,
    color: '#F5F0E8',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#F5F0E8',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    gap: 14,
  },
  modalTitle: {
    fontSize: 22,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_300Light',
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    marginTop: -8,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
  },
  modalBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 14,
    color: '#F5F0E8',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  modalCancel: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: {
    fontSize: 14,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },

  // Journey prompt chips
  promptScroll: { gap: 8, paddingVertical: 4 },
  promptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    backgroundColor: '#FFFFFF',
  },
  promptChipActive: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  promptChipText: {
    fontSize: 12,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
  },
  promptChipTextActive: {
    color: '#F5F0E8',
  },

  // Media row
  mediaRow: { flexDirection: 'row', gap: 10 },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  mediaBtnText: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_400Regular',
  },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    backgroundColor: '#F5F0E8',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navItem: { alignItems: 'center', gap: 4 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C9A84C' },
  navLabel: {
    fontSize: 10,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
  navLabelActive: { color: '#2C2420', fontFamily: 'DMSans_500Medium' },
});
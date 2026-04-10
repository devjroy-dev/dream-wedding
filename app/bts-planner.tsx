import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput, Modal,
  ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getGuests, addGuest, getUserBookings, getNotifications
} from '../services/api';

const { width } = Dimensions.get('window');

const TABS = ['Budget', 'Guests', 'To Do', 'Payments', 'Memories'];

const DEFAULT_BUDGET_CATEGORIES = [
  { id: '1', category: 'Venue', budgeted: 800000, hearted: 0, booked: 0 },
  { id: '2', category: 'Photography', budgeted: 150000, hearted: 0, booked: 0 },
  { id: '3', category: 'Makeup Artist', budgeted: 50000, hearted: 0, booked: 0 },
  { id: '4', category: 'Designer', budgeted: 200000, hearted: 0, booked: 0 },
  { id: '5', category: 'Choreographer', budgeted: 60000, hearted: 0, booked: 0 },
  { id: '6', category: 'Content Creator', budgeted: 30000, hearted: 0, booked: 0 },
  { id: '7', category: 'DJ & Music', budgeted: 80000, hearted: 0, booked: 0 },
  { id: '8', category: 'Event Manager', budgeted: 200000, hearted: 0, booked: 0 },
];

const DEFAULT_TODOS = [
  { id: '1', text: 'Book photographer', done: true, reminder: 'Dec 1, 2025' },
  { id: '2', text: 'Finalise venue', done: false, reminder: 'Dec 5, 2025' },
  { id: '3', text: 'Send e-invites', done: false, reminder: 'Dec 10, 2025' },
  { id: '4', text: 'Book MUA for trial', done: false, reminder: 'Dec 8, 2025' },
  { id: '5', text: 'Confirm choreographer', done: false, reminder: '' },
  { id: '6', text: 'Finalise bridal outfit', done: false, reminder: 'Dec 15, 2025' },
];

const SMART_CHECKLIST = [
  { id: '1', text: '12 months before: Book venue', done: true },
  { id: '2', text: '10 months before: Book photographer', done: true },
  { id: '3', text: '8 months before: Book MUA & designer', done: false },
  { id: '4', text: '6 months before: Send save the dates', done: false },
  { id: '5', text: '4 months before: Finalise guest list', done: false },
  { id: '6', text: '2 months before: Send e-invites', done: false },
  { id: '7', text: '1 month before: Confirm all vendors', done: false },
];

const formatAmount = (amount: number) => {
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

  // Bookings/Payments
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Todos
  const [todos, setTodos] = useState(DEFAULT_TODOS);
  const [newTodo, setNewTodo] = useState('');
  const [newReminder, setNewReminder] = useState('');
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [showSmartChecklist, setShowSmartChecklist] = useState(false);

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (userId) {
      if (activeTab === 'Guests') loadGuests();
      if (activeTab === 'Payments') loadBookings();
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
    } catch (e) {
      setGuests([]);
    } finally {
      setGuestsLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      setBookingsLoading(true);
      const result = await getUserBookings(userId);
      if (result.success) setBookings(result.data || []);
    } catch (e) {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
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
        setNewGuestName('');
        setNewGuestGroup('');
        setNewGuestDietary('');
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
    setNewTodo('');
    setNewReminder('');
    setShowAddTodo(false);
  };

  const removeTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const totalBudget = userSession?.budget || 2500000;
  const confirmedGuests = guests.filter(g => g.rsvp === 'confirmed').length;
  const pendingGuests = guests.filter(g => g.rsvp === 'pending').length;
  const completedTodos = todos.filter(t => t.done).length;
  const totalInEscrow = bookings.reduce((sum, b) => b.status === 'pending_confirmation' ? sum + (b.token_amount || 0) : sum, 0);

  const weddingDate = userSession?.wedding_date
    ? new Date(userSession.wedding_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not set';

  const daysUntil = userSession?.wedding_date
    ? Math.max(0, Math.ceil((new Date(userSession.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

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
              placeholderTextColor="#8C7B6E"
              value={newGuestName}
              onChangeText={setNewGuestName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Group (e.g. Family, College Friends)"
              placeholderTextColor="#8C7B6E"
              value={newGuestGroup}
              onChangeText={setNewGuestGroup}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Dietary preference (e.g. Veg, Non-Veg, Jain)"
              placeholderTextColor="#8C7B6E"
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

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Planner</Text>
          {daysUntil !== null && (
            <Text style={styles.countdown}>{daysUntil} days to go · {weddingDate}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.messagesBtn}
            onPress={() => router.push('/messaging')}
          >
            <Text style={styles.messagesBtnText}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => Alert.alert('Co-Planner', 'Share this link with your partner to plan together:\n\nthedreamwedding.com/join/your-code\n\n(Live sync coming soon)')}
          >
            <Text style={styles.inviteBtnText}>+ Co-planner</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
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

        {/* BUDGET */}
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
                  <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>{formatAmount(totalInEscrow)}</Text>
                  <Text style={styles.summaryLabel}>In Escrow</Text>
                </View>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: '4%' }]} />
              </View>
              <Text style={styles.progressLabel}>Heart vendors to track your spend</Text>
            </View>

            <View style={styles.intelligenceCard}>
              <Text style={styles.intelligenceTitle}>Budget Intelligence</Text>
              <Text style={styles.intelligenceText}>
                Couples in {userSession?.city || 'your city'} typically spend 40% on venue, 15% on photography and 12% on designer wear.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>By Category</Text>
            <View style={styles.listCard}>
              {DEFAULT_BUDGET_CATEGORIES.map((cat, index) => (
                <View key={cat.id}>
                  <TouchableOpacity
                    style={styles.budgetRow}
                    onPress={() => router.push(`/filter?category=${cat.category.toLowerCase().replace(/ /g, '-')}`)}
                  >
                    <View>
                      <Text style={styles.budgetCategoryName}>{cat.category}</Text>
                      <Text style={styles.budgetCategoryDetail}>Budget: {formatAmount(cat.budgeted)}</Text>
                    </View>
                    <View style={styles.budgetRowRight}>
                      <Text style={styles.emptyText}>Browse →</Text>
                    </View>
                  </TouchableOpacity>
                  {index < DEFAULT_BUDGET_CATEGORIES.length - 1 && <View style={styles.listDivider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* GUESTS */}
        {activeTab === 'Guests' && (
          <View style={styles.tabPane}>
            <View style={styles.summaryCard}>
              <View style={styles.guestSummaryRow}>
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

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderRightWidth: 1, borderRightColor: '#E8E0D5' }]}
                onPress={() => setShowAddGuest(true)}
              >
                <Text style={styles.actionBtnText}>Add Guest</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderRightWidth: 1, borderRightColor: '#E8E0D5' }]}
                onPress={() => Alert.alert('E-Invites', 'Digital invitations are coming soon. Your guest list is being saved so you\'ll be ready to send instantly.')}
              >
                <Text style={styles.actionBtnText}>E-Invites</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => Alert.alert('Seating Chart', 'AI-powered seating suggestions are coming soon. Keep adding your guests!')}
              >
                <Text style={styles.actionBtnText}>Seating</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Guest List ({guests.length})</Text>

            {guestsLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#C9A84C" />
              </View>
            ) : guests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No guests yet</Text>
                <Text style={styles.emptyStateText}>Add your first guest to start building your list</Text>
                <TouchableOpacity style={styles.emptyStateBtn} onPress={() => setShowAddGuest(true)}>
                  <Text style={styles.emptyStateBtnText}>+ Add First Guest</Text>
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
                        <Text style={styles.guestGroup}>{guest.group} · {guest.dietary}</Text>
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

        {/* TO DO */}
        {activeTab === 'To Do' && (
          <View style={styles.tabPane}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {completedTodos} of {todos.length} tasks completed
              </Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: todos.length > 0 ? `${(completedTodos / todos.length) * 100}%` : '0%'
                }]} />
              </View>
            </View>

            <TouchableOpacity
              style={styles.smartChecklistToggle}
              onPress={() => setShowSmartChecklist(!showSmartChecklist)}
            >
              <Text style={styles.smartChecklistToggleText}>
                Smart Wedding Checklist {showSmartChecklist ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {showSmartChecklist && (
              <View style={styles.listCard}>
                {SMART_CHECKLIST.map((item, index) => (
                  <View key={item.id}>
                    <View style={styles.smartChecklistRow}>
                      <View style={[styles.smartCheckbox, item.done && styles.smartCheckboxDone]}>
                        {item.done && <Text style={styles.smartCheckboxTick}>✓</Text>}
                      </View>
                      <Text style={[styles.smartChecklistText, item.done && styles.smartChecklistTextDone]}>
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
                        {todo.reminder ? <Text style={styles.todoReminder}>{todo.reminder}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => removeTodo(todo.id)}>
                        <Text style={styles.todoRemoveBtn}>✕</Text>
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
                        <TouchableOpacity style={[styles.todoCheckbox, styles.todoCheckboxDone]} onPress={() => toggleTodo(todo.id)}>
                          <Text style={styles.todoCheckboxTick}>✓</Text>
                        </TouchableOpacity>
                        <View style={styles.todoContent}>
                          <Text style={[styles.todoText, styles.todoTextDone]}>{todo.text}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeTodo(todo.id)}>
                          <Text style={styles.todoRemoveBtn}>✕</Text>
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
                  placeholderTextColor="#8C7B6E"
                  value={newTodo}
                  onChangeText={setNewTodo}
                  autoFocus
                />
                <TextInput
                  style={styles.addTodoInput}
                  placeholder="Reminder date (optional)"
                  placeholderTextColor="#8C7B6E"
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
                <Text style={styles.addTodoBtnText}>+ Add Task</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* PAYMENTS */}
        {activeTab === 'Payments' && (
          <View style={styles.tabPane}>
            {bookingsLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#C9A84C" />
              </View>
            ) : bookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No payments yet</Text>
                <Text style={styles.emptyStateText}>Lock a vendor date to see your escrow payments here</Text>
                <TouchableOpacity style={styles.emptyStateBtn} onPress={() => router.push('/home')}>
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
                          <Text style={styles.paymentAmount}>{formatAmount(booking.token_amount || 0)}</Text>
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

                <View style={styles.paymentSummaryCard}>
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryKey}>Total in Escrow</Text>
                    <Text style={styles.paymentSummaryVal}>{formatAmount(totalInEscrow)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* MEMORIES */}
        {activeTab === 'Memories' && (
          <View style={styles.tabPane}>
            <View style={styles.memoriesEmpty}>
              <Text style={styles.memoriesTitle}>Memory Book</Text>
              <Text style={styles.memoriesSubtitle}>
                Upload behind-the-scenes moments from your functions. Your co-planner and content creator can add memories too.
              </Text>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => Alert.alert('Coming Soon', 'Memory uploads are being set up. Your Memory Book will be ready soon!')}
              >
                <Text style={styles.uploadBtnText}>Add Memory</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.websiteBtn}
                onPress={() => router.push('/wedding-website')}
              >
                <Text style={styles.websiteBtnText}>Create Wedding Website →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/moodboard')}>
          <Text style={styles.navLabel}>Moodboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navDot} />
          <Text style={[styles.navLabel, styles.navActive]}>Planner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  title: { fontSize: 28, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  countdown: { fontSize: 12, color: '#C9A84C', marginTop: 3, letterSpacing: 0.3 },
  headerRight: { flexDirection: 'row', gap: 8 },
  messagesBtn: { borderWidth: 1, borderColor: '#2C2420', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 7 },
  messagesBtnText: { fontSize: 12, color: '#2C2420', fontWeight: '500' },
  inviteBtn: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 7 },
  inviteBtnText: { fontSize: 12, color: '#8C7B6E' },
  tabScroll: { maxHeight: 44, marginBottom: 16 },
  tabContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 50, borderWidth: 1, borderColor: '#E8E0D5', backgroundColor: '#FFFFFF' },
  tabActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  tabText: { fontSize: 13, color: '#2C2420' },
  tabTextActive: { color: '#F5F0E8', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  tabPane: { gap: 14 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, gap: 14, borderWidth: 1, borderColor: '#E8E0D5' },
  summaryTitle: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guestSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#E8E0D5' },
  summaryAmount: { fontSize: 22, color: '#2C2420', fontWeight: '400' },
  summaryLabel: { fontSize: 11, color: '#8C7B6E', letterSpacing: 0.3 },
  progressBg: { height: 3, backgroundColor: '#E8E0D5', borderRadius: 1.5 },
  progressFill: { height: 3, backgroundColor: '#C9A84C', borderRadius: 1.5 },
  progressLabel: { fontSize: 11, color: '#8C7B6E', textAlign: 'right' },
  intelligenceCard: { backgroundColor: '#2C2420', borderRadius: 12, padding: 16, gap: 8 },
  intelligenceTitle: { fontSize: 13, color: '#C9A84C', fontWeight: '500', letterSpacing: 0.5 },
  intelligenceText: { fontSize: 13, color: '#B8A99A', lineHeight: 20 },
  sectionLabel: { fontSize: 12, color: '#8C7B6E', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '500' },
  listCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E0D5', overflow: 'hidden' },
  listDivider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 16 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  budgetRowRight: { alignItems: 'flex-end' },
  budgetCategoryName: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  budgetCategoryDetail: { fontSize: 12, color: '#8C7B6E', marginTop: 2 },
  emptyText: { fontSize: 12, color: '#C9A84C', fontWeight: '500' },
  actionRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E0D5', overflow: 'hidden' },
  actionBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  actionBtnText: { fontSize: 13, color: '#C9A84C', fontWeight: '500' },
  guestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  guestAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  guestAvatarText: { fontSize: 14, color: '#F5F0E8', fontWeight: '500' },
  guestInfo: { flex: 1, gap: 2 },
  guestName: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  guestGroup: { fontSize: 12, color: '#8C7B6E' },
  rsvpText: { fontSize: 12, fontWeight: '500' },
  loadingRow: { paddingVertical: 40, alignItems: 'center' },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyStateTitle: { fontSize: 18, color: '#2C2420', fontWeight: '300' },
  emptyStateText: { fontSize: 13, color: '#8C7B6E', textAlign: 'center', lineHeight: 20 },
  emptyStateBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  emptyStateBtnText: { fontSize: 13, color: '#F5F0E8', fontWeight: '500' },
  smartChecklistToggle: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D5' },
  smartChecklistToggleText: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  smartChecklistRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  smartCheckbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8E0D5', justifyContent: 'center', alignItems: 'center' },
  smartCheckboxDone: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  smartCheckboxTick: { color: '#C9A84C', fontSize: 10, fontWeight: '700' },
  smartChecklistText: { fontSize: 13, color: '#2C2420', flex: 1 },
  smartChecklistTextDone: { textDecorationLine: 'line-through', color: '#8C7B6E' },
  todoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  todoCheckbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#C9A84C', justifyContent: 'center', alignItems: 'center' },
  todoCheckboxDone: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  todoCheckboxInner: { width: 8, height: 8, borderRadius: 4 },
  todoCheckboxTick: { color: '#C9A84C', fontSize: 10, fontWeight: '700' },
  todoContent: { flex: 1, gap: 2 },
  todoText: { fontSize: 14, color: '#2C2420' },
  todoTextDone: { textDecorationLine: 'line-through', color: '#8C7B6E' },
  todoReminder: { fontSize: 11, color: '#C9A84C' },
  todoRemoveBtn: { fontSize: 13, color: '#8C7B6E', padding: 4 },
  addTodoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', gap: 10 },
  addTodoInput: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: '#2C2420', backgroundColor: '#F5F0E8' },
  addTodoActions: { flexDirection: 'row', gap: 10 },
  addTodoCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  addTodoCancelText: { fontSize: 14, color: '#8C7B6E' },
  addTodoSaveBtn: { flex: 1, backgroundColor: '#2C2420', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  addTodoSaveText: { fontSize: 14, color: '#F5F0E8', fontWeight: '500' },
  addTodoBtn: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFFFFF' },
  addTodoBtnText: { fontSize: 14, color: '#C9A84C', fontWeight: '500' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  paymentLeft: { flex: 1, gap: 3 },
  paymentVendor: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  paymentDate: { fontSize: 12, color: '#8C7B6E' },
  paymentRight: { alignItems: 'flex-end', gap: 3 },
  paymentAmount: { fontSize: 15, color: '#2C2420', fontWeight: '600' },
  paymentStatus: { fontSize: 11, fontWeight: '500' },
  paymentSummaryCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E0D5', overflow: 'hidden' },
  paymentSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  paymentSummaryKey: { fontSize: 14, color: '#8C7B6E' },
  paymentSummaryVal: { fontSize: 14, color: '#2C2420', fontWeight: '600' },
  memoriesEmpty: { alignItems: 'center', gap: 14, paddingVertical: 48 },
  memoriesTitle: { fontSize: 24, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  memoriesSubtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  uploadBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32 },
  uploadBtnText: { fontSize: 14, color: '#F5F0E8', fontWeight: '500' },
  websiteBtn: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32, backgroundColor: '#FFFFFF' },
  websiteBtnText: { fontSize: 14, color: '#C9A84C', fontWeight: '500' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8', position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center', gap: 4 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C9A84C' },
  navLabel: { fontSize: 12, color: '#8C7B6E', letterSpacing: 0.3 },
  navActive: { color: '#2C2420', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#F5F0E8', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 14 },
  modalTitle: { fontSize: 22, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  modalInput: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 14, paddingHorizontal: 16, fontSize: 14, color: '#2C2420' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  modalBtnText: { fontSize: 15, color: '#F5F0E8', fontWeight: '500' },
  modalCancel: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: '#8C7B6E' },
});
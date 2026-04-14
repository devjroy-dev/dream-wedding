import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Modal, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUser } from '../services/api';
import { Feather } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import { ProfileSkeleton, ListSkeleton } from '../components/SkeletonLoader';

export default function ProfileScreen() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [coupleTier, setCoupleTier] = useState<'free' | 'premium' | 'elite'>('free');
  const [tokenBalance, setTokenBalance] = useState(0);
  const [showTierModal, setShowTierModal] = useState(false);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSession(parsed);
        setEditName(parsed.name || '');
      }
      const tier = await AsyncStorage.getItem('tdw_couple_tier');
      if (tier) setCoupleTier(tier as any);
      const tokens = await AsyncStorage.getItem('tdw_token_balance');
      if (tokens !== null) setTokenBalance(parseInt(tokens));
    } catch (e) {}
    finally { setLoading(false); }
  };

  const handleSaveEdit = async () => {
    try {
      setSavingEdit(true);
      const updated = { ...session, name: editName.trim() };
      await AsyncStorage.setItem('user_session', JSON.stringify(updated));
      if (session?.userId) {
        try { await updateUser(session.userId, { name: editName.trim() }); } catch (e) {}
      }
      setSession(updated);
      setShowEditModal(false);
    } catch (e) {
      Alert.alert('Error', 'Could not save changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('user_session');
          await AsyncStorage.removeItem('vendor_session');
          router.replace('/login');
        }
      }
    ]);
  };

  const formatDate = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return isoDate; }
  };

  const formatBudget = (budget: number) => {
    if (!budget) return 'Not set';
    if (budget >= 10000000) return '₹1Cr+';
    if (budget >= 5000000) return '₹50L – ₹1Cr';
    if (budget >= 2500000) return '₹25L – ₹50L';
    if (budget >= 1000000) return '₹10L – ₹25L';
    return '₹5L – ₹10L';
  };

  const formatFunctions = (functions: string[]) => {
    if (!functions || functions.length === 0) return 'Not set';
    return functions.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ');
  };

  const userName = session?.name || 'Guest';
  const userPhone = session?.phone || 'Not set';
  const weddingDate = session?.wedding_date ? formatDate(session.wedding_date) : 'Not set';
  const city = session?.city || 'Not set';
  const budget = formatBudget(session?.budget);
  const functions = formatFunctions(session?.functions);

  const daysUntil = session?.wedding_date
    ? Math.max(0, Math.ceil((new Date(session.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#C9A84C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>


      {/* Tier Selection Modal */}
      <Modal visible={showTierModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.modalTitle}>Choose Your Plan</Text>
                <TouchableOpacity onPress={() => setShowTierModal(false)}><Feather name="x" size={20} color="#8C7B6E" /></TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 20, marginBottom: 20 }}>Every plan includes the full swipe experience, moodboard, and BTS planner</Text>

              {/* Mehendi — Free */}
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: coupleTier === 'free' ? '#C9A84C' : '#EDE8E0', gap: 12, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' }}>Basic</Text>
                    <Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>Start your journey</Text>
                  </View>
                  <Text style={{ fontSize: 20, color: '#2C2420', fontFamily: 'PlayfairDisplay_600SemiBold' }}>Free</Text>
                </View>
                <View style={{ gap: 6 }}>
                  {['3 tokens to unlock vendors', 'Blind swipe discovery', 'Moodboard & BTS planner', 'Wedding website builder'].map(f => (
                    <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="check" size={11} color="#4CAF50" />
                      <Text style={{ fontSize: 12, color: '#2C2420', fontFamily: 'DMSans_400Regular' }}>{f}</Text>
                    </View>
                  ))}
                </View>
                {coupleTier === 'free' && (
                  <View style={{ backgroundColor: '#4CAF5015', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#4CAF50', fontFamily: 'DMSans_500Medium' }}>Current Plan</Text>
                  </View>
                )}
              </View>

              {/* Sangeet — Premium */}
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: coupleTier === 'premium' ? '#C9A84C' : '#EDE8E0', gap: 12, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' }}>Gold</Text>
                    <Text style={{ fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>Most Popular</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 20, color: '#2C2420', fontFamily: 'PlayfairDisplay_600SemiBold' }}>Rs.999</Text>
                    <Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>one-time</Text>
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  {['15 tokens to unlock vendors', 'Smart vendor matching', 'Priority enquiry badge', 'Curated For You combinations', 'Everything in Mehendi'].map(f => (
                    <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="check" size={11} color="#C9A84C" />
                      <Text style={{ fontSize: 12, color: '#2C2420', fontFamily: 'DMSans_400Regular' }}>{f}</Text>
                    </View>
                  ))}
                </View>
                {coupleTier === 'premium' ? (
                  <View style={{ backgroundColor: '#C9A84C15', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>Current Plan</Text>
                  </View>
                ) : coupleTier === 'free' ? (
                  <TouchableOpacity style={{ backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }} onPress={async () => {
                    setCoupleTier('premium'); setTokenBalance(15);
                    await AsyncStorage.setItem('tdw_couple_tier', 'premium');
                    await AsyncStorage.setItem('tdw_token_balance', '15');
                    setShowTierModal(false);
                    Alert.alert('Welcome to Gold!', 'You now have 15 tokens and access to smart matching. Razorpay payment integration coming soon.');
                  }}>
                    <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}>UPGRADE TO GOLD</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Shaadi — Elite */}
              <View style={{ backgroundColor: '#2C2420', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: coupleTier === 'elite' ? '#C9A84C' : 'rgba(201,168,76,0.3)', gap: 12, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 18, color: '#C9A84C', fontFamily: 'PlayfairDisplay_400Regular' }}>Platinum</Text>
                    <Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>The complete experience</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 20, color: '#C9A84C', fontFamily: 'PlayfairDisplay_600SemiBold' }}>Rs.2,999</Text>
                    <Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>one-time</Text>
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  {['Unlimited tokens', 'Couture vendor access', 'Book luxury appointments', 'Vendor availability checker', 'Co-planner live sync', 'Everything in Sangeet'].map(f => (
                    <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="check" size={11} color="#C9A84C" />
                      <Text style={{ fontSize: 12, color: '#F5F0E8', fontFamily: 'DMSans_400Regular' }}>{f}</Text>
                    </View>
                  ))}
                </View>
                {coupleTier === 'elite' ? (
                  <View style={{ backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>Current Plan</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={{ backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }} onPress={async () => {
                    setCoupleTier('elite'); setTokenBalance(9999);
                    await AsyncStorage.setItem('tdw_couple_tier', 'elite');
                    await AsyncStorage.setItem('tdw_token_balance', '9999');
                    setShowTierModal(false);
                    Alert.alert('Welcome to Platinum!', 'You now have unlimited tokens, Couture access, and the full planning experience. Razorpay payment integration coming soon.');
                  }}>
                    <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}>UPGRADE TO PLATINUM</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={{ fontSize: 10, color: '#B8ADA4', fontFamily: 'DMSans_300Light', textAlign: 'center', marginTop: 4 }}>Secured by Razorpay · Payments launching soon</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Name Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Your Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter your name"
                placeholderTextColor="#8C7B6E"
                value={editName}
                onChangeText={setEditName}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.modalBtn, savingEdit && { opacity: 0.6 }]}
              onPress={handleSaveEdit}
              disabled={savingEdit}
            >
              {savingEdit ? <ActivityIndicator color="#F5F0E8" /> : <Text style={styles.modalBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.notificationsBtn} onPress={() => router.push('/notifications')}>
          <Text style={styles.notificationsBtnText}>🔔 Notifications</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName[0]?.toUpperCase() || 'G'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userPhone}>{userPhone}</Text>
            {daysUntil !== null && (
              <Text style={styles.userWedding}>{daysUntil} days to go · {city}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditModal(true)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription Tier */}
        <TouchableOpacity style={styles.subscriptionCard} onPress={() => setShowTierModal(true)} activeOpacity={0.85}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.subscriptionPlan}>
              {coupleTier === 'elite' ? 'Platinum Plan' : coupleTier === 'premium' ? 'Gold Plan' : 'Basic Plan'}
            </Text>
            <Text style={styles.subscriptionDetail}>
              {coupleTier === 'elite' ? 'Unlimited tokens · Couture access' : coupleTier === 'premium' ? '15 tokens · Smart matching' : 'Free · 3 tokens'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: '#FFF8EC', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#E8D9B5', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="zap" size={10} color="#C9A84C" />
              <Text style={{ fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>{coupleTier === 'elite' ? 'Unlimited' : tokenBalance}</Text>
            </View>
            {coupleTier === 'free' && <Text style={{ fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>Upgrade</Text>}
          </View>
        </TouchableOpacity>

        {/* Wedding countdown prominent */}
        {daysUntil !== null && (
          <View style={styles.countdownCard}>
            <View style={styles.countdownLeft}>
              <Text style={styles.countdownNumber}>{daysUntil}</Text>
              <Text style={styles.countdownLabel}>days to go</Text>
            </View>
            <View style={styles.countdownDivider} />
            <View style={styles.countdownRight}>
              <Text style={styles.countdownDate}>{weddingDate}</Text>
              <Text style={styles.countdownSub}>Your wedding day ✨</Text>
              <TouchableOpacity onPress={() => router.push('/onboarding')}>
                <Text style={styles.countdownEdit}>Change date →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Co-planner */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Co-planner</Text>
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle}>No co-planner linked</Text>
              <Text style={styles.cardSub}>Invite your partner or parent to plan together</Text>
            </View>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => Alert.alert('Invite Co-planner', 'Share this link with your partner:\n\nthedreamwedding.in/join/your-code\n\nLive sync coming soon!')}
            >
              <Text style={styles.linkBtnText}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wedding Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Wedding Details</Text>
          <View style={styles.listCard}>
            {[
              { key: 'Date', val: weddingDate },
              { key: 'City', val: city },
              { key: 'Budget', val: budget },
              { key: 'Functions', val: functions },
            ].map((item, index, arr) => (
              <View key={item.key}>
                <View style={styles.listRow}>
                  <Text style={styles.listKey}>{item.key}</Text>
                  <Text style={styles.listVal} numberOfLines={2}>{item.val}</Text>
                </View>
                {index < arr.length - 1 && <View style={styles.listDivider} />}
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.editDetailsBtn} onPress={() => router.push('/onboarding')}>
            <Text style={styles.editDetailsBtnText}>Update wedding details →</Text>
          </TouchableOpacity>
        </View>

        {/* Referral Banner */}
        <TouchableOpacity
          style={styles.referralCard}
          onPress={() => Alert.alert('Invite a Friend', 'Share your referral link:\n\nthedreamwedding.in/invite/your-code\n\nGet 1 month Premium free when they sign up!')}
        >
          <View style={styles.referralLeft}>
            <Text style={styles.referralTitle}>Invite a friend</Text>
            <Text style={styles.referralSub}>Get 1 month Premium free when they sign up</Text>
          </View>
          <Text style={styles.referralArrow}>›</Text>
        </TouchableOpacity>

        {/* Post Wedding */}
        <TouchableOpacity style={styles.postWeddingCard}>
          <View style={styles.postWeddingLeft}>
            <Text style={styles.postWeddingTitle}>After the wedding</Text>
            <Text style={styles.postWeddingSub}>Book your anniversary shoot, honeymoon photographer & more</Text>
          </View>
          <Text style={styles.postWeddingArrow}>›</Text>
        </TouchableOpacity>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.listCard}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Push Notifications</Text>
              <TouchableOpacity style={[styles.toggle, notifications && styles.toggleActive]} onPress={() => setNotifications(!notifications)}>
                <View style={[styles.toggleThumb, notifications && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
            <View style={styles.listDivider} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Payment Reminders</Text>
              <TouchableOpacity style={[styles.toggle, reminders && styles.toggleActive]} onPress={() => setReminders(!reminders)}>
                <View style={[styles.toggleThumb, reminders && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Beta Features */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Beta Features</Text>
          <View style={styles.listCard}>

            {/* Curated Suggestions — Live */}
            <TouchableOpacity
              style={styles.listRow}
              onPress={() => router.push('/curated-suggestions' as any)}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.betaTitle}>Curated Suggestions</Text>
                <Text style={styles.betaDesc}>Set budgets per vendor category and get smart combinations within your total budget</Text>
              </View>
              <View style={styles.betaBadgeLive}>
                <Text style={styles.betaBadgeLiveText}>Live</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.listDivider} />

            {/* Coming Soon features — greyed out */}
            {[
              { title: 'AI Vendor Match', desc: 'AI picks your dream team based on your vibe, budget, and past saves', build: 'Build 2' },
              { title: 'Co-planner Live Sync', desc: 'Real-time planning with your partner — see changes as they happen', build: 'Build 2' },
              { title: 'Wedding Website Builder', desc: 'A beautiful shareable website for your guests with RSVP, registry, and timeline', build: 'Build 2' },
              { title: 'Look-Alike Search', desc: 'Upload a photo you love, find vendors who shoot in that exact style', build: 'Build 2' },
              { title: 'Smart Checklist', desc: 'AI-generated checklist based on your wedding date, budget, and functions', build: 'Build 3' },
              { title: 'Vendor Chat', desc: 'In-app messaging with read receipts, image sharing, and voice notes', build: 'Build 3' },
              { title: 'AR Venue Preview', desc: 'Walk through venues virtually before visiting in person', build: 'Build 3' },
            ].map((feature, index, arr) => (
              <View key={feature.title}>
                <View style={[styles.listRow, { opacity: 0.45 }]}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.betaTitle}>{feature.title}</Text>
                    <Text style={styles.betaDesc}>{feature.desc}</Text>
                  </View>
                  <View style={styles.betaBadgeSoon}>
                    <Text style={styles.betaBadgeSoonText}>{feature.build}</Text>
                  </View>
                </View>
                {index < arr.length - 1 && <View style={styles.listDivider} />}
              </View>
            ))}

          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.listCard}>
            {[
              { label: 'Privacy Policy', onPress: () => Alert.alert('Privacy Policy', 'Available at thedreamwedding.in/privacy') },
              { label: 'Terms of Service', onPress: () => Alert.alert('Terms of Service', 'Available at thedreamwedding.in/terms') },
              { label: 'Help & Support', onPress: () => Alert.alert('Support', 'Email us at hello@thedreamwedding.in') },
              { label: 'Rate The Dream Wedding', onPress: () => Alert.alert('Thank you!', 'App Store rating coming when we launch on the store.') },
            ].map((item, index, arr) => (
              <View key={item.label}>
                <TouchableOpacity style={styles.listRow} onPress={item.onPress}>
                  <Text style={styles.listKey}>{item.label}</Text>
                  <Text style={styles.listArrow}>›</Text>
                </TouchableOpacity>
                {index < arr.length - 1 && <View style={styles.listDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>The Dream Wedding v1.0.0</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <BottomNav />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', paddingTop: 60 },
  loadingContainer: { flex: 1, backgroundColor: '#FAF6F0', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  title: { fontSize: 28, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  notificationsBtn: { borderWidth: 1, borderColor: '#EDE8E0', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#FFFFFF' },
  notificationsBtnText: { fontSize: 12, color: '#8C7B6E' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, gap: 16, paddingBottom: 40 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#EDE8E0', gap: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, color: '#C9A84C', fontWeight: '400' },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 18, color: '#2C2420', fontWeight: '500' },
  userPhone: { fontSize: 13, color: '#8C7B6E' },
  userWedding: { fontSize: 12, color: '#C9A84C' },
  editBtn: { borderWidth: 1, borderColor: '#EDE8E0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  editBtnText: { fontSize: 13, color: '#2C2420' },
  subscriptionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2C2420', borderRadius: 16, padding: 18 },
  subscriptionPlan: { fontSize: 15, color: '#F5F0E8', fontWeight: '500' },
  subscriptionDetail: { fontSize: 12, color: '#8C7B6E', marginTop: 3 },
  subscriptionBadge: { backgroundColor: '#C9A84C', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 },
  subscriptionBadgeText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  countdownCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#EDE8E0', gap: 16 },
  countdownLeft: { alignItems: 'center', minWidth: 64 },
  countdownNumber: { fontSize: 36, color: '#C9A84C', fontWeight: '300' },
  countdownLabel: { fontSize: 10, color: '#8C7B6E', letterSpacing: 1, textTransform: 'uppercase' },
  countdownDivider: { width: 1, height: 50, backgroundColor: '#E8E0D5' },
  countdownRight: { flex: 1, gap: 4 },
  countdownDate: { fontSize: 15, color: '#2C2420', fontWeight: '400' },
  countdownSub: { fontSize: 12, color: '#8C7B6E' },
  countdownEdit: { fontSize: 12, color: '#C9A84C', marginTop: 4 },
  referralCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF8EC', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E8D9B5' },
  referralLeft: { flex: 1, gap: 4 },
  referralTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  referralSub: { fontSize: 12, color: '#8C7B6E', lineHeight: 18 },
  referralArrow: { fontSize: 20, color: '#C9A84C' },
  postWeddingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAF6F0', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#EDE8E0' },
  postWeddingLeft: { flex: 1, gap: 4 },
  postWeddingTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  postWeddingSub: { fontSize: 12, color: '#8C7B6E', lineHeight: 18 },
  postWeddingArrow: { fontSize: 20, color: '#C9A84C' },
  section: { gap: 10 },
  sectionLabel: { fontSize: 12, color: '#8C7B6E', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '500' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#EDE8E0', gap: 12 },
  cardLeft: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  cardSub: { fontSize: 12, color: '#8C7B6E' },
  linkBtn: { borderWidth: 1, borderColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  linkBtnText: { fontSize: 13, color: '#C9A84C', fontWeight: '500' },
  listCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E0', overflow: 'hidden' },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16 },
  listKey: { fontSize: 14, color: '#2C2420' },
  listVal: { fontSize: 13, color: '#8C7B6E', flex: 1, textAlign: 'right', marginLeft: 16 },
  listArrow: { fontSize: 20, color: '#C9A84C' },
  listDivider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 16 },
  editDetailsBtn: { paddingVertical: 8, alignItems: 'center' },
  editDetailsBtnText: { fontSize: 13, color: '#C9A84C', letterSpacing: 0.3 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16 },
  toggleLabel: { fontSize: 14, color: '#2C2420' },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: '#E8E0D5', justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive: { backgroundColor: '#2C2420' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  logoutBtn: { borderWidth: 1, borderColor: '#EDE8E0', borderRadius: 12, paddingVertical: 16, alignItems: 'center', backgroundColor: '#FFFFFF' },
  logoutBtnText: { fontSize: 14, color: '#E57373', fontWeight: '500' },
  version: { textAlign: 'center', fontSize: 11, color: '#8C7B6E', letterSpacing: 0.5 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#EDE8E0', backgroundColor: '#FAF6F0', position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center', gap: 4 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C9A84C' },
  navLabel: { fontSize: 10, color: '#8C7B6E', letterSpacing: 0.3 },
  navLabelActive: { color: '#2C2420', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FAF6F0', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 16 },
  modalTitle: { fontSize: 22, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  modalInputGroup: { gap: 8 },
  modalInputLabel: { fontSize: 13, color: '#8C7B6E', letterSpacing: 0.3 },
  modalInput: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#EDE8E0', paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, color: '#2C2420' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  modalBtnText: { fontSize: 15, color: '#F5F0E8', fontWeight: '500' },
  modalCancel: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: '#8C7B6E' },
  betaTitle: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  betaDesc: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 16, letterSpacing: 0.2 },
  betaBadgeLive: { backgroundColor: '#4CAF5015', borderWidth: 1, borderColor: '#4CAF50', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  betaBadgeLiveText: { fontSize: 10, color: '#4CAF50', fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 },
  betaBadgeSoon: { backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  betaBadgeSoonText: { fontSize: 10, color: '#C9A84C', fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 },
});
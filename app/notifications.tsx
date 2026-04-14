import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNotifications, markNotificationRead } from '../services/api';

const TYPE_COLORS: Record<string, string> = {
  booking_confirmed: '#4CAF50',
  booking_declined: '#E57373',
  booking_cancelled: '#E57373',
  auto_refund: '#E57373',
  message: '#C9A84C',
  reminder: '#2C2420',
  trending: '#8C7B6E',
  payment: '#4CAF50',
};

const TYPE_ICONS: Record<string, string> = {
  booking_confirmed: '✓',
  booking_declined: '✕',
  booking_cancelled: '✕',
  auto_refund: '↩',
  message: '💬',
  reminder: '⏰',
  trending: '✨',
  payment: '₹',
};

const formatTime = (isoDate: string) => {
  try {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  } catch {
    return '';
  }
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const session = await AsyncStorage.getItem('user_session');
      if (!session) return;
      const parsed = JSON.parse(session);
      const uid = parsed.userId || parsed.uid;
      setUserId(uid);
      const result = await getNotifications(uid);
      if (result.success) {
        setNotifications(result.data || []);
      }
    } catch (e) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      await markNotificationRead(id);
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await Promise.all(unread.map(n => markNotificationRead(n.id)));
    } catch (e) {}
  };

  const handleNotifPress = (notif: any) => {
    handleMarkRead(notif.id);
    // Route based on type
    if (notif.type === 'message') router.push('/messaging');
    else if (notif.type === 'booking_confirmed' || notif.type === 'payment') router.push('/bts-planner');
    else if (notif.type === 'booking_declined' || notif.type === 'auto_refund') router.push('/bts-planner');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#C9A84C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markRead}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptySubtitle}>
            Booking confirmations, messages and reminders will appear here
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {notifications.map((notif, index) => (
            <View key={notif.id}>
              <TouchableOpacity
                style={[styles.notifRow, !notif.read && styles.notifRowUnread]}
                onPress={() => handleNotifPress(notif)}
              >
                <View style={[
                  styles.notifIconContainer,
                  { backgroundColor: (TYPE_COLORS[notif.type] || '#8C7B6E') + '15' }
                ]}>
                  <Text style={[
                    styles.notifIcon,
                    { color: TYPE_COLORS[notif.type] || '#8C7B6E' }
                  ]}>
                    {TYPE_ICONS[notif.type] || '•'}
                  </Text>
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifTopRow}>
                    <Text style={styles.notifTitle} numberOfLines={1}>
                      {notif.title}
                    </Text>
                    <Text style={styles.notifTime}>
                      {notif.created_at ? formatTime(notif.created_at) : ''}
                    </Text>
                  </View>
                  <Text style={styles.notifMessage} numberOfLines={2}>
                    {notif.message}
                  </Text>
                </View>
                {!notif.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
              {index < notifications.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', paddingTop: 60 },
  loadingContainer: { flex: 1, backgroundColor: '#FAF6F0', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  backBtn: { fontSize: 22, color: '#2C2420', width: 24 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  unreadBadge: { backgroundColor: '#C9A84C', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  unreadBadgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  markRead: { fontSize: 13, color: '#C9A84C', width: 80, textAlign: 'right' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 24, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  emptySubtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', lineHeight: 22 },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 24, paddingVertical: 16, gap: 14 },
  notifRowUnread: { backgroundColor: '#FDFAF5' },
  notifIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  notifIcon: { fontSize: 14, fontWeight: '600' },
  notifContent: { flex: 1, gap: 5 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: 14, color: '#2C2420', fontWeight: '500', flex: 1 },
  notifTime: { fontSize: 11, color: '#8C7B6E', marginLeft: 8 },
  notifMessage: { fontSize: 13, color: '#8C7B6E', lineHeight: 20 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C9A84C', marginTop: 5 },
  divider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 24 },
});
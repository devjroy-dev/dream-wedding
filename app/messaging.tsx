import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { joinConversation, sendSocketMessage, onReceiveMessage, offReceiveMessage } from '../services/socket';
import { getMessages, getUserBookings } from '../services/api';

const { width } = Dimensions.get('window');

export default function MessagingScreen() {
  const router = useRouter();
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const parsed = JSON.parse(session);
        const uid = parsed.userId || parsed.uid;
        setUserId(uid);
        loadConversations(uid);
      }
    } catch (e) {
      setLoading(false);
    }
  };

  const loadConversations = async (uid: string) => {
    try {
      const result = await getUserBookings(uid);
      if (result.success && result.data?.length > 0) {
        const convs = result.data.map((booking: any) => ({
          id: booking.id,
          vendorId: booking.vendor_id,
          vendorName: booking.vendor_name || 'Vendor',
          category: booking.vendor_category || '',
          lastMessage: 'Tap to open chat',
          time: '',
          unread: 0,
        }));
        setConversations(convs);
      } else {
        setConversations([]);
      }
    } catch (e) {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeConversation || !userId) return;

    getMessages(userId, activeConversation.vendorId)
      .then(res => {
        if (res.success) setMessages(res.data);
      })
      .catch(() => setMessages([]));

    joinConversation(userId, activeConversation.vendorId);

    onReceiveMessage((msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => offReceiveMessage();
  }, [activeConversation, userId]);

  const sendMessage = () => {
    if (newMessage.trim() === '' || !activeConversation || !userId) return;
    sendSocketMessage(userId, activeConversation.vendorId, newMessage.trim(), 'user');
    setNewMessage('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (activeConversation) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setActiveConversation(null)}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>{activeConversation.vendorName}</Text>
            <Text style={styles.chatHeaderCategory}>{activeConversation.category}</Text>
          </View>
          <TouchableOpacity
            style={styles.lockDateBtn}
            onPress={() => router.push(`/payment?id=${activeConversation.vendorId}`)}
          >
            <Text style={styles.lockDateBtnText}>Lock Date</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Start the conversation with {activeConversation.vendorName}</Text>
            </View>
          )}
          {messages.map((msg, index) => (
            <View
              key={msg.id || index}
              style={[styles.messageBubble, msg.sender_type === 'user' ? styles.userBubble : styles.vendorBubble]}
            >
              <Text style={[styles.messageText, msg.sender_type === 'user' ? styles.userMessageText : styles.vendorMessageText]}>
                {msg.message}
              </Text>
              <Text style={[styles.messageTime, msg.sender_type === 'user' ? styles.userMessageTime : styles.vendorMessageTime]}>
                {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor="#8C7B6E"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, newMessage.trim() === '' && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={newMessage.trim() === ''}
          >
            <Text style={styles.sendBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#C9A84C" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Send an inquiry to a vendor to start chatting</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/home')}>
            <Text style={styles.emptyBtnText}>Discover Vendors</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {conversations.map((conv, index) => (
            <View key={conv.id}>
              <TouchableOpacity style={styles.conversationRow} onPress={() => setActiveConversation(conv)}>
                <View style={styles.convAvatar}>
                  <Text style={styles.convAvatarText}>{conv.vendorName[0]}</Text>
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.convTopRow}>
                    <Text style={styles.convName}>{conv.vendorName}</Text>
                    <Text style={styles.convTime}>{conv.time}</Text>
                  </View>
                  <Text style={styles.convCategory}>{conv.category}</Text>
                  <Text style={styles.convLastMessage} numberOfLines={1}>{conv.lastMessage}</Text>
                </View>
                {conv.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{conv.unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
              {index < conversations.length - 1 && <View style={styles.convDivider} />}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  backBtn: { fontSize: 22, color: '#2C2420', width: 24 },
  title: { fontSize: 17, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 22, color: '#2C2420', fontWeight: '300' },
  emptySubtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', lineHeight: 22 },
  emptyBtn: { marginTop: 16, backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32 },
  emptyBtnText: { fontSize: 14, color: '#F5F0E8', fontWeight: '500' },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyChatText: { fontSize: 14, color: '#8C7B6E', textAlign: 'center' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E8E0D5', gap: 12 },
  chatHeaderInfo: { flex: 1, gap: 2 },
  chatHeaderName: { fontSize: 16, color: '#2C2420', fontWeight: '500' },
  chatHeaderCategory: { fontSize: 12, color: '#8C7B6E' },
  lockDateBtn: { backgroundColor: '#2C2420', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  lockDateBtnText: { fontSize: 12, color: '#C9A84C', fontWeight: '500' },
  messagesScroll: { flex: 1 },
  messagesContent: { paddingHorizontal: 24, paddingVertical: 16, gap: 12 },
  messageBubble: { maxWidth: width * 0.72, borderRadius: 16, padding: 12, gap: 4 },
  userBubble: { backgroundColor: '#2C2420', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  vendorBubble: { backgroundColor: '#FFFFFF', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E8E0D5' },
  messageText: { fontSize: 14, lineHeight: 20 },
  userMessageText: { color: '#F5F0E8' },
  vendorMessageText: { color: '#2C2420' },
  messageTime: { fontSize: 10 },
  userMessageTime: { color: '#8C7B6E', textAlign: 'right' },
  vendorMessageTime: { color: '#8C7B6E' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8', gap: 12 },
  messageInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E0D5', paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#2C2420', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText: { fontSize: 18, color: '#C9A84C', fontWeight: '500' },
  conversationRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 14 },
  convAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  convAvatarText: { fontSize: 20, color: '#C9A84C', fontWeight: '300' },
  convInfo: { flex: 1, gap: 3 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  convTime: { fontSize: 11, color: '#8C7B6E' },
  convCategory: { fontSize: 12, color: '#C9A84C' },
  convLastMessage: { fontSize: 13, color: '#8C7B6E' },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  unreadBadgeText: { fontSize: 10, color: '#C9A84C', fontWeight: '700' },
  convDivider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 24 },
});
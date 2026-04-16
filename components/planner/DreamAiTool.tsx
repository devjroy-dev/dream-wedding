import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props { userId: string; session: any; onBack: () => void; }

export default function DreamAiTool({ userId, session, onBack }: Props) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hello! I\'m DreamAi, your wedding planning companion. Ask me anything about your wedding — vendors, timelines, ideas, or logistics.' },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input.trim() }]);
    setInput('');
    // AI response placeholder
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: 'DreamAi is getting ready. Full AI responses coming with the next update — powered by the same intelligence as TDW-Ai on WhatsApp.' }]);
    }, 800);
  };

  const SUGGESTIONS = ['Help me plan the sangeet', 'What vendors do I still need?', 'Create a day-of timeline'];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Feather name="arrow-left" size={18} color="#2C2420" /></TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>DreamAi</Text>
          <Text style={s.headerSub}>Your wedding companion</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.chat} contentContainerStyle={s.chatContent}>
        {messages.map((m, i) => (
          <View key={i} style={[s.bubble, m.role === 'user' ? s.userBubble : s.aiBubble]}>
            <Text style={[s.bubbleText, m.role === 'user' ? s.userText : s.aiText]}>{m.text}</Text>
          </View>
        ))}

        {messages.length <= 1 && (
          <View style={s.suggestWrap}>
            {SUGGESTIONS.map(sg => (
              <TouchableOpacity key={sg} style={s.suggestPill} onPress={() => { setInput(sg); }}>
                <Text style={s.suggestText}>{sg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Ask DreamAi anything..."
          placeholderTextColor="#C4B8AC"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
        />
        <TouchableOpacity style={s.sendBtn} onPress={send}>
          <Feather name="send" size={16} color="#C9A84C" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  headerSub: { fontSize: 10, color: '#C9A84C', fontFamily: 'DMSans_300Light', letterSpacing: 0.5 },

  chat: { flex: 1 },
  chatContent: { paddingHorizontal: 24, paddingBottom: 20 },

  bubble: { maxWidth: '80%', borderRadius: 16, padding: 14, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8E0' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  aiText: { color: '#2C2420', fontFamily: 'DMSans_300Light' },

  suggestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  suggestPill: { borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E8D9B5', backgroundColor: '#FFF8EC' },
  suggestText: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EDE8E0', backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', paddingVertical: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5', justifyContent: 'center', alignItems: 'center' },
});

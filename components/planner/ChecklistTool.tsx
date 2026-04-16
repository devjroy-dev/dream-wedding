import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const DEFAULT_TASKS = [
  { id: '1', text: 'Book venue', done: false, phase: 'This month' },
  { id: '2', text: 'Finalise photographer', done: false, phase: 'This month' },
  { id: '3', text: 'Book makeup artist for trial', done: false, phase: 'Next two weeks' },
  { id: '4', text: 'Send save the dates', done: false, phase: 'This week' },
  { id: '5', text: 'Confirm choreographer', done: false, phase: 'This month' },
  { id: '6', text: 'Finalise bridal outfit', done: false, phase: 'Next two weeks' },
];

interface Props { userId: string; onBack: () => void; }

export default function ChecklistTool({ userId, onBack }: Props) {
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState('');

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try {
      const s = await AsyncStorage.getItem(`checklist_${userId}`);
      if (s) setTasks(JSON.parse(s));
    } catch (e) {}
  };

  const save = async (t: any[]) => {
    setTasks(t);
    try { await AsyncStorage.setItem(`checklist_${userId}`, JSON.stringify(t)); } catch (e) {}
  };

  const toggle = (id: string) => save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) => save(tasks.filter(t => t.id !== id));
  const add = () => {
    if (!newTask.trim()) return;
    save([...tasks, { id: Date.now().toString(), text: newTask.trim(), done: false, phase: 'This week' }]);
    setNewTask(''); setShowAdd(false);
  };

  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const groups = ['This week', 'Next two weeks', 'This month'];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#2C2420" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Checklist</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.backBtn}>
          <Feather name="plus" size={18} color="#C9A84C" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Progress */}
        <View style={s.progressCard}>
          <Text style={s.progressNum}>{done.length}/{tasks.length}</Text>
          <Text style={s.progressLabel}>tasks completed</Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${tasks.length > 0 ? (done.length / tasks.length) * 100 : 0}%` }]} />
          </View>
        </View>

        {groups.map(group => {
          const groupTasks = pending.filter(t => t.phase === group);
          if (groupTasks.length === 0) return null;
          return (
            <View key={group}>
              <Text style={s.groupLabel}>{group}</Text>
              {groupTasks.map(t => (
                <TouchableOpacity key={t.id} style={s.taskCard} onPress={() => toggle(t.id)} activeOpacity={0.8}>
                  <View style={s.checkbox}>
                    {t.done && <Feather name="check" size={12} color="#C9A84C" />}
                  </View>
                  <Text style={s.taskText}>{t.text}</Text>
                  <TouchableOpacity onPress={() => remove(t.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="x" size={14} color="#C4B8AC" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {done.length > 0 && (
          <View>
            <Text style={s.groupLabel}>Done</Text>
            {done.map(t => (
              <View key={t.id} style={[s.taskCard, { opacity: 0.4 }]}>
                <View style={[s.checkbox, s.checkboxDone]}>
                  <Feather name="check" size={12} color="#C9A84C" />
                </View>
                <Text style={[s.taskText, { textDecorationLine: 'line-through' }]}>{t.text}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Task</Text>
            <TextInput style={s.modalInput} placeholder="What needs to be done?" placeholderTextColor="#C4B8AC" value={newTask} onChangeText={setNewTask} />
            <TouchableOpacity style={s.modalBtn} onPress={add}>
              <Text style={s.modalBtnText}>Add</Text>
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

  progressCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDE8E0', padding: 20, marginBottom: 20, alignItems: 'center', gap: 6 },
  progressNum: { fontSize: 28, color: '#C9A84C', fontFamily: 'PlayfairDisplay_600SemiBold' },
  progressLabel: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  progressTrack: { height: 3, backgroundColor: '#EDE8E0', borderRadius: 2, width: '100%', marginTop: 8 },
  progressFill: { height: 3, backgroundColor: '#C9A84C', borderRadius: 2 },

  groupLabel: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 16 },

  taskCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E0', padding: 14, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#E8D9B5', justifyContent: 'center', alignItems: 'center' },
  checkboxDone: { backgroundColor: '#FFF8EC' },
  taskText: { flex: 1, fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  modalInput: { fontSize: 15, color: '#2C2420', fontFamily: 'DMSans_400Regular', borderBottomWidth: 1, borderBottomColor: '#EDE8E0', paddingVertical: 10 },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#FAF6F0', fontSize: 13, fontFamily: 'DMSans_300Light', letterSpacing: 1.5, textTransform: 'uppercase' },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
});

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_TYPES = [
  {
    id: 'couple',
    label: 'We are a Couple',
    sub: 'Planning our dream wedding together',
    route: '/onboarding',
    userType: 'couple',
  },
  {
    id: 'parent',
    label: 'I am a Parent',
    sub: 'Planning my son or daughter\'s wedding',
    route: '/onboarding',
    userType: 'parent',
  },
  {
    id: 'vendor',
    label: 'I am a Vendor',
    sub: 'Photographer, venue, MUA or other professional',
    route: '/vendor-login',
    userType: 'vendor',
  },
];

export default function UserTypeScreen() {
  const router = useRouter();

  const handleSelect = async (type: typeof USER_TYPES[0]) => {
    try {
      // Update session with user type
      const existing = await AsyncStorage.getItem('user_session');
      const parsed = existing ? JSON.parse(existing) : {};
      await AsyncStorage.setItem('user_session', JSON.stringify({
        ...parsed,
        userType: type.userType,
      }));
    } catch (e) {}
    router.replace(type.route as any);
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.logoTop}>The</Text>
        <Text style={styles.logoMain}>Dream Wedding</Text>
        <View style={styles.logoDivider} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>Help us personalise your experience</Text>

        <View style={styles.list}>
          {USER_TYPES.map((type, index) => (
            <View key={type.id}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleSelect(type)}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{type.label}</Text>
                  <Text style={styles.rowSub}>{type.sub}</Text>
                </View>
                <Text style={styles.rowArrow}>›</Text>
              </TouchableOpacity>
              {index < USER_TYPES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          You can always switch later from your profile settings
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: 80,
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 64,
  },
  logoTop: {
    fontSize: 14,
    color: '#8C7B6E',
    fontWeight: '300',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  logoMain: {
    fontSize: 30,
    color: '#2C2420',
    fontWeight: '500',
    letterSpacing: 3,
    textAlign: 'center',
  },
  logoDivider: {
    width: 36,
    height: 1.5,
    backgroundColor: '#C9A84C',
    marginTop: 6,
  },
  content: {
    flex: 1,
    gap: 24,
  },
  title: {
    fontSize: 36,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    marginTop: -16,
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  rowText: {
    gap: 4,
  },
  rowLabel: {
    fontSize: 16,
    color: '#2C2420',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  rowSub: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  rowArrow: {
    fontSize: 22,
    color: '#C9A84C',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 20,
  },
  note: {
    fontSize: 12,
    color: '#8C7B6E',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
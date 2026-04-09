import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function PaymentSuccessScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.successIcon}>
        <Text style={styles.successIconText}>✓</Text>
      </View>
      <Text style={styles.successTitle}>Date Locked!</Text>
      <Text style={styles.successSubtitle}>
        Your token of ₹60,000 is safely held in escrow. Joseph Radhik has 48 hours to confirm your booking.
      </Text>
      <View style={styles.successCard}>
        <View style={styles.successCardRow}>
          <Text style={styles.successCardKey}>Vendor</Text>
          <Text style={styles.successCardVal}>Joseph Radhik</Text>
        </View>
        <View style={styles.successCardDivider} />
        <View style={styles.successCardRow}>
          <Text style={styles.successCardKey}>Event Date</Text>
          <Text style={styles.successCardVal}>December 15, 2025</Text>
        </View>
        <View style={styles.successCardDivider} />
        <View style={styles.successCardRow}>
          <Text style={styles.successCardKey}>Token Paid</Text>
          <Text style={styles.successCardVal}>₹60,000</Text>
        </View>
        <View style={styles.successCardDivider} />
        <View style={styles.successCardRow}>
          <Text style={styles.successCardKey}>Status</Text>
          <Text style={[styles.successCardVal, { color: '#C9A84C' }]}>In Escrow</Text>
        </View>
      </View>
      <View style={styles.noteCard}>
        <Text style={styles.noteText}>
          If the vendor doesn't confirm within 48 hours, your full token will be automatically refunded. No questions asked.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.plannerBtn}
        onPress={() => router.push('/bts-planner')}
      >
        <Text style={styles.plannerBtnText}>View in Planner</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/home')}>
        <Text style={styles.homeLink}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
    paddingTop: 60,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  successIconText: {
    fontSize: 36,
    color: '#C9A84C',
    fontWeight: '300',
  },
  successTitle: {
    fontSize: 32,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    textAlign: 'center',
    lineHeight: 22,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    width: '100%',
    overflow: 'hidden',
  },
  successCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  successCardDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 16,
  },
  successCardKey: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  successCardVal: {
    fontSize: 13,
    color: '#2C2420',
    fontWeight: '500',
  },
  noteCard: {
    backgroundColor: '#FFF8EC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8D9B5',
    width: '100%',
  },
  noteText: {
    fontSize: 13,
    color: '#8C7B6E',
    lineHeight: 20,
    textAlign: 'center',
  },
  plannerBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  plannerBtnText: {
    fontSize: 15,
    color: '#F5F0E8',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  homeLink: {
    fontSize: 13,
    color: '#C9A84C',
    letterSpacing: 0.3,
  },
});
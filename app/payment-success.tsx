import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { vendorName, tokenAmount, weddingDate, bookingId } = useLocalSearchParams();

  const displayVendor = vendorName as string || 'Your Vendor';
  const displayToken = tokenAmount as string || '0';
  const displayDate = weddingDate as string || 'Your wedding date';

  const formatAmount = (amount: string) => {
    const num = parseInt(amount);
    if (isNaN(num)) return '₹0';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <View style={styles.container}>

      <View style={styles.successIcon}>
        <Text style={styles.successIconText}>✓</Text>
      </View>

      <Text style={styles.successTitle}>Date Locked!</Text>
      <Text style={styles.successSubtitle}>
        Your token of {formatAmount(displayToken)} is secured by Payment Shield.{'\n'}
        {displayVendor} has 48 hours to confirm.
      </Text>

      <View style={styles.successCard}>
        {[
          { key: 'Vendor', val: displayVendor },
          { key: 'Wedding Date', val: displayDate },
          { key: 'Token Paid', val: formatAmount(displayToken) },
          { key: 'Protection Fee', val: '₹999' },
          { key: 'Status', val: 'Payment Shield Active', gold: true },
        ].map((row, i, arr) => (
          <View key={row.key}>
            <View style={styles.successCardRow}>
              <Text style={styles.successCardKey}>{row.key}</Text>
              <Text style={[styles.successCardVal, row.gold && { color: '#C9A84C' }]}>
                {row.val}
              </Text>
            </View>
            {i < arr.length - 1 && <View style={styles.successCardDivider} />}
          </View>
        ))}
      </View>

      <View style={styles.shieldCard}>
        <Text style={styles.shieldTitle}>Protected by The Dream Wedding</Text>
        <Text style={styles.shieldText}>
          If {displayVendor} doesn't confirm within 48 hours, your full token is automatically refunded. Your ₹999 booking protection fee is non-refundable.
        </Text>
      </View>

      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#EDE8E0', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 16, color: '#2C2420', fontWeight: '600', letterSpacing: 0.3 }}>Payment Shield</Text>
        <Text style={{ fontSize: 13, color: '#8C7B6E', textAlign: 'center', lineHeight: 20 }}>When the vendor completes their work, release the secured payment.</Text>
        <TouchableOpacity style={{ backgroundColor: '#2C2420', borderRadius: 12, paddingVertical: 15, width: '100%', alignItems: 'center' }} onPress={() => Alert.alert('Release Payment', 'This will release the secured amount to the vendor. Proceed?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Release', onPress: () => Alert.alert('Released', 'Payment released to vendor.') }])}>
          <Text style={{ color: '#F5F0E8', fontSize: 13, fontWeight: '500', letterSpacing: 1.5 }}>RELEASE PAYMENT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ borderRadius: 12, paddingVertical: 13, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#EDE8E0' }} onPress={() => Alert.alert('Cash Settlement', 'Confirm you paid the vendor in cash? Secured amount returns to you.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => Alert.alert('Confirmed', 'Secured amount will be returned.') }])}>
          <Text style={{ color: '#8C7B6E', fontSize: 12, fontWeight: '500', letterSpacing: 1.5 }}>I PAID IN CASH</Text>
        </TouchableOpacity>
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
    backgroundColor: '#FAF6F0',
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
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
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
  successCardKey: { fontSize: 13, color: '#8C7B6E' },
  successCardVal: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  shieldCard: {
    backgroundColor: '#2C2420',
    borderRadius: 14,
    padding: 18,
    width: '100%',
    gap: 8,
  },
  shieldTitle: {
    fontSize: 13,
    color: '#C9A84C',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  shieldText: {
    fontSize: 13,
    color: '#B8A99A',
    lineHeight: 20,
  },
  plannerBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
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
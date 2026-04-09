import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BOOKING_PROTECTION_FEE, initiatePayment } from '../services/razorpay';

const { width } = Dimensions.get('window');

export default function PaymentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const vendorName = 'Joseph Radhik';
  const vendorCategory = 'Photographer';
  const eventDate = 'December 15, 2025';
  const totalAmount = 300000;
  const tokenAmount = 60000;
  const platformFee = BOOKING_PROTECTION_FEE;

  const formatAmount = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      const data = await initiatePayment({
        amount: tokenAmount + platformFee,
        vendorName,
        description: `Token payment for ${vendorName} · ${eventDate}`,
        userName: 'Guest User',
        userPhone: '9999999999',
      });
      // Payment successful
      setStep(3);
    } catch (error: any) {
      if (error.code !== 'PAYMENT_CANCELLED') {
        Alert.alert('Payment Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Date Locked!</Text>
        <Text style={styles.successSubtitle}>
          Your token of {formatAmount(tokenAmount)} is safely held in escrow. {vendorName} has 48 hours to confirm your booking.
        </Text>
        <View style={styles.successCard}>
          <Text style={styles.successCardText}>
            You'll receive a confirmation once the vendor accepts. If they don't respond within 48 hours, your full token will be refunded automatically.
          </Text>
        </View>
        <TouchableOpacity style={styles.successBtn} onPress={() => router.push('/bts-planner')}>
          <Text style={styles.successBtnText}>View in Planner</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/home')}>
          <Text style={styles.successHomeLink}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 2) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep(1)}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Confirm Payment</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Vendor</Text>
              <Text style={styles.summaryVal}>{vendorName}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Category</Text>
              <Text style={styles.summaryVal}>{vendorCategory}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Event Date</Text>
              <Text style={styles.summaryVal}>{eventDate}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Total Package</Text>
              <Text style={styles.summaryVal}>{formatAmount(totalAmount)}</Text>
            </View>
          </View>

          <View style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>Payment Breakdown</Text>
            <View style={styles.paymentRow}>
              <View>
                <Text style={styles.paymentLabel}>Token Amount</Text>
                <Text style={styles.paymentSub}>20% of total package</Text>
              </View>
              <Text style={styles.paymentAmount}>{formatAmount(tokenAmount)}</Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentRow}>
              <View>
                <Text style={styles.paymentLabel}>Booking Protection Fee</Text>
                <Text style={styles.paymentSub}>DreamWedding guarantee</Text>
              </View>
              <Text style={styles.paymentAmount}>{formatAmount(platformFee)}</Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, { fontWeight: '600' }]}>Total Due Now</Text>
              <Text style={[styles.paymentAmount, { color: '#2C2420', fontSize: 18, fontWeight: '600' }]}>
                {formatAmount(tokenAmount + platformFee)}
              </Text>
            </View>
          </View>

          <View style={styles.escrowCard}>
            <Text style={styles.escrowTitle}>DreamWedding Booking Protection</Text>
            <View style={styles.escrowPoints}>
              {[
                'Your token is held securely in escrow',
                'Released to vendor only after they confirm',
                'Full refund if vendor cancels or doesn\'t confirm within 48 hours',
                'Disputes handled by DreamWedding',
              ].map((point, index) => (
                <View key={index} style={styles.escrowPoint}>
                  <Text style={styles.escrowPointDot}>✓</Text>
                  <Text style={styles.escrowPointText}>{point}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(!agreed)}>
            <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
              {agreed && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.agreeText}>
              I agree to the Terms of Service and understand the refund policy
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.payBtn, (!agreed || loading) && styles.payBtnDisabled]}
            disabled={!agreed || loading}
            onPress={handlePayment}
          >
            {loading ? (
              <ActivityIndicator color="#F5F0E8" />
            ) : (
              <Text style={styles.payBtnText}>Pay {formatAmount(tokenAmount + platformFee)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Lock the Date</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.vendorCard}>
          <View style={styles.vendorAvatar}>
            <Text style={styles.vendorAvatarText}>J</Text>
          </View>
          <View style={styles.vendorInfo}>
            <Text style={styles.vendorName}>{vendorName}</Text>
            <Text style={styles.vendorCategory}>{vendorCategory} · Mumbai</Text>
            <Text style={styles.vendorDate}>For: {eventDate}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What is a token payment?</Text>
          <Text style={styles.infoText}>
            A token payment (20% of total) secures your date with the vendor. It's held safely by DreamWedding until the vendor confirms your booking. The remaining balance is paid directly to the vendor later.
          </Text>
        </View>

        <View style={styles.tokenCard}>
          <View style={styles.tokenRow}>
            <Text style={styles.tokenLabel}>Token Amount</Text>
            <Text style={styles.tokenAmount}>{formatAmount(tokenAmount)}</Text>
          </View>
          <View style={styles.tokenDivider} />
          <View style={styles.tokenRow}>
            <Text style={styles.tokenLabel}>Booking Protection Fee</Text>
            <Text style={styles.tokenFee}>{formatAmount(platformFee)}</Text>
          </View>
          <View style={styles.tokenDivider} />
          <View style={styles.tokenRow}>
            <Text style={[styles.tokenLabel, { fontWeight: '600', color: '#2C2420' }]}>Total Due Now</Text>
            <Text style={[styles.tokenAmount, { fontSize: 20 }]}>{formatAmount(tokenAmount + platformFee)}</Text>
          </View>
          <Text style={styles.tokenNote}>Remaining {formatAmount(totalAmount - tokenAmount)} paid directly to vendor</Text>
        </View>

        <View style={styles.protectionCard}>
          <Text style={styles.protectionTitle}>Protected by DreamWedding</Text>
          <Text style={styles.protectionText}>
            Full refund if vendor cancels or doesn't confirm within 48 hours. No questions asked.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.payBtn} onPress={() => setStep(2)}>
          <Text style={styles.payBtnText}>Continue to Payment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 24 },
  backBtn: { fontSize: 22, color: '#2C2420', width: 24 },
  title: { fontSize: 17, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, gap: 16 },
  vendorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', gap: 14 },
  vendorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  vendorAvatarText: { fontSize: 20, color: '#C9A84C', fontWeight: '300' },
  vendorInfo: { flex: 1, gap: 3 },
  vendorName: { fontSize: 16, color: '#2C2420', fontWeight: '500' },
  vendorCategory: { fontSize: 13, color: '#8C7B6E' },
  vendorDate: { fontSize: 12, color: '#C9A84C', fontWeight: '500' },
  infoCard: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8D9B5', gap: 8 },
  infoTitle: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  infoText: { fontSize: 13, color: '#8C7B6E', lineHeight: 20 },
  tokenCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#E8E0D5' },
  tokenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  tokenDivider: { height: 1, backgroundColor: '#E8E0D5' },
  tokenLabel: { fontSize: 14, color: '#8C7B6E' },
  tokenAmount: { fontSize: 16, color: '#2C2420', fontWeight: '600' },
  tokenFee: { fontSize: 14, color: '#8C7B6E' },
  tokenNote: { fontSize: 11, color: '#8C7B6E', marginTop: 8, textAlign: 'center' },
  protectionCard: { backgroundColor: '#2C2420', borderRadius: 12, padding: 16, gap: 8 },
  protectionTitle: { fontSize: 14, color: '#C9A84C', fontWeight: '500' },
  protectionText: { fontSize: 13, color: '#B8A99A', lineHeight: 20 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#E8E0D5' },
  summaryTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  summaryDivider: { height: 1, backgroundColor: '#E8E0D5' },
  summaryKey: { fontSize: 13, color: '#8C7B6E' },
  summaryVal: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  paymentCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#E8E0D5' },
  paymentTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500', marginBottom: 14 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  paymentDivider: { height: 1, backgroundColor: '#E8E0D5' },
  paymentLabel: { fontSize: 14, color: '#2C2420' },
  paymentSub: { fontSize: 11, color: '#8C7B6E', marginTop: 2 },
  paymentAmount: { fontSize: 15, color: '#C9A84C', fontWeight: '600' },
  escrowCard: { backgroundColor: '#2C2420', borderRadius: 14, padding: 20, gap: 14 },
  escrowTitle: { fontSize: 14, color: '#C9A84C', fontWeight: '500' },
  escrowPoints: { gap: 10 },
  escrowPoint: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  escrowPointDot: { fontSize: 12, color: '#C9A84C', fontWeight: '700', marginTop: 1 },
  escrowPointText: { fontSize: 13, color: '#B8A99A', flex: 1, lineHeight: 20 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: '#C9A84C', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkboxActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  checkboxTick: { color: '#C9A84C', fontSize: 12, fontWeight: '700' },
  agreeText: { flex: 1, fontSize: 13, color: '#8C7B6E', lineHeight: 20 },
  bottomBar: { paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8' },
  payBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  payBtnDisabled: { opacity: 0.3 },
  payBtnText: { fontSize: 15, color: '#F5F0E8', fontWeight: '500', letterSpacing: 0.5 },
  successContainer: { flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 40 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  successIconText: { fontSize: 32, color: '#C9A84C', fontWeight: '300' },
  successTitle: { fontSize: 30, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  successSubtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', lineHeight: 22 },
  successCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8E0D5' },
  successCardText: { fontSize: 13, color: '#8C7B6E', lineHeight: 20, textAlign: 'center' },
  successBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  successBtnText: { fontSize: 14, color: '#F5F0E8', fontWeight: '500' },
  successHomeLink: { fontSize: 13, color: '#C9A84C', letterSpacing: 0.3 },
});
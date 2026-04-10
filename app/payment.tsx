import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator, Alert, ScrollView,
  StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOOKING_PROTECTION_FEE, initiatePayment } from '../services/razorpay';
import { getVendor, createBooking } from '../services/api';

export default function PaymentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState<any>(null);
  const [userSession, setUserSession] = useState<any>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoadingVendor(true);
      const session = await AsyncStorage.getItem('user_session');
      if (session) setUserSession(JSON.parse(session));

      const result = await getVendor(id as string);
      if (result.success) setVendor(result.data);
    } catch (e) {
      console.log('Error loading vendor:', e);
    } finally {
      setLoadingVendor(false);
    }
  };

  const vendorName = vendor?.name || 'Vendor';
  const vendorCategory = vendor?.category?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '';
  const vendorCity = vendor?.city || '';
  const totalAmount = vendor?.starting_price || 300000;
  const tokenAmount = Math.round(totalAmount * 0.2);
  const platformFee = BOOKING_PROTECTION_FEE;
  const userName = userSession?.name || 'Guest';
  const userPhone = userSession?.phone || '9999999999';

  const formatAmount = (amount: number) =>
    `₹${amount.toLocaleString('en-IN')}`;

  const weddingDate = userSession?.wedding_date
    ? new Date(userSession.wedding_date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    : 'Your wedding date';

  const handlePayment = async () => {
    try {
      setLoading(true);
      await initiatePayment({
        amount: tokenAmount + platformFee,
        vendorName,
        description: `Token payment for ${vendorName} · ${weddingDate}`,
        userName,
        userPhone,
      });

      // Create booking in backend
      try {
        await createBooking({
          user_id: userSession?.userId,
          vendor_id: id,
          vendor_name: vendorName,
          vendor_category: vendorCategory,
          token_amount: tokenAmount,
          total_amount: totalAmount,
          platform_fee: platformFee,
          status: 'pending_confirmation',
          wedding_date: userSession?.wedding_date,
        });
      } catch (e) {
        console.log('Booking creation failed:', e);
      }

      setStep(3);
    } catch (error: any) {
      if (error?.code !== 'PAYMENT_CANCELLED') {
        Alert.alert('Payment Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingVendor) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#C9A84C" size="large" />
      </View>
    );
  }

  // SUCCESS SCREEN
  if (step === 3) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Date Locked!</Text>
        <Text style={styles.successSubtitle}>
          Your token of {formatAmount(tokenAmount)} is safely held in escrow.{'\n'}{vendorName} has 48 hours to confirm.
        </Text>
        <View style={styles.successCard}>
          <View style={styles.successCardRow}>
            <Text style={styles.successCardKey}>Vendor</Text>
            <Text style={styles.successCardVal}>{vendorName}</Text>
          </View>
          <View style={styles.successCardDivider} />
          <View style={styles.successCardRow}>
            <Text style={styles.successCardKey}>Token paid</Text>
            <Text style={styles.successCardVal}>{formatAmount(tokenAmount)}</Text>
          </View>
          <View style={styles.successCardDivider} />
          <View style={styles.successCardRow}>
            <Text style={styles.successCardKey}>Status</Text>
            <Text style={[styles.successCardVal, { color: '#C9A84C' }]}>Awaiting confirmation</Text>
          </View>
        </View>
        <View style={styles.escrowNotice}>
          <Text style={styles.escrowNoticeText}>
            Full auto-refund if vendor doesn't confirm within 48 hours. No questions asked.
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

  // STEP 2 — Confirm & Pay
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

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Booking Summary</Text>
            {[
              { key: 'Vendor', val: vendorName },
              { key: 'Category', val: vendorCategory },
              { key: 'City', val: vendorCity },
              { key: 'Wedding Date', val: weddingDate },
              { key: 'Total Package', val: formatAmount(totalAmount) },
            ].map((row, i, arr) => (
              <View key={row.key}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardKey}>{row.key}</Text>
                  <Text style={styles.cardVal}>{row.val}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.cardDivider} />}
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Breakdown</Text>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardKey}>Token Amount</Text>
                <Text style={styles.cardHint}>20% of total package</Text>
              </View>
              <Text style={styles.cardAmount}>{formatAmount(tokenAmount)}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardKey}>Booking Protection</Text>
                <Text style={styles.cardHint}>The Dream Wedding guarantee</Text>
              </View>
              <Text style={styles.cardAmount}>{formatAmount(platformFee)}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={[styles.cardKey, { fontWeight: '600', color: '#2C2420' }]}>Total Due Now</Text>
              <Text style={styles.cardTotal}>{formatAmount(tokenAmount + platformFee)}</Text>
            </View>
          </View>

          <View style={styles.escrowCard}>
            <Text style={styles.escrowTitle}>The Dream Wedding Booking Protection</Text>
            {[
              'Your token is held securely in escrow',
              'Released to vendor only after they confirm',
              'Full refund if vendor cancels or doesn\'t confirm within 48 hours',
              'All disputes handled by The Dream Wedding',
            ].map((point, i) => (
              <View key={i} style={styles.escrowPoint}>
                <Text style={styles.escrowPointDot}>✓</Text>
                <Text style={styles.escrowPointText}>{point}</Text>
              </View>
            ))}
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
            {loading
              ? <ActivityIndicator color="#F5F0E8" />
              : <Text style={styles.payBtnText}>Pay {formatAmount(tokenAmount + platformFee)}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // STEP 1 — Overview
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
            <Text style={styles.vendorAvatarText}>{vendorName[0]}</Text>
          </View>
          <View style={styles.vendorInfo}>
            <Text style={styles.vendorName}>{vendorName}</Text>
            <Text style={styles.vendorMeta}>{vendorCategory} · {vendorCity}</Text>
            <Text style={styles.vendorDate}>For: {weddingDate}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What is a token payment?</Text>
          <Text style={styles.infoText}>
            A token payment (20% of total) secures your date with the vendor. It's held safely by The Dream Wedding until the vendor confirms. The remaining balance is paid directly to the vendor later.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardKey}>Token Amount</Text>
            <Text style={styles.cardAmount}>{formatAmount(tokenAmount)}</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardRow}>
            <Text style={styles.cardKey}>Booking Protection Fee</Text>
            <Text style={styles.cardAmount}>{formatAmount(platformFee)}</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardRow}>
            <Text style={[styles.cardKey, { fontWeight: '600', color: '#2C2420' }]}>Total Due Now</Text>
            <Text style={styles.cardTotal}>{formatAmount(tokenAmount + platformFee)}</Text>
          </View>
          <Text style={styles.remainingNote}>
            Remaining {formatAmount(totalAmount - tokenAmount)} paid directly to vendor
          </Text>
        </View>

        <View style={styles.escrowCard}>
          <Text style={styles.escrowTitle}>Protected by The Dream Wedding</Text>
          <Text style={styles.escrowSubtext}>
            Full refund if vendor cancels or doesn't confirm within 48 hours. No questions asked.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.payBtn} onPress={() => setStep(2)}>
          <Text style={styles.payBtnText}>Continue to Payment →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  loadingContainer: { flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 24 },
  backBtn: { fontSize: 22, color: '#2C2420', width: 24 },
  title: { fontSize: 17, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, gap: 16 },
  vendorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E8E0D5', gap: 14 },
  vendorAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  vendorAvatarText: { fontSize: 22, color: '#C9A84C', fontWeight: '300' },
  vendorInfo: { flex: 1, gap: 4 },
  vendorName: { fontSize: 17, color: '#2C2420', fontWeight: '500' },
  vendorMeta: { fontSize: 13, color: '#8C7B6E' },
  vendorDate: { fontSize: 12, color: '#C9A84C', fontWeight: '500' },
  infoCard: { backgroundColor: '#FFF8EC', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E8D9B5', gap: 8 },
  infoTitle: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  infoText: { fontSize: 13, color: '#8C7B6E', lineHeight: 22 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E8E0D5', gap: 0 },
  cardTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500', marginBottom: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  cardDivider: { height: 1, backgroundColor: '#E8E0D5' },
  cardKey: { fontSize: 14, color: '#8C7B6E' },
  cardHint: { fontSize: 11, color: '#8C7B6E', marginTop: 2 },
  cardVal: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  cardAmount: { fontSize: 15, color: '#C9A84C', fontWeight: '600' },
  cardTotal: { fontSize: 20, color: '#2C2420', fontWeight: '600' },
  remainingNote: { fontSize: 11, color: '#8C7B6E', textAlign: 'center', marginTop: 8 },
  escrowCard: { backgroundColor: '#2C2420', borderRadius: 16, padding: 20, gap: 12 },
  escrowTitle: { fontSize: 14, color: '#C9A84C', fontWeight: '500', letterSpacing: 0.3 },
  escrowSubtext: { fontSize: 13, color: '#B8A99A', lineHeight: 20 },
  escrowPoint: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  escrowPointDot: { fontSize: 12, color: '#C9A84C', fontWeight: '700', marginTop: 1 },
  escrowPointText: { fontSize: 13, color: '#B8A99A', flex: 1, lineHeight: 20 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: '#C9A84C', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkboxActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  checkboxTick: { color: '#C9A84C', fontSize: 12, fontWeight: '700' },
  agreeText: { flex: 1, fontSize: 13, color: '#8C7B6E', lineHeight: 20 },
  bottomBar: { paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8' },
  payBtn: { backgroundColor: '#2C2420', borderRadius: 14, paddingVertical: 17, alignItems: 'center', shadowColor: '#2C2420', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 },
  payBtnDisabled: { opacity: 0.3 },
  payBtnText: { fontSize: 15, color: '#F5F0E8', fontWeight: '500', letterSpacing: 0.5 },
  successContainer: { flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 40 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  successIconText: { fontSize: 36, color: '#C9A84C', fontWeight: '300' },
  successTitle: { fontSize: 32, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  successSubtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', lineHeight: 22 },
  successCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E8E0D5', width: '100%', gap: 0 },
  successCardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  successCardDivider: { height: 1, backgroundColor: '#E8E0D5' },
  successCardKey: { fontSize: 13, color: '#8C7B6E' },
  successCardVal: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  escrowNotice: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E8D9B5', width: '100%' },
  escrowNoticeText: { fontSize: 13, color: '#8C7B6E', textAlign: 'center', lineHeight: 20 },
  successBtn: { backgroundColor: '#2C2420', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, marginTop: 8, width: '100%', alignItems: 'center' },
  successBtnText: { fontSize: 15, color: '#F5F0E8', fontWeight: '500' },
  successHomeLink: { fontSize: 13, color: '#C9A84C', letterSpacing: 0.3, marginTop: 4 },
});
import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', desc: 'GPay, PhonePe, Paytm & more' },
  { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', label: 'Net Banking', desc: 'All major banks supported' },
  { id: 'wallet', label: 'Wallet', desc: 'Paytm, Amazon Pay & more' },
];

const UPI_APPS = ['GPay', 'PhonePe', 'Paytm', 'BHIM'];

export default function RazorpayMockScreen() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [selectedUPI, setSelectedUPI] = useState('GPay');
  const [processing, setProcessing] = useState(false);

  const amount = '₹60,999';
  const vendor = 'Joseph Radhik';

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      router.replace('/payment-success');
    }, 2000);
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerBrand}>DreamWedding</Text>
          <Text style={styles.headerSub}>Secure Payment</Text>
        </View>
        <View style={styles.secureBadge}>
          <Text style={styles.secureBadgeText}>🔒 Secure</Text>
        </View>
      </View>

      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Paying to</Text>
        <Text style={styles.amountVendor}>{vendor}</Text>
        <Text style={styles.amountValue}>{amount}</Text>
        <Text style={styles.amountSub}>Token + Booking Protection Fee · Held in Escrow</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >

        <Text style={styles.sectionLabel}>Payment Method</Text>
        <View style={styles.methodList}>
          {PAYMENT_METHODS.map((method, index) => (
            <View key={method.id}>
              <TouchableOpacity
                style={styles.methodRow}
                onPress={() => setSelectedMethod(method.id)}
              >
                <View style={[
                  styles.methodRadio,
                  selectedMethod === method.id && styles.methodRadioSelected
                ]}>
                  {selectedMethod === method.id && (
                    <View style={styles.methodRadioInner} />
                  )}
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  <Text style={styles.methodDesc}>{method.desc}</Text>
                </View>
              </TouchableOpacity>
              {index < PAYMENT_METHODS.length - 1 && <View style={styles.listDivider} />}
            </View>
          ))}
        </View>

        {selectedMethod === 'upi' && (
          <View style={styles.upiSection}>
            <Text style={styles.sectionLabel}>Select UPI App</Text>
            <View style={styles.upiGrid}>
              {UPI_APPS.map(app => (
                <TouchableOpacity
                  key={app}
                  style={[styles.upiApp, selectedUPI === app && styles.upiAppSelected]}
                  onPress={() => setSelectedUPI(app)}
                >
                  <View style={styles.upiAppIcon}>
                    <Text style={styles.upiAppIconText}>{app[0]}</Text>
                  </View>
                  <Text style={[styles.upiAppLabel, selectedUPI === app && styles.upiAppLabelSelected]}>
                    {app}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedMethod === 'card' && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionLabel}>Card Details</Text>
            <View style={styles.cardFields}>
              <View style={styles.cardField}>
                <Text style={styles.cardFieldLabel}>Card Number</Text>
                <Text style={styles.cardFieldPlaceholder}>•••• •••• •••• ••••</Text>
              </View>
              <View style={styles.listDivider} />
              <View style={styles.cardFieldRow}>
                <View style={[styles.cardField, { flex: 1 }]}>
                  <Text style={styles.cardFieldLabel}>Expiry</Text>
                  <Text style={styles.cardFieldPlaceholder}>MM / YY</Text>
                </View>
                <View style={styles.cardFieldVertDivider} />
                <View style={[styles.cardField, { flex: 1 }]}>
                  <Text style={styles.cardFieldLabel}>CVV</Text>
                  <Text style={styles.cardFieldPlaceholder}>•••</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.trustRow}>
          <Text style={styles.trustItem}>256-bit SSL</Text>
          <Text style={styles.trustDot}>·</Text>
          <Text style={styles.trustItem}>PCI DSS Compliant</Text>
          <Text style={styles.trustDot}>·</Text>
          <Text style={styles.trustItem}>RBI Approved</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {processing ? (
          <View style={styles.processingBtn}>
            <Text style={styles.processingBtnText}>Processing Payment...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
            <Text style={styles.payBtnText}>Pay {amount}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.poweredBy}>Powered by Razorpay</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backBtn: {
    fontSize: 18,
    color: '#2C2420',
    width: 24,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerBrand: {
    fontSize: 16,
    color: '#2C2420',
    fontWeight: '500',
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 0.5,
  },
  secureBadge: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  secureBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  amountCard: {
    backgroundColor: '#2C2420',
    marginHorizontal: 24,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 0.5,
  },
  amountVendor: {
    fontSize: 16,
    color: '#F5F0E8',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 36,
    color: '#C9A84C',
    fontWeight: '300',
    letterSpacing: 1,
  },
  amountSub: {
    fontSize: 11,
    color: '#8C7B6E',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  methodList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    overflow: 'hidden',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E8E0D5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodRadioSelected: {
    borderColor: '#2C2420',
  },
  methodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2C2420',
  },
  methodInfo: {
    flex: 1,
    gap: 3,
  },
  methodLabel: {
    fontSize: 14,
    color: '#2C2420',
    fontWeight: '500',
  },
  methodDesc: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  listDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 16,
  },
  upiSection: {
    gap: 12,
  },
  upiGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  upiApp: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  upiAppSelected: {
    borderColor: '#2C2420',
    backgroundColor: '#F5F0E8',
  },
  upiAppIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upiAppIconText: {
    fontSize: 16,
    color: '#C9A84C',
    fontWeight: '500',
  },
  upiAppLabel: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  upiAppLabelSelected: {
    color: '#2C2420',
    fontWeight: '500',
  },
  cardSection: {
    gap: 12,
  },
  cardFields: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    overflow: 'hidden',
  },
  cardField: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },
  cardFieldRow: {
    flexDirection: 'row',
  },
  cardFieldVertDivider: {
    width: 1,
    backgroundColor: '#E8E0D5',
  },
  cardFieldLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 0.5,
  },
  cardFieldPlaceholder: {
    fontSize: 16,
    color: '#C9B99A',
    letterSpacing: 2,
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  trustItem: {
    fontSize: 11,
    color: '#8C7B6E',
  },
  trustDot: {
    fontSize: 11,
    color: '#8C7B6E',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    backgroundColor: '#F5F0E8',
    gap: 10,
    alignItems: 'center',
  },
  payBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  payBtnText: {
    fontSize: 16,
    color: '#F5F0E8',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  processingBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    opacity: 0.6,
  },
  processingBtnText: {
    fontSize: 15,
    color: '#F5F0E8',
    letterSpacing: 0.5,
  },
  poweredBy: {
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 0.5,
  },
});
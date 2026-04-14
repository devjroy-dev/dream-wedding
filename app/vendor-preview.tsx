import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Image
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const IMAGES = [
  'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
];

export default function VendorPreviewScreen() {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);

  return (
    <View style={styles.container}>

      {/* Preview Banner */}
      <View style={styles.previewBanner}>
        <Text style={styles.previewBannerText}>Preview Mode — This is how couples see your profile</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.previewBannerClose}>✕ Exit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={e => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveImage(index);
          }}
          scrollEventThrottle={16}
        >
          {IMAGES.map((img, i) => (
            <Image key={i} source={{ uri: img }} style={styles.galleryImage} />
          ))}
        </ScrollView>

        {/* Dots */}
        <View style={styles.dots}>
          {IMAGES.map((_, i) => (
            <View key={i} style={[styles.dot, activeImage === i && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.content}>

          <View style={styles.nameRow}>
            <View style={styles.nameCol}>
              <View style={styles.nameWithBadge}>
                <Text style={styles.vendorName}>Arjun Mehta Photography</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              </View>
              <Text style={styles.vendorMeta}>Photographer · Delhi NCR</Text>
            </View>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingScore}>★ 4.9</Text>
              <Text style={styles.ratingCount}>124 reviews</Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹80,000 onwards</Text>
            <View style={styles.vibeTags}>
              {['Candid', 'Cinematic'].map(v => (
                <View key={v} style={styles.vibeTag}>
                  <Text style={styles.vibeTagText}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.sectionText}>
              Award-winning wedding photographer with 8 years of experience capturing candid, emotional moments. Specialising in cinematic films and editorial photography across India.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Details</Text>
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Equipment</Text>
                <Text style={styles.detailVal}>Sony A7IV, Canon R5, DJI Drone</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Delivery</Text>
                <Text style={styles.detailVal}>4–6 weeks post wedding</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Instagram</Text>
                <Text style={[styles.detailVal, { color: '#C9A84C' }]}>@arjunmehta.photos</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Edit Profile</Text>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.editProfileBtnText}>Go to Dashboard to Edit →</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Bar — disabled in preview */}
      <View style={styles.bottomBar}>
        <View style={[styles.quoteBtn, styles.disabledBtn]}>
          <Text style={styles.quoteBtnText}>Request Quote</Text>
        </View>
        <View style={[styles.inquiryBtn, styles.disabledBtn]}>
          <Text style={styles.inquiryBtnText}>Send Inquiry</Text>
        </View>
        <View style={[styles.lockBtn, styles.disabledBtn]}>
          <Text style={styles.lockBtnText}>Lock the Date</Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  previewBanner: {
    backgroundColor: '#2C2420',
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewBannerText: {
    fontSize: 12,
    color: '#C9A84C',
    flex: 1,
    lineHeight: 18,
  },
  previewBannerClose: {
    fontSize: 13,
    color: '#F5F0E8',
    fontWeight: '500',
    marginLeft: 12,
  },
  galleryImage: {
    width,
    height: height * 0.42,
    resizeMode: 'cover',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E8E0D5',
  },
  dotActive: {
    backgroundColor: '#C9A84C',
    width: 16,
  },
  content: {
    paddingHorizontal: 24,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  nameCol: {
    flex: 1,
    gap: 4,
  },
  nameWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vendorName: {
    fontSize: 20,
    color: '#2C2420',
    fontWeight: '400',
  },
  verifiedBadge: {
    backgroundColor: '#C9A84C',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  vendorMeta: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  ratingBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  ratingScore: {
    fontSize: 15,
    color: '#C9A84C',
    fontWeight: '600',
  },
  ratingCount: {
    fontSize: 11,
    color: '#8C7B6E',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  price: {
    fontSize: 16,
    color: '#2C2420',
    fontWeight: '500',
  },
  vibeTags: {
    flexDirection: 'row',
    gap: 6,
  },
  vibeTag: {
    borderWidth: 1,
    borderColor: '#EDE8E0',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  vibeTagText: {
    fontSize: 11,
    color: '#8C7B6E',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E0D5',
  },
  section: {
    paddingVertical: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  sectionText: {
    fontSize: 14,
    color: '#2C2420',
    lineHeight: 24,
  },
  detailsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE8E0',
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 16,
  },
  detailKey: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  detailVal: {
    fontSize: 13,
    color: '#2C2420',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  editProfileBtn: {
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  editProfileBtnText: {
    fontSize: 13,
    color: '#C9A84C',
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#FAF6F0',
    borderTopWidth: 1,
    borderTopColor: '#EDE8E0',
    opacity: 0.5,
  },
  disabledBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  quoteBtn: {
    borderWidth: 1,
    borderColor: '#EDE8E0',
    backgroundColor: '#FFFFFF',
  },
  quoteBtnText: {
    fontSize: 12,
    color: '#2C2420',
  },
  inquiryBtn: {
    borderWidth: 1,
    borderColor: '#2C2420',
    backgroundColor: '#FFFFFF',
  },
  inquiryBtnText: {
    fontSize: 12,
    color: '#2C2420',
  },
  lockBtn: {
    backgroundColor: '#2C2420',
  },
  lockBtnText: {
    fontSize: 12,
    color: '#F5F0E8',
  },
});
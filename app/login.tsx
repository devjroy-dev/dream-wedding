import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function LoginScreen() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    Alert.alert('Coming Soon', 'Google login is being set up. Please use phone login for now.');
  };

  return (
    <View style={styles.container}>

      {/* Logo Section — centred vertically in top half */}
      <View style={styles.logoSection}>
        <Text style={styles.logoTop}>The</Text>
        <Text style={styles.logoMain}>Dream Wedding</Text>
        <View style={styles.logoDivider} />
        <Text style={styles.logoTagline}>India's Premium Wedding Platform</Text>
      </View>

      {/* Buttons — anchored to bottom */}
      <View style={styles.buttonSection}>
        <Text style={styles.welcomeText}>Welcome</Text>
        <Text style={styles.subText}>Sign in to continue planning your dream wedding</Text>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
            {googleLoading
              ? <ActivityIndicator color="#2C2420" />
              : <Text style={styles.socialButtonText}>Continue with Google</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => router.push('/otp?mode=email')}
          >
            <Text style={styles.socialButtonText}>Continue with Email</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/otp')}
          >
            <Text style={styles.primaryButtonText}>Continue with Phone</Text>
          </TouchableOpacity>

          <Text style={styles.verifyNote}>
            Phone verification required for all sign ins
          </Text>
        </View>

        <TouchableOpacity onPress={() => router.push('/vendor-login')}>
          <Text style={styles.vendorLink}>Vendor? Sign in here →</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 28,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 60,
  },
  logoTop: {
    fontSize: 18,
    color: '#8C7B6E',
    fontWeight: '300',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  logoMain: {
    fontSize: 34,
    color: '#2C2420',
    fontWeight: '500',
    letterSpacing: 3,
    textAlign: 'center',
  },
  logoDivider: {
    width: 40,
    height: 1.5,
    backgroundColor: '#C9A84C',
    marginVertical: 4,
  },
  logoTagline: {
    fontSize: 10,
    color: '#8C7B6E',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  buttonSection: {
    gap: 20,
  },
  welcomeText: {
    fontSize: 30,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 1,
  },
  subText: {
    fontSize: 14,
    color: '#8C7B6E',
    marginTop: -12,
    lineHeight: 22,
  },
  buttons: {
    gap: 12,
  },
  socialButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  socialButtonText: {
    color: '#2C2420',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E0D5',
  },
  dividerText: {
    color: '#8C7B6E',
    fontSize: 13,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#2C2420',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#F5F0E8',
    fontSize: 15,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  verifyNote: {
    fontSize: 11,
    color: '#8C7B6E',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  vendorLink: {
    color: '#C9A84C',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
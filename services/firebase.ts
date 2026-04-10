import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyDzXw3pC_CmSW_q87I_fIUKNVfUIM806h8",
  authDomain: "the-dream-wedding-aa214.firebaseapp.com",
  projectId: "the-dream-wedding-aa214",
  storageBucket: "the-dream-wedding-aa214.firebasestorage.app",
  messagingSenderId: "707007171164",
  appId: "1:707007171164:web:8bf008a9e8d5a5c1503499"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: any;
try {
  if (Platform.OS !== 'web') {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } else {
    auth = getAuth(app);
  }
} catch (e) {
  auth = getAuth(app);
}

export { auth };
export default app;
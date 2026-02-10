// For Android Emulator use 10.0.2.2, for iOS Simulator use localhost, for physical device use your computer's IP
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiUrl = () => {
  // Check for Expo debuggerHost to auto-detect dev machine IP
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  
  if (debuggerHost) {
    // Extract IP from Expo's debuggerHost (format: "ip:port")
    const hostIP = debuggerHost.split(':')[0];
    return `http://${hostIP}:3000/api`;
  }
  
  // Fallback based on platform
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api'; // Android emulator
  }
  
  return 'http://localhost:3000/api'; // iOS simulator / web
};

export const API_BASE_URL = getApiUrl();

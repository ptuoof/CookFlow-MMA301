// Keeps the JWT between app launches: SecureStore on iOS/Android, localStorage on web.
import { Platform } from 'react-native';

const TOKEN_KEY = 'cookflow_auth_token'; // SecureStore keys allow only [A-Za-z0-9._-]

const webStorage = () => (typeof window !== 'undefined' ? window.localStorage : null);

export const loadToken = async () => {
  try {
    if (Platform.OS === 'web') return webStorage()?.getItem(TOKEN_KEY) || null;
    return (await require('expo-secure-store').getItemAsync(TOKEN_KEY)) || null;
  } catch {
    return null;
  }
};

export const saveToken = async token => {
  try {
    if (Platform.OS === 'web') webStorage()?.setItem(TOKEN_KEY, token);
    else await require('expo-secure-store').setItemAsync(TOKEN_KEY, token);
  } catch {
    // The session still works until the app is closed
  }
};

export const clearToken = async () => {
  try {
    if (Platform.OS === 'web') webStorage()?.removeItem(TOKEN_KEY);
    else await require('expo-secure-store').deleteItemAsync(TOKEN_KEY);
  } catch {
    // nothing stored
  }
};

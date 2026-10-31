// Cross-platform alert/confirm. React Native Web's Alert.alert is a no-op, so on web
// every confirmation (exit cooking, delete recipe...) silently did nothing.
import { Alert, Platform } from 'react-native';

export const showAlert = (title, message = '') => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
};

/**
 * Asks for confirmation. Resolves with nothing; `onConfirm` runs only if the user accepts.
 */
export const confirmAction = ({ title, message = '', confirmText = 'Đồng ý', cancelText = 'Hủy', destructive = false, onConfirm, onCancel }) => {
  if (Platform.OS === 'web') {
    const ok = typeof window === 'undefined' ? true : window.confirm(message ? `${title}\n\n${message}` : title);
    if (ok) onConfirm?.();
    else onCancel?.();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm }
  ]);
};

// App-wide alert / confirm. Same two functions as before, so no caller changes:
//   showAlert(title, message?)
//   confirmAction({ title, message, confirmText, cancelText, destructive, onConfirm, onCancel })
//
// Android and web show CookFlow's own dialog (components/ui/DialogHost, mounted at the root):
// the stock Android AlertDialog looked out of place, and React Native Web's Alert is a no-op.
// iOS keeps the native alert: it already fits the platform, and iOS cannot present a second modal
// on top of an open one (Cooking Mode is a modal). Before the host is mounted (very early in
// start-up) the native alert is used as well.
import { Alert, Platform } from 'react-native';

let host = null;

/** Called by DialogHost on mount; returns the unregister function. */
export const registerDialogHost = open => {
  host = open;
  return () => {
    if (host === open) host = null;
  };
};

const nativeDialog = ({ kind, title, message, confirmText, cancelText, destructive, onConfirm, onCancel }) => {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return onConfirm?.();
    const text = message ? `${title}\n\n${message}` : title;
    if (kind === 'alert') {
      window.alert(text);
      return onConfirm?.();
    }
    return window.confirm(text) ? onConfirm?.() : onCancel?.();
  }
  if (kind === 'alert') {
    Alert.alert(title, message, [{ text: confirmText, onPress: onConfirm }]);
    return undefined;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm }
  ]);
  return undefined;
};

const open = dialog => {
  if (Platform.OS === 'ios' || !host) return nativeDialog(dialog);
  return host(dialog);
};

/** Information with a single button. */
export const showAlert = (title, message = '', { confirmText = 'Đã hiểu', onClose } = {}) =>
  open({ kind: 'alert', title, message, confirmText, onConfirm: onClose });

/**
 * Asks for confirmation. Resolves with nothing; `onConfirm` runs only if the user accepts,
 * `onCancel` when they cancel, tap outside or press Back.
 */
export const confirmAction = ({ title, message = '', confirmText = 'Đồng ý', cancelText = 'Hủy', destructive = false, onConfirm, onCancel }) =>
  open({ kind: 'confirm', title, message, confirmText, cancelText, destructive, onConfirm, onCancel });

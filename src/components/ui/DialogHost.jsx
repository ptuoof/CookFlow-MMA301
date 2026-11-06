import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HeronColors } from '../../constants/theme';
import { registerDialogHost } from '../../utils/dialog';

const DANGER = '#D92D20';

/**
 * Renders every showAlert / confirmAction of the app (Android + web; see utils/dialog.js).
 * Dialogs opened while one is on screen wait in a queue and appear one after the other.
 * Mounted once, at the root layout.
 */
export function DialogHost() {
  const [queue, setQueue] = useState([]);
  const nextId = useRef(0);

  // Re-registered after every render (cheap): if utils/dialog.js is re-evaluated (fast refresh),
  // its host slot is filled again instead of silently falling back to the native alert
  useEffect(() => registerDialogHost(dialog => {
    nextId.current += 1;
    setQueue(list => [...list, { ...dialog, id: nextId.current }]);
  }));

  const current = queue[0] || null;

  // Close first, then run the chosen action (it may open the next dialog or another screen)
  const finish = useCallback(action => {
    setQueue(list => list.slice(1));
    if (action) setTimeout(action, 0);
  }, []);
  const cancel = useCallback(() => {
    if (!current) return;
    finish(current.kind === 'alert' ? current.onConfirm : current.onCancel);
  }, [current, finish]);

  const isAlert = current?.kind === 'alert';
  // Long labels ("Vẫn hoàn thành", "Nấu lại từ đầu") stack the buttons instead of squeezing them
  const stacked = !isAlert && current && (current.confirmText.length + current.cancelText.length > 24);

  return <Modal
      visible={!!current}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={cancel}
    >
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Đóng hộp thoại" style={StyleSheet.absoluteFill} onPress={cancel} />
        {current ? <View key={current.id} accessibilityRole="alert" accessibilityViewIsModal style={styles.card}>
            <Text style={styles.title}>{current.title}</Text>
            {current.message ? <ScrollView style={styles.messageScroll} contentContainerStyle={styles.messageContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.message}>{current.message}</Text>
              </ScrollView> : null}

            <View style={[styles.actions, stacked && styles.actionsStacked]}>
              {!isAlert ? <Pressable accessibilityRole="button" onPress={cancel} style={({ pressed }) => [styles.button, styles.cancelButton, stacked && styles.buttonStacked, pressed && styles.pressed]}>
                  <Text style={styles.cancelText} numberOfLines={2}>{current.cancelText}</Text>
                </Pressable> : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => finish(current.onConfirm)}
                style={({ pressed }) => [styles.button, current.destructive ? styles.dangerButton : styles.confirmButton, stacked && styles.buttonStacked, pressed && styles.pressed]}
              >
                <Text style={styles.confirmText} numberOfLines={2}>{current.confirmText}</Text>
              </Pressable>
            </View>
          </View> : null}
      </View>
    </Modal>;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 }
  },
  title: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    color: HeronColors.primary,
    textAlign: 'center'
  },
  messageScroll: {
    marginTop: 10,
    maxHeight: 320
  },
  messageContent: {
    paddingBottom: 2
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: HeronColors.granite,
    textAlign: 'center'
  },
  actions: {
    marginTop: 22,
    flexDirection: 'row',
    gap: 10
  },
  actionsStacked: {
    flexDirection: 'column-reverse'
  },
  button: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonStacked: {
    flex: 0,
    width: '100%'
  },
  cancelButton: {
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  confirmButton: {
    backgroundColor: HeronColors.brand
  },
  dangerButton: {
    backgroundColor: DANGER
  },
  pressed: {
    opacity: 0.8
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: HeronColors.primary,
    textAlign: 'center'
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center'
  }
});

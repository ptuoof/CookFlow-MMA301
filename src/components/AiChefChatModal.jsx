import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { AppleButton } from './ui/AppleButton';
import { askSousChef, getGeminiApiKey, saveGeminiApiKey, clearGeminiApiKey, GEMINI_KEY_URL } from '../services/gemini';
export const SOUS_CHEF_SUGGESTIONS = [{
  icon: '💡',
  label: 'Thay thế gia vị',
  prompt: 'Trong các nguyên liệu và gia vị của chính món này, chọn ra 2–3 thứ nhà mình dễ thiếu nhất. Với mỗi thứ, nếu hết thì thay bằng gì và tỉ lệ quy đổi bao nhiêu?'
}, {
  icon: '🥗',
  label: 'Biến tấu ăn kiêng',
  prompt: 'Cách biến tấu món này cho người ăn kiêng / giảm calo?'
}, {
  icon: '🍷',
  label: 'Thức uống kèm',
  prompt: 'Gợi ý thức uống phù hợp dùng kèm món này?'
}];
const RESCUE_SUGGESTION = {
  icon: '🆘',
  label: 'Cứu bước này',
  prompt: 'Mình đang làm bước hiện tại. Nếu lỡ làm hỏng (quá mặn, cháy, bị khô, chưa chín...) thì cứu thế nào?'
};
export const AiChefChatModal = ({
  visible,
  onClose,
  recipe,
  currentStep,
  initialQuestion
}) => {
  const [apiKey, setApiKey] = useState(null);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const sentInitialRef = useRef(null);

  // Load key whenever the modal opens
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getGeminiApiKey().then(key => {
      if (!cancelled) setApiKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // A new recipe starts a fresh conversation
  useEffect(() => {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setIsLoading(false);
    sentInitialRef.current = null;
  }, [recipe?.id]);

  // Cancel any in-flight request when closing
  useEffect(() => {
    if (!visible) {
      abortRef.current?.abort();
      setIsLoading(false);
      sentInitialRef.current = null;
    }
  }, [visible]);
  useEffect(() => () => abortRef.current?.abort(), []);
  const sendQuestion = async question => {
    const text = question.trim();
    if (!text || isLoading || !apiKey) return;
    const history = messages.filter(m => !m.isError).map(m => ({
      role: m.role,
      text: m.text
    }));
    setMessages(prev => [...prev, {
      id: `u_${Date.now()}`,
      role: 'user',
      text
    }]);
    setInput('');
    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await askSousChef({
        apiKey,
        recipe,
        currentStep,
        history,
        question: text,
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      setMessages(prev => [...prev, {
        id: `m_${Date.now()}`,
        role: 'model',
        text: reply
      }]);
    } catch (e) {
      if (controller.signal.aborted) return;
      setMessages(prev => [...prev, {
        id: `e_${Date.now()}`,
        role: 'model',
        text: e.message,
        isError: true
      }]);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  };

  // Auto-send a question picked from a suggestion chip outside the modal
  useEffect(() => {
    if (visible && apiKey && initialQuestion && sentInitialRef.current !== initialQuestion) {
      sentInitialRef.current = initialQuestion;
      sendQuestion(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, apiKey, initialQuestion]);
  const handleSaveKey = async () => {
    const key = keyDraft.trim();
    if (!key) return;
    await saveGeminiApiKey(key);
    setApiKey(key);
    setKeyDraft('');
    setIsEditingKey(false);
  };
  const handleClearKey = async () => {
    await clearGeminiApiKey();
    const fallbackKey = await getGeminiApiKey();
    setApiKey(fallbackKey);
    setIsEditingKey(!fallbackKey);
  };
  const suggestions = currentStep ? [RESCUE_SUGGESTION, ...SOUS_CHEF_SUGGESTIONS] : SOUS_CHEF_SUGGESTIONS;
  const showKeySetup = apiKey === '' || isEditingKey;
  const renderKeySetup = () => <ScrollView contentContainerStyle={styles.setupWrap} keyboardShouldPersistTaps="handled">
      <View style={styles.setupCard}>
        <Text style={styles.setupEmoji}>🔑</Text>
        <Text style={styles.setupTitle}>Kết nối Google Gemini</Text>
        <Text style={styles.setupDesc}>
          AI Sous-Chef dùng Gemini API miễn phí từ Google AI Studio. Tạo key, dán vào ô bên dưới — key chỉ lưu trên thiết bị này.
        </Text>
        <Pressable onPress={() => Linking.openURL(GEMINI_KEY_URL)} style={styles.linkBtn}>
          <Text style={styles.linkText}>↗ Lấy API key tại aistudio.google.com</Text>
        </Pressable>
        <TextInput style={styles.keyInput} placeholder="Dán Gemini API key (AIza...)" placeholderTextColor={HeronColors.disable} value={keyDraft} onChangeText={setKeyDraft} autoCapitalize="none" autoCorrect={false} secureTextEntry />
        <AppleButton title="LƯU & BẮT ĐẦU HỎI" variant="primary" onPress={handleSaveKey} disabled={!keyDraft.trim()} style={{
        width: '100%'
      }} />
        {isEditingKey && apiKey ? <View style={styles.setupFooterRow}>
            <Pressable onPress={() => setIsEditingKey(false)}>
              <Text style={styles.setupFooterLink}>Huỷ</Text>
            </Pressable>
            <Pressable onPress={handleClearKey}>
              <Text style={[styles.setupFooterLink, {
            color: HeronColors.brand
          }]}>Xoá key đã lưu</Text>
            </Pressable>
          </View> : null}
      </View>
    </ScrollView>;
  const renderChat = () => <>
      <ScrollView ref={scrollRef} style={{
      flex: 1
    }} contentContainerStyle={styles.chatContent} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({
      animated: true
    })}>
        {messages.length === 0 ? <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👨‍🍳</Text>
            <Text style={styles.emptyTitle}>Chào bạn, mình là phụ bếp AI!</Text>
            <Text style={styles.emptyDesc}>
              Hỏi mình bất cứ điều gì về {recipe ? `món "${recipe.title}"` : 'nấu ăn'}: thay thế nguyên liệu, biến tấu, mẹo cứu món...
            </Text>
          </View> : null}

        {messages.map(m => <View key={m.id} style={[styles.bubbleRow, m.role === 'user' && styles.bubbleRowUser]}>
            {m.role === 'model' ? <View style={styles.avatar}>
                <Text style={styles.avatarText}>🤖</Text>
              </View> : null}
            <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleModel, m.isError && styles.bubbleError]}>
              <Text selectable style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser, m.isError && styles.bubbleTextError]}>
                {m.isError ? `⚠ ${m.text}` : m.text}
              </Text>
            </View>
          </View>)}

        {isLoading ? <View style={styles.bubbleRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>🤖</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleModel, styles.typingBubble]}>
              <ActivityIndicator size="small" color={HeronColors.brand} />
              <Text style={styles.typingText}>Sous-Chef đang suy nghĩ...</Text>
            </View>
          </View> : null}
      </ScrollView>

      {/* Quick suggestions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsBar} contentContainerStyle={styles.chipsContent} keyboardShouldPersistTaps="handled">
        {suggestions.map(s => <Pressable key={s.label} onPress={() => sendQuestion(s.prompt)} disabled={isLoading} style={({
        pressed
      }) => [styles.chip, isLoading && styles.chipDisabled, {
        transform: [{
          scale: pressed ? 0.96 : 1
        }]
      }]}>
            <Text style={styles.chipText}>{s.icon} {s.label}</Text>
          </Pressable>)}
      </ScrollView>

      {/* Composer */}
      <View style={styles.composer}>
        <TextInput style={styles.composerInput} placeholder="Hỏi Sous-Chef về món này..." placeholderTextColor={HeronColors.disable} value={input} onChangeText={setInput} multiline maxLength={500} onSubmitEditing={() => sendQuestion(input)} blurOnSubmit />
        <Pressable onPress={() => sendQuestion(input)} disabled={!input.trim() || isLoading} style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}>
          <Text style={styles.sendBtnText}>➤</Text>
        </Pressable>
      </View>
    </>;
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.dragHandleWrap}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={{
          flex: 1
        }}>
            <Text style={styles.headerTag}>AI SOUS-CHEF // GEMINI</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {recipe ? recipe.title : 'Trợ lý đầu bếp AI'}
            </Text>
            {currentStep ? <Text style={styles.headerStep} numberOfLines={1}>
                Đang ở bước {currentStep.stepNumber}: {currentStep.title}
              </Text> : null}
          </View>
          <View style={styles.headerActions}>
            {apiKey && !isEditingKey ? <Pressable onPress={() => setIsEditingKey(true)} style={styles.iconCircle}>
                <Text style={styles.iconText}>🔑</Text>
              </Pressable> : null}
            <Pressable onPress={onClose} style={styles.iconCircle}>
              <Text style={styles.iconText}>✕</Text>
            </Pressable>
          </View>
        </View>

        {apiKey === null ? <ActivityIndicator style={{
        marginTop: 40
      }} color={HeronColors.brand} /> : showKeySetup ? renderKeySetup() : renderChat()}
      </KeyboardAvoidingView>
    </Modal>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HeronColors.canvas
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: 10
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: HeronColors.disable
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: HeronColors.border,
    gap: 12
  },
  headerTag: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.brand,
    letterSpacing: 1
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -0.5,
    marginTop: 2
  },
  headerStep: {
    fontSize: 12,
    fontWeight: '600',
    color: HeronColors.granite,
    marginTop: 2
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle
  },
  iconText: {
    fontSize: 15
  },
  setupWrap: {
    padding: Spacing.lg
  },
  setupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: HeronColors.border,
    alignItems: 'center',
    gap: 12,
    ...HeronShadow.card
  },
  setupEmoji: {
    fontSize: 34
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: HeronColors.primary
  },
  setupDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: HeronColors.granite,
    textAlign: 'center'
  },
  linkBtn: {
    paddingVertical: 4
  },
  linkText: {
    fontSize: 13,
    fontWeight: '800',
    color: HeronColors.blue
  },
  keyInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: HeronColors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: HeronColors.primary,
    backgroundColor: HeronColors.cardAlt
  },
  setupFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4
  },
  setupFooterLink: {
    fontSize: 13,
    fontWeight: '800',
    color: HeronColors.granite
  },
  chatContent: {
    padding: Spacing.lg,
    gap: 12
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 12
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: HeronColors.primary,
    marginBottom: 6
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: HeronColors.granite,
    textAlign: 'center'
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8
  },
  bubbleRowUser: {
    justifyContent: 'flex-end'
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: HeronColors.brandLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 14
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  bubbleModel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border,
    borderBottomLeftRadius: 4
  },
  bubbleUser: {
    backgroundColor: HeronColors.primary,
    borderBottomRightRadius: 4
  },
  bubbleError: {
    backgroundColor: HeronColors.brandLight,
    borderColor: '#FFD8CF'
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21,
    color: HeronColors.primary
  },
  bubbleTextUser: {
    color: '#FFFFFF'
  },
  bubbleTextError: {
    color: HeronColors.brandHover,
    fontWeight: '600'
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  typingText: {
    fontSize: 13,
    color: HeronColors.granite,
    fontStyle: 'italic'
  },
  chipsBar: {
    flexGrow: 0,
    borderTopWidth: 1,
    borderTopColor: HeronColors.borderLight
  },
  chipsContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  chipDisabled: {
    opacity: 0.5
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: HeronColors.primary
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingTop: 4,
    paddingBottom: Spacing.lg,
    backgroundColor: HeronColors.canvas
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: HeronColors.primary
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: HeronColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...HeronShadow.brandGlow
  },
  sendBtnDisabled: {
    backgroundColor: HeronColors.disable,
    shadowOpacity: 0,
    elevation: 0
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900'
  }
});

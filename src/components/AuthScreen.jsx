import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeronColors as C } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { isAcceptablePassword, isValidEmail, passwordStrength } from '../utils/authValidation';

const modes = { login: 'Đăng nhập', register: 'Tạo tài khoản', verify: 'Xác minh email', forgot: 'Quên mật khẩu', reset: 'Đặt mật khẩu mới' };

export function AuthScreen() {
  const { login, register, verify, resendCode, requestPasswordReset, resetPassword, cancelVerification, pendingEmail, devCode, connectionError } = useAuth();
  const [mode, setMode] = useState(pendingEmail ? 'verify' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(pendingEmail || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const strength = passwordStrength(password);

  useEffect(() => {
    if (pendingEmail) { setEmail(pendingEmail); setMode('verify'); }
  }, [pendingEmail]);

  // While no mail server is configured, the server returns the code in development
  const codeHint = sent => sent ? ` Mã (môi trường thử nghiệm): ${sent}` : '';

  const changeMode = next => {
    if (mode === 'verify' && next !== 'verify') cancelVerification();
    setMode(next); setError(''); setMessage(''); setPassword(''); setConfirm(''); setCode(''); setEmailTouched(false); setShowPassword(false);
  };
  const submit = async () => {
    setError(''); setMessage('');
    if (!email.trim()) return setError('Hãy nhập email của bạn.');
    if ((mode === 'register' || mode === 'login' || mode === 'forgot') && !isValidEmail(email)) return setError('Email chưa đúng định dạng. Ví dụ: ban@example.com.');
    if (mode === 'register') {
      if (!name.trim()) return setError('Hãy nhập họ tên.');
      if (!isAcceptablePassword(password)) return setError('Mật khẩu cần từ 8 ký tự và đạt mức trung bình trở lên.');
      if (password !== confirm) return setError('Mật khẩu xác nhận chưa khớp.');
    }
    if ((mode === 'verify' || mode === 'reset') && !/^\d{6}$/.test(code.trim())) return setError('Mã gồm 6 chữ số.');
    if (mode === 'reset' && (!isAcceptablePassword(password) || password !== confirm)) return setError(!isAcceptablePassword(password) ? 'Mật khẩu cần từ 8 ký tự và đạt mức trung bình trở lên.' : 'Mật khẩu xác nhận chưa khớp.');
    setBusy(true);
    try {
      if (mode === 'register') { await register({ name, email, password }); setCode(''); setMessage('Tài khoản đã tạo. Nhập mã xác minh 6 chữ số đã gửi tới email của bạn.'); }
      else if (mode === 'verify') { await verify(email, code); }
      else if (mode === 'login') { await login(email, password); }
      else if (mode === 'forgot') { await requestPasswordReset(email); setMode('reset'); setCode(''); setMessage('Nếu email đã đăng ký, mã đặt lại mật khẩu đã được gửi. Nhập mã rồi chọn mật khẩu mới.'); }
      else if (mode === 'reset') { await resetPassword(email, code, password); setMode('login'); setMessage('Đã đổi mật khẩu. Bạn có thể đăng nhập.'); setPassword(''); setConfirm(''); setCode(''); }
    } catch (e) {
      // A login of an unverified account switches to the verification step (pendingEmail)
      if (e.code === 'EMAIL_NOT_VERIFIED') setMessage('Tài khoản chưa xác minh. Nhập mã 6 chữ số đã gửi tới email của bạn.');
      else setError(e.message || 'Chưa thể hoàn tất thao tác.');
    }
    finally { setBusy(false); }
  };
  const resend = async () => {
    setError(''); setMessage('');
    setBusy(true);
    try {
      if (mode === 'reset') await requestPasswordReset(email);
      else await resendCode(email);
      setMessage('Đã gửi mã mới.');
    } catch (e) { setError(e.message || 'Chưa gửi lại được mã.'); }
    finally { setBusy(false); }
  };

  const field = (label, value, setter, options = {}) => <View style={styles.field} key={label}>
    <Text style={styles.label}>{label}</Text>
    <View style={options.secret ? styles.passwordInputWrap : undefined}>
      <TextInput accessibilityLabel={label} value={value} onChangeText={setter} onBlur={options.onBlur} placeholder={options.placeholder || label} placeholderTextColor="#9B9B95" style={[styles.input, options.secret && styles.passwordInput]} autoCapitalize={options.email || options.secret ? 'none' : 'words'} autoCorrect={false} keyboardType={options.email ? 'email-address' : options.number ? 'number-pad' : 'default'} secureTextEntry={options.secret && !showPassword} textContentType={options.secret ? 'password' : options.email ? 'emailAddress' : 'none'} />
      {options.secret && <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setShowPassword(value => !value)} style={styles.passwordToggle}><Text style={styles.passwordToggleText}>{showPassword ? 'Ẩn' : 'Hiện'}</Text></Pressable>}
    </View>
  </View>;

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}><View style={styles.logoDot}/></View>
        <Text style={styles.brand}>COOKFLOW</Text>
        <Text style={styles.heading}>{mode === 'login' ? 'Mời bạn vào bếp' : modes[mode]}</Text>
        <Text style={styles.subheading}>{mode === 'login' ? 'Đăng nhập để tiếp tục hành trình nấu ăn.' : mode === 'register' ? 'Tạo tài khoản để lưu những món bạn yêu thích.' : mode === 'verify' ? 'Xác minh email để hoàn tất tài khoản.' : mode === 'forgot' ? 'Nhập email đã đăng ký để đặt lại mật khẩu.' : mode === 'reset' ? 'Chọn mật khẩu mới cho tài khoản của bạn.' : ''}</Text>
        <View style={styles.form}>
          {mode === 'register' && field('Họ tên', name, setName)}
          <>{field('Email', email, setEmail, { email: true, placeholder: 'ban@example.com', onBlur: () => setEmailTouched(true) })}{mode === 'register' && emailTouched && !!email && !isValidEmail(email) && <Text style={styles.fieldError}>Email chưa đúng định dạng. Ví dụ: ban@example.com.</Text>}</>
          {mode === 'verify' && field('Mã xác minh', code, setCode, { number: true, placeholder: 'Nhập mã 6 chữ số' })}
          {mode === 'login' && field('Mật khẩu', password, setPassword, { secret: true })}
          {(mode === 'register' || mode === 'reset') && <>{mode === 'reset' && field('Mã đặt lại', code, setCode, { number: true, placeholder: 'Nhập mã 6 chữ số' })}{field(mode === 'register' ? 'Mật khẩu' : 'Mật khẩu mới', password, setPassword, { secret: true })}<View style={styles.strengthWrap}><View style={styles.strengthBars}>{strength.checks.map((passed, index) => <View key={index} style={[styles.strengthBar, passed && (strength.score < 3 ? styles.strengthWeak : strength.score < 5 ? styles.strengthMedium : styles.strengthStrong)]}/>)}</View><Text style={[styles.strengthLabel, strength.score < 3 ? styles.strengthLabelWeak : strength.score < 5 ? styles.strengthLabelMedium : styles.strengthLabelStrong]}>Độ mạnh: {strength.label}</Text><Text style={styles.strengthHint}>Dùng ít nhất 8 ký tự, kết hợp chữ hoa, chữ thường, số hoặc ký tự đặc biệt.</Text></View>{field('Xác nhận mật khẩu', confirm, setConfirm, { secret: true })}</>}
          {!!(error || (!message && connectionError)) && <Text accessibilityRole="alert" style={styles.error}>{error || connectionError}</Text>}
          {!!message && <Text style={styles.message}>{message}{(mode === 'verify' || mode === 'reset') ? codeHint(devCode) : ''}</Text>}
          <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={({ pressed }) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryText}>{mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Tạo tài khoản' : mode === 'verify' ? 'Xác minh tài khoản' : mode === 'forgot' ? 'Tiếp tục' : 'Đổi mật khẩu'}</Text>}
          </Pressable>
          {mode === 'login' && <Pressable onPress={() => changeMode('forgot')} style={styles.forgot}><Text style={styles.link}>Quên mật khẩu?</Text></Pressable>}
          {(mode === 'verify' || mode === 'reset') && <Pressable disabled={busy} onPress={resend} style={styles.forgot}><Text style={styles.link}>Gửi lại mã</Text></Pressable>}
          <View style={styles.switchRow}>
            {mode === 'login' ? <><Text style={styles.switchText}>Chưa có tài khoản? </Text><Text accessibilityRole="link" onPress={() => changeMode('register')} style={styles.link}>Đăng ký</Text></> : mode === 'register' ? <><Text style={styles.switchText}>Đã có tài khoản? </Text><Text accessibilityRole="link" onPress={() => changeMode('login')} style={styles.link}>Đăng nhập</Text></> : <Text accessibilityRole="link" onPress={() => changeMode('login')} style={styles.link}>Quay lại đăng nhập</Text>}
          </View>
          <Text style={styles.demoNote}>Tài khoản được lưu trên máy chủ CookFlow. Mã xác minh gồm 6 chữ số, hiệu lực 10 phút.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas }, flex: { flex: 1 }, content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32 },
  logo: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, logoDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff' }, brand: { color: C.granite, fontSize: 12, fontWeight: '700', letterSpacing: 2.2 }, heading: { marginTop: 22, fontSize: 30, lineHeight: 38, fontWeight: '700', color: C.primary }, subheading: { marginTop: 8, color: C.granite, fontSize: 15, lineHeight: 22 }, form: { marginTop: 30 }, field: { marginBottom: 17 }, label: { color: C.primary, fontSize: 13, fontWeight: '600', marginBottom: 8 }, input: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 15, fontSize: 15, color: C.primary }, primary: { height: 54, marginTop: 8, borderRadius: 15, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' }, pressed: { opacity: 0.82 }, disabled: { opacity: 0.55 }, forgot: { alignSelf: 'flex-end', marginTop: 15, paddingVertical: 4 }, link: { color: C.brand, fontSize: 14, fontWeight: '600' }, divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }, rule: { flex: 1, height: 1, backgroundColor: C.border }, or: { color: C.granite, fontSize: 13 }, google: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, googleMark: { fontSize: 18, color: '#4285F4', fontWeight: '700' }, googleText: { color: C.primary, fontWeight: '600', fontSize: 14 }, switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 }, switchText: { color: C.granite, fontSize: 14 }, error: { color: '#B42318', fontSize: 13, marginBottom: 12, lineHeight: 19 }, message: { color: '#277448', backgroundColor: '#EBFBEE', padding: 12, borderRadius: 12, fontSize: 13, lineHeight: 19, marginBottom: 12 }, demoNote: { textAlign: 'center', color: '#85857F', fontSize: 11, lineHeight: 16, marginTop: 22 },
  passwordInputWrap: { position: 'relative', justifyContent: 'center' }, passwordInput: { paddingRight: 64 }, passwordToggle: { position: 'absolute', right: 8, height: 44, minWidth: 48, alignItems: 'center', justifyContent: 'center' }, passwordToggleText: { color: C.granite, fontSize: 12, fontWeight: '700' },
  fieldError: { color: '#B42318', fontSize: 12, marginTop: -11, marginBottom: 13 }, strengthWrap: { marginTop: -8, marginBottom: 16 }, strengthBars: { flexDirection: 'row', gap: 5 }, strengthBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.border }, strengthWeak: { backgroundColor: '#C0392B' }, strengthMedium: { backgroundColor: '#D98B13' }, strengthStrong: { backgroundColor: '#287A49' }, strengthLabel: { fontSize: 12, fontWeight: '700', marginTop: 7 }, strengthLabelWeak: { color: '#B42318' }, strengthLabelMedium: { color: '#9A6100' }, strengthLabelStrong: { color: '#287A49' }, strengthHint: { color: C.granite, fontSize: 11, lineHeight: 16, marginTop: 4 }
});

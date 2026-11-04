import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

const STORAGE_KEY = '@cookflow_mock_auth_v1';
const PASSWORD_KEY = email => `cookflow_password_${Array.from(email).map(char => char.codePointAt(0).toString(16)).join('_')}`;
const ADMIN_EMAIL = 'admin@cookflow.demo';
const ADMIN_PASSWORD = 'Admin123!';
const AuthContext = createContext(null);

const storage = {
  get: async () => {
    try {
      if (Platform.OS === 'web') return window.localStorage.getItem(STORAGE_KEY);
      return await require('@react-native-async-storage/async-storage').default.getItem(STORAGE_KEY);
    } catch { return null; }
  },
  set: async value => {
    try {
      if (Platform.OS === 'web') window.localStorage.setItem(STORAGE_KEY, value);
      else await require('@react-native-async-storage/async-storage').default.setItem(STORAGE_KEY, value);
    } catch { /* Demo can continue for the current session if storage is unavailable. */ }
  },
  getPassword: async email => Platform.OS === 'web' ? window.localStorage.getItem(PASSWORD_KEY(email)) : require('expo-secure-store').getItemAsync(PASSWORD_KEY(email)),
  setPassword: async (email, password) => Platform.OS === 'web' ? window.localStorage.setItem(PASSWORD_KEY(email), password) : require('expo-secure-store').setItemAsync(PASSWORD_KEY(email), password)
};

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    storage.get().then(async raw => {
      if (!alive) return;
      try {
        const saved = JSON.parse(raw || 'null');
        if (saved?.users) {
          const users = { ...saved.users };
          await Promise.all(Object.entries(users).map(async ([email, user]) => {
            if (user.password != null) {
              await storage.setPassword(email, user.password);
              users[email] = { ...user };
              delete users[email].password;
            }
          }));
          const safeSaved = { ...saved, users };
          setAccount(safeSaved);
          if (JSON.stringify(safeSaved) !== JSON.stringify(saved)) await storage.set(JSON.stringify(safeSaved));
        }
      } catch { /* Ignore invalid demo data. */ }
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  const persist = useCallback(async next => {
    const users = { ...(next.users || {}) };
    await Promise.all(Object.entries(users).map(async ([email, user]) => {
      if (user.password != null) {
        await storage.setPassword(email, user.password);
        users[email] = { ...user };
        delete users[email].password;
      }
    }));
    const safeNext = { ...next, users };
    setAccount(safeNext);
    await storage.set(JSON.stringify(safeNext));
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const users = account?.users || {};
    if (users[normalizedEmail]) throw new Error('Email này đã được đăng ký. Hãy đăng nhập.');
    const nextUsers = { ...users, [normalizedEmail]: { name: name.trim(), password, verified: false, role: 'user', createdAt: Date.now() } };
    await persist({ users: nextUsers, pendingEmail: normalizedEmail, currentUser: null });
    return normalizedEmail;
  }, [account, persist]);

  const verify = useCallback(async email => {
    const users = { ...(account?.users || {}) };
    if (!users[email]) throw new Error('Không tìm thấy tài khoản cần xác minh.');
    users[email] = { ...users[email], verified: true };
    await persist({ users, pendingEmail: null, currentUser: { email, name: users[email].name, role: users[email].role || 'user' } });
  }, [account, persist]);

  const login = useCallback(async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const admin = { name: 'Quản trị viên', verified: true, role: 'admin' };
      await persist({ ...(account || {}), users: { ...(account?.users || {}), [ADMIN_EMAIL]: admin }, currentUser: { email: ADMIN_EMAIL, ...admin }, pendingEmail: null });
      return;
    }
    const user = account?.users?.[normalizedEmail];
    const savedPassword = user ? await storage.getPassword(normalizedEmail) : null;
    if (!user || savedPassword !== password) throw new Error('Email hoặc mật khẩu chưa chính xác.');
    if (user.locked) throw new Error('Tài khoản đã bị khóa. Liên hệ quản trị viên CookFlow.');
    if (!user.verified) {
      await persist({ ...account, pendingEmail: normalizedEmail, currentUser: null });
      throw new Error('Tài khoản chưa xác minh. Mã demo: 123456.');
    }
    await persist({ ...account, currentUser: { email: normalizedEmail, name: user.name, role: user.role || 'user' }, pendingEmail: null });
  }, [account, persist]);

  const resetPassword = useCallback(async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const users = { ...(account?.users || {}) };
    if (!users[normalizedEmail]) throw new Error('Không tìm thấy tài khoản với email này.');
    users[normalizedEmail] = { ...users[normalizedEmail], password };
    await persist({ ...account, users, pendingEmail: null });
  }, [account, persist]);

  const signInWithGoogle = useCallback(async () => {
    const email = 'chef@cookflow.demo';
    const existing = account?.users?.[email];
    if (existing?.locked) throw new Error('Tài khoản đã bị khóa. Liên hệ quản trị viên CookFlow.');
    const users = { ...(account?.users || {}), [email]: { createdAt: Date.now(), ...existing, name: existing?.name || 'Đầu bếp CookFlow', verified: true, role: existing?.role || 'user' } };
    await persist({ ...account, users, pendingEmail: null, currentUser: { email, name: users[email].name, role: users[email].role } });
  }, [account, persist]);

  // ---------- Profile (signed-in user) ----------
  const updateProfile = useCallback(async ({ name }) => {
    const current = account?.currentUser;
    const cleanName = String(name ?? '').trim();
    if (!current) throw new Error('Bạn chưa đăng nhập.');
    if (cleanName.length < 2) throw new Error('Tên hiển thị cần ít nhất 2 ký tự.');
    if (cleanName.length > 40) throw new Error('Tên hiển thị tối đa 40 ký tự.');
    const users = { ...(account.users || {}) };
    users[current.email] = { ...(users[current.email] || {}), name: cleanName };
    await persist({ ...account, users, currentUser: { ...current, name: cleanName } });
  }, [account, persist]);

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    const email = account?.currentUser?.email;
    if (!email) throw new Error('Bạn chưa đăng nhập.');
    if (email === ADMIN_EMAIL) throw new Error('Mật khẩu tài khoản quản trị demo không thể đổi.');
    const saved = await storage.getPassword(email);
    if (saved != null && saved !== oldPassword) throw new Error('Mật khẩu hiện tại chưa đúng.');
    if (String(newPassword || '').length < 8) throw new Error('Mật khẩu mới cần ít nhất 8 ký tự.');
    await storage.setPassword(email, newPassword);
  }, [account]);

  // ---------- Admin: user management ----------
  const listUsers = useCallback(() => Object.entries(account?.users || {}).map(([email, user]) => ({
    email, name: user.name || email, role: user.role || 'user', verified: !!user.verified, locked: !!user.locked, createdAt: user.createdAt || null
  })).sort((a, b) => (a.role === b.role ? a.email.localeCompare(b.email) : a.role === 'admin' ? -1 : 1)), [account]);

  /** Creates (no `originalEmail`) or edits a user. Admin cannot demote / lock themselves. */
  const adminSaveUser = useCallback(async ({ originalEmail, email, name, role, verified, locked, password }) => {
    const users = { ...(account?.users || {}) };
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const cleanName = String(name ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Email không hợp lệ.');
    if (cleanName.length < 2) throw new Error('Tên cần ít nhất 2 ký tự.');
    const isSelf = originalEmail && originalEmail === account?.currentUser?.email;
    if (isSelf && (role !== 'admin' || locked)) throw new Error('Không thể tự hạ quyền hoặc khóa tài khoản đang đăng nhập.');
    if (originalEmail && originalEmail !== normalizedEmail) {
      if (isSelf || originalEmail === ADMIN_EMAIL) throw new Error('Không đổi email của tài khoản quản trị.');
      if (users[normalizedEmail]) throw new Error('Email mới đã được dùng bởi tài khoản khác.');
      const moved = await storage.getPassword(originalEmail);
      if (moved != null) await storage.setPassword(normalizedEmail, moved);
      delete users[originalEmail];
    } else if (!originalEmail && users[normalizedEmail]) {
      throw new Error('Email này đã có tài khoản.');
    }
    if (!originalEmail && String(password || '').length < 8) throw new Error('Mật khẩu ban đầu cần ít nhất 8 ký tự.');
    const previous = users[originalEmail || normalizedEmail] || users[normalizedEmail] || {};
    users[normalizedEmail] = {
      ...previous,
      name: cleanName,
      role: role === 'admin' ? 'admin' : 'user',
      verified: !!verified,
      locked: !!locked,
      createdAt: previous.createdAt || Date.now(),
      ...(password ? { password } : {})
    };
    await persist({ ...account, users });
  }, [account, persist]);

  const adminDeleteUser = useCallback(async email => {
    if (email === account?.currentUser?.email) throw new Error('Không thể xóa tài khoản đang đăng nhập.');
    if (email === ADMIN_EMAIL) throw new Error('Không thể xóa tài khoản quản trị mặc định.');
    const users = { ...(account?.users || {}) };
    delete users[email];
    await persist({ ...account, users, pendingEmail: account?.pendingEmail === email ? null : account?.pendingEmail });
  }, [account, persist]);

  const signOut = useCallback(async () => {
    if (account) await persist({ ...account, currentUser: null, pendingEmail: null });
  }, [account, persist]);

  const value = useMemo(() => ({
    ready, user: account?.currentUser || null, pendingEmail: account?.pendingEmail || null,
    register, verify, login, resetPassword, signInWithGoogle, signOut,
    updateProfile, changePassword, listUsers, adminSaveUser, adminDeleteUser
  }), [ready, account, register, verify, login, resetPassword, signInWithGoogle, signOut, updateProfile, changePassword, listUsers, adminSaveUser, adminDeleteUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

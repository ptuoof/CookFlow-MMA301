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
    const nextUsers = { ...users, [normalizedEmail]: { name: name.trim(), password, verified: false, role: 'user' } };
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
    const users = { ...(account?.users || {}), [email]: { name: 'Đầu bếp CookFlow', verified: true, role: 'user' } };
    await persist({ users, pendingEmail: null, currentUser: { email, name: users[email].name, role: 'user' } });
  }, [account, persist]);

  const signOut = useCallback(async () => {
    if (account) await persist({ ...account, currentUser: null, pendingEmail: null });
  }, [account, persist]);

  const value = useMemo(() => ({ ready, user: account?.currentUser || null, pendingEmail: account?.pendingEmail || null, register, verify, login, resetPassword, signInWithGoogle, signOut }), [ready, account, register, verify, login, resetPassword, signInWithGoogle, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

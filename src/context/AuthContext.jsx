import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authApi from '../services/api/auth';
import * as usersApi from '../services/api/users';
import { setAuthToken, setSessionEndHandler } from '../services/api/client';
import { clearToken, loadToken, saveToken } from '../services/api/session';
import { showAlert } from '../utils/dialog';

// Accounts live on the CookFlow API (JWT). The token is kept in SecureStore (web: localStorage)
// so the user stays signed in between launches.
const AuthContext = createContext(null);

// The app's user shape: { id, email, name, role, verified, locked, avatar, createdAt }
const toUser = user => user ? { ...user, name: user.name || user.fullName || user.email } : null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  // Email waiting for its 6-digit code (after register, or a login of an unverified account)
  const [pendingEmail, setPendingEmail] = useState(null);
  // Code returned by the server in development (no mail server yet)
  const [devCode, setDevCode] = useState(null);
  // Startup problem (server unreachable) shown on the sign-in screen
  const [connectionError, setConnectionError] = useState('');
  // Admin: user list
  const [users, setUsers] = useState([]);
  const userRef = useRef(null);
  userRef.current = user;

  const startSession = useCallback(async (token, nextUser) => {
    setAuthToken(token);
    await saveToken(token);
    setPendingEmail(null);
    setDevCode(null);
    setConnectionError('');
    setUser(toUser(nextUser));
  }, []);

  const endSession = useCallback(async () => {
    setAuthToken(null);
    await clearToken();
    setUser(null);
    setUsers([]);
  }, []);

  // Restore the previous session
  useEffect(() => {
    let alive = true;
    (async () => {
      const token = await loadToken();
      if (token) {
        setAuthToken(token);
        try {
          const me = await authApi.fetchMe();
          if (alive) setUser(toUser(me.user));
        } catch (error) {
          if (!alive) return;
          if (error.code === 'NETWORK_ERROR') {
            // Keep the token: the next launch (or sign-in) may reach the server
            setConnectionError(error.message);
          } else {
            setAuthToken(null);
            await clearToken();
          }
        }
      }
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  // Token expired / account locked or deleted while the app is open -> back to the sign-in screen
  useEffect(() => {
    setSessionEndHandler(({ code, message }) => {
      if (!userRef.current) return;
      endSession();
      if (code === 'ACCOUNT_LOCKED') showAlert('Tài khoản đã bị khóa', message);
      else showAlert('Phiên đăng nhập đã kết thúc', message || 'Hãy đăng nhập lại.');
    });
    return () => setSessionEndHandler(null);
  }, [endSession]);

  const register = useCallback(async ({ name, email, password }) => {
    const data = await authApi.register({ name: name.trim(), email: email.trim().toLowerCase(), password });
    setPendingEmail(data.email);
    setDevCode(data.devCode || null);
    return data.email;
  }, []);

  /** Verifies the email with the 6-digit code; signs the user in. */
  const verify = useCallback(async (email, code) => {
    const data = await authApi.verifyEmail(email.trim().toLowerCase(), code.trim());
    await startSession(data.token, data.user);
  }, [startSession]);

  const resendCode = useCallback(async email => {
    const data = await authApi.resendCode(email.trim().toLowerCase());
    setDevCode(data.devCode || null);
    return data.devCode || null;
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authApi.login(email.trim().toLowerCase(), password);
      await startSession(data.token, data.user);
    } catch (error) {
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        // The server sent a fresh code: the sign-in screen switches to "Xác minh email"
        setPendingEmail(error.data?.email || email.trim().toLowerCase());
        setDevCode(error.data?.devCode || null);
      }
      throw error;
    }
  }, [startSession]);

  /** Step 1 of "Quên mật khẩu": sends a reset code. */
  const requestPasswordReset = useCallback(async email => {
    const data = await authApi.forgotPassword(email.trim().toLowerCase());
    setDevCode(data.devCode || null);
    return data.devCode || null;
  }, []);

  /** Step 2: new password with the code. */
  const resetPassword = useCallback(async (email, code, password) => {
    await authApi.resetPassword(email.trim().toLowerCase(), code.trim(), password);
    setDevCode(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    throw new Error('Đăng nhập bằng Google chưa được hỗ trợ trên máy chủ CookFlow.');
  }, []);

  const cancelVerification = useCallback(() => {
    setPendingEmail(null);
    setDevCode(null);
  }, []);

  // ---------- Profile (signed-in user) ----------
  const updateProfile = useCallback(async ({ name }) => {
    const cleanName = String(name ?? '').trim();
    if (cleanName.length < 2) throw new Error('Tên hiển thị cần ít nhất 2 ký tự.');
    if (cleanName.length > 40) throw new Error('Tên hiển thị tối đa 40 ký tự.');
    setUser(toUser(await authApi.updateProfile({ name: cleanName })));
  }, []);

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    if (String(newPassword || '').length < 8) throw new Error('Mật khẩu mới cần ít nhất 8 ký tự.');
    await authApi.changePassword(oldPassword, newPassword);
  }, []);

  // ---------- Admin: user management ----------
  const refreshUsers = useCallback(async () => {
    const data = await usersApi.fetchUsers();
    setUsers(data.users.map(toUser));
    return data.users;
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') refreshUsers().catch(error => showAlert('Không tải được danh sách tài khoản', error.message));
  }, [user?.id, user?.role, refreshUsers]);

  /** Same list as before, now loaded from the server (refreshUsers) */
  const listUsers = useCallback(() => users, [users]);

  /** Creates (no `id`) or edits a user. */
  const adminSaveUser = useCallback(async form => {
    if (!form.id && String(form.password || '').length < 8) throw new Error('Mật khẩu ban đầu cần ít nhất 8 ký tự.');
    await usersApi.saveUser(form);
    await refreshUsers();
  }, [refreshUsers]);

  const adminDeleteUser = useCallback(async id => {
    await usersApi.deleteUser(id);
    await refreshUsers();
  }, [refreshUsers]);

  const signOut = useCallback(async () => {
    await endSession();
  }, [endSession]);

  const value = useMemo(() => ({
    ready, user, pendingEmail, devCode, connectionError,
    register, verify, resendCode, login, requestPasswordReset, resetPassword, signInWithGoogle, cancelVerification, signOut,
    updateProfile, changePassword, users, listUsers, refreshUsers, adminSaveUser, adminDeleteUser
  }), [ready, user, pendingEmail, devCode, connectionError, register, verify, resendCode, login, requestPasswordReset, resetPassword,
    signInWithGoogle, cancelVerification, signOut, updateProfile, changePassword, users, listUsers, refreshUsers, adminSaveUser, adminDeleteUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

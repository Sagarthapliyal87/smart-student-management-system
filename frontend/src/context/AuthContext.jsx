import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, getErrorMessage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sms_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Validate any stored token against the server on first load.
  useEffect(() => {
    if (!localStorage.getItem('sms_token')) { setLoading(false); return; }
    api.get('/auth/me')
      .then((res) => { setUser(res.data); localStorage.setItem('sms_user', JSON.stringify(res.data)); })
      .catch(() => { localStorage.removeItem('sms_token'); localStorage.removeItem('sms_user'); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get('/auth/me');
    localStorage.setItem('sms_user', JSON.stringify(res.data));
    setUser(res.data);
    return res.data;
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('sms_token', res.data.token);
      // Fetch the full profile (student/teacher/parent record) so pages can use user.student.id etc. immediately.
      const me = await refreshUser();
      return { success: true, user: me };
    } catch (err) {
      localStorage.removeItem('sms_token');
      return { success: false, error: getErrorMessage(err) };
    }
  }, [refreshUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout, refreshUser, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

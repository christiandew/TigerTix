import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);
const AUTH_BASE = process.env.REACT_APP_AUTH_BASE || 'http://localhost:6010';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to load current profile (will succeed if cookie set)
    fetch(`${AUTH_BASE}/api/auth/profile`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Not authenticated');
        const body = await res.json();
        setUser(body);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await fetch(`${AUTH_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Login failed');
    }
    const body = await res.json();
    setUser(body);
    return body;
  }

  async function register(email, password) {
    const res = await fetch(`${AUTH_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Registration failed');
    }
    const body = await res.json();
    setUser(body);
    return body;
  }

  async function logout() {
    try {
      await fetch(`${AUTH_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;

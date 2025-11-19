// src/Register.js
import React, { useState } from 'react';
import { useAuth } from './AuthContext';

function Register({ onDone }) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      await register(email, password);
      if (onDone) onDone();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <h2 className="auth-title">Create an account</h2>
      <p className="auth-subtitle">Register once to book and manage tickets.</p>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="register-email" className="auth-label">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="register-password" className="auth-label">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>

        <button type="submit" className="auth-button" disabled={busy}>
          {busy ? 'Creating account…' : 'Register'}
        </button>
      </form>
    </div>
  );
}

export default Register;

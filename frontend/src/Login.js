import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export default function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      if (onDone) onDone();
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={submit} className="auth-form">
      <h2>Login</h2>
      {error && <p className="error" role="alert">{error}</p>}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button type="submit">Log in</button>
    </form>
  );
}

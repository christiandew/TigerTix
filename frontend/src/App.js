import React, { useEffect, useState } from 'react';
import './App.css';
import { useAuth } from './AuthContext';
import Login from './Login';
import Register from './Register';

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [buyingId, setBuyingId] = useState(null);

const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:6001';
  const { user, logout } = useAuth() || {};
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    fetch(`${BASE}/api/events`)
      .then((res) => {
        if (!res.ok) throw new Error('Load failed');
        return res.json();
      })
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  const buyTicket = async (id, name) => {
    setError(null);
    setSuccess(null);
    setBuyingId(id);
    try {
      const res = await fetch(`${BASE}/api/events/${id}/purchase`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.status === 401) {
        setError('Please log in to purchase tickets.');
        return;
      }

      if (res.status === 404 || res.status === 409) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Unable to purchase ticket');
        return;
      }
      if (!res.ok) {
        setError('Failed to purchase ticket');
        return;
      }

      const updated = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setSuccess(`Purchased 1 ticket for ${name}.`);
    } catch {
      setError('Network error while purchasing ticket');
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>

      <div className="App">
        <header className="app-header">
          <h1>Clemson Campus Events</h1>
          <div className="auth-status">
            {user ? (
              <>
                <span className="auth-chip">Logged in as {user.email}</span>
                <button type="button" className="ghost-button" onClick={() => logout()}>Logout</button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => { setShowLogin((s) => !s); setShowRegister(false); }}
                >
                  Login
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => { setShowRegister((s) => !s); setShowLogin(false); }}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </header>
        {showLogin && !user && <Login onDone={() => setShowLogin(false)} />}
        {showRegister && !user && <Register onDone={() => setShowRegister(false)} />}

        {loading && <p className="status" aria-live="polite">Loading events…</p>}
        {success && <p className="status" role="status" aria-live="polite">{success}</p>}
        {error && <p className="error" role="alert">{error}</p>}

        <main id="main" aria-busy={loading ? 'true' : 'false'}>
          <ul className="event-list">
            {events.map((event) => {
              const soldOut = Number(event.ticketsAvailable) <= 0;
              const busy = buyingId === event.id;

              return (
                <li key={event.id} className="event-item">
                  <span className="event-name"><strong>{event.name}</strong></span>
                  <span className="event-date">{event.date}</span>
                  <span className="event-tickets">Tickets: {event.ticketsAvailable}</span>
                  <button
                    type="button"
                    className="buy-button"
                    onClick={() => buyTicket(event.id, event.name)}
                    disabled={soldOut || busy}
                    aria-label={soldOut
                      ? `Sold out: ${event.name}`
                      : `Buy ticket for ${event.name}`}
                  >
                    {busy ? 'Purchasing…' : soldOut ? 'Sold out' : 'Buy Ticket'}
                  </button>
                </li>
              );
            })}
          </ul>
        </main>
      </div>
    </>
  );
}

export default App;

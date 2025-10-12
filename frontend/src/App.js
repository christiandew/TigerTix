import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyingId, setBuyingId] = useState(null);

  // NOTE: client-service runs on port 6001 (see backend/client-service/server.js)
  const BASE = 'http://localhost:6001';

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${BASE}/api/events`)
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => setError('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  const buyTicket = async (id, name) => {
    setError(null);
    setBuyingId(id);
    try {
      const res = await fetch(`${BASE}/api/events/${id}/purchase`, { method: 'POST' });

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
      // update local list with returned row
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      setError('Network error while purchasing ticket');
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="App">
      <h1>Clemson Campus Events</h1>
      {loading && <p>Loading events...</p>}
      {error && <p style={{ color: 'darkred' }}>{error}</p>}
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <strong>{event.name}</strong> — {event.date} —
            <span> Tickets: {event.ticketsAvailable}</span>{' '}
            <button
              onClick={() => buyTicket(event.id, event.name)}
              disabled={event.ticketsAvailable <= 0 || buyingId === event.id}
            >
              {buyingId === event.id ? 'Purchasing...' : event.ticketsAvailable > 0 ? 'Buy Ticket' : 'Sold out'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
// App.js — Sprint 1 frontend
// Goal: show events, let the user buy a ticket, and meet basic a11y needs.
// Notes: We talk to the client service (read/purchase). Admin service is for creating events.

/**
 * App
 * Purpose: Renders the events list, loads data from the client service,
 *          and lets the user purchase a ticket with clear feedback.
 * Inputs:  None (top-level component manages its own state)
 * Output:  React tree; performs network I/O (fetch) and updates local state
 * Side effects: Fetches data on mount; POSTs on purchase
 */
import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  // UI state
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [buyingId, setBuyingId] = useState(null);


  const BASE = 'http://localhost:6001';

  // Load events once on mount
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

  /**
   * buyTicket
   * Purpose: Attempts to purchase one ticket for a given event by ID.
   * Inputs:
   *   id   (number|string) event identifier
   *   name (string)        event name (for user-friendly messages only)
   * Output: None (updates local events state and user messages)
   * Side effects: POSTs to the client service; updates state based on response
   */
  const buyTicket = async (id, name) => {
    setError(null);
    setSuccess(null);
    setBuyingId(id);
    try {
      const res = await fetch(`${BASE}/api/events/${id}/purchase`, { method: 'POST' });

      // Common API results we want to show nicely
      if (res.status === 404 || res.status === 409) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Unable to purchase ticket');
        return;
      }
      if (!res.ok) {
        setError('Failed to purchase ticket');
        return;
      }

      // Update only the changed row the server returns
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
      {/* Skip link helps keyboard users jump straight to content; hidden until focused */}
      <a className="skip-link" href="#main">Skip to main content</a>

      <div className="App">
        <header>
          <h1>Clemson Campus Events</h1>
        </header>

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
                    // Clear, screen-reader friendly name
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

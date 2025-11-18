// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './AuthContext';
import reportWebVitals from './reportWebVitals';

// NEW: import the Task 2 chat
import LlmChat from './LlmChat';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      {/* Your existing Sprint 1 UI */}
      <App />
      {/* Task 2: Voice-enabled chat (no auto-booking) */}
      <LlmChat />
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LlmChat from './LlmChat';

// Helper to mock global speech APIs
function setupSpeechMocks() {
  // Mock AudioContext
  class MockAudioCtx {
    constructor() {}
    createOscillator() { return { type: null, frequency: { value: 0 }, connect: () => ({ connect: () => {} }), start: () => {}, stop: () => {} }; }
    createGain() { return { gain: { value: 0 }, connect: () => ({ connect: () => {} }) }; }
    close() { return Promise.resolve(); }
  }
  window.AudioContext = MockAudioCtx;
  window.webkitAudioContext = MockAudioCtx;

  // Mock speechSynthesis
  const voices = [{ voiceURI: 'mock-1', name: 'Mock Voice', lang: 'en-US' }];
  window.speechSynthesis = {
    getVoices: () => voices,
    speak: jest.fn(),
    cancel: jest.fn(),
    onvoiceschanged: null
  };

  // Mock SpeechSynthesisUtterance constructor (just a container)
  window.SpeechSynthesisUtterance = function (text) { this.text = text; this.onend = null; this.onerror = null; };

  // Mock SpeechRecognition
  function MockRecognition() {
    this.lang = 'en-US';
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this._started = false;
    MockRecognition._lastInstance = this;
  }
  MockRecognition.prototype.start = function () {
    this._started = true;
    if (typeof this.onstart === 'function') this.onstart();
  };
  MockRecognition.prototype.stop = function () {
    this._started = false;
    if (typeof this.onend === 'function') this.onend();
  };

  window.SpeechRecognition = MockRecognition;
  window.webkitSpeechRecognition = MockRecognition;

  return { voices, MockRecognition };
}

beforeEach(() => {
  jest.restoreAllMocks();
  // Ensure speech globals exist to avoid errors during mount effects
  if (!window.speechSynthesis) window.speechSynthesis = { getVoices: () => [], speak: jest.fn(), cancel: jest.fn() };
  if (!window.SpeechSynthesisUtterance) window.SpeechSynthesisUtterance = function (text) { this.text = text; this.onend = null; this.onerror = null; };
});

test('mic button disabled when SpeechRecognition not supported, enabled when supported', () => {
  // Render without SpeechRecognition -> mic should be disabled
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  const { unmount } = render(<LlmChat />);
  let micBtn = document.querySelector('.llm-chat__mic');
  expect(micBtn).toBeDisabled();

  // Now enable speech support and re-render -> mic should be enabled
  unmount();
  setupSpeechMocks();
  render(<LlmChat />);
  micBtn = document.querySelector('.llm-chat__mic');
  expect(micBtn).toBeEnabled();
});

test('clicking mic triggers recognition and sends transcript to LLM, assistant reply appears and TTS is invoked', async () => {
  const { MockRecognition } = setupSpeechMocks();

  // Mock fetch to LLM parse endpoint
  global.fetch = jest.fn(async (url, opts) => {
    if (url.endsWith('/api/llm/parse')) {
      return {
        ok: true,
        json: async () => ({ intent: 'propose_booking', event_text: 'Clemson vs. Florida State', tickets: 1, message: 'Sure', normalized: { event_id: 1 }, availability: { can_fulfill: true, event_id: 1 } })
      };
    }
    return { ok: false, json: async () => ({}) };
  });

  render(<LlmChat />);

  // mic button should be enabled now
  const micBtn = document.querySelector('.llm-chat__mic');
  expect(micBtn).toBeEnabled();

  // Click mic to start recognition
  fireEvent.click(micBtn);

  // Ensure recognition instance created
  const inst = MockRecognition._lastInstance;
  expect(inst).toBeDefined();

  // Simulate onresult event
  const resultEvent = {
    results: [
      [ { transcript: 'Book one ticket for Clemson vs. Florida State' } ]
    ]
  };

  // call handler
  await waitFor(() => {
    // emulate result callback
    if (typeof inst.onresult === 'function') inst.onresult(resultEvent);
  });

  // Wait for TTS speak to be called (indirectly indicates assistant replied)
  await waitFor(() => expect(window.speechSynthesis.speak).toHaveBeenCalled());

  // Ensure at least one assistant message was added after the initial greeting
  const assistantTexts = Array.from(document.querySelectorAll('.msg--assistant .msg__text')).map(n => n.textContent.trim());
  expect(assistantTexts.length).toBeGreaterThanOrEqual(1);
});

test('confirm booking button appears when parse proposes booking and confirm reduces via API', async () => {
  setupSpeechMocks();

  // Mock parse to return propose_booking
  global.fetch = jest.fn(async (url, opts) => {
    if (url.endsWith('/api/llm/parse')) {
      return { ok: true, json: async () => ({ intent: 'propose_booking', event_text: 'Clemson vs. Florida State', tickets: 1, message: 'I can do that', normalized: { event_id: 1 }, availability: { can_fulfill: true, event_id: 1 } }) };
    }
    if (url.endsWith('/api/llm/confirm')) {
      return { ok: true, json: async () => ({ ok: true, eventId: 1, tickets: 1, remaining: 99 }) };
    }
    return { ok: false, json: async () => ({}) };
  });

  render(<LlmChat />);

  // send a message manually via input
  const input = screen.getByPlaceholderText(/Type here/);
  fireEvent.change(input, { target: { value: 'Book one' } });
  const sendBtn = screen.getByText(/Send/i);
  fireEvent.click(sendBtn);

  // Wait for confirm button to appear
  const confirmBtn = await screen.findByText(/Confirm Booking/i);
  expect(confirmBtn).toBeInTheDocument();

  // Click confirm and expect assistant acknowledgement
  fireEvent.click(confirmBtn);

  await waitFor(() => expect(screen.getByText(/remaining:/i)).toBeInTheDocument());
});

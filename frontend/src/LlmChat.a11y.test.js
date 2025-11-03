import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LlmChat from './LlmChat';

// Reuse speech mocks from previous test file inline
function setupSpeechMocks() {
  class MockAudioCtx {
    constructor() {}
    createOscillator() { return { type: null, frequency: { value: 0 }, connect: () => ({ connect: () => {} }), start: () => {}, stop: () => {} }; }
    createGain() { return { gain: { value: 0 }, connect: () => ({ connect: () => {} }) }; }
    close() { return Promise.resolve(); }
  }
  window.AudioContext = MockAudioCtx;
  window.webkitAudioContext = MockAudioCtx;

  const voices = [{ voiceURI: 'mock-1', name: 'Mock Voice', lang: 'en-US' }];
  window.speechSynthesis = {
    getVoices: () => voices,
    speak: jest.fn(),
    cancel: jest.fn(),
    onvoiceschanged: null
  };
  window.SpeechSynthesisUtterance = function (text) { this.text = text; this.onend = null; this.onerror = null; };

  function MockRecognition() {
    this.lang = 'en-US';
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    MockRecognition._lastInstance = this;
  }
  MockRecognition.prototype.start = function () { if (typeof this.onstart === 'function') this.onstart(); };
  MockRecognition.prototype.stop = function () { if (typeof this.onend === 'function') this.onend(); };

  window.SpeechRecognition = MockRecognition;
  window.webkitSpeechRecognition = MockRecognition;

  return { voices, MockRecognition };
}

beforeEach(() => {
  jest.restoreAllMocks();
});

test('has accessible region, input label, and live region', () => {
  setupSpeechMocks();
  render(<LlmChat />);

  // The root section should be exposed as a region landmark with the accessible name
  const region = screen.getByRole('region', { name: /TigerTix voice assistant/i });
  expect(region).toBeInTheDocument();

  // The chat log should be announced politely (aria-live)
  const log = region.querySelector('.llm-chat__log');
  expect(log).toBeInTheDocument();
  expect(log.getAttribute('aria-live')).toBe('polite');
  expect(log.getAttribute('aria-relevant')).toBe('additions');

  // The input should be labelled for accessibility
  const input = screen.getByLabelText(/Type your message/i);
  expect(input).toBeInTheDocument();
});

test('mic button uses aria-pressed while listening and is keyboard focusable', async () => {
  const { MockRecognition } = setupSpeechMocks();
  render(<LlmChat />);

  // select mic button by class to avoid accessible-name fragility
  const micBtn = document.querySelector('.llm-chat__mic');
  // initially not pressed
  expect(micBtn).toHaveAttribute('aria-pressed', 'false');
  micBtn.focus();
  expect(document.activeElement).toBe(micBtn);

  // click to start listening -> MockRecognition.start will call onstart which sets listening
  userEvent.click(micBtn);

  // after onstart, aria-pressed should be true
  await waitFor(() => expect(micBtn).toHaveAttribute('aria-pressed', 'true'));

  // simulate result and ensure result gets processed (mock fetch to respond)
  global.fetch = jest.fn(async (url, opts) => {
    if (url.endsWith('/api/llm/parse')) {
      return { ok: true, json: async () => ({ intent: 'propose_booking', event_text: 'Clemson', tickets: 1, message: 'ok', normalized: { event_id: 1 }, availability: { can_fulfill: true, event_id: 1 } }) };
    }
    return { ok: false, json: async () => ({}) };
  });

  // emulate recognition result
  const inst = MockRecognition._lastInstance;
  const resultEvent = { results: [[{ transcript: 'Book Clemson' }]] };
  if (inst && typeof inst.onresult === 'function') inst.onresult(resultEvent);

  // assistant message should appear and log is still aria-live polite
  await waitFor(() => expect(regionQueryContainsText('prepare') || true).toBeTruthy());

  function regionQueryContainsText(sub) {
    const region = screen.getByRole('region', { name: /TigerTix voice assistant/i });
    return Array.from(region.querySelectorAll('.msg__text')).some(el => el.textContent.toLowerCase().includes(sub));
  }
});

test('confirm button is reachable by keyboard after propose_booking and is actionable', async () => {
  setupSpeechMocks();

  // mock parse and confirm endpoints
  global.fetch = jest.fn(async (url, opts) => {
    if (url.endsWith('/api/llm/parse')) {
      return { ok: true, json: async () => ({ intent: 'propose_booking', event_text: 'Clemson', tickets: 1, message: 'I can do that', normalized: { event_id: 1 }, availability: { can_fulfill: true, event_id: 1 } }) };
    }
    if (url.endsWith('/api/llm/confirm')) {
      return { ok: true, json: async () => ({ ok: true, eventId: 1, tickets: 1, remaining: 10 }) };
    }
    return { ok: false, json: async () => ({}) };
  });

  render(<LlmChat />);

  // type a message and send
  const input = screen.getByLabelText(/Type your message/i);
  const sendBtn = screen.getByText(/Send/i);
  await userEvent.type(input, 'Book Clemson');
  userEvent.click(sendBtn);

  // wait for confirm button to appear
  const confirmBtn = await screen.findByText(/Confirm Booking/i);
  expect(confirmBtn).toBeInTheDocument();

  // tab until confirm button is focused
  let maxTabs = 10;
  let focused = false;
  while (maxTabs-- > 0) {
    await userEvent.tab();
    if (document.activeElement === confirmBtn) { focused = true; break; }
  }
  expect(focused).toBe(true);

  // activate confirm with keyboard (press Enter)
  confirmBtn.focus();
  await userEvent.keyboard('{Enter}');

  // assistant should display remaining info
  await waitFor(() => expect(screen.getByText(/remaining:/i)).toBeInTheDocument());
});

test('booking via natural language (text)', async () => {
  setupSpeechMocks();

  // Mock parse and confirm endpoints
  global.fetch = jest.fn(async (url, opts) => {
    if (url.endsWith('/api/llm/parse')) {
      return { ok: true, json: async () => ({ intent: 'propose_booking', event_text: 'Clemson Homecoming Game', tickets: 1, message: 'I can do that', normalized: { event_id: 1 }, availability: { can_fulfill: true, event_id: 1 } }) };
    }
    if (url.endsWith('/api/llm/confirm')) {
      return { ok: true, json: async () => ({ ok: true, eventId: 1, tickets: 1, remaining: 10 }) };
    }
    return { ok: false, json: async () => ({}) };
  });

  render(<LlmChat />);

  // type a natural-language booking and send
  const input = screen.getByLabelText(/Type your message/i);
  const sendBtn = screen.getByText(/Send/i);
  await userEvent.type(input, 'Please book one ticket for Clemson Homecoming Game');
  userEvent.click(sendBtn);

  // wait for confirm button and activate it
  const confirmBtn = await screen.findByText(/Confirm Booking/i);
  expect(confirmBtn).toBeInTheDocument();
  userEvent.click(confirmBtn);

  // assistant should display remaining info
  await waitFor(() => expect(screen.getByText(/remaining:/i)).toBeInTheDocument());
});

test('booking via natural language (voice)', async () => {
  const { MockRecognition } = setupSpeechMocks();

  // Mock parse and confirm endpoints
  global.fetch = jest.fn(async (url, opts) => {
    if (url.endsWith('/api/llm/parse')) {
      return { ok: true, json: async () => ({ intent: 'propose_booking', event_text: 'Clemson Homecoming Game', tickets: 1, message: 'Sure', normalized: { event_id: 1 }, availability: { can_fulfill: true, event_id: 1 } }) };
    }
    if (url.endsWith('/api/llm/confirm')) {
      return { ok: true, json: async () => ({ ok: true, eventId: 1, tickets: 1, remaining: 9 }) };
    }
    return { ok: false, json: async () => ({}) };
  });

  render(<LlmChat />);

  // start mic (keyboard focusable) and simulate a spoken phrase
  const micBtn = document.querySelector('.llm-chat__mic');
  expect(micBtn).toBeInTheDocument();
  userEvent.click(micBtn);

  // emulate recognition result
  const inst = MockRecognition._lastInstance;
  expect(inst).toBeDefined();
  const resultEvent = { results: [[{ transcript: 'Book one ticket for Clemson Homecoming Game' }]] };
  if (typeof inst.onresult === 'function') inst.onresult(resultEvent);

  // wait for confirm button and confirm
  const confirmBtn = await screen.findByText(/Confirm Booking/i);
  userEvent.click(confirmBtn);

  await waitFor(() => expect(screen.getByText(/remaining:/i)).toBeInTheDocument());
});

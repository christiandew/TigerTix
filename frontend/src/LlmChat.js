import React, { useEffect, useRef, useState } from "react";
import "./LlmChat.css";

const LLM_BASE = process.env.REACT_APP_LLM_BASE || 'http://localhost:7001';

export default function LlmChat() {
  // chat
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi, I'm the TigerTix assistant. Ask me to show you a list of upcoming events.",
    },
  ]);
  const [input, setInput] = useState("");

  // speech-to-text
  const [supportedSTT, setSupportedSTT] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // text-to-speech
  const [speakingOn, setSpeakingOn] = useState(true);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  // tts guards
  const lastSpokenIdxRef = useRef(-1);
  const speakSessionRef = useRef(0);

  // last parse (for confirm button)
  const lastParseRef = useRef(null); // keeps latest value
  const [lastParse, setLastParse] = useState(null); // triggers re-render when parse result changes

  const pushMessage = (role, text) =>
    setMessages((m) => [...m, { role, text }]);

  // short beep before STT
  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 700;
      gain.gain.value = 0.1;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 150);
    } catch {}
  }

  // STT availability
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) setSupportedSTT(true);
  }, []);

  // mic then transcribe then send
  function handleMicClick() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || listening) return;
    beep();

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    rec.onresult = async (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) {
        pushMessage("user", transcript);
        setInput("");
        await sendToLlm(transcript);
      }
    };
    rec.start();
  }

  // pick a usable default TTS voice
  useEffect(() => {
    function choose(vs) {
      const saved = localStorage.getItem("ttsVoiceURI");
      if (saved) {
        const hit = vs.find((v) => v.voiceURI === saved);
        if (hit) return hit;
      }
      return vs.find((v) => /English/i.test(v.lang || "")) || vs[0] || null;
    }
    function load() {
      const vs = window.speechSynthesis?.getVoices?.() || [];
      setVoices(vs);
      if (!selectedVoice && vs.length) setSelectedVoice(choose(vs));
    }
    load();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
  }, [selectedVoice]);

    function getAuthHeaders() {
    let token = null;
    try {
      token =
        localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("authToken");
    } catch (e) {
      // ignore if localStorage is not accessible
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // sanitize + chunk text for TTS
  const ttsSanitize = (s) =>
    String(s || "")
      .replace(/[•·●▪︎◦]/g, "- ")
      .replace(/[—–]/g, "-")
      .replace(/\r\n/g, "\n")
      .replace(/\n{2,}/g, "\n")
      .trim();

  function chunkText(text, maxLen = 220) {
    const lines = ttsSanitize(text)
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const out = [];
    for (const line of lines) {
      if (line.length <= maxLen) {
        out.push(line);
        continue;
      }
      const parts = line.split(/(?<=[.!?])\s+/);
      let buf = "";
      for (const p of parts) {
        const next = buf ? `${buf} ${p}` : p;
        if (next.length > maxLen) {
          if (buf) out.push(buf);
          buf = p;
        } else {
          buf = next;
        }
      }
      if (buf) out.push(buf);
    }
    return out;
  }

  // speak one chunk with watchdog
  function speakChunk(str) {
    return new Promise((done) => {
      const u = new SpeechSynthesisUtterance(str);
      if (selectedVoice) u.voice = selectedVoice;
      u.rate = rate;
      u.pitch = pitch;
      u.volume = volume;
      const timeout = setTimeout(
        done,
        Math.max(2000, Math.min(12000, str.length * 40))
      );
      u.onend = () => {
        clearTimeout(timeout);
        done();
      };
      u.onerror = () => {
        clearTimeout(timeout);
        done();
      };
      try {
        window.speechSynthesis?.speak(u);
      } catch {
        done();
      }
    });
  }

  // speak newest assistant once
  async function speakTextOnce(text) {
    if (!text) return;
    const sessionId = ++speakSessionRef.current;
    try {
      window.speechSynthesis?.cancel?.();
    } catch {}
    for (const c of chunkText(text)) {
      if (sessionId !== speakSessionRef.current) return;
      await speakChunk(c);
    }
  }

  useEffect(() => {
    if (!speakingOn || !messages.length) return;
    let idx = -1;
    for (let i = messages.length - 1; i >= 0; i--)
      if (messages[i].role === "assistant") {
        idx = i;
        break;
      }
    if (idx === -1 || idx <= lastSpokenIdxRef.current) return;
    speakTextOnce(messages[idx].text);
    lastSpokenIdxRef.current = idx;
  }, [messages, speakingOn, selectedVoice, rate, pitch, volume]);

  // call parse API
  async function sendToLlm(text) {
    try {
      const res = await fetch(`${LLM_BASE}/api/llm/parse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ user_input: text }),
      });
      const data = await res.json();
      lastParseRef.current = data;
      setLastParse(data);

      // show events
      if (data?.intent === "show_events" && Array.isArray(data.results)) {
        const eventsList = data.results
          .map(
            (e) =>
              `• ${e.name} — ${e.date} (${e.remaining} left)${
                e.total ? ` [${e.total} total]` : ""
              }`
          )
          .join("\n");
        pushMessage(
          "assistant",
          `Here are the upcoming events.\n${eventsList}`
        );
        return;
      }

      // propose booking
      if (data?.intent === "propose_booking") {
        const details = data?.availability;
        const ok = details?.can_fulfill === true;
        const eventName = details?.event_name || "your event";
        const remaining = Number.isFinite(details?.remaining)
          ? `${details.remaining} left`
          : "remaining tickets";
        const qty = Number.isFinite(data?.tickets) ? data.tickets : 1;

        if (ok) {
          pushMessage(
            "assistant",
            `I found the event you requested: ${eventName} (${remaining}).\n` +
              `You requested ${qty} ticket(s). Use the confirm button below to finalize.`
          );
        } else {
          pushMessage(
            "assistant",
            `I found the event you requested: ${eventName}, but it can't fulfill your request.`
          );
        }
        return;
      }

      // generic, including "ok" fallback
      if (typeof data?.message === "string" && data.message.trim()) {
        const msg = data.message.trim();
        const polite = "Okay. What would you like to do next?";
        pushMessage(
          "assistant",
          !msg || /^ok(ay)?\.?$/i.test(msg) ? polite : msg
        );
        return;
      }

      // generic
      pushMessage("assistant", data?.message || "Okay.");
    } catch (err) {
      pushMessage("assistant", "Sorry couldn't reach the LLM service.");
      console.error("[sendToLlm]", err);
    }
  }

  // confirm booking
  async function handleConfirmClick() {
    const p = lastParse || {};
    const proposed = p?.intent === "propose_booking";
    const eventId =
      p?.normalized?.event_id ?? p?.availability?.event_id ?? null;
    const qty = Number.isFinite(p?.tickets) ? p.tickets : 1;
    const ok =
      p?.availability?.can_fulfill === true && Number.isInteger(eventId);
    if (!proposed || !ok) return;

    try {
      const res = await fetch(`${LLM_BASE}/api/llm/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ event_id: eventId, qty }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        pushMessage(
          "assistant",
          `Booking failed: ${err?.error || res.statusText}`
        );
        return;
      }
      const data = await res.json();
      const remaining = Number.isFinite(data?.remaining)
        ? data.remaining
        : "unknown";
      const eventName = data?.event_name || "your event";
      pushMessage(
        "assistant",
        `Booked ${eventName} — remaining tickets: ${remaining}.`
      );
    } catch (err) {
      pushMessage("assistant", "Sorry, booking failed due to a network error.");
      console.error("[handleConfirmClick]", err);
    }
  }


  async function handleSendClick() {
    const text = input.trim();
    if (!text) return;
    pushMessage("user", text);
    setInput("");
    await sendToLlm(text);
  }

  const canConfirm = (() => {
    const p = lastParse || {};
    const proposed = p?.intent === "propose_booking";
    const eventId =
      p?.normalized?.event_id ?? p?.availability?.event_id ?? null;
    const ok =
      p?.availability?.can_fulfill === true && Number.isInteger(eventId);
    return proposed && ok;
  })();

  return (
    <section className="llm-chat" aria-label="TigerTix voice assistant">
      <h2 className="llm-chat__title">Voice Assistant</h2>

      <div
        className="llm-chat__log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((m, i) => (
          <div key={i} className={`msg msg--${m.role}`}>
            <span className="msg__role" aria-hidden="true">
              {m.role === "user" ? "You" : "Assistant"}
            </span>
            <p className="msg__text">{m.text}</p>
          </div>
        ))}
      </div>

      <div className="llm-chat__controls">
        <label htmlFor="chat-input" className="visually-hidden">
          Type your message
        </label>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type here (or use the mic)…"
          className="llm-chat__input llm-chat__input--text"
        />
        <button className="llm-chat__send" onClick={handleSendClick}>
          Send
        </button>
        <button
          className="llm-chat__mic"
          onClick={handleMicClick}
          disabled={!supportedSTT || listening}
          aria-disabled={!supportedSTT || listening}
          aria-pressed={listening}
          title={
            supportedSTT
              ? listening
                ? "Listening…"
                : "Start voice input"
              : "Speech recognition not supported"
          }
        >
          {listening ? "Listening…" : "🎤"}
        </button>
      </div>

      <div className="llm-chat__controls llm-chat__controls--advanced">
        <select
          className="llm-chat__select"
          value={selectedVoice?.voiceURI || ""}
          onChange={(e) => {
            const v =
              voices.find((vv) => vv.voiceURI === e.target.value) || null;
            setSelectedVoice(v);
            if (v) localStorage.setItem("ttsVoiceURI", v.voiceURI);
          }}
          title="Choose voice"
        >
          {voices.length === 0 && (
            <option value="">System voice (loading…)</option>
          )}
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} {v.lang ? `(${v.lang})` : ""}
            </option>
          ))}
        </select>

        <label className="llm-chat__mini" title="Voice rate">
          <span>Rate</span>
          <input
            className="llm-chat__range"
            type="range"
            min="0.7"
            max="1.2"
            step="0.05"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
          />
        </label>

        <label className="llm-chat__mini" title="Voice pitch">
          <span>Pitch</span>
          <input
            className="llm-chat__range"
            type="range"
            min="0.8"
            max="1.2"
            step="0.05"
            value={pitch}
            onChange={(e) => setPitch(parseFloat(e.target.value))}
          />
        </label>

        <label className="llm-chat__mini" title="Voice volume">
          <span>Vol</span>
          <input
            className="llm-chat__range"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </label>

        <label className="llm-chat__mini" title="Speak replies">
          <input
            type="checkbox"
            checked={speakingOn}
            onChange={() => setSpeakingOn((v) => !v)}
          />
          <span>TTS</span>
        </label>
      </div>

      {canConfirm && (
        <div className="llm-chat__confirm">
          <button className="confirm-btn" onClick={handleConfirmClick}>
            Confirm Booking
          </button>
        </div>
      )}
    </section>
  );
}

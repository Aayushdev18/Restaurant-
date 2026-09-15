import React, { useEffect, useRef, useState } from "react";
import { FaMicrophone } from "react-icons/fa";
import { IoClose, IoSend } from "react-icons/io5";
import { useLocation } from "react-router-dom";
import { agentApi, agentSessionId, newAgentSession } from "../api";

const SpeechEngine =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const BOOKING_STEPS = [
  { key: "party_size", label: "Guests" },
  { key: "date", label: "Date" },
  { key: "time", label: "Time" },
  { key: "first_name", label: "Name" },
  { key: "phone", label: "Phone" },
];

const SUGGESTIONS = ["Opening hours", "Today's menu", "Book a table", "Where are you?"];

const GREETING = {
  role: "maya",
  text: "How can I help you?",
};

const spokenForm = (text) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 220) return clean;
  const cut = clean.slice(0, 220);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "));
  return stop > 80 ? cut.slice(0, stop + 1) : cut;
};

const speak = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(spokenForm(text));
  utterance.lang = "en-IN";
  utterance.rate = 0.95;
  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const match =
      voices.find((v) => v.lang === "en-IN") ||
      voices.find((v) => /India/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (match) utterance.voice = match;
    window.speechSynthesis.speak(utterance);
  };
  if (window.speechSynthesis.getVoices().length) pickVoice();
  else window.speechSynthesis.addEventListener("voiceschanged", pickVoice, { once: true });
};

const VoiceConcierge = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState("");
  const [slots, setSlots] = useState({});
  const [pending, setPending] = useState(null);
  const [lines, setLines] = useState([GREETING]);
  const recognitionRef = useRef(null);
  const listRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, open]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const send = async (raw) => {
    const message = raw.trim();
    if (!message || busyRef.current) return;
    setDraft("");
    setHint("");
    setLines((prev) => [...prev, { role: "you", text: message }]);
    setBusy(true);
    try {
      const { data } = await agentApi.post("/turn", {
        message,
        session_id: agentSessionId(),
      });
      const reply = data.reply || "I missed that. Could you repeat it?";
      setSlots(data.slots || {});
      setPending(data.pending || null);
      const whatsapp = data.whatsapp_url;
      setLines((prev) => [...prev, { role: "maya", text: reply, whatsapp }]);
      speak(reply);
      if (whatsapp) {
        window.open(whatsapp, "_blank", "noopener,noreferrer");
      }
    } catch {
      setLines((prev) => [
        ...prev,
        { role: "maya", text: "The concierge is offline. Please use WhatsApp or the reservation form." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const resetChat = async () => {
    const previous = agentSessionId();
    try {
      await agentApi.post("/reset", { session_id: previous });
    } catch {
      // Local UI reset is enough if the agent restarted.
    }
    newAgentSession();
    setSlots({});
    setPending(null);
    setHint("");
    setLines([GREETING]);
    window.speechSynthesis?.cancel();
  };

  const toggleListen = () => {
    if (!SpeechEngine) {
      setOpen(true);
      setHint("Voice works in Chrome or Edge. You can type instead.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setHint("");
      return;
    }
    window.speechSynthesis?.cancel();
    const recognition = new SpeechEngine();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      setHint(transcript);
      if (result.isFinal) send(transcript);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed") setHint("Allow microphone access to speak.");
      else if (event.error === "no-speech") setHint("Nothing was heard. Try again, or type.");
      else setHint("Microphone unavailable. Type your request below.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    setHint("Listening…");
    try {
      recognition.start();
    } catch {
      setListening(false);
      setHint("Microphone is busy. Wait a moment and try again.");
    }
  };

  if (location.pathname === "/kitchen") return null;

  const bookingActive = pending === "book_table" || BOOKING_STEPS.some((step) => slots[step.key]);

  return (
    <>
      <button
        type="button"
        className={`voice_float ${listening ? "listening" : ""}`}
        onClick={() => {
          setOpen(true);
          if (open) toggleListen();
        }}
        aria-label={listening ? "Stop listening" : "Open concierge"}
      >
        <FaMicrophone />
      </button>
      {open && (
        <div className="voice_panel" role="dialog" aria-label="Restaurant concierge">
          <header>
            <div>
              <strong>Concierge</strong>
              <span>
                {listening ? "Listening" : busy ? "Checking the kitchen…" : "Ayush Restaurant · CP"}
              </span>
            </div>
            <div className="voice_header_actions">
              <button type="button" className="voice_text_btn" onClick={resetChat}>
                New
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <IoClose />
              </button>
            </div>
          </header>
          {bookingActive && (
            <ol className="voice_steps">
              {BOOKING_STEPS.map((step) => (
                <li key={step.key} className={slots[step.key] ? "done" : ""}>
                  {step.label}
                </li>
              ))}
            </ol>
          )}
          <div className="voice_log" ref={listRef}>
            {lines.map((line, index) => (
              <p key={`${line.role}-${index}`} className={line.role}>
                {line.text}
                {line.whatsapp ? (
                  <>
                    {" "}
                    <a href={line.whatsapp} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </>
                ) : null}
              </p>
            ))}
            {hint ? <p className="hint">{hint}</p> : null}
          </div>
          {!bookingActive && lines.length < 4 && (
            <div className="voice_chips">
              {SUGGESTIONS.map((item) => (
                <button key={item} type="button" onClick={() => send(item)}>
                  {item}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(draft);
            }}
          >
            <button
              type="button"
              className={listening ? "listening" : ""}
              onClick={toggleListen}
              aria-label="Start voice"
            >
              <FaMicrophone />
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message"
            />
            <button type="submit" disabled={busy} aria-label="Send">
              <IoSend />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default VoiceConcierge;

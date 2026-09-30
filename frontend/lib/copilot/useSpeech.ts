import { useCallback, useEffect, useRef, useState } from "react";

interface ResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface ResultEventLike {
  resultIndex: number;
  results: ArrayLike<ResultLike>;
}
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: ResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => RecognitionLike;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_TEXT: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in the browser and try again.",
  "service-not-allowed": "Microphone access was blocked. Allow it in the browser and try again.",
  "no-speech": "I did not hear anything. Try again.",
  "audio-capture": "No microphone was found.",
  network: "The browser speech service could not be reached.",
};

// Speech to text with the browser's built-in recognition (Chrome, Edge, Safari).
export function useSpeech(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<RecognitionLike | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  useEffect(() => {
    setSupported(getCtor() !== null);
    return () => recRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    setInterim("");
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    let heard = "";
    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
        if (event.results[i].isFinal) heard = text;
      }
      setInterim(text);
    };
    rec.onerror = (event) => {
      setError(ERROR_TEXT[event.error] ?? "Voice input stopped because of an error.");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      if (heard.trim()) finalRef.current(heard.trim());
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Voice input could not start.");
    }
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  return { supported, listening, interim, error, start, stop };
}

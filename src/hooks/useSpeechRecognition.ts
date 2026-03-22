"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
};

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor():
  | (new () => RecognitionInstance)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionInstance;
    webkitSpeechRecognition?: new () => RecognitionInstance;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * ブラウザの音声認識（Web Speech API）。Chrome / Edge で利用しやすい。
 * 確定した発話（isFinal）だけ onFinal に渡す。
 */
export function useSpeechRecognition(
  onFinal: (text: string) => void,
  lang = "en-US"
) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<RecognitionInstance | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    stop();
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: SpeechResultEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const t = result[0]?.transcript?.trim();
          if (t) onFinalRef.current(t);
        }
      }
    };
    rec.onerror = () => {
      setIsListening(false);
    };
    rec.onend = () => {
      recRef.current = null;
      setIsListening(false);
    };
    recRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [lang, stop]);

  useEffect(() => () => stop(), [stop]);

  return { supported, isListening, start, stop };
}

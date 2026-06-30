import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '../supabaseClient';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

interface UseVoiceManagerProps {
  activeBusinessId: string;
  onCommandParsed?: (parsedData: any) => void;
}

interface UseVoiceManagerResult {
  state: VoiceState;
  waveRef: React.RefObject<HTMLDivElement | null>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
}

export function useVoiceManager(props: UseVoiceManagerProps): UseVoiceManagerResult {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const stopListening = useCallback(() => {
    setState((prev) => (prev === 'listening' ? 'processing' : prev));
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setState('listening');

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Voice recognition is not supported in this browser.');
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        if (waveRef.current) waveRef.current.style.transform = 'scaleY(2)';
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        const cleanTranscript = String(transcript || "").trim();

        if (waveRef.current) waveRef.current.style.transform = 'scaleY(1)';
        setState('processing');

        if (!cleanTranscript) {
          console.warn("Voice command skipped: empty transcript");
          setError("Please speak or enter a command first.");
          setState('idle');
          return;
        }

        const payload = {
          transcript: cleanTranscript,
          command: cleanTranscript,
          text: cleanTranscript,
          userId: null,
          businessId: props.activeBusinessId || "default",
          source: "voice-manager",
          timestamp: new Date().toISOString()
        };

        console.log("parse-voice-command payload:", payload);

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.functions.invoke("parse-voice-command", {
          body: payload
        });

        if (error) {
          console.error("parse-voice-command failed:", { error, payload });
          setError("AI service is currently unavailable.");
          setState('error');
          setTimeout(() => {
            setState('idle');
            setError(null);
          }, 4000);
          return;
        }

        setState('success');
        if (props.onCommandParsed) {
          props.onCommandParsed(data);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error !== 'aborted') {
          setError(`Microphone error: ${event.error}`);
          setState('error');
        }
        if (waveRef.current) waveRef.current.style.transform = 'scaleY(1)';
      };

      recognition.onend = () => {
        if (state === 'listening') {
          setState('idle');
        }
        if (waveRef.current) waveRef.current.style.transform = 'scaleY(1)';
      };

      recognition.start();

    } catch (err: any) {
      console.error('Microphone initialization failed:', err);
      setError(err.message || 'Failed to initialize microphone');
      setState('error');
    }
  }, [props.activeBusinessId, props.onCommandParsed, state]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    waveRef,
    startListening,
    stopListening,
    error,
  };
}

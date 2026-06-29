import { useState, useEffect, useRef, useCallback } from 'react';
import { encodeWAV, sendVoiceToAI } from '../services/voiceProcessing';


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

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const cleanupAudioGraph = useCallback(async () => {
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.port.close();
        workletNodeRef.current.disconnect();
      } catch (e) {
        console.warn('Error releasing worklet node resources', e);
      }
      workletNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        console.warn('Error disconnecting audio source node', e);
      }
      sourceNodeRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioCtxRef.current) {
      if (audioCtxRef.current.state !== 'closed') {
        try {
          await audioCtxRef.current.close();
        } catch (e) {
          console.warn('Error closing AudioContext gracefully', e);
        }
      }
      audioCtxRef.current = null;
    }

    if (waveRef.current) {
      waveRef.current.style.transform = 'scaleY(1)';
    }
  }, []);

  const stopListening = useCallback(() => {
    setState((prev) => (prev === 'listening' ? 'processing' : prev));
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ command: 'STOP_RECORDING' });
    } else {
      cleanupAudioGraph();
    }
  }, [cleanupAudioGraph]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setState('listening');

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser.');
      }
      
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      await audioCtx.audioWorklet.addModule('/processor.js');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const workletNode = new AudioWorkletNode(audioCtx, 'voice-processor');
      workletNodeRef.current = workletNode;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      workletNode.port.onmessage = async (event: MessageEvent<any>) => {
        if (event.data.type === 'AUDIO_DATA') {
          try {
            const chunks = event.data.data;
            const sampleRate = audioCtxRef.current?.sampleRate || 44100;
            const audioBlob = encodeWAV(chunks, sampleRate);
            
            // Edge Function Call
            const parsedResponse = await sendVoiceToAI(audioBlob, props.activeBusinessId);
            
            setState('success');
            if (props.onCommandParsed) {
              props.onCommandParsed(parsedResponse);
            }
          } catch (err: any) {
            console.error('AI Processing Failed:', err);
            setError(err.message || 'Failed to parse voice command');
            setState('error');
          }
          await cleanupAudioGraph();
          return;
        }
        
        const { volume } = event.data;
        
        if (waveRef.current && audioCtxRef.current?.state === 'running') {
          const scaleFactor = 1 + volume * 10; 
          
          requestAnimationFrame(() => {
            if (waveRef.current) {
              waveRef.current.style.transform = `scaleY(${Math.min(scaleFactor, 3)})`;
            }
          });
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioCtx.destination);

    } catch (err: any) {
      console.error('Microphone initialization failed:', err);
      setError(err.message || 'Failed to initialize microphone');
      setState('error');
      await cleanupAudioGraph();
    }
  }, [cleanupAudioGraph]);

  useEffect(() => {
    return () => {
      cleanupAudioGraph();
    };
  }, [cleanupAudioGraph]);

  return {
    state,
    waveRef,
    startListening,
    stopListening,
    error,
  };
}

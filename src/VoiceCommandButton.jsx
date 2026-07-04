import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { parseVoiceCommand } from './accounting.js';

export default function VoiceCommandButton({ onCommandRecognized, existingParties = [] }) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      const parsed = parseVoiceCommand(text, existingParties);
      
      const isBank = /\b(bank|upi|online|card|rtgs|neft)\b/i.test(text);
      
      onCommandRecognized({
        originalText: text,
        ...parsed,
        isBank
      });
      
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (event.error !== 'no-speech') {
        setError('Voice error: ' + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [existingParties, onCommandRecognized]);

  const toggleListening = () => {
    if (!supported) {
      setError('Voice commands not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!supported && !error) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', margin: '8px 0 16px 0' }}>
      {/* This is browser Web Speech API voice command, not AI. */}
      <button
        type="button"
        onClick={toggleListening}
        className={isListening ? "danger-button" : "primary-button"}
        style={{ 
          width: 'auto', 
          minHeight: '40px', 
          padding: '8px 16px', 
          margin: 0, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          borderRadius: '8px'
        }}
        title="Use Voice Command (Local Browser API)"
      >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        {isListening ? 'Listening...' : 'Use Voice Command'}
      </button>
      {error && (
        <span style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={14} /> {error}
        </span>
      )}
    </div>
  );
}

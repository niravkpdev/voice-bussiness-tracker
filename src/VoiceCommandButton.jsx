import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { parseVoiceCommand } from './accounting.js';

export default function VoiceCommandButton({ 
  onCommandRecognized, 
  existingParties = [],
  isIconOnly = false,
  className = '',
  containerClassName = ''
}) {
  if (import.meta.env.VITE_ENABLE_VOICE_ASSISTANT !== 'true') {
    return null;
  }
  const [isListening, setIsListening] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [error, setError] = useState('');
  const [successText, setSuccessText] = useState('');
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
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setLiveText('');
      setError('');
      setSuccessText('');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const spoken = (finalTranscript || interim).trim();
      if (spoken) {
        setLiveText(spoken);
      }

      if (finalTranscript && finalTranscript.trim().length > 0) {
        const textToProcess = finalTranscript.trim();
        const parsed = parseVoiceCommand(textToProcess, existingParties);
        const isBank = /\b(bank|upi|online|card|rtgs|neft)\b/i.test(textToProcess);
        
        setSuccessText(`Recognized: "${textToProcess}"`);
        
        setTimeout(() => {
          onCommandRecognized({
            originalText: textToProcess,
            ...parsed,
            isBank
          });
          setIsListening(false);
          setTimeout(() => {
            setSuccessText('');
            setLiveText('');
          }, 2500);
        }, 400);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition notice:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access blocked. Please allow mic permission in your browser settings.');
      } else if (event.error !== 'no-speech') {
        setError('Voice notice: ' + event.error);
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
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
    } else {
      setError('');
      setLiveText('');
      setSuccessText('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error(err);
        try {
          recognitionRef.current?.stop();
          setTimeout(() => recognitionRef.current?.start(), 150);
        } catch (e) {}
      }
    }
  };

  if (!supported && !error && !isIconOnly) {
    return null;
  }

  // FLOATING CIRCULAR MIC BUTTON (Corner of website, stays visible while scrolling)
  if (isIconOnly) {
    return (
      <div 
        className={`global-floating-mic-wrap ${containerClassName}`} 
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          pointerEvents: 'none'
        }}
      >
        {/* Floating Speech Feedback Card */}
        {(isListening || error || liveText || successText) && (
          <div
            style={{
              pointerEvents: 'auto',
              marginBottom: '14px',
              width: '320px',
              maxWidth: 'calc(100vw - 44px)',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(0,0,0,0.08)',
              border: error ? '1.5px solid #fca5a5' : (successText ? '1.5px solid #86efac' : '1.5px solid #cbd5e1'),
              animation: 'slideUpFade 0.2s ease-out',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isListening ? (
                  <span style={{ display: 'inline-flex', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'micPulseDot 1s infinite' }} />
                ) : (
                  successText ? <CheckCircle2 size={16} color="#16a34a" /> : <Sparkles size={16} color="#5b4fe9" />
                )}
                <strong style={{ fontSize: '13px', color: error ? '#b91c1c' : (successText ? '#15803d' : '#0f172a') }}>
                  {error ? 'Microphone Notice' : (successText ? 'Command Processed' : (isListening ? 'Listening... Speak now' : 'Voice Assistant'))}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => { setError(''); setLiveText(''); setSuccessText(''); if (isListening) recognitionRef.current?.stop(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px', display: 'flex', alignItems: 'center' }}
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            {error ? (
              <div style={{ fontSize: '12.5px', color: '#dc2626', lineHeight: 1.4 }}>
                {error}
              </div>
            ) : (
              <>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: liveText ? '#0f172a' : '#64748b', fontStyle: liveText ? 'normal' : 'italic', fontWeight: liveText ? 600 : 400 }}>
                    {liveText || 'Listening for speech (e.g. "Add payment 500 cash for tea")'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>Try: <em>"Sales 1200 Ramesh"</em> or <em>"Received 5000 bank Rahul"</em></span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Circular Mic Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`floating-mic-btn ${isListening ? 'listening' : ''} ${className}`}
          style={{
            pointerEvents: 'auto',
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: isListening 
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
              : 'linear-gradient(135deg, #5b4fe9 0%, #4338ca 100%)',
            border: '2.5px solid rgba(255, 255, 255, 0.35)',
            boxShadow: isListening 
              ? '0 0 0 8px rgba(239, 68, 68, 0.25), 0 12px 28px rgba(220, 38, 38, 0.45)' 
              : '0 8px 24px rgba(91, 79, 233, 0.42), 0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: 0,
            outline: 'none',
            flexShrink: 0
          }}
          title={isListening ? 'Click to stop listening' : 'Voice Command Bookkeeper (Click & Speak)'}
          aria-label="Voice Command Mic"
        >
          {isListening ? (
            <MicOff size={26} color="#ffffff" strokeWidth={2.3} />
          ) : (
            <Mic size={26} color="#ffffff" strokeWidth={2.3} />
          )}
        </button>
      </div>
    );
  }

  // INLINE BUTTON (used in Voucher Entry and Phase3Ops)
  return (
    <div className={containerClassName} style={containerClassName ? {} : { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', margin: '8px 0 16px 0' }}>
      <button
        type="button"
        onClick={toggleListening}
        className={`${isListening ? "danger-button" : "primary-button"} ${className}`}
        style={{ 
          width: 'auto', 
          minHeight: '40px', 
          padding: '8px 16px', 
          margin: 0, 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px',
          borderRadius: '8px',
          background: isListening ? '#dc2626' : '#5b4fe9',
          color: '#ffffff',
          fontWeight: 650,
          fontSize: '13.5px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: isListening ? '0 4px 12px rgba(220,38,38,0.3)' : '0 4px 12px rgba(91,79,233,0.3)'
        }}
        title="Use Voice Command (Local Browser Speech Recognition)"
      >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        {isListening ? (liveText || 'Listening...') : 'Use Voice Command'}
      </button>
      {error && (
        <span style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={14} /> {error}
        </span>
      )}
    </div>
  );
}

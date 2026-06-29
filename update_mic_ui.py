import re

with open('src/VoiceExpenseTrackerPreview.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Import
import_statement = "import { useVoiceManager } from './hooks/useVoiceManager';\n"
if 'useVoiceManager' not in content:
    # insert after standard imports
    content = re.sub(
        r"(import React,.*?from 'react';)", 
        r"\1\n" + import_statement, 
        content,
        count=1
    )

# 2. Inject hook invocation
hook_invocation = "  const { state, waveRef, startListening, stopListening, error } = useVoiceManager();\n"
if 'useVoiceManager()' not in content:
    content = re.sub(
        r"(export default function VoiceExpenseTrackerPreview\(\) \{[\s\S]*?const \[aiQuestion, setAiQuestion\] = useState\(''\);)", 
        r"\1\n" + hook_invocation, 
        content,
        count=1
    )

# 3. Replace Floating Mic Button
old_mic_pattern = r"\{\/\*\s*Floating Microphone Action Button\s*\*\/\}.*?</button>"
new_mic_ui = """{/* High-Performance Voice Manager Widget */}
      <div className="voice-manager-widget" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        {state === 'idle' && (
          <div className="voice-prompt" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            Tap mic to speak
          </div>
        )}
        {state === 'error' && (
          <div className="voice-error" style={{ color: 'red', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            {error || 'Error accessing microphone'}
          </div>
        )}
        <button 
          className="floating-mic-btn"
          disabled={state === 'processing'}
          onClick={() => {
            if (state === 'listening') {
              stopListening();
            } else {
              startListening();
              startVoiceRecognition();
            }
          }}
          type="button"
          style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)', cursor: state === 'processing' ? 'not-allowed' : 'pointer', position: 'relative' }}
        >
          {state === 'idle' && <span className="mic-icon" style={{ fontSize: '24px' }}>🎤</span>}
          {state === 'listening' && (
            <div 
              ref={waveRef} 
              style={{ width: '20px', height: '4px', background: 'white', borderRadius: '2px', transition: 'transform 0.05s ease-out', transformOrigin: 'center' }} 
            />
          )}
          {state === 'processing' && (
            <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          )}
        </button>
      </div>"""

content = re.sub(old_mic_pattern, new_mic_ui, content, flags=re.DOTALL)

with open('src/VoiceExpenseTrackerPreview.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated VoiceExpenseTrackerPreview.jsx successfully")

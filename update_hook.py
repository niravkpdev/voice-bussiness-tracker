import re

with open('src/hooks/useVoiceManager.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_stmt = "import { encodeWAV, sendVoiceToAI } from '../services/voiceProcessing';\n"
if 'sendVoiceToAI' not in content:
    content = re.sub(r"(import .*? from 'react';)", r"\1\n" + import_stmt, content)

# Modify interface
new_interface = """interface UseVoiceManagerProps {
  activeBusinessId: string;
  onCommandParsed?: (parsedData: any) => void;
}

interface UseVoiceManagerResult {"""
if 'UseVoiceManagerProps' not in content:
    content = re.sub(r"interface UseVoiceManagerResult \{", new_interface, content)

# Modify function signature
if 'export function useVoiceManager(props: UseVoiceManagerProps)' not in content:
    content = re.sub(
        r"export function useVoiceManager\(\): UseVoiceManagerResult \{", 
        r"export function useVoiceManager(props: UseVoiceManagerProps): UseVoiceManagerResult {", 
        content
    )

# Modify the onmessage handler to catch AUDIO_DATA
# Current onmessage:
#      workletNode.port.onmessage = (event: MessageEvent<{ volume: number }>) => {
#        const { volume } = event.data;
#        
#        if (waveRef.current && audioCtxRef.current?.state === 'running') {

new_onmessage = """      workletNode.port.onmessage = async (event: MessageEvent<any>) => {
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
        
        if (waveRef.current && audioCtxRef.current?.state === 'running') {"""

if "event.data.type === 'AUDIO_DATA'" not in content:
    content = re.sub(
        r"      workletNode\.port\.onmessage = \(event: MessageEvent<\{ volume: number \}>\) => \{\n        const \{ volume \} = event\.data;\n        \n        if \(waveRef\.current && audioCtxRef\.current\?\.state === 'running'\) \{",
        new_onmessage,
        content
    )

# Modify stopListening to trigger the dump instead of just cleanup
new_stop_listening = """  const stopListening = useCallback(() => {
    setState((prev) => (prev === 'listening' ? 'processing' : prev));
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ command: 'STOP_RECORDING' });
    } else {
      cleanupAudioGraph();
    }
  }, [cleanupAudioGraph]);"""

content = re.sub(
    r"  const stopListening = useCallback\(async \(\) => \{\n    setState\(\(prev\) => \(prev === 'listening' \? 'processing' : prev\)\);\n    await cleanupAudioGraph\(\);\n  \}, \[cleanupAudioGraph\]\);",
    new_stop_listening,
    content
)

with open('src/hooks/useVoiceManager.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated useVoiceManager hook successfully")

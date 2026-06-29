import { getSupabaseClient } from '../supabaseClient';

/**
 * Encodes an array of Float32Array PCM chunks into a standard 16-bit WAV Blob.
 */
export function encodeWAV(chunks: Float32Array[], sampleRate: number): Blob {
  // Calculate total length of all chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  
  // Create a buffer for the WAV file (44 bytes header + PCM data)
  const buffer = new ArrayBuffer(44 + totalLength * 2);
  const view = new DataView(buffer);

  // RIFF Chunk Descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + totalLength * 2, true); // File size
  writeString(view, 8, 'WAVE');

  // FMT Sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 for Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample

  // Data Sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, totalLength * 2, true); // Subchunk2Size

  // Write PCM samples (16-bit)
  let offset = 44;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    for (let j = 0; j < chunk.length; j++) {
      // Clamp values between -1 and 1 before multiplying
      const s = Math.max(-1, Math.min(1, chunk[j]));
      // Convert 32-bit float to 16-bit integer
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Sends a standard WAV blob to the Supabase Edge Function for NLP parsing.
 */
export async function sendVoiceToAI(audioBlob: Blob, activeBusinessId: string): Promise<any> {
  const supabase = getSupabaseClient();
  
  const formData = new FormData();
  formData.append('audio', audioBlob, 'voice-command.wav');
  formData.append('businessId', activeBusinessId);

  const { data, error } = await supabase.functions.invoke('parse-voice-command', {
    body: formData,
  });

  if (error) {
    throw error;
  }

  return data;
}

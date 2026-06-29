class VoiceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.audioChunks = [];
    this.isRecording = true; // Default to recording, controlled by lifecycle if needed

    this.port.onmessage = (event) => {
      if (event.data.command === 'STOP_RECORDING' || event.data.command === 'EXPORT') {
        // Send collected audio data back to main thread
        this.port.postMessage({ type: 'AUDIO_DATA', data: this.audioChunks });
        // Clear the array for the next session
        this.audioChunks = [];
      } else if (event.data.command === 'START_RECORDING') {
        this.audioChunks = [];
        this.isRecording = true;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const channelData = input[0];
      
      // Store a clone of the Float32Array buffer because the Web Audio API 
      // reuses the original buffer on subsequent frames
      if (this.isRecording) {
        this.audioChunks.push(new Float32Array(channelData));
      }

      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);
      
      this.port.postMessage({ type: 'VOLUME', volume: rms });
    }
    
    return true;
  }
}

registerProcessor('voice-processor', VoiceProcessor);

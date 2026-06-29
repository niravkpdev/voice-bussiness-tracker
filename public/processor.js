class VoiceProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Check if we have audio channels in the input
    if (input.length > 0) {
      const channelData = input[0];
      let sum = 0;
      
      // Compute the Root Mean Square (RMS) volume for the chunk
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);
      
      // Post the volume metric back to the main thread
      this.port.postMessage({ volume: rms });
    }
    
    // Keep the processor alive
    return true;
  }
}

registerProcessor('voice-processor', VoiceProcessor);

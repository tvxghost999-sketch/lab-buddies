// Client-side voice activity analyser using Web Audio API

const isDev = process.env.NODE_ENV !== 'production';
const log = (...args: any[]) => {
  if (isDev) {
    console.log('[Voice Analyser]', ...args);
  }
};

export const createAudioAnalyser = (
  stream: MediaStream,
  onSpeakingChange: (isSpeaking: boolean) => void,
  threshold = 10, // Average volume threshold (0-255)
  intervalMs = 120
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      log('Web Audio API is not supported in this browser.');
      return () => {};
    }

    // Verify the stream has audio tracks
    if (stream.getAudioTracks().length === 0) {
      log('No audio tracks found in stream.');
      return () => {};
    }

    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;

    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let isSpeaking = false;
    let silenceCounter = 0;

    const interval = setInterval(() => {
      if (audioContext.state === 'suspended') {
        // Try to resume if it was suspended (browser autoplay policy)
        audioContext.resume().catch(() => {});
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      // Check average frequency volume
      let sum = 0;
      let activeBins = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
        if (dataArray[i] > 0) activeBins++;
      }
      
      const average = bufferLength > 0 ? sum / bufferLength : 0;
      
      // We consider speaking if average level is above threshold
      const isVoiceActive = average > threshold;

      if (isVoiceActive) {
        silenceCounter = 0;
        if (!isSpeaking) {
          isSpeaking = true;
          onSpeakingChange(true);
        }
      } else {
        silenceCounter++;
        // Require a few consecutive silent frames before declaring silence to prevent flicker
        if (silenceCounter >= 3 && isSpeaking) {
          isSpeaking = false;
          onSpeakingChange(false);
        }
      }
    }, intervalMs);

    // Return cleanup closure
    return () => {
      log('Cleaning up audio analyser for stream:', stream.id);
      clearInterval(interval);
      try {
        source.disconnect();
        analyser.disconnect();
        if (audioContext.state !== 'closed') {
          audioContext.close().catch((err) => {
            if (isDev) console.error('[Voice Analyser] Error closing audio context:', err);
          });
        }
      } catch (e) {
        if (isDev) console.error('[Voice Analyser] Exception during cleanup:', e);
      }
    };
  } catch (err) {
    if (isDev) console.error('[Voice Analyser] Failed to initialize audio analyser:', err);
    return () => {};
  }
};

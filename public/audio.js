// Web Audio API handler for browser-to-app audio calls
let audioCtx = null;
let micStream = null;
let micSource = null;
let processor = null;
let playbackCtx = null;
let isAudioRunning = false;
let isMuted = false;

// Use 256 instead of 320 - must be power of 2 for ScriptProcessorNode
const FRAME_SIZE = 256;
const SAMPLE_RATE = 16000;

async function startWebAudio(socket) {
  if (isAudioRunning) return true;
  
  try {
    // Request microphone with exact sample rate
    micStream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        sampleRate: SAMPLE_RATE, 
        channelCount: 1, 
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }, 
      video: false 
    });
    
    // Create audio context for capture at 16kHz
    audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    micSource = audioCtx.createMediaStreamSource(micStream);
    processor = audioCtx.createScriptProcessor(FRAME_SIZE, 1, 1);
    
    // Capture audio and send
    processor.onaudioprocess = (e) => {
      if (isMuted) return;
      
      const floatData = e.inputBuffer.getChannelData(0);
      // Convert float32 (-1 to 1) to int16
      const int16Data = new Int16Array(floatData.length);
      for (let i = 0; i < floatData.length; i++) {
        int16Data[i] = Math.max(-32768, Math.min(32767, floatData[i] * 32768));
      }
      
      if (socket) {
        socket.emit('audio-data', { 
          type: 'raw-pcm',
          data: Array.from(int16Data),
          sampleRate: SAMPLE_RATE,
          timestamp: Date.now() 
        });
      }
    };
    
    micSource.connect(processor);
    processor.connect(audioCtx.destination);
    
    // Create playback context
    playbackCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    
    isAudioRunning = true;
    console.log('[WebAudio] Started successfully');
    return true;
  } catch (err) {
    console.error('[WebAudio] Start failed:', err);
    return false;
  }
}

function stopWebAudio() {
  isAudioRunning = false;
  
  if (processor) {
    processor.onaudioprocess = null;
    processor.disconnect();
    processor = null;
  }
  if (micSource) {
    micSource.disconnect();
    micSource = null;
  }
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
  if (playbackCtx) {
    playbackCtx.close();
    playbackCtx = null;
  }
  console.log('[WebAudio] Stopped');
}

function muteWebAudio(muted) {
  isMuted = muted;
}

// Play incoming PCM data using AudioBuffer
let nextPlayTime = 0;
const MAX_QUEUE = 10;
let playQueue = [];

function playPCM(pcmArray, sampleRate = 16000) {
  if (!playbackCtx) return;
  
  try {
    // Queue the audio data
    playQueue.push(pcmArray);
    if (playQueue.length > MAX_QUEUE) playQueue.shift();
    
    // Schedule playback
    const now = playbackCtx.currentTime;
    if (nextPlayTime < now) nextPlayTime = now + 0.05;
    
    while (playQueue.length > 0) {
      const data = playQueue.shift();
      const buffer = playbackCtx.createBuffer(1, data.length, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      for (let i = 0; i < data.length; i++) {
        channelData[i] = data[i] / 32768;
      }
      
      const source = playbackCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(playbackCtx.destination);
      source.start(nextPlayTime);
      nextPlayTime += buffer.duration;
    }
  } catch (e) {
    console.error('[WebAudio] Playback error:', e);
  }
}

// Export for use in main script
window.WebAudio = { 
  start: startWebAudio, 
  stop: stopWebAudio, 
  mute: muteWebAudio,
  play: playPCM 
};

// Web Audio API handler - SINGLE SHARED CONTEXT
let audioCtx = null;
let micStream = null;
let micSource = null;
let processor = null;
let isAudioRunning = false;
let isMuted = false;

const FRAME_SIZE = 256;
const SAMPLE_RATE = 16000;

// Single shared playback context - NEVER recreate
let playbackCtx = null;

function getPlaybackCtx() {
  if (!playbackCtx) {
    playbackCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
  }
  if (playbackCtx.state === 'suspended') {
    playbackCtx.resume();
  }
  return playbackCtx;
}

async function startWebAudio(socket) {
  if (isAudioRunning) return true;
  
  try {
    // Request microphone
    micStream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        sampleRate: SAMPLE_RATE, 
        channelCount: 1, 
        echoCancellation: true,
        noiseSuppression: true
      }, 
      video: false 
    });
    
    // Create capture context
    audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    micSource = audioCtx.createMediaStreamSource(micStream);
    processor = audioCtx.createScriptProcessor(FRAME_SIZE, 1, 1);
    
    // Capture and send
    processor.onaudioprocess = (e) => {
      if (isMuted) return;
      
      const floatData = e.inputBuffer.getChannelData(0);
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
    
    // Initialize playback context once
    getPlaybackCtx();
    
    isAudioRunning = true;
    console.log('[WebAudio] Started');
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
  // DON'T close playbackCtx - keep it alive
  console.log('[WebAudio] Stopped capture, playback kept alive');
}

function muteWebAudio(muted) {
  isMuted = muted;
}

// Simple playback - just queue and play
let playQueue = [];
let isPlaying = false;

function playPCM(pcmArray, sampleRate = 16000) {
  const ctx = getPlaybackCtx();
  if (!ctx) return;
  
  try {
    // Convert to float32
    const floatData = new Float32Array(pcmArray.length);
    for (let i = 0; i < pcmArray.length; i++) {
      floatData[i] = pcmArray[i] / 32768;
    }
    
    // Create buffer
    const buffer = ctx.createBuffer(1, floatData.length, sampleRate);
    buffer.getChannelData(0).set(floatData);
    
    // Play immediately
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    
    console.log('[WebAudio] Played', pcmArray.length, 'samples');
  } catch (e) {
    console.error('[WebAudio] Playback error:', e);
  }
}

window.WebAudio = { 
  start: startWebAudio, 
  stop: stopWebAudio, 
  mute: muteWebAudio,
  play: playPCM 
};

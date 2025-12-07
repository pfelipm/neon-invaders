
// Simple synthesizer for retro sound effects
const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;

export const initAudio = () => {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
};

const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1, slide = 0) => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide !== 0) {
    osc.frequency.exponentialRampToValueAtTime(freq + slide, ctx.currentTime + duration);
  }

  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

const playNoise = (duration: number, vol: number = 0.1) => {
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  
  noise.connect(gain);
  gain.connect(ctx.destination);
  noise.start();
};

export const playShoot = () => playTone(880, 'square', 0.1, 0.05, -400);
export const playEnemyShoot = () => playTone(200, 'sawtooth', 0.2, 0.05, -50);
export const playHomingLaunch = () => playTone(150, 'sine', 0.3, 0.08, 100);
export const playLaserSweep = () => playTone(600, 'sawtooth', 0.05, 0.05, -300);
export const playExplosion = () => playNoise(0.3, 0.2);
export const playPowerUp = () => {
  if (!ctx) return;
  playTone(440, 'sine', 0.1, 0.1);
  setTimeout(() => playTone(554, 'sine', 0.1, 0.1), 100);
  setTimeout(() => playTone(659, 'sine', 0.2, 0.1), 200);
};
export const playShieldActivate = () => {
  if (!ctx) return;
  playTone(200, 'sine', 0.1, 0.1);
  setTimeout(() => playTone(300, 'sine', 0.1, 0.1, 50), 50);
  setTimeout(() => playTone(500, 'square', 0.3, 0.05, -100), 150);
};
export const playBossHit = () => playTone(100, 'sawtooth', 0.1, 0.1, -20);
export const playGameOver = () => {
    if (!ctx) return;
    playTone(300, 'sawtooth', 0.5, 0.2, -200);
    setTimeout(() => playTone(200, 'sawtooth', 0.5, 0.2, -150), 400);
    setTimeout(() => playTone(100, 'sawtooth', 1.0, 0.2, -90), 800);
};
export const playLevelUp = () => {
    playTone(440, 'square', 0.1, 0.1);
    setTimeout(() => playTone(880, 'square', 0.1, 0.1), 150);
    setTimeout(() => playTone(1760, 'square', 0.4, 0.1), 300);
};
export const playBossWarning = () => {
    if (!ctx) return;
    // Siren loop
    const now = ctx.currentTime;
    for(let i = 0; i < 4; i++) {
        const t = i * 0.8;
        setTimeout(() => {
           playTone(300, 'sawtooth', 0.4, 0.3, 300); // Low to High
        }, t * 1000);
        setTimeout(() => {
           playTone(600, 'sawtooth', 0.4, 0.3, -300); // High to Low
        }, (t + 0.4) * 1000);
    }
};

// New Laser Sounds
export const playChargeTick = (progress: number) => {
    if (!ctx) return;
    // Pitch rises with charge
    const freq = 200 + (progress * 800);
    playTone(freq, 'triangle', 0.05, 0.05);
}

export const playLaserBlast = (powerLevel: number) => {
    if (!ctx) return;
    // Heavy, long beam sound
    // powerLevel is 0 to 1
    playTone(100 - (powerLevel * 50), 'sawtooth', 0.4, 0.3); 
    playNoise(0.3 + (powerLevel * 0.2), 0.2);
    // High pitch zap overlay
    playTone(1000, 'square', 0.1, 0.1, -800);
};
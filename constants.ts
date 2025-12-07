
export const PLAYER_SPEED = 6;
export const BULLET_SPEED = 8;
export const ENEMY_BULLET_SPEED = 4;
export const FIRE_COOLDOWN = 25; // Frames
export const ENEMY_DROP_DISTANCE = 20;
export const PARTICLE_LIFE = 40;

// New Constants
export const BOSS_LEVEL_INTERVAL = 3; // Boss appears every 3 levels
export const POWERUP_DROP_RATE = 0.15; // 15% chance
export const POWERUP_DURATION = 600; // ~10 seconds at 60fps
export const RAPID_FIRE_COOLDOWN = 8;

// Laser Constants
export const MAX_CHARGE_FRAMES = 90; // 1.5 seconds for max charge
export const LASER_MIN_WIDTH = 8;
export const LASER_MAX_WIDTH = 80;

export const COLORS = {
  PLAYER: '#22d3ee', // Cyan-400
  PLAYER_SHIELD: '#3b82f6', // Blue-500
  PLAYER_BULLET: '#67e8f9', // Cyan-300
  
  // Original Enemies
  ENEMY_SQUID: '#f472b6', // Pink-400
  ENEMY_CRAB: '#a78bfa', // Violet-400
  ENEMY_OCTOPUS: '#34d399', // Emerald-400
  ENEMY_UFO: '#ef4444', // Red-500
  ENEMY_BOSS: '#db2777', // Pink-600
  
  // Boss Variants
  BOSS_GUARDIAN: '#db2777', // Pink-600
  BOSS_CONSTRUCT: '#d97706', // Amber-600
  BOSS_EYE: '#dc2626', // Red-600
  
  // New Enemies
  ENEMY_SPIDER: '#818cf8', // Indigo-400
  ENEMY_WORM: '#fbbf24', // Amber-400
  ENEMY_FLYER: '#a3e635', // Lime-400
  
  // Projectiles & Effects
  ENEMY_BULLET: '#f87171', // Red-400
  ENEMY_HOMING: '#f97316', // Orange-500
  ENEMY_LASER: '#e11d48', // Rose-600
  TEXT_NEON: '#e879f9',
  
  // Powerups
  POWERUP_RAPID: '#facc15', // Yellow
  POWERUP_SHIELD: '#60a5fa', // Blue
  POWERUP_MULTI: '#c084fc', // Purple
  POWERUP_LASER: '#fb7185', // Rose-400
  
  // Laser Beam
  CHARGED_BEAM_CORE: '#ffffff',
  CHARGED_BEAM_GLOW: '#f43f5e',
};

export const KEY_CODES = {
  LEFT: ['ArrowLeft', 'KeyA'],
  RIGHT: ['ArrowRight', 'KeyD'],
  SHOOT: ['Space', 'ArrowUp', 'KeyW'],
  PAUSE: ['Escape', 'KeyP'],
};
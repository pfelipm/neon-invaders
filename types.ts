
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  PAUSED = 'PAUSED',
  VICTORY = 'VICTORY', // Level complete
  BOSS_WARNING = 'BOSS_WARNING' // Boss approaching
}

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  dx: number;
  dy: number;
}

export interface Entity {
  id: string;
  pos: Position;
  width: number;
  height: number;
  color: string;
  active: boolean;
}

export type PowerUpType = 'RAPID_FIRE' | 'SHIELD' | 'MULTI_SHOT' | 'LASER';

export interface PowerUp extends Entity {
  type: PowerUpType;
  vel: Velocity;
}

export interface Player extends Entity {
  lives: number;
  cooldown: number;
  isShielded: boolean;
  activePowerUp?: PowerUpType;
  powerUpTimer: number;
  // Charging mechanics
  isCharging?: boolean;
  chargeLevel?: number;
}

export type BossAttackType = 'NONE' | 'SPREAD' | 'AIMED' | 'HOMING' | 'SWEEP';
export type BossVariant = 'GUARDIAN' | 'CONSTRUCT' | 'EYE';

export type EnemyType = 'SQUID' | 'CRAB' | 'OCTOPUS' | 'UFO' | 'BOSS' | 'SPIDER' | 'WORM' | 'FLYER';

export interface Enemy extends Entity {
  row: number;
  type: EnemyType;
  value: number;
  isBoss?: boolean;
  bossVariant?: BossVariant;
  maxHealth?: number;
  currentHealth?: number;
  currentAttack?: BossAttackType;
  attackFrame?: number;
  // Special enemy props
  baseY?: number; // For Worms/Spiders to track grid position while animating
  specialState?: 'IDLE' | 'ATTACKING' | 'RETURNING'; // For Spiders
  specialTimer?: number; // General timer
  vel?: Velocity;
}

export type BulletType = 'STANDARD' | 'HOMING' | 'LASER' | 'CHARGED_BEAM';

export interface Bullet extends Entity {
  owner: 'PLAYER' | 'ENEMY';
  vel: Velocity;
  bulletType?: BulletType;
  // For penetrating lasers
  penetration?: number; 
  damage?: number;
  hitIds?: Set<string>; // Track who has been hit to prevent multi-frame hits
}

export interface Particle extends Entity {
  vel: Velocity;
  life: number; // Frames remaining
  maxLife: number;
  alpha: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

export interface GameConfig {
  width: number;
  height: number;
}
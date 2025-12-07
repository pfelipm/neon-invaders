
import React, { useEffect, useRef, useCallback } from 'react';
import { 
  GameState, 
  Player, 
  Enemy, 
  Bullet, 
  Particle, 
  Star,
  PowerUp,
  PowerUpType,
  BossAttackType,
  EnemyType,
  BossVariant
} from '../types';
import { 
  PLAYER_SPEED, 
  BULLET_SPEED, 
  ENEMY_BULLET_SPEED, 
  FIRE_COOLDOWN, 
  ENEMY_DROP_DISTANCE, 
  PARTICLE_LIFE,
  COLORS,
  BOSS_LEVEL_INTERVAL,
  POWERUP_DROP_RATE,
  POWERUP_DURATION,
  RAPID_FIRE_COOLDOWN,
  MAX_CHARGE_FRAMES,
  LASER_MIN_WIDTH,
  LASER_MAX_WIDTH
} from '../constants';
import { 
  playShoot, 
  playEnemyShoot, 
  playExplosion, 
  playPowerUp, 
  playBossHit,
  playHomingLaunch,
  playLaserSweep,
  playShieldActivate,
  playChargeTick,
  playLaserBlast
} from '../services/audioService';

interface GameCanvasProps {
  gameState: GameState;
  score: number;
  setScore: (n: number) => void;
  setLives: (n: number) => void;
  onGameOver: () => void;
  onLevelComplete: () => void;
  onPlayerHit: () => void;
  level: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  score, 
  setScore, 
  setLives, 
  onGameOver, 
  onLevelComplete,
  onPlayerHit,
  level
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Calculate Difficulty Tier (0 for levels 1-3, 1 for 4-6, etc.)
  const difficultyTier = Math.max(0, Math.floor((level - 1) / BOSS_LEVEL_INTERVAL));

  // Game State Refs
  const playerRef = useRef<Player>({
    id: 'player',
    pos: { x: 380, y: 550 }, 
    width: 40,
    height: 30,
    color: COLORS.PLAYER,
    active: true,
    lives: 3,
    cooldown: 0,
    isShielded: false,
    powerUpTimer: 0,
    isCharging: false,
    chargeLevel: 0
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const starsRef = useRef<Star[]>([]);
  
  const enemyDirectionRef = useRef<number>(1);
  const keysPressed = useRef<Set<string>>(new Set());
  const frameCountRef = useRef<number>(0);
  const shakeRef = useRef<number>(0); 
  const levelCompleteTriggeredRef = useRef<boolean>(false);

  // --- Initialization ---
  
  const initStars = (width: number, height: number) => {
    const stars: Star[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        brightness: Math.random()
      });
    }
    starsRef.current = stars;
  };

  const initEnemies = (level: number, width: number) => {
    enemiesRef.current = []; 
    powerUpsRef.current = [];
    bulletsRef.current = [];
    levelCompleteTriggeredRef.current = false;

    // BOSS LEVEL
    if (level % BOSS_LEVEL_INTERVAL === 0) {
      // Scaling Boss Health: Base + Level Bonus + Tier Bonus (Big jump after each loop)
      const bossHealth = (level * 100) + (difficultyTier * 500);
      
      // Determine Boss Variant based on cycle
      const variantIdx = difficultyTier % 3;
      let variant: BossVariant = 'GUARDIAN';
      let bColor = COLORS.BOSS_GUARDIAN;
      let bWidth = 120;
      let bHeight = 80;

      if (variantIdx === 1) {
          variant = 'CONSTRUCT';
          bColor = COLORS.BOSS_CONSTRUCT;
          bWidth = 160;
          bHeight = 100;
      } else if (variantIdx === 2) {
          variant = 'EYE';
          bColor = COLORS.BOSS_EYE;
          bWidth = 100;
          bHeight = 100;
      }

      enemiesRef.current.push({
        id: `boss-${level}`,
        pos: { x: width / 2 - bWidth/2, y: 80 },
        width: bWidth,
        height: bHeight,
        color: bColor,
        active: true,
        row: 0,
        type: 'BOSS',
        value: 1000 * (difficultyTier + 1),
        isBoss: true,
        bossVariant: variant,
        maxHealth: bossHealth,
        currentHealth: bossHealth,
        currentAttack: 'NONE',
        attackFrame: 0
      });
      return;
    }

    // REGULAR LEVEL
    const rows = 4;
    const cols = 8;
    const startX = (width - (cols * 50)) / 2;
    const startY = 60;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type: EnemyType = 'SQUID';
        let color = COLORS.ENEMY_SQUID;
        let value = 10;
        let extraProps: Partial<Enemy> = {};

        // Determine Enemy Type based on row and level
        if (r === 0) { 
           type = 'OCTOPUS'; 
           color = COLORS.ENEMY_OCTOPUS; 
           value = 30; 
        } else if (r === 1) { 
           // Level 2+: Replace some Crabs with Spiders
           if (level >= 2 && (c % 2 === 0)) {
               type = 'SPIDER';
               color = COLORS.ENEMY_SPIDER;
               value = 40;
               extraProps = { specialState: 'IDLE', specialTimer: Math.random() * 200 };
           } else {
               type = 'CRAB'; 
               color = COLORS.ENEMY_CRAB; 
               value = 20; 
           }
        } else if (r === 2) { 
           // Level 3+: Replace row 2 with Worms
           if (level >= 3) {
               type = 'WORM';
               color = COLORS.ENEMY_WORM;
               value = 35;
           } else {
               type = 'SQUID'; 
               color = COLORS.ENEMY_SQUID; 
               value = 10; 
           }
        } else { 
           type = 'SQUID'; 
           color = COLORS.ENEMY_SQUID; 
           value = 10; 
        }

        enemiesRef.current.push({
          id: `e-${r}-${c}`,
          pos: { x: startX + c * 50, y: startY + r * 40 },
          baseY: startY + r * 40, // Track original grid Y for worms/spiders
          width: 30,
          height: 24,
          color,
          active: true,
          row: r,
          type,
          value: value + (difficultyTier * 5),
          ...extraProps
        });
      }
    }
    
    // Level 5+: Add Flyers (Independent of grid)
    if (level >= 4) {
       const flyerCount = Math.min(5, Math.ceil(level / 2)); // Increased max count
       // Faster flyers in higher tiers
       const flyerBaseSpeed = 2 + (difficultyTier * 0.5);
       
       for(let i=0; i<flyerCount; i++) {
          enemiesRef.current.push({
             id: `flyer-${i}`,
             pos: { x: Math.random() * (width - 50), y: 30 + Math.random() * 50 },
             width: 30,
             height: 20,
             color: COLORS.ENEMY_FLYER,
             active: true,
             row: -1,
             type: 'FLYER',
             value: 60 + (difficultyTier * 10),
             vel: { dx: (Math.random() > 0.5 ? flyerBaseSpeed : -flyerBaseSpeed), dy: 1 }
          });
       }
    }

    enemyDirectionRef.current = 1;
  };

  const createExplosion = (x: number, y: number, color: string, count = 10) => {
    playExplosion();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        id: Math.random().toString(),
        pos: { x, y },
        width: 3,
        height: 3,
        color: color,
        active: true,
        vel: { dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed },
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        alpha: 1
      });
    }
  };

  const spawnPowerUp = (x: number, y: number) => {
    if (Math.random() > POWERUP_DROP_RATE) return;
    
    const r = Math.random();
    // Adjusted Rarity Tiers:
    // 0.00 - 0.60: RAPID_FIRE (60%)
    // 0.60 - 0.85: MULTI_SHOT (25%)
    // 0.85 - 0.95: SHIELD (10%)
    // 0.95 - 1.00: LASER (5%) -> Updated to 5% as requested
    let type: PowerUpType = 'RAPID_FIRE';
    if (r > 0.60) type = 'MULTI_SHOT';
    if (r > 0.85) type = 'SHIELD';
    if (r > 0.95) type = 'LASER';

    const color = type === 'RAPID_FIRE' ? COLORS.POWERUP_RAPID : 
                  type === 'SHIELD' ? COLORS.POWERUP_SHIELD : 
                  type === 'LASER' ? COLORS.POWERUP_LASER : COLORS.POWERUP_MULTI;

    powerUpsRef.current.push({
      id: `p-${Date.now()}`,
      pos: { x, y },
      width: 20,
      height: 20,
      color: color,
      active: true,
      type,
      vel: { dx: 0, dy: 3 }
    });
  };

  const resetPlayerPosition = (width: number, height: number) => {
      playerRef.current.pos.x = width / 2 - playerRef.current.width / 2;
      playerRef.current.pos.y = height - playerRef.current.height - 10;
  };

  // --- Game Loop Helpers ---

  const updatePlayer = (width: number) => {
    const player = playerRef.current;
    if (!player.active) return;

    // Power-up Timer
    if (player.activePowerUp && player.powerUpTimer > 0) {
      player.powerUpTimer--;
      if (player.powerUpTimer <= 0) {
        player.activePowerUp = undefined;
        player.isShielded = false; 
        // Reset charging state if laser expires
        player.isCharging = false;
        player.chargeLevel = 0;
      }
    }

    // Movement
    if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA')) {
      player.pos.x -= PLAYER_SPEED;
    }
    if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD')) {
      player.pos.x += PLAYER_SPEED;
    }
    player.pos.x = Math.max(0, Math.min(width - player.width, player.pos.x));

    // Shooting / Action
    const isShootPressed = keysPressed.current.has('Space') || keysPressed.current.has('ArrowUp') || keysPressed.current.has('KeyW');

    // LASER LOGIC: Hold to Charge
    if (player.activePowerUp === 'LASER') {
        if (isShootPressed) {
            // Start or continue charging
            if (!player.isCharging) {
                player.isCharging = true;
                player.chargeLevel = 0;
            }
            // Increment charge
            if ((player.chargeLevel || 0) < MAX_CHARGE_FRAMES) {
                player.chargeLevel = (player.chargeLevel || 0) + 1;
                // Tick sound every few frames
                if (player.chargeLevel! % 10 === 0) {
                    playChargeTick(player.chargeLevel! / MAX_CHARGE_FRAMES);
                }
            }
        } else {
            // Key released
            if (player.isCharging) {
                // FIRE!
                const chargeRatio = (player.chargeLevel || 0) / MAX_CHARGE_FRAMES;
                // Calculate width based on charge
                const beamWidth = LASER_MIN_WIDTH + (chargeRatio * (LASER_MAX_WIDTH - LASER_MIN_WIDTH));
                
                playLaserBlast(chargeRatio);

                bulletsRef.current.push({
                  id: `laser-${Date.now()}`,
                  pos: { x: player.pos.x + player.width/2 - beamWidth/2, y: player.pos.y - 40 },
                  width: beamWidth,
                  height: 60, // Visual length, but physics makes it move fast
                  color: COLORS.CHARGED_BEAM_CORE,
                  active: true,
                  owner: 'PLAYER',
                  bulletType: 'CHARGED_BEAM',
                  vel: { dx: 0, dy: -20 }, // Very fast
                  penetration: 999, // Infinite penetration for normal enemies
                  damage: 10 + (chargeRatio * 100), // Scale damage
                  hitIds: new Set() // Track hit enemies
                });

                player.isCharging = false;
                player.chargeLevel = 0;
                player.cooldown = 20; // Recoil delay
            }
        }
    } 
    // STANDARD SHOOTING
    else {
        if (player.cooldown > 0) player.cooldown--;
        
        if (isShootPressed && player.cooldown <= 0) {
          playShoot();
          
          const spawnBullet = (xOffset: number, dx: number) => {
             bulletsRef.current.push({
              id: `b-${Date.now()}-${xOffset}`,
              pos: { x: player.pos.x + player.width / 2 - 2 + xOffset, y: player.pos.y },
              width: 4,
              height: 12,
              color: COLORS.PLAYER_BULLET,
              active: true,
              owner: 'PLAYER',
              bulletType: 'STANDARD',
              vel: { dx: dx, dy: -BULLET_SPEED }
            });
          };

          if (player.activePowerUp === 'MULTI_SHOT') {
            spawnBullet(0, 0);
            spawnBullet(-10, -2);
            spawnBullet(10, 2);
          } else {
            spawnBullet(0, 0);
          }

          player.cooldown = player.activePowerUp === 'RAPID_FIRE' ? RAPID_FIRE_COOLDOWN : FIRE_COOLDOWN;
        }
    }
  };

  const updateEnemies = (width: number, height: number) => {
    const enemies = enemiesRef.current;
    if (enemies.length === 0 && gameState === GameState.PLAYING) {
       return; 
    }

    // Dynamic stats based on difficultyTier
    const bulletSpeedMultiplier = 1 + (difficultyTier * 0.2); // 20% faster bullets per tier
    const bossIdleThreshold = Math.max(40, 100 - (difficultyTier * 10)); // Boss attacks faster per tier
    const currentEnemyBulletSpeed = ENEMY_BULLET_SPEED * bulletSpeedMultiplier;

    // BOSS LOGIC
    const boss = enemies.find(e => e.isBoss);
    if (boss) {
      // Boss Movement (Sine wave) - moves faster/wider with difficulty
      boss.pos.x += Math.sin(frameCountRef.current / 50) * (4 + difficultyTier);
      boss.pos.x = Math.max(0, Math.min(width - boss.width, boss.pos.x));
      
      // Boss Attack State Machine
      boss.attackFrame = (boss.attackFrame || 0) + 1;

      if (boss.currentAttack === 'NONE') {
         if (boss.attackFrame > bossIdleThreshold) { // Idle time reduced by tier
            // Pick new attack
            const r = Math.random();
            if (r < 0.3) boss.currentAttack = 'SPREAD';
            else if (r < 0.5) boss.currentAttack = 'AIMED';
            else if (r < 0.75) boss.currentAttack = 'HOMING';
            else boss.currentAttack = 'SWEEP';
            
            boss.attackFrame = 0;
         }
      } else {
         // Execute Attacks
         const centerX = boss.pos.x + boss.width/2;
         const bottomY = boss.pos.y + boss.height;

         if (boss.currentAttack === 'SPREAD') {
            if (boss.attackFrame === 1) {
               playEnemyShoot();
               [-2, 0, 2].forEach(dx => {
                  bulletsRef.current.push({
                    id: `eb-spread-${Date.now()}-${dx}`,
                    pos: { x: centerX, y: bottomY },
                    width: 8,
                    height: 16,
                    color: COLORS.ENEMY_BULLET,
                    active: true,
                    owner: 'ENEMY',
                    bulletType: 'STANDARD',
                    vel: { dx: dx, dy: currentEnemyBulletSpeed * 1.2 }
                  });
               });
            }
            if (boss.attackFrame > 20) { boss.currentAttack = 'NONE'; boss.attackFrame = 0; }

         } else if (boss.currentAttack === 'AIMED') {
            if (boss.attackFrame === 1) {
               playEnemyShoot();
               const playerCx = playerRef.current.pos.x + playerRef.current.width/2;
               const angle = Math.atan2(playerRef.current.pos.y - boss.pos.y, playerCx - centerX);
               bulletsRef.current.push({
                  id: `eb-aimed-${Date.now()}`,
                  pos: { x: centerX, y: bottomY },
                  width: 10,
                  height: 10,
                  color: '#fff',
                  active: true,
                  owner: 'ENEMY',
                  bulletType: 'STANDARD',
                  vel: { dx: Math.cos(angle) * (6 * bulletSpeedMultiplier), dy: Math.sin(angle) * (6 * bulletSpeedMultiplier) }
                });
            }
            if (boss.attackFrame > 20) { boss.currentAttack = 'NONE'; boss.attackFrame = 0; }

         } else if (boss.currentAttack === 'HOMING') {
            if (boss.attackFrame % 15 === 0 && boss.attackFrame <= 45) {
               playHomingLaunch();
               bulletsRef.current.push({
                  id: `eb-homing-${Date.now()}-${boss.attackFrame}`,
                  pos: { x: centerX + (Math.random() * 60 - 30), y: bottomY },
                  width: 12,
                  height: 12,
                  color: COLORS.ENEMY_HOMING,
                  active: true,
                  owner: 'ENEMY',
                  bulletType: 'HOMING',
                  vel: { dx: Math.random() * 4 - 2, dy: 3 } // Update handled in updateBullets
               });
            }
            if (boss.attackFrame > 60) { boss.currentAttack = 'NONE'; boss.attackFrame = 0; }

         } else if (boss.currentAttack === 'SWEEP') {
             if (boss.attackFrame % 3 === 0 && boss.attackFrame < 60) {
                playLaserSweep();
                const angle = -Math.PI/3 + (2 * Math.PI/3) * (boss.attackFrame / 60);
                bulletsRef.current.push({
                   id: `eb-sweep-${Date.now()}`,
                   pos: { x: centerX, y: bottomY },
                   width: 6,
                   height: 20,
                   color: COLORS.ENEMY_LASER,
                   active: true,
                   owner: 'ENEMY',
                   bulletType: 'LASER',
                   vel: { dx: Math.sin(angle) * (6 * bulletSpeedMultiplier), dy: Math.cos(angle) * (6 * bulletSpeedMultiplier) }
                });
             }
             if (boss.attackFrame > 80) { boss.currentAttack = 'NONE'; boss.attackFrame = 0; }
         }
      }
      return; 
    }

    // GRID ENEMY LOGIC
    const gridEnemies = enemies.filter(e => e.type !== 'FLYER');
    
    let hitEdge = false;
    let lowestY = 0;
    // Grid speed: Base speed + level increments + tier jump
    const baseSpeed = (1 + (level * 0.1)) + (difficultyTier * 0.5); 
    const currentSpeed = baseSpeed * enemyDirectionRef.current;

    gridEnemies.forEach(e => {
      // Standard Grid Move
      e.pos.x += currentSpeed;
      
      // Special behaviors per type within the grid
      if (e.type === 'WORM') {
         // Wiggle effect
         if (e.baseY === undefined) e.baseY = e.pos.y;
         e.pos.y = e.baseY + Math.sin(e.pos.x / 20) * 10;
      } 
      else if (e.type === 'SPIDER') {
         if (e.baseY === undefined) e.baseY = e.pos.y;
         
         // Spider AI
         if (e.specialState === 'IDLE') {
             e.pos.y = e.baseY;
             e.specialTimer = (e.specialTimer || 0) - 1;
             // Randomly drop - chance increases with tier
             if (e.specialTimer <= 0 && Math.random() < (0.01 + difficultyTier * 0.005)) {
                 e.specialState = 'ATTACKING';
             }
         } else if (e.specialState === 'ATTACKING') {
             e.pos.y += (4 + difficultyTier); // Drops faster with tier
             if (e.pos.y > e.baseY + 150) {
                 e.specialState = 'RETURNING';
                 // Shoot when at bottom
                 playEnemyShoot();
                 bulletsRef.current.push({
                    id: `spider-shot-${Date.now()}`,
                    pos: { x: e.pos.x + e.width/2, y: e.pos.y + e.height },
                    width: 4,
                    height: 10,
                    color: COLORS.ENEMY_BULLET,
                    active: true,
                    owner: 'ENEMY',
                    bulletType: 'STANDARD',
                    vel: { dx: 0, dy: currentEnemyBulletSpeed }
                 });
             }
         } else if (e.specialState === 'RETURNING') {
             e.pos.y -= (3 + difficultyTier);
             if (e.pos.y <= e.baseY) {
                 e.pos.y = e.baseY;
                 e.specialState = 'IDLE';
                 e.specialTimer = 100 + Math.random() * 200;
             }
         }
      }

      lowestY = Math.max(lowestY, e.pos.y + e.height);
      if (e.pos.x <= 0 || e.pos.x + e.width >= width) {
        hitEdge = true;
      }
    });

    if (hitEdge) {
      enemyDirectionRef.current *= -1;
      gridEnemies.forEach(e => {
        // For special enemies, we update their baseY to "drop" them
        if (e.type === 'WORM' || e.type === 'SPIDER') {
            if (e.baseY !== undefined) e.baseY += ENEMY_DROP_DISTANCE;
        } else {
            e.pos.y += ENEMY_DROP_DISTANCE;
        }
      });
    }

    // FLYER LOGIC
    const flyers = enemies.filter(e => e.type === 'FLYER');
    flyers.forEach(e => {
       if (!e.vel) e.vel = { dx: 2, dy: 1};
       
       e.pos.x += e.vel.dx;
       e.pos.y += e.vel.dy;

       // Bounce off walls
       if (e.pos.x <= 0 || e.pos.x + e.width >= width) e.vel.dx *= -1;
       
       // Oscillate Y or bounce
       if (e.pos.y < 20 || e.pos.y > 200) e.vel.dy *= -1;

       lowestY = Math.max(lowestY, e.pos.y);

       // Engine Trails
       if (frameCountRef.current % 5 === 0) {
           particlesRef.current.push({
                id: `trail-${e.id}-${frameCountRef.current}`,
                pos: { x: e.pos.x + e.width / 2, y: e.pos.y + e.height - 2 },
                width: 2,
                height: 2,
                color: e.color,
                active: true,
                vel: { dx: (Math.random() - 0.5) * 1, dy: 2 + Math.random() },
                life: 15,
                maxLife: 15,
                alpha: 0.5
           });
       }
    });

    // Check Game Over
    if (playerRef.current.pos.y > 0 && lowestY >= playerRef.current.pos.y) {
      playerRef.current.lives = 0;
      setLives(0);
      onGameOver();
    }

    // Shooting Logic
    // Base chance + Level increment + Tier jump + Few enemies remaining bonus
    const shootChance = 0.008 + (level * 0.002) + (difficultyTier * 0.005) + (0.02 * (1 - enemies.length / 32)); 
    
    if (Math.random() < shootChance && enemies.length > 0) {
        const shooters = enemies.filter(e => e.type !== 'SPIDER'); // Spiders shoot via AI
        if (shooters.length > 0) {
            const shooter = shooters[Math.floor(Math.random() * shooters.length)];
            playEnemyShoot();
            bulletsRef.current.push({
                id: `eb-${Date.now()}`,
                pos: { x: shooter.pos.x + shooter.width/2, y: shooter.pos.y + shooter.height },
                width: 4,
                height: 10,
                color: COLORS.ENEMY_BULLET,
                active: true,
                owner: 'ENEMY',
                bulletType: 'STANDARD',
                vel: { dx: 0, dy: currentEnemyBulletSpeed }
            });
        }
    }
  };

  const updateBullets = (height: number) => {
    bulletsRef.current.forEach(b => {
      // Homing Logic
      if (b.bulletType === 'HOMING' && b.owner === 'ENEMY') {
          const passedPlayer = b.pos.y > playerRef.current.pos.y + playerRef.current.height / 4;

          if (playerRef.current.active && !passedPlayer) {
              const target = playerRef.current;
              const tx = target.pos.x + target.width / 2;
              const ty = target.pos.y + target.height / 2;
              const dx = tx - b.pos.x;
              const dy = ty - b.pos.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              if (dist > 0) {
                 // Homing speed increases with tier
                 const speed = 3.5 + (difficultyTier * 0.5);
                 const targetDx = (dx / dist) * speed;
                 const targetDy = (dy / dist) * speed;
                 
                 b.vel.dx += (targetDx - b.vel.dx) * 0.03;
                 b.vel.dy += (targetDy - b.vel.dy) * 0.03;
              }
          } else {
              b.vel.dx = b.vel.dx * 0.8; // Rapidly decay horizontal movement
          }
      }

      b.pos.y += b.vel.dy;
      b.pos.x += b.vel.dx;
      if (b.pos.y < -100 || b.pos.y > height) b.active = false; // increased upper limit for long lasers
    });
    bulletsRef.current = bulletsRef.current.filter(b => b.active);
  };

  const updatePowerUps = (height: number) => {
    powerUpsRef.current.forEach(p => {
      p.pos.y += p.vel.dy;
      if (p.pos.y > height) p.active = false;
    });
    powerUpsRef.current = powerUpsRef.current.filter(p => p.active);
  };

  const checkCollisions = () => {
    const player = playerRef.current;
    const enemies = enemiesRef.current;
    const bullets = bulletsRef.current;
    const powerUps = powerUpsRef.current;

    // Player vs PowerUps
    powerUps.forEach(p => {
      if (
        player.active &&
        p.pos.x < player.pos.x + player.width &&
        p.pos.x + p.width > player.pos.x &&
        p.pos.y < player.pos.y + player.height &&
        p.pos.y + p.height > player.pos.y
      ) {
        p.active = false;
        
        if (p.type === 'SHIELD') {
            playShieldActivate();
            player.isShielded = true;
        } else {
            playPowerUp();
        }
        
        player.activePowerUp = p.type;
        player.powerUpTimer = POWERUP_DURATION;
        player.isCharging = false; // Reset charge state on pickup
        player.chargeLevel = 0;
      }
    });

    bullets.forEach(bullet => {
      if (!bullet.active) return;

      if (bullet.owner === 'PLAYER') {
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (!enemy.active) continue;

          // Check if bullet has already hit this enemy (for penetrating lasers)
          if (bullet.hitIds && bullet.hitIds.has(enemy.id)) continue;

          if (
            bullet.pos.x < enemy.pos.x + enemy.width &&
            bullet.pos.x + bullet.width > enemy.pos.x &&
            bullet.pos.y < enemy.pos.y + enemy.height &&
            bullet.pos.y + bullet.height > enemy.pos.y
          ) {
            
            const dmg = bullet.damage || 10;

            // Handle Hit Logic
            if (enemy.isBoss) {
               // Safely update health if it exists
               if (enemy.currentHealth !== undefined) {
                  enemy.currentHealth -= dmg;
               }
               
               playBossHit();
               createExplosion(bullet.pos.x + bullet.width/2, bullet.pos.y, '#fff', 3);
               
               // Check for death (use !== undefined to avoid 0 being falsy)
               if (enemy.currentHealth !== undefined && enemy.currentHealth <= 0) {
                   enemy.active = false;
                   createExplosion(enemy.pos.x + enemy.width/2, enemy.pos.y + enemy.height/2, enemy.color, 50);
                   setScore(score + enemy.value);
                   shakeRef.current = 20;
               }
            } else {
               // Normal Enemy
               enemy.active = false;
               createExplosion(enemy.pos.x + enemy.width/2, enemy.pos.y + enemy.height/2, enemy.color);
               spawnPowerUp(enemy.pos.x + enemy.width/2, enemy.pos.y);
               setScore(score + enemy.value);
            }

            // Bullet Lifecycle Logic
            if (bullet.bulletType === 'CHARGED_BEAM') {
                // Penetration logic
                if (bullet.hitIds) bullet.hitIds.add(enemy.id);
                createExplosion(enemy.pos.x + enemy.width/2, enemy.pos.y + enemy.height/2, COLORS.CHARGED_BEAM_GLOW, 5);
                // Note: Beam bullets don't die, they fly off screen or penetrate
            } else {
                // Standard bullets die on impact
                bullet.active = false;
            }

            break; // Break enemy loop (one hit per bullet frame unless piercing logic changes)
          }
        }
      } else if (bullet.owner === 'ENEMY') {
        if (
          player.active &&
          bullet.pos.x < player.pos.x + player.width &&
          bullet.pos.x + bullet.width > player.pos.x &&
          bullet.pos.y < player.pos.y + player.height &&
          bullet.pos.y + bullet.height > player.pos.y
        ) {
          bullet.active = false;
          
          if (player.isShielded) {
             player.isShielded = false; // Shield pops
             player.activePowerUp = undefined;
             createExplosion(player.pos.x + player.width/2, player.pos.y + player.height/2, '#3b82f6', 5);
             playBossHit(); // Dull sound
          } else {
             createExplosion(player.pos.x + player.width/2, player.pos.y + player.height/2, player.color);
             player.lives--;
             setLives(player.lives);
             shakeRef.current = 10;
             
             if (player.lives <= 0) {
               player.active = false;
               onGameOver();
             } else {
               // Trigger taunt on hit if still alive
               onPlayerHit();
             }
          }
        }
      }
    });

    enemiesRef.current = enemies.filter(e => e.active);
  };

  // --- Drawing ---

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // Screen Shake
    if (shakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * shakeRef.current;
        const dy = (Math.random() - 0.5) * shakeRef.current;
        ctx.save();
        ctx.translate(dx, dy);
        shakeRef.current *= 0.9; // Decay
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    // Stars
    starsRef.current.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        star.y += star.speed;
        if (star.y > height) star.y = 0;
    });

    // PowerUps
    powerUpsRef.current.forEach(p => {
       ctx.shadowBlur = 10;
       ctx.shadowColor = p.color;
       ctx.fillStyle = p.color;
       ctx.beginPath();
       // Pill shape
       ctx.roundRect(p.pos.x, p.pos.y, p.width, p.height, 5);
       ctx.fill();
       
       // Text icon
       ctx.fillStyle = '#000';
       ctx.font = 'bold 12px monospace';
       ctx.textAlign = 'center';
       const char = p.type === 'RAPID_FIRE' ? 'R' : p.type === 'SHIELD' ? 'S' : p.type === 'LASER' ? 'L' : 'M';
       ctx.fillText(char, p.pos.x + p.width/2, p.pos.y + 15);
       ctx.shadowBlur = 0;
    });

    // Player
    const p = playerRef.current;
    if (p.active) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.pos.x + p.width / 2, p.pos.y);
      ctx.lineTo(p.pos.x + p.width, p.pos.y + p.height);
      ctx.lineTo(p.pos.x, p.pos.y + p.height);
      ctx.closePath();
      ctx.fill();

      // Shield visual
      if (p.isShielded) {
        ctx.strokeStyle = COLORS.PLAYER_SHIELD;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.pos.x + p.width/2, p.pos.y + p.height/2, p.width, 0, Math.PI*2);
        ctx.stroke();
      }

      // Charge Visual
      if (p.isCharging) {
          const ratio = (p.chargeLevel || 0) / MAX_CHARGE_FRAMES;
          ctx.shadowColor = COLORS.CHARGED_BEAM_GLOW;
          ctx.shadowBlur = 10 + (ratio * 20);
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(p.pos.x + p.width/2, p.pos.y - 5, 2 + (ratio * 8), 0, Math.PI*2);
          ctx.fill();
          // Shake player slightly when full charge
          if (ratio > 0.8) {
              p.pos.x += (Math.random() - 0.5) * 2;
          }
      }
      
      // Thruster
      if (Math.random() > 0.5) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(p.pos.x + p.width / 2 - 5, p.pos.y + p.height);
          ctx.lineTo(p.pos.x + p.width / 2 + 5, p.pos.y + p.height);
          ctx.lineTo(p.pos.x + p.width / 2, p.pos.y + p.height + 10);
          ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    // Enemies
    enemiesRef.current.forEach(e => {
        // PULSATING NEON VISUALIZER
        const pulseSpeed = e.isBoss ? 0.05 : 0.1;
        const pulseBase = e.isBoss ? 20 : 10;
        const pulseVar = e.isBoss ? 20 : 10;
        const pulse = (Math.sin(frameCountRef.current * pulseSpeed) + 1) / 2; // 0 to 1
        
        ctx.shadowBlur = pulseBase + (pulse * pulseVar);
        ctx.shadowColor = e.color;
        ctx.fillStyle = e.color;
        
        const x = e.pos.x;
        const y = e.pos.y;
        const w = e.width;
        const h = e.height;

        if (e.isBoss) {
            // Boss Drawing
            if (e.bossVariant === 'CONSTRUCT') {
                // Robust Blocky Shape
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + w, y);
                ctx.lineTo(x + w, y + h * 0.8);
                ctx.lineTo(x + w * 0.8, y + h);
                ctx.lineTo(x + w * 0.2, y + h);
                ctx.lineTo(x, y + h * 0.8);
                ctx.closePath();
                ctx.fill();
                
                // Armor plating details
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(x + 10, y + 10, w - 20, h * 0.3);
                ctx.fillRect(x + w/2 - 10, y + h * 0.4, 20, h * 0.5);

            } else if (e.bossVariant === 'EYE') {
                 // Circular/Organic
                 ctx.beginPath();
                 ctx.arc(x + w/2, y + h/2, w/2, 0, Math.PI*2);
                 ctx.fill();
                 
                 // The Eye
                 const lookX = (playerRef.current.pos.x - (x + w/2)) * 0.05;
                 const lookY = (playerRef.current.pos.y - (y + h/2)) * 0.05;
                 
                 ctx.fillStyle = '#fff';
                 ctx.beginPath();
                 ctx.arc(x + w/2, y + h/2, w/4, 0, Math.PI*2);
                 ctx.fill();
                 
                 ctx.fillStyle = '#000';
                 ctx.beginPath();
                 ctx.arc(x + w/2 + lookX, y + h/2 + lookY, w/8, 0, Math.PI*2);
                 ctx.fill();

            } else {
                // GUARDIAN (Default Diamond)
                ctx.beginPath();
                ctx.moveTo(x, y + h/2);
                ctx.lineTo(x + w/2, y);
                ctx.lineTo(x + w, y + h/2);
                ctx.lineTo(x + w/2, y + h);
                ctx.closePath();
                ctx.fill();
                
                // Core
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath();
                ctx.moveTo(x + w/2, y + h/2 - 10);
                ctx.lineTo(x + w/2 + 10, y + h/2);
                ctx.lineTo(x + w/2, y + h/2 + 10);
                ctx.lineTo(x + w/2 - 10, y + h/2);
                ctx.fill();
            }

            // Boss Health Bar
            const hpPercent = (e.currentHealth || 0) / (e.maxHealth || 1);
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y - 15, w, 8);
            ctx.fillStyle = '#f00';
            ctx.fillRect(x, y - 15, w * hpPercent, 8);

            if (e.currentAttack === 'SWEEP') {
               ctx.fillStyle = COLORS.ENEMY_LASER;
               ctx.beginPath();
               ctx.arc(x + w/2, y + h, 5 + Math.random()*5, 0, Math.PI*2);
               ctx.fill();
            }
        } else if (e.type === 'SPIDER') {
            // Web line
            if (e.baseY !== undefined && y > e.baseY) {
               ctx.save();
               const webPulse = (Math.sin(frameCountRef.current * 0.2) + 1) / 2;
               ctx.shadowBlur = 5 + webPulse * 10;
               ctx.shadowColor = '#a5f3fc'; 
               ctx.strokeStyle = `rgba(200, 225, 255, ${0.3 + webPulse * 0.5})`;
               ctx.lineWidth = 1 + webPulse; 
               ctx.beginPath();
               ctx.moveTo(x + w/2, e.baseY + h/2);
               ctx.lineTo(x + w/2, y);
               ctx.stroke();
               ctx.restore();
            }
            // Body
            ctx.beginPath();
            ctx.arc(x + w/2, y + h/2, w/3, 0, Math.PI*2);
            ctx.fill();
            // Legs
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + w/2, y + h/2);
            ctx.moveTo(x + w, y); ctx.lineTo(x + w/2, y + h/2);
            ctx.moveTo(x, y + h); ctx.lineTo(x + w/2, y + h/2);
            ctx.moveTo(x + w, y + h); ctx.lineTo(x + w/2, y + h/2);
            ctx.stroke();

        } else if (e.type === 'WORM') {
            const segs = 3;
            const segW = w / segs;
            ctx.beginPath();
            for(let i=0; i<segs; i++) {
               ctx.arc(x + (i*segW) + segW/2, y + h/2, h/2, 0, Math.PI*2);
            }
            ctx.fill();
        } else if (e.type === 'FLYER') {
            ctx.beginPath();
            ctx.moveTo(x, y + h/2);
            ctx.lineTo(x + w/2, y + h);
            ctx.lineTo(x + w, y + h/2);
            ctx.lineTo(x + w/2, y);
            ctx.closePath();
            ctx.fill();
            // Engines
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + w/2 - 2, y + h - 4, 4, 4);
        } else if (e.type === 'CRAB') {
            ctx.beginPath();
            ctx.arc(x + w/2, y + h/2, w/2, 0, Math.PI * 2);
            ctx.fill();
        } else if (e.type === 'OCTOPUS') {
            ctx.beginPath();
            ctx.moveTo(x + w/2, y);
            ctx.lineTo(x + w, y + h/2);
            ctx.lineTo(x + w/2, y + h);
            ctx.lineTo(x, y + h/2);
            ctx.fill();
        } else {
            // SQUID
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    });

    // Bullets
    bulletsRef.current.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = b.color;
        
        if (b.bulletType === 'HOMING') {
           ctx.beginPath();
           ctx.moveTo(b.pos.x + b.width/2, b.pos.y);
           ctx.lineTo(b.pos.x + b.width, b.pos.y + b.height/2);
           ctx.lineTo(b.pos.x + b.width/2, b.pos.y + b.height);
           ctx.lineTo(b.pos.x, b.pos.y + b.height/2);
           ctx.fill();
        } else if (b.bulletType === 'LASER') {
           ctx.fillRect(b.pos.x, b.pos.y, b.width, b.height);
        } else if (b.bulletType === 'CHARGED_BEAM') {
           // Draw bright core and wide glow
           ctx.shadowBlur = 15;
           ctx.shadowColor = COLORS.CHARGED_BEAM_GLOW;
           ctx.fillStyle = COLORS.CHARGED_BEAM_CORE;
           ctx.fillRect(b.pos.x, b.pos.y, b.width, b.height);
           
           // Outer glow
           ctx.fillStyle = `rgba(244, 63, 94, 0.4)`; // Rose-500 transparent
           ctx.fillRect(b.pos.x - 4, b.pos.y, b.width + 8, b.height);
        } else {
           // Standard rect
           ctx.fillRect(b.pos.x, b.pos.y, b.width, b.height);
        }
        ctx.shadowBlur = 0;
    });

    // Particles
    particlesRef.current.forEach(part => {
        ctx.globalAlpha = part.alpha;
        ctx.fillStyle = part.color;
        ctx.fillRect(part.pos.x, part.pos.y, part.width, part.height);
        ctx.globalAlpha = 1.0;
    });

    // Restore shake state
    if (shakeRef.current > 0) ctx.restore();
  };

  // --- Main Loop ---

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gameState === GameState.PLAYING) {
        updatePlayer(canvas.width);
        updateBullets(canvas.height);
        updatePowerUps(canvas.height);
        updateEnemies(canvas.width, canvas.height);
        
        particlesRef.current.forEach(p => {
            p.pos.x += p.vel.dx;
            p.pos.y += p.vel.dy;
            p.life--;
            p.alpha = p.life / p.maxLife;
            if (p.life <= 0) p.active = false;
        });
        particlesRef.current = particlesRef.current.filter(p => p.active);

        checkCollisions();

        if (enemiesRef.current.length === 0 && !levelCompleteTriggeredRef.current) {
            levelCompleteTriggeredRef.current = true;
            onLevelComplete();
        }
    }

    draw(ctx, canvas.width, canvas.height);
    frameCountRef.current++;
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState, onLevelComplete, score, setScore]);

  // --- Event Listeners & Lifecycle ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  // Handle Level changes
  useEffect(() => {
    if (!canvasRef.current) return;
    
    if (gameState === GameState.PLAYING) {
        if (enemiesRef.current.length === 0) {
            resetPlayerPosition(canvasRef.current.width, canvasRef.current.height);
            initEnemies(level, canvasRef.current.width);
            initStars(canvasRef.current.width, canvasRef.current.height);
        }
    }
  }, [level, gameState]);

  // Handle Game Restart (Score reset to 0)
  useEffect(() => {
     if (score === 0 && gameState === GameState.PLAYING) {
         playerRef.current.lives = 3;
         playerRef.current.active = true;
         playerRef.current.activePowerUp = undefined;
         playerRef.current.isShielded = false;
         playerRef.current.cooldown = 0;
         playerRef.current.isCharging = false;
         setLives(3);
         
         if (canvasRef.current) {
             resetPlayerPosition(canvasRef.current.width, canvasRef.current.height);
             initEnemies(1, canvasRef.current.width);
         }
     }
  }, [gameState, score]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="block w-full h-full max-w-[800px] max-h-[600px] mx-auto border-2 border-cyan-900/50 bg-black rounded-lg shadow-2xl shadow-cyan-500/20"
    />
  );
};

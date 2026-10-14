export const WIDTH = 960;
export const HEIGHT = 600;
export const ROUND_SECONDS = 10 * 60;
export const SWIM_SPEED = 225;
export const INVINCIBILITY_SECONDS = 2;

export type Status = 'ready' | 'playing' | 'paused' | 'won' | 'lost';
export type Kind = 'shrimp' | 'bottle' | 'can' | 'bag' | 'golden';
export interface Entity {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
}
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}
export type GameEvent = 'shrimp' | 'hurt' | 'golden-appeared' | 'won' | 'lost';

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export class Adventure {
  status: Status = 'ready';
  hearts = 3;
  score = 0;
  elapsed = 0;
  invincible = 0;
  goldenAppeared = false;
  player = { x: 365, y: 300, targetX: 365, targetY: 300, facing: 1, moving: false };
  entities: Entity[] = [];
  particles: Particle[] = [];
  events: GameEvent[] = [];
  private nextId = 0;
  private spawnClock = 0;
  private readonly random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
    this.reset();
  }

  reset(): void {
    this.status = 'ready';
    this.hearts = 3;
    this.score = 0;
    this.elapsed = 0;
    this.invincible = 0;
    this.goldenAppeared = false;
    this.nextId = 0;
    this.spawnClock = 0;
    this.events = [];
    this.particles = [];
    this.player = { x: 365, y: 300, targetX: 365, targetY: 300, facing: 1, moving: false };
    this.entities = [];
    this.add('shrimp', 480, 300);
    this.add('shrimp', 250, 215);
    this.add('shrimp', 695, 210);
    this.add('shrimp', 780, 375);
    this.add('shrimp', 225, 440);
    this.add('shrimp', 535, 460);
    this.add('bottle', 640, 415);
    this.add('can', 160, 335);
    this.add('bag', 815, 270);
  }

  start(): void {
    this.reset();
    this.status = 'playing';
  }

  pause(): void {
    if (this.status === 'playing') {
      this.status = 'paused';
      this.player.moving = false;
    }
  }

  resume(): void {
    if (this.status === 'paused') this.status = 'playing';
  }

  aim(x: number, y: number): void {
    this.player.targetX = clamp(x, 50, WIDTH - 50);
    this.player.targetY = clamp(y, 110, HEIGHT - 65);
  }

  update(seconds: number, keyboard = { x: 0, y: 0 }): void {
    if (this.status !== 'playing') return;
    // Never turn a background-tab delay into a dangerous jump through the reef.
    const dt = clamp(seconds, 0, 0.05);
    this.events = [];
    this.elapsed += dt;
    this.invincible = Math.max(0, this.invincible - dt);

    const keyboardLength = Math.hypot(keyboard.x, keyboard.y);
    if (keyboardLength > 0) {
      this.aim(
        this.player.x + keyboard.x / keyboardLength * SWIM_SPEED * dt,
        this.player.y + keyboard.y / keyboardLength * SWIM_SPEED * dt,
      );
    }
    const dx = this.player.targetX - this.player.x;
    const dy = this.player.targetY - this.player.y;
    const distance = Math.hypot(dx, dy);
    this.player.moving = distance > 1;
    if (distance > 0.01) {
      const step = Math.min(distance, SWIM_SPEED * dt);
      this.player.x += dx / distance * step;
      this.player.y += dy / distance * step;
      if (Math.abs(dx) > 0.5) this.player.facing = dx > 0 ? 1 : -1;
    }

    if (this.elapsed >= ROUND_SECONDS && !this.goldenAppeared) {
      this.goldenAppeared = true;
      this.add('golden', 835, 345);
      this.events.push('golden-appeared');
      this.burst(835, 345, '#ffe09b', 28);
    }

    const consumed = new Set<number>();
    for (const entity of this.entities) {
      if (entity.kind !== 'golden') {
        entity.x += entity.vx * dt;
        entity.y += entity.vy * dt;
        if (entity.x < 65 || entity.x > WIDTH - 65) {
          entity.x = clamp(entity.x, 65, WIDTH - 65);
          entity.vx *= -1;
        }
        if (entity.y < 135 || entity.y > HEIGHT - 85) {
          entity.y = clamp(entity.y, 135, HEIGHT - 85);
          entity.vy *= -1;
        }
      }
      const radius = entity.kind === 'bag' ? 37 : entity.kind === 'golden' ? 38 : 32;
      if (Math.hypot(entity.x - this.player.x, entity.y - this.player.y) > radius) continue;

      if (entity.kind === 'shrimp') {
        this.score++;
        consumed.add(entity.id);
        this.events.push('shrimp');
        this.burst(entity.x, entity.y, '#ffb5a6', 10);
      } else if (entity.kind === 'golden') {
        consumed.add(entity.id);
        this.status = 'won';
        this.events.push('won');
        this.burst(entity.x, entity.y, '#ffe09b', 55);
        break;
      } else if (this.invincible === 0) {
        this.hearts--;
        this.invincible = INVINCIBILITY_SECONDS;
        consumed.add(entity.id);
        this.events.push('hurt');
        this.burst(entity.x, entity.y, '#87c5d3', 14);
        if (this.hearts === 0) {
          this.status = 'lost';
          this.events.push('lost');
          break;
        }
      }
    }
    this.entities = this.entities.filter((entity) => !consumed.has(entity.id));

    this.spawnClock += dt;
    if (this.spawnClock >= 2.5 && this.status === 'playing') {
      this.spawnClock = 0;
      const shrimp = this.entities.filter((entity) => entity.kind === 'shrimp').length;
      const trash = this.entities.filter((entity) => !['shrimp', 'golden'].includes(entity.kind)).length;
      if (shrimp < 7) this.spawnAway('shrimp');
      const trashLimit = 3 + Math.floor(Math.min(this.elapsed / ROUND_SECONDS, 1) * 4);
      if (trash < trashLimit && !this.goldenAppeared) {
        const kinds: Kind[] = ['bottle', 'can', 'bag'];
        this.spawnAway(kinds[Math.floor(this.random() * kinds.length)] ?? 'bottle');
      }
    }

    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private add(kind: Kind, x: number, y: number): void {
    const speed = kind === 'shrimp' ? 10 : 7;
    this.entities.push({
      id: this.nextId++, kind, x, y,
      vx: (this.random() * 2 - 1) * speed,
      vy: (this.random() * 2 - 1) * speed * 0.6,
      phase: this.random() * Math.PI * 2,
    });
  }

  private spawnAway(kind: Kind): void {
    let x = 70;
    let y = 150;
    for (let attempt = 0; attempt < 12; attempt++) {
      x = 70 + this.random() * (WIDTH - 140);
      y = 145 + this.random() * (HEIGHT - 235);
      if (Math.hypot(x - this.player.x, y - this.player.y) > 150) break;
    }
    if (Math.hypot(x - this.player.x, y - this.player.y) <= 150) {
      x = this.player.x < WIDTH / 2 ? WIDTH - 85 : 85;
    }
    this.add(kind, x, y);
  }

  private burst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = this.random() * Math.PI * 2;
      const speed = 18 + this.random() * 55;
      const life = 0.45 + this.random() * 0.65;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, color });
    }
  }
}

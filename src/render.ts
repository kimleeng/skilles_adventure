import { Adventure, WIDTH, HEIGHT } from './game.ts';
import type { Kind } from './game.ts';

type Palette = Record<string, string>;

function sprite(ctx: CanvasRenderingContext2D, rows: string[], palette: Palette, size: number, x = 0, y = 0): void {
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row]!.length; col++) {
      const color = palette[rows[row]![col]!];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x + col * size), Math.round(y + row * size), Math.ceil(size), Math.ceil(size));
    }
  }
}

const turtleRows = [
  '       oooooooo              ',
  '      oggggggggoo            ',
  '    ooghhhhhhhgggoo          ',
  '   olgghhssshhhgggo          ',
  '  ollgghsSSSshhggggo         ',
  '  ollghsSLLLSshhgggo  ooooo   ',
  '   oggsSLLLLLSshgggo olllllo  ',
  '  ogghsSLLLLLSshgggooalllllmo ',
  ' oogghhssSSSsshggggollllellmo ',
  'oagghhsShhhShhgggggollleellmo ',
  ' oogghsSLLLSshhggggolllllllmo ',
  '  oggsSLLLLLSshhgggoollllmmo  ',
  '  ogghsSLLLSshhhggo  ooooo    ',
  '   ogghsSSSshhhggo           ',
  '    ogghhhhhgggoo            ',
  '   olloggggggollo            ',
  '  ollllooolllllo             ',
  '  olllo   olllo              ',
  '   ooo     ooo               ',
];
const turtlePalette = { o: '#163f49', g: '#489a71', h: '#6bb580', s: '#327961', S: '#b6d489', L: '#92bd73', l: '#b0d8a0', a: '#76b98a', m: '#78b98a', e: '#092735' };

export function drawTurtle(ctx: CanvasRenderingContext2D, x: number, y: number, time = 0, facing = 1, scale = 1, moving = false): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing * scale, scale);
  const paddle = moving ? Math.round(Math.sin(time * 8) * 3) : Math.round(Math.sin(time * 2) * 1.2);
  ctx.fillStyle = '#215a59';
  ctx.fillRect(-27, -36 - paddle, 21, 12);
  ctx.fillRect(6, 25 + paddle, 17, 11);
  ctx.fillStyle = '#76b58c';
  ctx.fillRect(-24, -35 - paddle, 15, 6);
  sprite(ctx, turtleRows, turtlePalette, 4, -60, -36);
  // A little catchlight gives Skille a curious expression.
  ctx.fillStyle = '#e5f4d0';
  ctx.fillRect(44, -2, 3, 3);
  ctx.restore();
}

const shrimpRows = [
  '         a    a ',
  '       aa   aa  ',
  '      llllaa    ',
  '    pllplll     ',
  '   ppppppll e   ',
  '  ppppplpllll   ',
  ' pplp   pppp    ',
  'pppl     pp     ',
  '  ppl   ppp     ',
  '   ppppppl      ',
  '    ttttt       ',
  '   t   t        ',
];
export function drawShrimp(ctx: CanvasRenderingContext2D, x: number, y: number, golden = false, scale = 1): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  sprite(ctx, shrimpRows, golden ? { p: '#e9b753', l: '#fff0b5', a: '#edcf87', t: '#be8447', e: '#49351e' } : { p: '#ec8b91', l: '#ffd2b6', a: '#de9e9d', t: '#be617b', e: '#183141' }, 2.3, -18, -13);
  ctx.restore();
}

function drawTrash(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, phase: number): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(Math.sin(phase) * 0.18);
  if (kind === 'bottle') {
    sprite(ctx, ['    cc    ', '    bb    ', '    bb    ', '   bllb   ', '  bllllb  ', '  bllhlb  ', '  bllhlb  ', '  byyyyb  ', '  byyyyb  ', '  bllhlb  ', '  bllllb  ', '   bbbb   '], { c: '#54778a', b: '#4f8894', l: '#72a8a7', h: '#a7c1b3', y: '#d2c39b' }, 2.8, -14, -17);
  } else if (kind === 'can') {
    sprite(ctx, [' ccccccc ', 'chhhhhhhc', 'ccllllccc', ' rrrrrrr ', ' rllrrrr ', ' rllrrrr ', ' rllrrrr ', ' rrrrrrr ', ' rrrrrrr ', ' ccccccc ', '  ccccc  '], { c: '#658492', h: '#a7b6b5', l: '#657e84', r: '#af6f72' }, 2.8, -13, -16);
  } else {
    sprite(ctx, ['  bbb   bbb  ', '  bbb   bbb  ', '  blb   blb  ', '  bllbbbllb  ', ' blllllllllb ', ' bllhllllllb ', ' bllhllllllb ', ' blllhlhlllb ', ' blllllllllb ', '  blllllllb  ', '   bbbbbbb   '], { b: '#719ca7', l: '#afc4c4', h: '#d3d6ca' }, 2.6, -17, -16);
  }
  ctx.restore();
}

function rng(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export class ReefRenderer {
  private characterAspect = 1;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly backdrop: HTMLCanvasElement;
  private readonly motes = Array.from({ length: 70 }, (_, i) => ({ x: (i * 173 + 43) % WIDTH, y: (i * 79 + 22) % HEIGHT, size: i % 4 === 0 ? 3 : 2, speed: 3 + i % 7 }));
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(canvas: HTMLCanvasElement) {
    const measure = (): void => {
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width && bounds.height) this.characterAspect = (bounds.width / WIDTH) / (bounds.height / HEIGHT);
    };
    measure();
    new ResizeObserver(measure).observe(canvas);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser does not support the aquarium canvas.');
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
    this.backdrop = document.createElement('canvas');
    this.backdrop.width = WIDTH;
    this.backdrop.height = HEIGHT;
    this.paintBackdrop();
  }

  draw(game: Adventure, visualTime: number): void {
    const ctx = this.ctx;
    const time = this.reducedMotion || game.status === 'paused' ? game.elapsed : visualTime;
    // The phone reef is taller. Keep the characters square instead of stretching their pixel art.
    const aspect = this.characterAspect;
    const characterScale = aspect < 0.75 ? 1.2 : 1;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(this.backdrop, 0, 0);
    this.drawWater(time);

    for (const entity of game.entities) {
      const bob = Math.sin(time * 1.8 + entity.phase) * 3;
      if (entity.kind === 'shrimp') {
        ctx.save();
        ctx.translate(entity.x, entity.y + bob);
        ctx.scale(characterScale, aspect * characterScale);
        drawShrimp(ctx, 0, 0);
        ctx.restore();
      } else if (entity.kind === 'golden') {
        const glow = ctx.createRadialGradient(entity.x, entity.y, 3, entity.x, entity.y, 65);
        glow.addColorStop(0, '#f6d98688');
        glow.addColorStop(1, '#f6d98600');
        ctx.fillStyle = glow;
        ctx.fillRect(entity.x - 65, entity.y - 65, 130, 130);
        ctx.strokeStyle = '#eacf8366';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(entity.x, entity.y, 35 + Math.sin(time * 3) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.save();
        ctx.translate(entity.x, entity.y + bob);
        ctx.scale(characterScale, aspect * characterScale);
        drawShrimp(ctx, 0, 0, true, 1.5);
        ctx.restore();
        this.star(entity.x - 33, entity.y - 20, time);
        this.star(entity.x + 28, entity.y + 25, time + 1);
      } else {
        ctx.save();
        ctx.translate(entity.x, entity.y + bob);
        ctx.scale(characterScale, aspect * characterScale);
        drawTrash(ctx, entity.kind, 0, 0, time + entity.phase);
        ctx.restore();
      }
    }

    const preview = game.status === 'ready';
    const px = preview ? 180 : game.player.x;
    const py = preview ? 330 + Math.sin(time) * 4 : game.player.y;
    ctx.save();
    if (game.invincible > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(time * 20) * 0.25;
      const glow = ctx.createRadialGradient(px, py, 5, px, py, 80);
      glow.addColorStop(0, '#b9f8dc66');
      glow.addColorStop(1, '#b9f8dc00');
      ctx.fillStyle = glow;
      ctx.fillRect(px - 80, py - 80, 160, 160);
    }
    ctx.translate(px, py);
    ctx.scale(characterScale, aspect * characterScale);
    drawTurtle(ctx, 0, 0, time, preview ? 1 : game.player.facing, 1.15, game.player.moving);
    ctx.restore();

    if (game.status === 'playing' && game.player.moving && !this.reducedMotion) {
      ctx.strokeStyle = '#bee5d53d';
      for (let i = 0; i < 3; i++) {
        const offset = (time * 30 + i * 17) % 45;
        const bx = game.player.x - game.player.facing * (58 + offset);
        const by = game.player.y + i * 8 - 8;
        ctx.strokeRect(Math.round(bx), Math.round(by), 3 + i, 3 + i);
      }
    }
    for (const p of game.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 4);
    }
    ctx.globalAlpha = 1;
    this.drawForeground(time);
  }

  private star(x: number, y: number, time: number): void {
    const ctx = this.ctx;
    ctx.globalAlpha = 0.5 + Math.sin(time * 3) * 0.3;
    ctx.fillStyle = '#fff0b8';
    ctx.fillRect(x - 1, y - 5, 2, 10);
    ctx.fillRect(x - 5, y - 1, 10, 2);
    ctx.globalAlpha = 1;
  }

  private paintBackdrop(): void {
    const ctx = this.backdrop.getContext('2d')!;
    const random = rng(122);
    const water = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    water.addColorStop(0, '#164853');
    water.addColorStop(0.34, '#143e4b');
    water.addColorStop(0.7, '#102e3d');
    water.addColorStop(1, '#0b2532');
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (const [x, w, opacity] of [[170, 68, 0.09], [350, 24, 0.06], [490, 100, 0.09], [730, 44, 0.06]]) {
      ctx.fillStyle = `rgba(150, 226, 206, ${opacity})`;
      ctx.beginPath();
      ctx.moveTo(x!, 0);
      ctx.lineTo(x! + w!, 0);
      ctx.lineTo(x! + w! - 150, 500);
      ctx.lineTo(x! - 200, 500);
      ctx.closePath();
      ctx.fill();
    }

    // Distant aquarium glass and forgotten silhouettes.
    ctx.fillStyle = '#092e3c55';
    for (let i = 0; i < 10; i++) {
      const x = i * 114 - 28;
      const height = 65 + random() * 130;
      ctx.fillRect(x, 490 - height, 32, height);
      ctx.fillRect(x - 5, 485 - height, 42, 9);
    }
    ctx.fillStyle = '#153d4355';
    for (let i = 0; i < 20; i++) {
      const x = i * 53;
      ctx.fillRect(x, 483 + Math.round(random() * 13), 54, 65);
    }

    // The sunken arch frames the golden shrimp's final appearance.
    const ax = 835;
    ctx.fillStyle = '#173c44';
    ctx.fillRect(ax - 68, 305, 22, 204);
    ctx.fillRect(ax + 45, 305, 22, 204);
    ctx.fillRect(ax - 55, 285, 108, 24);
    ctx.fillRect(ax - 40, 271, 78, 20);
    ctx.fillStyle = '#32625b';
    ctx.fillRect(ax - 68, 305, 5, 193);
    ctx.fillRect(ax + 45, 305, 5, 191);
    ctx.fillRect(ax - 40, 271, 78, 5);
    ctx.fillStyle = '#547362';
    ctx.fillRect(ax - 29, 280, 15, 4);
    ctx.fillRect(ax + 19, 295, 14, 4);
    ctx.fillStyle = '#284a48';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(ax - 68, 331 + i * 34, 22, 3);
      ctx.fillRect(ax + 45, 342 + i * 34, 22, 3);
    }
    ctx.fillStyle = '#7a907058';
    ctx.fillRect(ax - 59, 374, 6, 17);
    ctx.fillRect(ax + 53, 403, 6, 17);
    const archGlow = ctx.createRadialGradient(ax, 348, 10, ax, 348, 100);
    archGlow.addColorStop(0, '#b3d2a51a');
    archGlow.addColorStop(1, '#b3d2a500');
    ctx.fillStyle = archGlow;
    ctx.fillRect(ax - 100, 248, 200, 200);

    // Pixel shelves, sand, and small stones.
    ctx.fillStyle = '#294644';
    ctx.fillRect(0, 548, WIDTH, HEIGHT - 548);
    for (let x = 0; x < WIDTH; x += 16) {
      const y = 526 + Math.round(random() * 4) * 4;
      ctx.fillStyle = '#3d5650';
      ctx.fillRect(x, y, 16, HEIGHT - y);
      ctx.fillStyle = '#527066';
      ctx.fillRect(x, y, 16, 4);
    }
    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#8a96724a' : '#1c353d66';
      ctx.fillRect(Math.floor(random() * WIDTH / 3) * 3, 549 + Math.floor(random() * 17) * 3, 3 + (i % 2) * 3, 3);
    }
    this.rock(ctx, 280, 537, 95, 46);
    this.rock(ctx, 633, 538, 78, 32);
    this.rock(ctx, 35, 543, 108, 67);
    this.rock(ctx, 907, 541, 105, 55);

    // Violet coral, tiny luminous anemones, and seaweed.
    this.coral(ctx, 91, 536, '#775c8c', '#b687ac', 1.15);
    this.coral(ctx, 295, 537, '#6a647e', '#a593aa', 0.52);
    this.coral(ctx, 680, 540, '#547573', '#88b0a2', 0.75);
    this.coral(ctx, 945, 541, '#68608c', '#9d8faf', 0.9);
    for (const [x, height] of [[30, 154], [52, 103], [125, 116], [152, 76], [349, 52], [717, 90], [742, 119], [924, 153]]) {
      this.seaweed(ctx, x!, 545, height!, '#275e58', '#408271');
    }

    for (const x of [210, 395, 573, 761]) {
      ctx.fillStyle = '#4b6973';
      ctx.fillRect(x, 526, 5, 16);
      ctx.fillStyle = '#72bbb3';
      ctx.fillRect(x - 5, 521, 15, 5);
      ctx.fillStyle = '#afe4c4';
      ctx.fillRect(x - 2, 518, 9, 3);
      const glow = ctx.createRadialGradient(x, 521, 1, x, 521, 40);
      glow.addColorStop(0, '#7de3c322');
      glow.addColorStop(1, '#7de3c300');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 40, 481, 80, 80);
    }
  }

  private rock(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    ctx.fillStyle = '#18353e';
    ctx.fillRect(x - width / 2, y - height / 2, width, height / 2 + 10);
    ctx.fillRect(x - width / 2 + 12, y - height + 8, width - 22, height / 2);
    ctx.fillRect(x - width / 2 + 23, y - height, width - 44, 9);
    ctx.fillStyle = '#31524f';
    ctx.fillRect(x - width / 2 + 23, y - height, width - 44, 5);
    ctx.fillRect(x - width / 2 + 12, y - height + 8, 5, height / 2);
    ctx.fillStyle = '#47736a';
    ctx.fillRect(x - width / 2 + 26, y - height - 3, width / 3, 4);
  }

  private coral(ctx: CanvasRenderingContext2D, x: number, y: number, dark: string, light: string, scale: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = dark;
    ctx.fillRect(-5, -61, 11, 61);
    ctx.fillRect(-25, -49, 30, 9);
    ctx.fillRect(-28, -80, 9, 38);
    ctx.fillRect(-47, -72, 27, 8);
    ctx.fillRect(-48, -94, 8, 24);
    ctx.fillRect(0, -34, 32, 9);
    ctx.fillRect(26, -69, 9, 43);
    ctx.fillRect(29, -62, 26, 8);
    ctx.fillRect(49, -83, 8, 29);
    ctx.fillRect(-3, -92, 8, 31);
    ctx.fillStyle = light;
    for (const [px, py] of [[-45, -94], [-25, -80], [0, -92], [29, -69], [52, -83]]) {
      ctx.fillRect(px! - 4, py! - 5, 11, 6);
    }
    ctx.restore();
  }

  private seaweed(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, dark: string, light: string): void {
    for (let i = 0; i < height / 8; i++) {
      const sway = Math.round(Math.sin(i * 0.38 + x) * 7 / 3) * 3;
      ctx.fillStyle = dark;
      ctx.fillRect(x + sway, y - i * 8, 7, 9);
      ctx.fillStyle = light;
      ctx.fillRect(x + sway, y - i * 8, 2, 8);
      if (i % 4 === 1) {
        ctx.fillStyle = dark;
        ctx.fillRect(x + sway + (i % 8 === 1 ? -8 : 6), y - i * 8 - 4, 9, 5);
      }
    }
  }

  private drawWater(time: number): void {
    const ctx = this.ctx;
    for (const mote of this.motes) {
      const y = (mote.y - time * mote.speed % HEIGHT + HEIGHT) % HEIGHT;
      const x = mote.x + Math.round(Math.sin(time * 0.4 + mote.y) * 5);
      ctx.fillStyle = mote.size === 3 ? '#a6d4c333' : '#add3c51a';
      ctx.fillRect(x, Math.round(y), mote.size, mote.size);
    }
    ctx.strokeStyle = '#7cc1bb44';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const x = (i % 2 === 0 ? 62 : 893) + Math.sin(time + i) * 8;
      const y = 530 - (time * 16 + i * 53) % 430;
      const size = 3 + i % 3 * 2;
      ctx.strokeRect(Math.round(x), Math.round(y), size, size);
    }
  }

  private drawForeground(time: number): void {
    const ctx = this.ctx;
    for (const [x, h] of [[12, 63], [178, 30], [591, 26], [884, 41], [954, 72]]) {
      this.seaweed(ctx, x! + Math.round(Math.sin(time + x!) * 2), HEIGHT, h!, '#123b3c', '#275550');
    }
    // Dark glass edges keep the reef feeling deep and enclosed.
    const shade = ctx.createLinearGradient(0, 0, WIDTH, 0);
    shade.addColorStop(0, '#041c304d');
    shade.addColorStop(0.16, '#041c3000');
    shade.addColorStop(0.85, '#041c3000');
    shade.addColorStop(1, '#041c304d');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

export function drawNotes(): void {
  for (const [id, type] of [['turtle-note', 'turtle'], ['shrimp-note', 'shrimp'], ['golden-note', 'golden']]) {
    const canvas = document.getElementById(id!) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    if (type === 'turtle') drawTurtle(ctx, 33, 31, 0, 1, 0.53);
    else drawShrimp(ctx, 34, 31, type === 'golden', 1.4);
    if (type === 'golden') {
      ctx.fillStyle = '#edcd87';
      ctx.fillRect(57, 12, 2, 8);
      ctx.fillRect(54, 15, 8, 2);
    }
  }
}

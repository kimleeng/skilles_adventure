import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Adventure, HEIGHT, INVINCIBILITY_SECONDS, ROUND_SECONDS, SWIM_SPEED, WIDTH } from '../src/game.ts';
import type { Entity, Kind } from '../src/game.ts';

function entity(id: number, kind: Kind, x: number, y: number): Entity {
  return { id, kind, x, y, vx: 0, vy: 0, phase: 0 };
}
function playing(): Adventure {
  const game = new Adventure(() => 0.5);
  game.start();
  game.entities = [];
  return game;
}
function advance(game: Adventure, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) game.update(Math.min(0.05, seconds - elapsed));
}

test('mouse targets produce smooth, bounded movement without teleporting', () => {
  const game = playing();
  const startX = game.player.x;
  game.aim(WIDTH + 1000, HEIGHT + 1000);
  game.update(0.05);
  const travelled = Math.hypot(game.player.x - startX, game.player.y - 300);
  assert.ok(Math.abs(travelled - SWIM_SPEED * 0.05) < 0.001);
  assert.equal(game.player.targetX, WIDTH - 50);
  assert.equal(game.player.targetY, HEIGHT - 65);
  game.aim(-1000, -1000);
  assert.equal(game.player.targetX, 50);
  assert.equal(game.player.targetY, 110);
});

test('a shrimp is collected once and a distant shrimp is untouched', () => {
  const game = playing();
  game.entities = [entity(100, 'shrimp', game.player.x, game.player.y), entity(101, 'shrimp', 800, 400)];
  game.update(0.01);
  assert.equal(game.score, 1);
  assert.deepEqual(game.events, ['shrimp']);
  assert.deepEqual(game.entities.map(({ id }) => id), [101]);
  game.update(0.01);
  assert.equal(game.score, 1);
});

test('overlapping trash costs one heart, with protection from repeated hits', () => {
  const game = playing();
  game.entities = [entity(100, 'bottle', game.player.x, game.player.y), entity(101, 'bag', game.player.x, game.player.y)];
  game.update(0.01);
  assert.equal(game.hearts, 2);
  assert.equal(game.invincible, INVINCIBILITY_SECONDS);
  game.update(0.05);
  assert.equal(game.hearts, 2);
  assert.equal(game.entities.length, 1);
  game.entities = [];
  advance(game, INVINCIBILITY_SECONDS + 0.05);
  game.entities = [entity(102, 'can', game.player.x, game.player.y)];
  game.update(0.01);
  assert.equal(game.hearts, 1);
});

test('losing three hearts ends the round and freezes movement and time', () => {
  const game = playing();
  for (let hit = 0; hit < 3; hit++) {
    game.invincible = 0;
    game.entities = [entity(100 + hit, 'bag', game.player.x, game.player.y)];
    game.update(0.01);
  }
  assert.equal(game.hearts, 0);
  assert.equal(game.status, 'lost');
  assert.ok(game.events.includes('lost'));
  const elapsed = game.elapsed;
  game.aim(900, 450);
  game.update(1);
  assert.equal(game.elapsed, elapsed);
  assert.equal(game.player.x, 365);
});

test('pause and resume freeze the entire simulation', () => {
  const game = playing();
  game.entities = [entity(100, 'shrimp', game.player.x, game.player.y)];
  game.pause();
  advance(game, 10);
  assert.equal(game.elapsed, 0);
  assert.equal(game.score, 0);
  game.resume();
  game.update(0.02);
  assert.equal(game.score, 1);
  assert.equal(game.elapsed, 0.02);
});

test('the golden shrimp appears at ten minutes, once, and must be caught to win', () => {
  const game = playing();
  game.elapsed = ROUND_SECONDS - 0.06;
  game.update(0.05);
  assert.equal(game.goldenAppeared, false);
  game.update(0.05);
  assert.equal(game.goldenAppeared, true);
  assert.equal(game.status, 'playing');
  assert.ok(game.events.includes('golden-appeared'));
  const golden = game.entities.find(({ kind }) => kind === 'golden')!;
  assert.ok(golden);
  game.update(0.05);
  assert.equal(game.entities.filter(({ kind }) => kind === 'golden').length, 1);
  game.player.x = golden.x;
  game.player.y = golden.y;
  game.aim(golden.x, golden.y);
  game.update(0.01);
  assert.equal(game.status, 'won');
  assert.ok(game.events.includes('won'));
  assert.equal(game.hearts, 3);
});

test('restart resets health, progress, golden shrimp, and collected score', () => {
  const game = playing();
  game.hearts = 0;
  game.score = 42;
  game.elapsed = 700;
  game.goldenAppeared = true;
  game.status = 'lost';
  game.start();
  assert.equal(game.status, 'playing');
  assert.equal(game.hearts, 3);
  assert.equal(game.score, 0);
  assert.equal(game.elapsed, 0);
  assert.equal(game.goldenAppeared, false);
  assert.ok(game.entities.some(({ kind }) => kind === 'shrimp'));
  assert.ok(!game.entities.some(({ kind }) => kind === 'golden'));
});

test('keyboard diagonal movement has the same speed as movement along one axis', () => {
  const game = playing();
  game.update(0.05, { x: 1, y: 1 });
  assert.ok(Math.abs(Math.hypot(game.player.x - 365, game.player.y - 300) - SWIM_SPEED * 0.05) < 0.001);
});

test('long frame delays are bounded, and replacement entities cannot spawn on Skille', () => {
  const game = playing();
  game.aim(900, 450);
  game.update(120);
  assert.equal(game.elapsed, 0.05);
  game.aim(game.player.x, game.player.y);
  advance(game, 2.5);
  assert.ok(game.entities.length > 0);
  assert.ok(game.entities.every(({ x, y }) => Math.hypot(x - game.player.x, y - game.player.y) > 150));
});

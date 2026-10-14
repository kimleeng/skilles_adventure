import './style.css';
import { Adventure, HEIGHT, ROUND_SECONDS, WIDTH } from './game.ts';
import type { GameEvent, Status } from './game.ts';
import { drawNotes, ReefRenderer } from './render.ts';

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing interface element: ${id}`);
  return value as T;
}

const canvas = element<HTMLCanvasElement>('aquarium');
const game = new Adventure();
const renderer = new ReefRenderer(canvas);
const overlay = element('overlay');
const arrowIcon = '<svg class="arrow-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16 16 4M4 4h12v12" /></svg>';
const title = element('overlay-title');
const description = element('overlay-description');
const eyebrow = element('overlay-eyebrow');
const hint = element('overlay-hint');
const details = element('round-details');
const playButton = element<HTMLButtonElement>('play-button');
const pauseButton = element<HTMLButtonElement>('pause-button');
const soundButton = element<HTMLButtonElement>('sound-button');
const helpDialog = element<HTMLDialogElement>('help-dialog');
const notice = element('notice');
const score = element('score');
const clock = element('clock');
const hearts = element('hearts');
const progress = element('journey-progress');
const keys = new Set<string>();
let lastStatus: Status | null = null;
let lastFrame = 0;
let lastHudUpdate = 0;
let noticeUntil = 0;
let resumeAfterHelp = false;
let soundEnabled = false;
let audio: AudioContext | null = null;
let best = 0;

try {
  const stored = Number(localStorage.getItem('skille:best'));
  if (Number.isFinite(stored) && stored >= 0) best = stored;
} catch { /* The adventure still works when browser storage is unavailable. */ }

function announce(message: string): void {
  notice.textContent = message;
  notice.classList.add('visible');
  noticeUntil = performance.now() + 4200;
}

function tone(frequency: number, duration: number, delay = 0, volume = 0.07): void {
  if (!soundEnabled || !audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.01);
}

function handleEvent(event: GameEvent): void {
  if (event === 'shrimp') {
    tone(620 + (game.score % 5) * 70, 0.15);
    tone(980, 0.18, 0.07, 0.04);
    if (game.score === 1) announce('Your first shrimp! Keep following the pink ones.');
    else if (game.score % 10 === 0) announce(`${game.score} shrimp! A fine feast for a little turtle.`);
  } else if (event === 'hurt') {
    tone(180, 0.3, 0, 0.09);
    announce(game.hearts > 0 ? 'Oops, drifting litter! Swim away while Skille glows.' : 'Time for a little rest. You can always dive again.');
  } else if (event === 'golden-appeared') {
    announce('There it is! Catch the golden shrimp in the glowing arch.');
    [523, 659, 784, 1047].forEach((frequency, i) => tone(frequency, 0.5, i * 0.13));
  } else if (event === 'won') {
    best = Math.max(best, game.score);
    try { localStorage.setItem('skille:best', String(best)); } catch { /* Optional record. */ }
    [523, 659, 784, 1047, 1318].forEach((frequency, i) => tone(frequency, 0.7, i * 0.13));
    announce('You found the golden shrimp. Adventure complete!');
  } else if (event === 'lost') {
    best = Math.max(best, game.score);
    try { localStorage.setItem('skille:best', String(best)); } catch { /* Optional record. */ }
  }
}

function syncInterface(): void {
  score.textContent = String(game.score).padStart(2, '0');
  hearts.setAttribute('aria-label', `${game.hearts} of 3 hearts`);
  Array.from(hearts.children).forEach((heart, i) => heart.classList.toggle('empty', i >= game.hearts));
  const remaining = Math.max(0, Math.ceil(ROUND_SECONDS - game.elapsed));
  clock.textContent = game.goldenAppeared ? '✦ READY' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  element('clock-label').textContent = game.goldenAppeared ? 'CATCH THE GOLDEN SHRIMP' : 'UNTIL THE GOLDEN SHRIMP';
  const percent = Math.min(game.elapsed / ROUND_SECONDS * 100, 100);
  element('journey-fill').style.width = `${percent}%`;
  progress.setAttribute('aria-valuenow', String(Math.round(percent)));
  element('journey-label').textContent = game.status === 'won' ? 'ADVENTURE COMPLETE' : 'YOUR JOURNEY';
  pauseButton.disabled = !['playing', 'paused'].includes(game.status);
  pauseButton.setAttribute('aria-label', game.status === 'paused' ? 'Resume adventure' : 'Pause adventure');
  pauseButton.title = game.status === 'paused' ? 'Resume (P or Escape)' : 'Pause (P or Escape)';
  pauseButton.innerHTML = game.status === 'paused' ? '<span class="resume-symbol" aria-hidden="true"></span>' : '<span class="pause-symbol" aria-hidden="true"></span>';

  if (lastStatus === game.status) return;
  lastStatus = game.status;
  overlay.classList.toggle('hidden', game.status === 'playing');
  keys.clear();
  details.hidden = false;
  if (game.status === 'ready') {
    if (matchMedia('(pointer: coarse)').matches) hint.textContent = 'DRAG YOUR FINGER TO SWIM';
  } else if (game.status === 'paused') {
    eyebrow.textContent = 'THE REEF WILL WAIT';
    title.innerHTML = 'Catch your breath.<br /><em>Stay a little longer.</em>';
    description.textContent = 'Your adventure is paused. Skille will be right here when you’re ready to swim again.';
    playButton.innerHTML = `Keep swimming ${arrowIcon}`;
    hint.textContent = 'PRESS P OR ESC TO RESUME';
    details.textContent = `${game.score} shrimp caught · ${game.hearts} hearts left`;
  } else if (game.status === 'won') {
    eyebrow.textContent = 'YOU FOLLOWED THE GLOW';
    title.innerHTML = 'A golden discovery.<br /><em>What an adventure.</em>';
    description.textContent = `Skille found the golden shrimp, and ${game.score} tasty shrimp along the way. The reef holds a little less mystery now.`;
    playButton.innerHTML = `Dive again ${arrowIcon}`;
    hint.textContent = 'THERE’S ALWAYS MORE TO EXPLORE';
    details.textContent = `Your best feast: ${best} shrimp`;
  } else if (game.status === 'lost') {
    eyebrow.textContent = 'EVERY EXPLORER NEEDS A REST';
    title.innerHTML = 'The reef can wait.<br /><em>Try another little dive.</em>';
    description.textContent = `You caught ${game.score} shrimp! Give Skille a fresh start, and watch out for the bottles, cans, and bags drifting through the water.`;
    playButton.innerHTML = `Try again ${arrowIcon}`;
    hint.textContent = 'A NEW ADVENTURE. THREE FRESH HEARTS.';
    details.textContent = `Your best feast: ${best} shrimp`;
  }
  if (['won', 'lost', 'paused'].includes(game.status) && !helpDialog.open) playButton.focus({ preventScroll: true });
}

playButton.addEventListener('click', () => {
  if (game.status === 'paused') game.resume();
  else {
    game.start();
    announce('Follow your mouse. Pink shrimp are delicious; drifting litter isn’t.');
    tone(392, 0.4);
    tone(587, 0.5, 0.12);
  }
  syncInterface();
});

function togglePause(): void {
  if (helpDialog.open) return;
  if (game.status === 'playing') game.pause();
  else if (game.status === 'paused') game.resume();
  syncInterface();
}
pauseButton.addEventListener('click', togglePause);

soundButton.addEventListener('click', async () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    try {
      audio ??= new AudioContext();
      if (audio.state === 'suspended') await audio.resume();
      tone(659, 0.2);
    } catch {
      soundEnabled = false;
      announce('Sound is unavailable in this browser. You can still explore.');
    }
  }
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.setAttribute('aria-label', soundEnabled ? 'Turn sound off' : 'Turn sound on');
  soundButton.title = soundEnabled ? 'Turn sound off' : 'Turn sound on';
  element('sound-label').textContent = soundEnabled ? 'Sound on' : 'Sound off';
});

element('help-button').addEventListener('click', () => {
  resumeAfterHelp = game.status === 'playing';
  game.pause();
  helpDialog.showModal();
  syncInterface();
});
element('help-done').addEventListener('click', () => helpDialog.close());
helpDialog.addEventListener('close', () => {
  if (resumeAfterHelp) game.resume();
  resumeAfterHelp = false;
  syncInterface();
});

function aimFromPointer(event: PointerEvent): void {
  if (game.status !== 'playing') return;
  const bounds = canvas.getBoundingClientRect();
  game.aim((event.clientX - bounds.left) / bounds.width * WIDTH, (event.clientY - bounds.top) / bounds.height * HEIGHT);
}
canvas.addEventListener('pointermove', aimFromPointer);
canvas.addEventListener('pointerdown', (event) => {
  if (game.status !== 'playing') return;
  canvas.setPointerCapture(event.pointerId);
  aimFromPointer(event);
});

window.addEventListener('keydown', (event) => {
  if (helpDialog.open) return;
  const key = event.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key) && game.status === 'playing') {
    event.preventDefault();
    keys.add(key);
  }
  if ((key === 'p' || key === 'escape') && !event.repeat) {
    event.preventDefault();
    togglePause();
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));

function pauseWhenAway(): void {
  keys.clear();
  game.pause();
  syncInterface();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseWhenAway(); });
window.addEventListener('blur', pauseWhenAway);

function frame(now: number): void {
  const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
  lastFrame = now;
  if (game.status === 'playing') {
    game.update(dt, {
      x: Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a')),
      y: Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w')),
    });
    game.events.forEach(handleEvent);
    if (game.status !== lastStatus || game.events.length > 0 || now - lastHudUpdate >= 200) {
      syncInterface();
      lastHudUpdate = now;
    }
  }
  if (noticeUntil && now >= noticeUntil) {
    notice.classList.remove('visible');
    noticeUntil = 0;
  }
  renderer.draw(game, now / 1000);
  requestAnimationFrame(frame);
}

drawNotes();
syncInterface();
requestAnimationFrame(frame);

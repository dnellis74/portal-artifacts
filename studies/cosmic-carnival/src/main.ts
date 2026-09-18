import "@fontsource/archivo-black/400.css";
import "./styles.css";
import { Leaderboard } from "./leaderboard";
import { Synth } from "./audio/synth";
import { GameSimulation, type GameEvent } from "./game/simulation";
import { Controls } from "./input/controls";
import { GameRenderer } from "./render/game-renderer";

type AppState = "loading" | "title" | "playing" | "wave-clear" | "paused" | "game-over" | "error";

const root = document.querySelector<HTMLElement>("#app")!;
const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const loading = document.querySelector<HTMLElement>("#loading")!;
const loadBar = document.querySelector<HTMLElement>("#load-bar")!;
const loadStatus = document.querySelector<HTMLElement>("#load-status")!;
const retry = document.querySelector<HTMLButtonElement>("#retry")!;
const title = document.querySelector<HTMLElement>("#title")!;
const hud = document.querySelector<HTMLElement>("#hud")!;
const pauseScreen = document.querySelector<HTMLElement>("#pause")!;
const gameOverScreen = document.querySelector<HTMLElement>("#game-over")!;
const touchControls = document.querySelector<HTMLElement>("#touch-controls")!;
const message = document.querySelector<HTMLElement>("#message")!;
const scoreEl = document.querySelector<HTMLElement>("#score")!;
const waveEl = document.querySelector<HTMLElement>("#wave")!;
const livesEl = document.querySelector<HTMLElement>("#lives")!;
const bestEl = document.querySelector<HTMLElement>("#best")!;
const finalScore = document.querySelector<HTMLElement>("#final-score")!;
const finalBest = document.querySelector<HTMLElement>("#final-best")!;
const finalWave = document.querySelector<HTMLElement>("#final-wave")!;
const help = document.querySelector<HTMLDialogElement>("#help")!;
const effectsButton = document.querySelector<HTMLButtonElement>("#effects")!;

const leaderboard = new Leaderboard();
let starting = false;
const game = new GameSimulation();
const view = new GameRenderer(canvas);
const synth = new Synth();
let state: AppState = "loading";
let stateBeforePause: AppState = "playing";
let bestScore = readNumber("cosmic-carnival-best");
let lowEffects = readBoolean("cosmic-carnival-low-fx");
let waveClearTimer = 0;
let lastTime = performance.now();
let accumulator = 0;

view.setLowEffects(lowEffects);
effectsButton.textContent = lowEffects ? "LOW FX" : "FULL FX";
effectsButton.setAttribute("aria-pressed", String(lowEffects));

const controls = new Controls(canvas, {
  move: (direction) => {
    if (state === "playing") game.move(direction);
  },
  fire: () => {
    if (state !== "playing") return;
    for (const event of game.fire()) handleEvent(event);
  },
  start: () => {
    if (document.querySelector("dialog[open]")) return;
    if (state === "title" || state === "game-over") void startGame();
    else if (state === "paused") resumeGame();
  },
  pause: () => togglePause(),
  mute: () => toggleMute(),
});

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function readBoolean(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Gameplay remains available when storage is blocked.
  }
}

function setState(next: AppState): void {
  state = next;
  root.dataset.state = next;
  loading.classList.toggle("hidden", next !== "loading" && next !== "error");
  title.classList.toggle("hidden", next !== "title");
  hud.classList.toggle("hidden", !["playing", "wave-clear", "paused"].includes(next));
  pauseScreen.classList.toggle("hidden", next !== "paused");
  gameOverScreen.classList.toggle("hidden", next !== "game-over");
  touchControls.classList.toggle("hidden", !["playing"].includes(next));
  controls.setEnabled(next === "playing");
  if (next !== "wave-clear") message.classList.add("hidden");
}

async function loadAssets(): Promise<void> {
  setState("loading");
  retry.classList.add("hidden");
  loadBar.style.width = "0%";
  loadStatus.textContent = "Loading carnival sculptures… 0%";
  try {
    await view.load((progress, label) => {
      loadBar.style.width = `${Math.round(progress * 100)}%`;
      loadStatus.textContent = `${label} · ${Math.round(progress * 100)}%`;
    });
    setState("title");
    updateHud();
    requestAnimationFrame(() => title.classList.add("title-screen--revealed"));
  } catch (error) {
    console.error("Cosmic Carnival failed to load its models", error);
    setState("error");
    loadStatus.textContent = "The model caravan missed the gate. Check your connection and retry.";
    retry.classList.remove("hidden");
  }
}

async function startGame(): Promise<void> {
  if (starting || document.querySelector("dialog[open]")) return;
  starting = true;
  const startButtons = document.querySelectorAll<HTMLButtonElement>("#start, #restart");
  startButtons.forEach(button => { button.disabled = true; });
  await Promise.all([synth.unlock().catch(() => undefined), leaderboard.start()]);
  starting = false;
  startButtons.forEach(button => { button.disabled = false; });
  accumulator = 0;
  lastTime = performance.now();
  game.reset();
  view.reset();
  updateHud();
  setState("playing");
  canvas.focus();
}

function togglePause(): void {
  if (state === "playing" || state === "wave-clear") {
    stateBeforePause = state;
    setState("paused");
  } else if (state === "paused") {
    resumeGame();
  }
}

function resumeGame(): void {
  setState(stateBeforePause === "wave-clear" ? "wave-clear" : "playing");
  canvas.focus();
  lastTime = performance.now();
}

function toggleMute(): void {
  synth.toggle();
  syncMuteUI();
}

function syncMuteUI(): void {
  const muted = synth.isMuted;
  document.querySelector<HTMLButtonElement>("#title-mute")!.textContent = muted ? "SOUND OFF" : "SOUND ON";
  document.querySelector<HTMLButtonElement>("#title-mute")!.setAttribute("aria-pressed", String(muted));
  document.querySelector<HTMLButtonElement>("#hud-mute")!.textContent = muted ? "×" : "♪";
  document.querySelector<HTMLButtonElement>("#hud-mute")!.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
}

function handleEvent(event: GameEvent): void {
  if (event.type === "shot") synth.play("shot");
  if (event.type === "hit") {
    synth.play(event.destroyed ? "destroy" : "hit");
    view.flashAt(event.enemy, event.destroyed ? 0xffe29a : 0xee91bb);
  }
  if (event.type === "breach") {
    view.flashBreach(event.lane);
    if (event.damaged) synth.play("breach");
  }
  if (event.type === "wave-clear") {
    state = "wave-clear";
    setState("wave-clear");
    waveClearTimer = 1.55;
    message.textContent = `WAVE ${event.wave} CLEARED`;
    message.classList.remove("hidden");
    synth.play("wave");
  }
  if (event.type === "game-over") endGame();
  updateHud();
}

function endGame(): void {
  if (game.score > bestScore) {
    bestScore = game.score;
    save("cosmic-carnival-best", String(bestScore));
  }
  finalScore.textContent = game.score.toLocaleString();
  finalBest.textContent = bestScore.toLocaleString();
  finalWave.textContent = String(game.wave);
  synth.play("game-over");
  setState("game-over");
  leaderboard.finish(game.score, game.wave);
}

function updateHud(): void {
  scoreEl.textContent = String(game.score).padStart(6, "0");
  waveEl.textContent = String(game.wave).padStart(2, "0");
  livesEl.textContent = Array.from({ length: game.lives }, () => "◆").join(" ") || "—";
  bestEl.textContent = String(Math.max(bestScore, game.score)).padStart(6, "0");
}

function frame(now: number): void {
  const rawDelta = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  if (state === "playing") {
    controls.update(rawDelta);
    accumulator = Math.min(accumulator + rawDelta, 0.15);
    while (accumulator >= 1 / 60) {
      for (const event of game.step(1 / 60)) handleEvent(event);
      accumulator -= 1 / 60;
      if (state !== "playing") break;
    }
  } else if (state === "wave-clear") {
    waveClearTimer -= rawDelta;
    if (waveClearTimer <= 0) {
      game.beginWave(game.wave + 1);
      message.classList.add("hidden");
      setState("playing");
      updateHud();
    }
  }
  const viewMode = state === "title" || state === "loading" || state === "error"
    ? "title"
    : state === "paused" ? "paused" : state === "game-over" ? "game-over" : "playing";
  view.render(game.snapshot(), rawDelta, now / 1000, viewMode);
  requestAnimationFrame(frame);
}

document.querySelector<HTMLButtonElement>("#start")!.addEventListener("click", () => void startGame());
document.querySelector<HTMLButtonElement>("#restart")!.addEventListener("click", () => void startGame());
document.querySelector<HTMLButtonElement>("#resume")!.addEventListener("click", resumeGame);
document.querySelector<HTMLButtonElement>("#title-mute")!.addEventListener("click", toggleMute);
document.querySelector<HTMLButtonElement>("#hud-mute")!.addEventListener("click", toggleMute);
document.querySelector<HTMLButtonElement>("#help-open")!.addEventListener("click", () => help.showModal());
document.querySelector<HTMLButtonElement>("#help-close")!.addEventListener("click", () => help.close());
retry.addEventListener("click", () => void loadAssets());
effectsButton.addEventListener("click", () => {
  lowEffects = !lowEffects;
  save("cosmic-carnival-low-fx", String(lowEffects));
  view.setLowEffects(lowEffects);
  effectsButton.textContent = lowEffects ? "LOW FX" : "FULL FX";
  effectsButton.setAttribute("aria-pressed", String(lowEffects));
});

document.addEventListener("visibilitychange", () => {
  controls.clearHeld();
  if (document.hidden && (state === "playing" || state === "wave-clear")) togglePause();
});

syncMuteUI();
setState("loading");
requestAnimationFrame(frame);
void loadAssets();

declare global {
  interface Window {
    __cosmicCarnival?: {
      state: () => AppState;
      snapshot: () => ReturnType<GameSimulation["snapshot"]>;
    };
  }
}

window.__cosmicCarnival = {
  state: () => state,
  snapshot: () => game.snapshot(),
};

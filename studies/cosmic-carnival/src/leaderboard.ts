const BASE = '/leaderboard-api/cosmic-carnival';
const VERSION = '1';
const portalURL = 'https://portal.raidguild.org/modules/cosmic-carnival';
export class Leaderboard {
  private authenticated = false;
  private ready: Promise<void>;
  private run: { id: string; started: number } | null = null;
  private generation = 0;
  private dialog = document.querySelector<HTMLDialogElement>('#leaderboard')!;
  private status = document.querySelector<HTMLElement>('#ranked-status')!;
  private result = document.querySelector<HTMLElement>('#ranked-result')!;
  private list = document.querySelector<HTMLOListElement>('#leaderboard-list')!;
  private retry: (() => void) | null = null;

  constructor() {
    document.querySelectorAll<HTMLAnchorElement>('[data-portal-launch]').forEach(a => { a.href = portalURL; });
    document.querySelectorAll<HTMLButtonElement>('[data-leaderboard-open]').forEach(button => button.addEventListener('click', () => {
      this.dialog.showModal(); void this.load();
    }));
    document.querySelector('#leaderboard-close')!.addEventListener('click', () => this.dialog.close());
    document.querySelector('#ranked-retry')!.addEventListener('click', () => this.retry?.());
    this.ready = this.initialize();
  }
  private async request(path: string, body?: unknown): Promise<any> {
    const response = await fetch(`${BASE}${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      if (response.status === 401) this.authenticated = false;
      throw new Error(response.status === 401 ? 'Launch from Portal to join the leaderboard.' : 'Leaderboard unavailable. Your local best is saved.');
    }
    return response.json();
  }
  private async initialize(): Promise<void> {
    // Scripts-only sandbox embeds remain guest experiences, independent of cookies.
    if (window.self !== window.top) { this.status.textContent = 'Guest play · Open in Portal for ranked runs'; return; }
    const url = new URL(location.href);
    const failedLaunch = url.searchParams.get('ranked') === 'launch-failed';
    if (failedLaunch) { url.searchParams.delete('ranked'); history.replaceState(null, '', url); }
    try {
      const session = await this.request('/session');
      this.authenticated = true;
      this.status.textContent = `Ranked play · ${session.displayName}`;
    } catch {
      this.status.textContent = failedLaunch ? 'Portal launch expired. Launch again to play ranked.' : 'Guest play · Local best saved on this device';
    }
  }
  async start(): Promise<void> {
    const generation = ++this.generation;
    this.run = null; this.retry = null;
    document.querySelector('#ranked-retry')!.classList.add('hidden');
    this.result.textContent = 'Local run · Launch from Portal to join the leaderboard';
    await this.ready;
    if (!this.authenticated) return;
    try {
      const run = await this.request('/runs', { version:VERSION });
      if (generation === this.generation) {
        this.run = { id:run.runId, started:performance.now() };
        this.result.textContent = 'Ranked run';
      }
    } catch (e) { this.result.textContent = `${(e as Error).message} Playing locally.`; }
  }
  finish(score: number, wave: number): void {
    const run = this.run; this.run = null;
    if (!run) return;
    const generation = this.generation;
    const payload = { version:VERSION, score, wave, durationMs:Math.round(performance.now()-run.started) };
    const submit = async () => {
      if (generation !== this.generation) return;
      this.result.textContent = 'Saving ranked score…';
      document.querySelector('#ranked-retry')!.classList.add('hidden');
      try {
        await this.request(`/runs/${run.id}/finish`,payload);
        if (generation === this.generation) { this.result.textContent = 'Score saved to the Portal leaderboard'; this.retry = null; }
      } catch (e) {
        if (generation === this.generation) {
          this.result.textContent = (e as Error).message;
          this.retry = () => { void submit(); };
          document.querySelector('#ranked-retry')!.classList.remove('hidden');
        }
      }
    };
    void submit();
  }
  private async load(): Promise<void> {
    const message = document.querySelector<HTMLElement>('#leaderboard-message')!;
    this.list.replaceChildren(); message.textContent = 'Loading scores…';
    try {
      const board = await this.request('/leaderboard');
      message.textContent = board.entries.length ? 'Best run per player · Scoring version 1' : 'No ranked scores yet. Be the first through the spiral.';
      for (const entry of board.entries) {
        const li = document.createElement('li');
        const name = document.createElement('span'); name.textContent = entry.displayName;
        const score = document.createElement('strong'); score.textContent = Number(entry.score).toLocaleString();
        li.append(name,score); this.list.append(li);
      }
    } catch { message.textContent = 'Leaderboard unavailable here. You can keep playing locally.'; }
  }
}

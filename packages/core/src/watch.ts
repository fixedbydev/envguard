import { watch, type FSWatcher } from 'node:fs';
import { EventEmitter } from 'node:events';

/** Events emitted by the env file watcher. */
export interface WatcherEvents {
  change: [env: Record<string, unknown>];
  error: [error: Error];
}

/**
 * Typed event emitter for env file watch events.
 */
export class EnvWatcher extends EventEmitter {
  private _watcher: FSWatcher | null = null;
  private _path: string;
  private _revalidate: () => Record<string, unknown>;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(path: string, revalidate: () => Record<string, unknown>) {
    super();
    this._path = path;
    this._revalidate = revalidate;
  }

  /**
   * Start watching the .env file for changes.
   * Emits `'change'` with the re-validated env on file change.
   * Emits `'error'` if re-validation fails.
   */
  start(): void {
    if (this._watcher) return;

    this._watcher = watch(this._path, () => {
      // Debounce rapid changes
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        try {
          const env = this._revalidate();
          this.emit('change', env);
        } catch (err) {
          this.emit('error', err instanceof Error ? err : new Error(String(err)));
        }
      }, 100);
    });
  }

  /**
   * Stop watching the .env file.
   */
  close(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }
}

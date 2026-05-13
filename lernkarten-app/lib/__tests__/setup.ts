// Test-Setup: Stellt eine simple, in-memory localStorage-Implementierung bereit.
// Wird verwendet, weil jsdom 27 + Vitest 2 unter Node 22 wegen eines CJS/ESM-
// Konflikts in @csstools/css-calc nicht bootbar ist. Für unsere lib-Tests reicht
// ein localStorage-Polyfill völlig aus.

class InMemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const speicher = new InMemoryStorage();

// Stelle `localStorage` und `window.localStorage` global bereit.
const g = globalThis as unknown as {
  localStorage?: Storage;
  window?: { localStorage: Storage };
};

g.localStorage = speicher;
g.window = { localStorage: speicher };

/**
 * Seeded Pseudo-Random Number Generator (mulberry32)
 *
 * A fast, simple, deterministic 32-bit PRNG suitable for game-like
 * applications.  The same seed always produces the same sequence.
 *
 * Reference: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 *
 * Usage:
 *   const rng = createRng(seed);
 *   rng.next();        // float in [0, 1)
 *   rng.nextInt(n);    // integer in [0, n)
 *   rng.pick(array);   // random element
 */

export type Rng = {
  /** Returns a float in [0, 1). */
  next: () => number;
  /** Returns an integer in [0, n). */
  nextInt: (n: number) => number;
  /** Returns a random element from a non-empty readonly array. */
  pick: <T>(arr: readonly T[]) => T;
};

/**
 * Create a seeded RNG.  `seed` must be a 32-bit unsigned integer (0–2³²−1).
 * Non-integer seeds are floored; negative seeds are wrapped via `>>> 0`.
 */
export function createRng(seed: number): Rng {
  let s = seed >>> 0; // coerce to uint32

  function next(): number {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    z = (z ^ (z >>> 14)) >>> 0;
    return z / 0x100000000;
  }

  function nextInt(n: number): number {
    return Math.floor(next() * n);
  }

  function pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) {
      throw new Error("Cannot pick from an empty array.");
    }
    return arr[nextInt(arr.length)] as T;
  }

  return { next, nextInt, pick };
}

/**
 * Derive a deterministic numeric seed from a string key.
 * Uses a simple djb2-style hash so the same key always gives the same seed.
 */
export function seedFromString(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = (Math.imul(hash, 33) ^ key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

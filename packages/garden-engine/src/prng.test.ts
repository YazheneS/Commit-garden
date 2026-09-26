import { describe, it, expect } from "vitest";
import { createRng, seedFromString } from "./prng.js";

describe("createRng", () => {
  it("produces values in [0, 1)", () => {
    const rng = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("same seed produces identical sequence", () => {
    const a = createRng(12345);
    const b = createRng(12345);
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("different seeds produce different sequences", () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("seed 0 does not crash", () => {
    const rng = createRng(0);
    expect(() => rng.next()).not.toThrow();
  });
});

describe("createRng — nextInt", () => {
  it("produces integers in [0, n)", () => {
    const rng = createRng(99);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });

  it("nextInt(1) always returns 0", () => {
    const rng = createRng(7);
    for (let i = 0; i < 10; i++) {
      expect(rng.nextInt(1)).toBe(0);
    }
  });
});

describe("createRng — pick", () => {
  it("always returns an element from the array", () => {
    const arr = ["a", "b", "c", "d"] as const;
    const rng = createRng(42);
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it("pick from a single-element array always returns that element", () => {
    const rng = createRng(1);
    expect(rng.pick(["only"] as const)).toBe("only");
  });

  it("throws on empty array", () => {
    const rng = createRng(1);
    expect(() => rng.pick([] as const)).toThrow();
  });

  it("same seed picks the same element", () => {
    const arr = ["x", "y", "z"] as const;
    expect(createRng(55).pick(arr)).toBe(createRng(55).pick(arr));
  });
});

describe("seedFromString", () => {
  it("returns a non-negative integer", () => {
    const s = seedFromString("hello");
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
  });

  it("same string produces same seed", () => {
    expect(seedFromString("garden-1:1")).toBe(seedFromString("garden-1:1"));
  });

  it("different strings produce different seeds (no trivial collisions)", () => {
    const keys = ["a", "b", "ab", "ba", "garden-1:1", "garden-1:2", "garden-2:1"];
    const seeds = keys.map(seedFromString);
    const unique = new Set(seeds);
    expect(unique.size).toBe(keys.length);
  });

  it("empty string does not crash", () => {
    expect(() => seedFromString("")).not.toThrow();
  });
});

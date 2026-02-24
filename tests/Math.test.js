import { describe, it, expect } from 'vitest';
import { clamp, lerp, remap, smoothstep } from '../src/utils/Math.js';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles equal min and max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  it('handles boundary values exactly', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('returns a when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint when t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('extrapolates beyond 0-1', () => {
    expect(lerp(0, 10, 2)).toBe(20);
    expect(lerp(0, 10, -1)).toBe(-10);
  });
});

describe('remap', () => {
  it('maps value from one range to another', () => {
    expect(remap(5, 0, 10, 0, 100)).toBe(50);
  });

  it('clamps output to target range', () => {
    expect(remap(15, 0, 10, 0, 100)).toBe(100);
    expect(remap(-5, 0, 10, 0, 100)).toBe(0);
  });

  it('handles inverted output range', () => {
    expect(remap(5, 0, 10, 100, 0)).toBe(50);
  });

  it('maps minimum to outMin', () => {
    expect(remap(0, 0, 10, 20, 30)).toBe(20);
  });

  it('maps maximum to outMax', () => {
    expect(remap(10, 0, 10, 20, 30)).toBe(30);
  });
});

describe('smoothstep', () => {
  it('returns 0 at edge0', () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
  });

  it('returns 1 at edge1', () => {
    expect(smoothstep(0, 1, 1)).toBe(1);
  });

  it('returns 0.5 at midpoint', () => {
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });

  it('clamps below edge0', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
  });

  it('clamps above edge1', () => {
    expect(smoothstep(0, 1, 2)).toBe(1);
  });

  it('produces smooth curve (derivative = 0 at edges)', () => {
    const nearZero = smoothstep(0, 1, 0.01);
    const nearOne = smoothstep(0, 1, 0.99);
    // Values near edges should be very close to 0 and 1
    expect(nearZero).toBeLessThan(0.01);
    expect(nearOne).toBeGreaterThan(0.99);
  });
});

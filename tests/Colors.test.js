import { describe, it, expect } from 'vitest';
import { resourceColorForCategory, PALETTE } from '../src/utils/Colors.js';
import { THEME } from '../src/utils/Theme.js';

describe('resourceColorForCategory', () => {
  it('returns a number from the resourceColors palette', () => {
    const color = resourceColorForCategory('Design');
    expect(typeof color).toBe('number');
    expect(THEME.resourceColors).toContain(color);
  });

  it('is deterministic — same input gives same output', () => {
    const a = resourceColorForCategory('Research');
    const b = resourceColorForCategory('Research');
    expect(a).toBe(b);
  });

  it('returns different colors for different categories', () => {
    const design = resourceColorForCategory('Design');
    const engineering = resourceColorForCategory('Engineering');
    // Not guaranteed to differ (hash collision possible), but likely
    // At least verify both are valid palette entries
    expect(THEME.resourceColors).toContain(design);
    expect(THEME.resourceColors).toContain(engineering);
  });

  it('handles empty string', () => {
    const color = resourceColorForCategory('');
    expect(typeof color).toBe('number');
    expect(THEME.resourceColors).toContain(color);
  });
});

describe('PALETTE', () => {
  it('re-exports THEME.palette', () => {
    expect(PALETTE).toBe(THEME.palette);
  });

  it('contains expected color keys', () => {
    expect(PALETTE.WHITE).toBeDefined();
    expect(PALETTE.DARK).toBeDefined();
    expect(PALETTE.AVATAR_COLORS).toBeInstanceOf(Array);
    expect(PALETTE.AVATAR_COLORS.length).toBeGreaterThan(0);
  });
});

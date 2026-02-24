import { THEME } from './Theme.js';

// Backward-compatible re-exports — UI files keep importing from here
export const PALETTE = THEME.palette;

// Deterministic resource color from category name
export function resourceColorForCategory(category) {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash + category.charCodeAt(i)) | 0;
  }
  return THEME.resourceColors[Math.abs(hash) % THEME.resourceColors.length];
}

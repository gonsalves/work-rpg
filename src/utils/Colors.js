export const PALETTE = {
  WHITE:      '#FFFFFF',
  LIGHT_GREY: '#F0F0F0',
  MID_GREY:   '#B0B0B0',
  DARK:       '#2C2C2C',

  RED:    '#E8422F',
  BLUE:   '#0078D7',
  ORANGE: '#FF6F00',
  GREEN:  '#4CAF50',
  YELLOW: '#FFC107',

  // Terrain
  TERRAIN_GRASS:  '#4a7c3f',
  TERRAIN_DIRT:   '#8b7355',
  TERRAIN_STONE:  '#808080',
  TERRAIN_WATER:  '#3d6b8e',
  TERRAIN_FOREST: '#2d5a2d',

  // Game elements
  FOG_COLOR:      '#1a1a2e',
  BASE_COLOR:     '#c4a882',
  STRUCTURE_GOLD: '#d4af37',

  AVATAR_COLORS: [
    '#E8422F', '#0078D7', '#FF6F00', '#4CAF50',
    '#9C27B0', '#00BCD4', '#FF5722', '#607D8B',
    '#E91E63', '#3F51B5', '#009688', '#795548',
  ],
};

// Dynamic resource type color mapping (deterministic from category name)
const RESOURCE_COLORS = [
  0xffd700, // gold
  0xe74c3c, // red berries
  0x808080, // stone
  0x8b4513, // wood
  0x2ecc71, // herbs
  0x3498db, // crystal
  0x9b59b6, // amethyst
  0xe67e22, // copper
];

export function resourceColorForCategory(category) {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash + category.charCodeAt(i)) | 0;
  }
  return RESOURCE_COLORS[Math.abs(hash) % RESOURCE_COLORS.length];
}

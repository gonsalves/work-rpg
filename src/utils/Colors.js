export const PALETTE = {
  WHITE:      '#F0EBE3',
  LIGHT_GREY: '#E8E4DC',
  MID_GREY:   '#888888',
  DARK:       '#1A1A1A',

  RED:    '#C0A090',
  BLUE:   '#A0AAB8',
  ORANGE: '#C0B090',
  GREEN:  '#8A9A7C',
  YELLOW: '#C8C0A0',

  // Terrain
  TERRAIN_GRASS:  '#E8E4DC',
  TERRAIN_DIRT:   '#D8D2C8',
  TERRAIN_STONE:  '#CCC8C0',
  TERRAIN_WATER:  '#1A1A1A',
  TERRAIN_FOREST: '#C5CCBF',

  // Game elements
  FOG_COLOR:      '#000000',
  BASE_COLOR:     '#E0DAD0',
  STRUCTURE_GOLD: '#F5F0E8',

  AVATAR_COLORS: [
    '#D4C4B0', '#BFC0C5', '#C8BDA8', '#ADB0B5',
    '#D0C0A8', '#B5B8A8', '#C0B0A0', '#A8AABB',
    '#BBB0A0', '#B0B8B0', '#C5B5A5', '#A5A5A5',
  ],
};

// Dynamic resource type color mapping (deterministic from category name)
const RESOURCE_COLORS = [
  0xF0EBE3, // bright ivory
  0xE0DAD0, // warm cream
  0xCCC8C0, // cool cream
  0xD8D2C8, // mid cream
  0xB8B8B0, // grey-green
  0xC0BAB0, // dusty cream
  0xA8A8A8, // neutral grey
  0xD0C8BC, // warm grey
];

export function resourceColorForCategory(category) {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash + category.charCodeAt(i)) | 0;
  }
  return RESOURCE_COLORS[Math.abs(hash) % RESOURCE_COLORS.length];
}

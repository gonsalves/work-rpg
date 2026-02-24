/**
 * Theme.js — Single source of truth for ALL visual constants.
 *
 * Every 3D scene color, material property, lighting parameter, and
 * texture setting lives here. Consumer files import THEME and reference
 * values by domain (scene, lighting, terrain, trees, avatar, etc.).
 *
 * To reskin the game, edit this one file.
 */

export const THEME = {

  // ─── Scene ──────────────────────────────────────────────────────
  scene: {
    background: 0xF5F5F5,
    toneMappingExposure: 1.1,
  },

  // ─── Lighting ───────────────────────────────────────────────────
  lighting: {
    ambient: {
      color: 0xffffff,
      intensity: 1.0,
    },
    directional: {
      color: 0xffffff,
      intensity: 0.6,
      position: [20, 40, 15],
      shadow: {
        mapSize: 4096,
        near: 0.5,
        far: 120,
        extent: 50,
        bias: -0.0003,
        normalBias: 0.03,
      },
    },
    fill: {
      color: 0xffffff,
      intensity: 0.3,
      position: [-15, 20, -10],
    },
    hemisphere: {
      skyColor: 0xffffff,
      groundColor: 0xE8E8E8,
      intensity: 0.4,
    },
  },

  // ─── Terrain Tiles ──────────────────────────────────────────────
  terrain: {
    tiles: {
      grass:  0xF0F0F0,
      dirt:   0xE0E0E0,
      stone:  0xD8D8D8,
      water:  0x5BA4CF,
      forest: 0xE8EDE5,
    },
    fallbackColor: 0xDDDDDD,
    material: {
      roughness: 0.95,
      metalness: 0,
    },
  },

  // ─── Terrain Textures (Canvas2D procedural generation) ──────────
  terrainTextures: {
    grass: {
      base: '#F0F0F0',
      noiseScale: 40,
      noiseAmplitude: 5,
    },
    dirt: {
      base: '#E0E0E0',
      noiseScale: 30,
      noiseAmplitude: 5,
      crackColor: 'rgba(200, 200, 200, 0.06)',
    },
    stone: {
      base: '#D8D8D8',
      shadeMin: 210,
      shadeRange: 12,
    },
    water: {
      base: '#5BA4CF',
      noiseScale: 50,
      noiseAmplitude: 4,
    },
    forest: {
      base: '#E8EDE5',
      noiseScale: 35,
      noiseAmplitude: 5,
    },
  },

  // ─── Trees ──────────────────────────────────────────────────────
  trees: {
    trunk: {
      color: 0xD0D0D0,
      roughness: 0.9,
      metalness: 0,
    },
    crown: {
      color: 0x6DBE6D,   // Bright matte green
      roughness: 0.85,
      metalness: 0,
    },
  },

  // ─── Resource Nodes ─────────────────────────────────────────────
  resourceNodes: {
    marker: {
      color: 0x6DBE6D,
      roughness: 0.5,
      metalness: 0.02,
    },
    pedestal: {
      color: 0xE0E0E0,
      roughness: 0.9,
      metalness: 0,
    },
    depleted: {
      color: 0xCCCCCC,
      opacity: 0.35,
    },
  },

  // ─── Structures (Milestones) ────────────────────────────────────
  structures: {
    wireframe: {
      color: 0xD0D0D0,
      opacity: 0.25,
    },
    solid: {
      color: 0xF0F0F0,
      roughness: 0.8,
      metalness: 0,
    },
    complete: {
      color: 0xFAFAFA,
      emissiveColor: 0xFAFAFA,
      emissiveIntensity: 0.03,
    },
  },

  // ─── Base (Town Center) ─────────────────────────────────────────
  base: {
    platform: { color: 0xFAFAFA, roughness: 0.8, metalness: 0 },
    walls:    { color: 0xF0F0F0, roughness: 0.8, metalness: 0 },
    roof:     { color: 0xE8E8E8, roughness: 0.85, metalness: 0 },
    pole:     { color: 0xBBBBBB, roughness: 0.7 },
    flag:     { color: 0xFAFAFA, roughness: 0.7 },
  },

  // ─── Avatar ─────────────────────────────────────────────────────
  avatar: {
    skin: {
      color: 0xFAFAFA,
      roughness: 0.8,
      metalness: 0,
    },
    body: {
      roughness: 0.8,
      metalness: 0,
    },
    legDarken: 0.8,
    carryCube: {
      color: 0xF5F5F5,
      emissiveColor: 0xF5F5F5,
      emissiveIntensity: 0.04,
      roughness: 0.6,
    },
    nameSprite: {
      textColor: '#E8E4DC',
      bgColor: 'rgba(0,0,0,0.5)',
      fontSize: 32,
    },
    highlight: {
      emissiveColor: 0xF5F5F5,
      emissiveIntensity: 0.08,
    },
    unhighlight: {
      emissiveColor: 0x000000,
      emissiveIntensity: 0,
    },
  },

  // ─── Energy Bar (3D in-scene) ───────────────────────────────────
  energyBar: {
    background: { color: 0xBBBBBB, opacity: 0.25 },
    fill:       { color: 0xF0F0F0, opacity: 0.85 },
    gradient: {
      depletedColor: 0xCCCCCC,
      fullColor: 0xF0F0F0,
    },
  },

  // ─── Shadow Disc ────────────────────────────────────────────────
  shadowDisc: {
    color: 0x000000,
    opacity: 0.12,
  },

  // ─── Resource Colors (category hashing) ─────────────────────────
  resourceColors: [
    0xFAFAFA, 0xF0F0F0, 0xE0E0E0, 0xE8E8E8,
    0xD8D8D8, 0xDDDDDD, 0xCCCCCC, 0xE5E5E5,
  ],

  // ─── Fog of War (frozen — not changed) ──────────────────────────
  fog: {
    color: { r: 255, g: 255, b: 255 },
    revealFloor: 0.55,
    fadeInSpeed: 2.0,
    fadeOutSpeed: 0.8,
  },

  // ─── UI Palette (backward compat for EditorPanel, etc.) ─────────
  palette: {
    WHITE:      '#F0EBE3',
    LIGHT_GREY: '#E8E4DC',
    MID_GREY:   '#888888',
    DARK:       '#1A1A1A',

    RED:    '#C0A090',
    BLUE:   '#A0AAB8',
    ORANGE: '#C0B090',
    GREEN:  '#8A9A7C',
    YELLOW: '#C8C0A0',

    TERRAIN_GRASS:  '#E8E4DC',
    TERRAIN_DIRT:   '#D8D2C8',
    TERRAIN_STONE:  '#CCC8C0',
    TERRAIN_WATER:  '#1A1A1A',
    TERRAIN_FOREST: '#C5CCBF',

    FOG_COLOR:      '#000000',
    BASE_COLOR:     '#E0DAD0',
    STRUCTURE_GOLD: '#F5F0E8',

    AVATAR_COLORS: [
      '#D4C4B0', '#BFC0C5', '#C8BDA8', '#ADB0B5',
      '#D0C0A8', '#B5B8A8', '#C0B0A0', '#A8AABB',
      '#BBB0A0', '#B0B8B0', '#C5B5A5', '#A5A5A5',
    ],
  },
};

# AI Odyssey MMORPG - Asset Generation Guide

This document provides instructions for generating placeholder assets for the AI Odyssey MMORPG.

## Overview

The asset pipeline generates:
- **Sprites**: Character and enemy sprites in chibi style
- **Tilesets**: Seamless environment tiles for different zones
- **Combat Effects**: Visual effects for gameplay

## Directory Structure

```
assets/
├── sprites/          # Generated sprite sheets
│   ├── player/       # Player character sprites
│   ├── enemies/      # Enemy sprites (slimes, wolves, etc.)
│   └── ai-agent/     # AI agent character sprites
├── tiles/            # Generated tilesets
│   ├── forest/       # Forest zone tiles
│   ├── dungeon/      # Dungeon zone tiles
│   └── town/         # Town zone tiles
└── effects/          # Combat effect sprites
    ├── damage/       # Damage number popups
    ├── attack/       # Attack slash effects
    ├── healing/      # Healing glow effects
    └── death/        # Death explosion effects

scripts/
├── generate-sprites.py    # Sprite generation script
├── generate-tilesets.py   # Tileset generation script
└── generate-effects.py    # Effect generation script
```

## Color Palettes

### Forest Zone
- Primary Green: `#2d5016`
- Secondary Green: `#4a7c23`
- Light Green: `#8bc34a`
- Dark Green: `#1b3300`
- Brown (trunks): `#5d4037`
- Accent Yellow: `#cddc39`

### Dungeon Zone
- Primary Gray: `#455a64`
- Secondary Gray: `#607d8b`
- Dark Gray: `#263238`
- Light Gray: `#90a4ae`
- Red Accent: `#d32f2f` (blood/danger)
- Purple Accent: `#7b1fa2` (magic)

### Town Zone
- Primary Beige: `#d7ccc8`
- Secondary Brown: `#8d6e63`
- Dark Brown: `#4e342e`
- Light Brown: `#a1887f`
- Blue Accent: `#1976d2` (roofs)
- Gold Accent: `#fbc02d` (decorations)

## Sprite Specifications

### Player Chibi (32x32 base, 64x64 scaled)
- **Directions**: 4 (North, South, East, West)
- **Animations per direction**: 4
  - Idle (4 frames)
  - Walk (6 frames)
  - Attack (4 frames)
  - Hurt (2 frames)
- **Total frames**: 4 directions × 4 anims × avg 4 frames = 64 frames

### Slime Enemy (32x32)
- **Variations**: 3 (Small, Medium, Large)
- **Animations**: 3 per variation
  - Idle (3 frames - bounce)
  - Move (4 frames - squish)
  - Attack (3 frames - leap)
- **Total frames**: 3 variations × 3 anims × avg 3.3 frames = 30 frames

### Wolf Enemy (32x32)
- **Variations**: 2 (Normal, Alpha)
- **Animations**: 4 per variation
  - Idle (2 frames)
  - Walk (6 frames)
  - Attack (4 frames)
  - Death (3 frames)
- **Total frames**: 2 variations × 4 anims × avg 3.75 frames = 30 frames

### AI Agent Character (64x64)
- **Base template** with customizable colors
- **Directions**: 4
- **Animations**: 3
  - Idle (4 frames - subtle hover)
  - Talk (3 frames - gesture)
  - Cast spell (5 frames - magic effect)
- **Total frames**: 4 × 3 × 4 = 48 frames

## Tileset Specifications

### All Tilesets: 512x512 seamless
- **Grid**: 16x16 tiles (32x32 pixel tiles)
- **Variations per tile type**: 4 (for natural variation)
- **Autotile support**: Corner, edge, inside variants

## Combat Effects Specifications

### Damage Number Popup
- Size: 32x48 pixels
- Animation: 6 frames (rise and fade)
- Colors: Red (damage), White (neutral), Green (healing)

### Attack Slash Effect
- Size: 64x64 pixels
- Animation: 4 frames
- Style: Arc shape, fade effect

### Healing Glow
- Size: 48x48 pixels
- Animation: 8 frames (pulse)
- Color: Gradient green/white

### Death Explosion
- Size: 96x96 pixels
- Animation: 10 frames
- Colors: Gray to black particles

## Usage

1. Run `python3 scripts/generate-sprites.py` to generate sprite sheets
2. Run `python3 scripts/generate-tilesets.py` to generate tilesets
3. Customize colors and patterns in the scripts as needed
4. All assets are saved to their respective directories

## Notes

- All generated assets are placeholders and can be replaced with hand-drawn art
- Scripts use PIL/Pillow for image generation
- Consider adding noise/texture for more organic look
- Tilesets are generated with seamless borders for tiling

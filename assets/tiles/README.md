# AI Odyssey - Tileset Specifications

## Overview

This document defines the tileset specifications for all environment zones in the AI Odyssey MMORPG.

## Base Specifications

- **Tile Size**: 32x32 pixels (base), 64x64 pixels (scaled ×2)
- **Tileset Size**: 512x512 pixels (16x16 grid at 32x32 tiles)
- **Format**: PNG with alpha transparency
- **Seamless**: All tiles are designed to tile seamlessly horizontally and vertically
- **Color Depth**: 24-bit RGB + 8-bit alpha

---

## Zone Tilesets

### 1. Forest Zone

#### Color Palette
| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Primary Green | #2d5016 | Base grass color |
| Secondary Green | #4a7c23 | Grass variation |
| Light Green | #8bc34a | Sunlit grass |
| Dark Green | #1b3300 | Shadows, outlines |
| Brown | #5d4037 | Dirt patches, trunks |
| Accent Yellow | #cddc39 | Flowers, highlights |

#### Tile Types
- **Grass Tiles** (70% coverage)
  - 4 variations for natural look
  - Contains grass blade details
  - Some tiles have flower accents

- **Dirt Tiles** (15% coverage)
  - 2 variations
  - Used for paths and clearings
  - Textured with small stones

- **Stone Tiles** (10% coverage)
  - 2 variations
  - Ancient ruins, rocks
  - Darker gray-green tint

- **Water Tiles** (5% coverage)
  - Pond/stream edges
  - Semi-transparent blue
  - Wave animation frames

#### Autotile Requirements
Each tile type needs variations for:
- Corner (4 types)
- Edge (4 types: N, E, S, W)
- Inside (flat)
- Mixed (half corner/half flat)

#### File Naming
```
forest/tile_{row}_{col}.png
forest/autotile/{type}_{variation}.png
forest/forest_tileset.png (full 512x512)
```

---

### 2. Dungeon Zone

#### Color Palette
| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Primary Gray | #455a64 | Base stone color |
| Secondary Gray | #607d8b | Stone variation |
| Dark Gray | #263238 | Shadows, deep stone |
| Light Gray | #90a4ae | Highlighted stone |
| Red Accent | #d32f2f | Blood stains, danger |
| Purple Accent | #7b1fa2 | Magic runes, portals |

#### Tile Types
- **Stone Tiles** (60% coverage)
  - 4 variations
  - Cracked and intact stone
  - Mortar lines between blocks

- **Dark Stone Tiles** (20% coverage)
  - 2 variations
  - Used in deeper dungeon areas
  - Shadowy appearance

- **Blood Stain Tiles** (10% coverage)
  - 2 variations
  - Random red splotches
  - Horror atmosphere

- **Magic Rune Tiles** (10% coverage)
  - 2 variations
  - Glowing purple symbols
  - Portal and trap locations

#### Special Features
- Torch light variations (orange glow)
- Water puddles (dark, reflective)
- Spike trap tiles
- Portal/teleporter tiles

#### Autotile Requirements
Similar to forest but optimized for:
- Wall-floor transitions
- Doorway frames
- Column bases

#### File Naming
```
dungeon/tile_{row}_{col}.png
dungeon/autotile/{type}_{variation}.png
dungeon/dungeon_tileset.png (full 512x512)
```

---

### 3. Town Zone

#### Color Palette
| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Primary Beige | #d7ccc8 | Base cobblestone/light |
| Secondary Brown | #8d6e63 | Wood, buildings |
| Dark Brown | #4e342e | Shadows, foundations |
| Light Brown | #a1887f | Wood highlights |
| Blue Accent | #1976d2 | Roof tiles |
| Gold Accent | #fbc02d | Decorations, lamps |

#### Tile Types
- **Cobblestone Tiles** (40% coverage)
  - 4 variations
  - Individual stone pattern
  - Worn and new stones mixed

- **Wood Floor Tiles** (25% coverage)
  - 2 variations
  - Indoor use
  - Plank patterns

- **Roof Tiles** (15% coverage)
  - 2 variations
  - Blue tiled pattern
  - Circular gold decorations

- **Decoration Tiles** (10% coverage)
  - 2 variations
  - Street lamps
  - Gold accents

- **Path Tiles** (10% coverage)
  - 2 variations
  - Dirt/gravel paths
  - Between buildings

#### Building Elements
- Door frame bases
- Window sill tiles
- Foundation blocks
- Street furniture hints

#### File Naming
```
town/tile_{row}_{col}.png
town/autotile/{type}_{variation}.png
town/town_tileset.png (full 512x512)
```

---

## Seamless Tiling Requirements

### How It Works
For a tileset to be seamless:
1. The left edge must match the right edge
2. The top edge must match the bottom edge
3. Corner tiles must connect correctly

### Testing
Run the provided test script:
```bash
python3 scripts/test_seamless.py
```

This generates a 4x4 tiled image to verify seamlessness.

### Autotile System
Autotiles automatically select the correct variation based on neighboring tiles.

```
Autotile States:
┌─────┬─────┬─────┐
│     │ N   │     │
├─────┼─────┼─────┤
│ W   │ C   │ E   │
├─────┼─────┼─────┤
│     │ S   │     │
└─────┴─────┴─────┘

Where:
- C = Center (inside)
- N = North edge
- S = South edge
- E = East edge
- W = West edge
- Corner = Diagonal connections
```

---

## Animation Frames

### Animatable Tiles
Some tiles have multiple animation frames:

| Tile Type | Frames | FPS | Effect |
|-----------|--------|-----|--------|
| Water | 4 | 5 | Gentle wave |
| Torch | 6 | 8 | Flickering flame |
| Portal | 8 | 10 | Swirling magic |
| Leaves | 4 | 2 | Subtle rustle |
| Snow | 6 | 3 | Falling flakes |

### Animation Storage
Animations are stored as:
- Sprite sheets (multiple frames in one image)
- Or separate files (Frame_00.png, Frame_01.png, etc.)

---

## Tile Variations

### Randomization
For natural-looking maps, use random tile selection:

```python
# Example variation selection
def select_tile variation, row, col):
    # Use noise function for deterministic randomness
    noise_value = perlin_noise(row * 0.1, col * 0.1)
    
    if noise_value > 0.7:
        return variation["light"]
    elif noise_value > 0.4:
        return variation["normal"]
    else:
        return variation["dark"]
```

### Variation Count
| Zone | Base Tiles | Variations | Total Unique |
|------|------------|------------|--------------|
| Forest | 4 | 4 | 16 |
| Dungeon | 4 | 4 | 16 |
| Town | 5 | 2 | 10 |

---

## File Organization

```
assets/tiles/
├── forest/
│   ├── forest_tileset.png      # Full 512x512 sheet
│   ├── tile_0_0.png            # Individual tiles
│   ├── tile_0_1.png
│   └── ...                     # All 256 tiles
├── dungeon/
│   ├── dungeon_tileset.png
│   └── tile_*.png
├── town/
│   ├── town_tileset.png
│   └── tile_*.png
└── tests/
    └── tile_seamless_test.png  # Verification
```

---

## Generation Script Usage

Run the tileset generator:
```bash
python3 scripts/generate-tilesets.py
```

This will create:
- Full 512x512 tileset images for each zone
- Individual 32x32 tile files
- Seamless tiling tests

---

## Integration Notes

### Game Engine Support
These tilesets work with:
- **Tiled Map Editor**: Import as tilesets
- **Unity**: Create tile palette from sprite sheet
- **Godot**: Import as TileSet resource
- **Custom engines**: Parse at 32x32 grid intervals

### Layering
For depth, use multiple layers:
- **Layer 1**: Ground tiles (grass, stone, cobblestone)
- **Layer 2**: Floor details (dirt paths, wood)
- **Layer 3**: Ground objects (rocks, flowers, debris)
- **Layer 4**: Animated tiles (water, torches, portals)

---

## Requirements Checklist

- [ ] All tilesets are 512x512 (16x16 grid)
- [ ] Individual tiles are 32x32
- [ ] Seamless horizontal and vertical tiling
- [ ] Proper color palettes per zone
- [ ] Autotile variations for transitions
- [ ] Animation frames for dynamic tiles
- [ ] Individual tile exports for reference
- [ ] Test images for verification

---

## Future Enhancements

### Planned Tile Types
- **Snow Zone**: Winter variations
- **Desert Zone**: Sand and rock tiles
- **Cave Zone**: Darker dungeon variants
- **Sky Zone**: Floating island tiles

### Advanced Features
- Parallax background tiles
- Dynamic lighting overlays
- Weather effect tiles (rain, snow)
- Seasonal variation swaps

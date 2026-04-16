# AI Odyssey - Sprite Specifications

## Overview

This document defines the sprite specifications for all characters, enemies, and effects in the AI Odyssey MMORPG.

## Base Specifications

- **Sprite Size**: 32x32 pixels (base), 64x64 pixels (scaled ×2)
- **Format**: PNG with alpha transparency
- **Color Depth**: 24-bit RGB + 8-bit alpha
- **Animation FPS**: 12 fps for walk cycles, 8 fps for idle, 15 fps for combat

---

## Player Character Sprites

### Chibi Player (32x32)

#### Structure
- **Directions**: 4 (North, South, East, West)
- **Animations**: 4 types per direction
  - Idle (4 frames)
  - Walk (6 frames)
  - Attack (4 frames)
  - Hurt (2 frames)

#### Sprite Sheet Layout
```
Frame Grid (8x8 tiles per sheet):
┌────────────────────────────────┐
│ Idle: North    │ Idle: East    │
│ Frame 0-3      │ Frame 0-3     │
├────────────────┼───────────────┤
│ Idle: South    │ Idle: West    │
│ Frame 0-3      │ Frame 0-3     │
├────────────────┼───────────────┤
│ Walk: North    │ Walk: East    │
│ Frame 0-5      │ Frame 0-5     │
├────────────────┼───────────────┤
│ Walk: South    │ Walk: West    │
│ Frame 0-5      │ Frame 0-5     │
└────────────────────────────────┘
```

#### Color Variants
- **Hair**: #FF6B6B (red), #4ECDC4 (cyan), #9B59B6 (purple)
- **Shirt**: #4ECDC4 (teal), #FF6B6B (red), #F1C40F (yellow)
- **Pants**: #1A535C (dark teal), #2C3E50 (navy), #8E44AD (purple)

#### Frame Count Summary
- Idle: 4 frames × 4 directions = 16 frames
- Walk: 6 frames × 4 directions = 24 frames
- Attack: 4 frames × 4 directions = 16 frames
- Hurt: 2 frames × 4 directions = 8 frames
- **Total**: 64 frames

---

## Enemy Sprites

### Slime Enemies (32x32)

#### Variations
1. **Small Slime** (#2ECC71 - bright green)
   - Size: 0.7× base
   - HP: 10
   - Movement: Fast

2. **Medium Slime** (#27AE60 - standard green)
   - Size: 1.0× base
   - HP: 25
   - Movement: Normal

3. **Large Slime** (#1E8449 - dark green)
   - Size: 1.3× base
   - HP: 50
   - Movement: Slow

#### Animations (all variations)
- **Idle**: 3 frames (bounce up/down)
- **Move**: 4 frames (squish animation)
- **Attack**: 3 frames (leap forward)

#### Sprite Naming Convention
```
slime_{size}_{animation}_{frame}.png
Examples:
- slime_small_idle_00.png
- slime_medium_move_02.png
- slime_large_attack_01.png
```

#### Frame Count Summary
- Per variation: 3 animations × ~3.3 avg frames = 10 frames
- Total: 3 variations × 10 frames = 30 frames

---

### Wolf Enemies (32x32)

#### Variations
1. **Normal Wolf** (#7F8C8D - gray)
   - HP: 30
   - Damage: 8
   - Pack animal

2. **Alpha Wolf** (#34495E - dark gray)
   - HP: 60
   - Damage: 15
   - Boss variant, glowing eyes

#### Animations (all variations)
- **Idle**: 2 frames (breathing)
- **Walk**: 6 frames (leg cycle)
- **Attack**: 4 frames (bite animation)
- **Death**: 3 frames (Collapse)

#### Sprite Naming Convention
```
wolf_{type}_{animation}_{frame}.png
Examples:
- wolf_normal_idle_00.png
- wolf_alpha_walk_03.png
- wolf_normal_death_02.png
```

#### Frame Count Summary
- Per variation: (2 + 6 + 4 + 3) = 15 frames
- Total: 2 variations × 15 frames = 30 frames

---

## AI Agent Character (64x64)

### Base Template

#### Specifications
- **Size**: 64x64 pixels (scaled)
- **Style**: Futuristic/robotic chibi
- **Directions**: 4 (North, South, East, West)
- **Animations**: 3 types
  - Idle: 4 frames (subtle hover)
  - Talk: 3 frames (hand gesture)
  - Cast: 5 frames (magic effect)

#### Color Scheme
- **Body**: #9B59B6 (purple)
- **Accent**: #E91E63 (pink)
- **Glow**: #F0F0F0 (white, animated opacity)

#### Special Effects
- Hover animation with vertical oscillation
- Glowing eyes with pulsating effect
- Spellcasting with particle effects

#### Frame Count Summary
- Idle: 4 frames × 4 directions = 16 frames
- Talk: 3 frames × 4 directions = 12 frames
- Cast: 5 frames × 4 directions = 20 frames
- **Total**: 48 frames

---

## Combat Effects

### Damage Number Popup (32x48)

#### Types
- **Damage**: Red (#FF0000) - negative numbers
- **Heal**: Green (#00FF00) - positive numbers
- **Neutral**: White (#FFFFFF) - misc effects

#### Animation
- 6 frames total
- Frame 0-1: Appear at full size
- Frame 2-4: Rise and fade
- Frame 5: Disappear

```
Frame Sequence:
┌──────┐
│  -42 │  Frame 0: Full opacity
│      │  Frame 1: Full opacity
└──────┘

┌──────┐
│  -42 │  Frame 2: Start rising
│      │  Frame 3: Half opacity
└──────┘

         4: 1/4 opacity
         5: Gone
```

### Attack Slash Effect (64x64)

#### Animation
- 4 frames
- Arc shape that fades
- Yellow/white gradient

#### Frame Breakdown
- Frame 0: 25% arc, full opacity
- Frame 1: 50% arc, full opacity
- Frame 2: 75% arc, 75% opacity
- Frame 3: 100% arc, 25% opacity

### Healing Glow (48x48)

#### Animation
- 8 frames
- Pulsating green circle
- Gradient fade from center

#### Color Gradient
- Center: #00FF00 (pure green)
- Edge: #00FF00 with 0% opacity

#### Frame Pattern
- Frames 0-3: Expand (pulse out)
- Frames 4-7: Contract (pulse in)

### Death Explosion (96x96)

#### Animation
- 10 frames
- Expanding particle field
- Gray to black color fade

#### Particle Count
- Frame 0-2: 8 particles, full size
- Frame 3-6: 8 particles, spread out
- Frame 7-9: 8 particles, fade to black

---

## File Organization

```
assets/sprites/
├── player/
│   ├── player_idle_sheet.png
│   ├── player_walk_sheet.png
│   ├── player_attack_sheet.png
│   ├── player_hurt_sheet.png
│   ├── player_idle_north_00.png
│   ├── player_idle_north_01.png
│   └── ... (individual frames)
├── enemies/
│   ├── slime_small_idle_00.png
│   ├── slime_small_idle_01.png
│   ├── slime_medium_...
│   ├── slime_large_...
│   ├── wolf_normal_...
│   └── wolf_alpha_...
├── ai-agent/
│   ├── agent_idle_00.png
│   ├── agent_idle_01.png
│   ├── agent_talk_...
│   └── agent_cast_...
└── effects/
    ├── damage/
    │   ├── damage_00.png
    │   ├── damage_01.png
    │   ├── heal_...
    │   └── neutral_...
    ├── attack/
    │   └── slash_...
    ├── healing/
    │   └── glow_...
    └── death/
        └── explosion_...
```

---

## Animation Timing

| Animation Type | FPS | Duration (ms) |
|---------------|-----|---------------|
| Idle          | 8   | 125 per frame |
| Walk          | 12  | 83 per frame  |
| Attack        | 15  | 67 per frame  |
| Hurt          | 15  | 67 per frame  |
| Death         | 10  | 100 per frame |
| Effects       | 20  | 50 per frame  |

---

## Requirements Checklist

- [ ] All sprites generated at 32x32 base size
- [ ] Scaled versions available at 64x64
- [ ] Alpha transparency on all sprites
- [ ] Consistent animation timing
- [ ] Color palette variation for player skins
- [ ] Enemy variations properly labeled
- [ ] Combat effects have proper fade
- [ ] Sprite sheets and individual frames exported

---

## Notes

- Sprites can be exported as both individual frames and sprite sheets
- Sprite sheets use 8x8 grid layout (256x256 at 32x32, 512x512 at 64x64)
- All animations should loop except: Attack, Hurt, Death
- Death animations are single-play only
- Consider adding shadow sprites for depth effect (optional)

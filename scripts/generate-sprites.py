#!/usr/bin/env python3
"""
AI Odyssey MMORPG - Sprite Generation Script
Generates placeholder sprite sheets for characters and enemies.
"""

import os
from PIL import Image, ImageDraw
import math

# Configuration
OUTPUT_DIR = "assets/sprites"
BASE_SIZE = 32  # Base sprite size
SCALE = 2  # Scale factor for output

# Color Palettes
PLAYER_COLORS = {
    "hair": "#FF6B6B",
    "skin": "#FFD93D",
    "shirt": "#4ECDC4",
    "pants": "#1A535C",
    "weapon": "#FFE66D"
}

SLIME_COLORS = {
    "small": "#2ECC71",
    "medium": "#27AE60",
    "large": "#1E8449"
}

WOLF_COLORS = {
    "normal": "#7F8C8D",
    "alpha": "#34495E"
}

AI_AGENT_COLORS = {
    "body": "#9B59B6",
    "accent": "#E91E63",
    "glow": "#F0F0F0"
}

def ensure_dir(path):
    """Create directory if it doesn't exist."""
    os.makedirs(path, exist_ok=True)

def create_sprite_canvas(size=BASE_SIZE):
    """Create a transparent sprite canvas."""
    return Image.new("RGBA", (size * SCALE, size * SCALE), (0, 0, 0, 0))

def draw_chibi_player(draw, size, color_variant=None, direction="south", anim_frame=0):
    """Draw a chibi player character."""
    colors = PLAYER_COLORS
    if color_variant:
        colors.update(color_variant)
    
    x, y = size // 2, size // 2
    head_size = size // 2
    body_size = size // 3
    
    # Draw based on direction
    angle_map = {"north": 0, "south": 180, "east": 90, "west": -90}
    
    # Head
    head_y = y - head_size // 2
    draw.ellipse([x - head_size//2, head_y - head_size//2,
                  x + head_size//2, head_y + head_size//2],
                 fill=colors["skin"], outline=colors["hair"], width=2)
    
    # Hair
    draw.ellipse([x - head_size//2 - 2, head_y - head_size//2 - 2,
                  x + head_size//2 + 2, head_y],
                 fill=colors["hair"], outline=colors["hair"], width=2)
    
    # Eyes (animated wink for attack)
    if anim_frame == 2 and direction == "attack":
        # Wink pose
        draw.ellipse([x - 6, head_y - 2, x - 2, head_y + 2], fill="#000")
        draw.line([x + 2, head_y, x + 8, head_y], fill="#000", width=2)
    else:
        draw.ellipse([x - 6, head_y - 2, x - 2, head_y + 2], fill="#000")
        draw.ellipse([x + 2, head_y - 2, x + 6, head_y + 2], fill="#000")
    
    # Body
    body_y = y
    draw.ellipse([x - body_size//2, body_y - body_size//4,
                  x + body_size//2, body_y + body_size//2],
                 fill=colors["shirt"])
    
    # Legs/Pants
    leg_width = body_size // 4
    draw.rectangle([x - leg_width, body_y + body_size//4,
                    x - leg_width//2, body_y + body_size//2 + 4], fill=colors["pants"])
    draw.rectangle([x + leg_width//2, body_y + body_size//4,
                    x + leg_width, body_y + body_size//2 + 4], fill=colors["pants"])
    
    # Weapon (for attack animation)
    if direction == "attack":
        weapon_angle = anim_frame * 45
        wx = x + 12
        wy = body_y
        draw.line([wx, wy, wx + 15, wy - 10], fill=colors["weapon"], width=3)

def draw_slime(draw, size, variation="medium", anim_frame=0):
    """Draw a slime enemy."""
    colors = SLIME_COLORS
    
    if variation == "small":
        color = colors["small"]
        scale = 0.7
    elif variation == "large":
        color = colors["large"]
        scale = 1.3
    else:
        color = colors["medium"]
        scale = 1.0
    
    x, y = size // 2, size - 4
    
    # Base slime body (oval)
    slime_size = int(size // 2 * scale)
    bounce = math.sin(anim_frame * 0.5) * 2
    
    draw.ellipse([x - slime_size, y - slime_size + bounce,
                  x + slime_size, y + slime_size // 2 + bounce],
                 fill=color, outline=darken_color(color), width=2)
    
    # Eyes
    eye_size = max(3, int(slime_size * 0.3))
    draw.ellipse([x - eye_size - 2, y - eye_size // 2 + bounce,
                  x - eye_size + 2, y + eye_size // 2 + bounce], fill="#FFF")
    draw.ellipse([x + eye_size - 2, y - eye_size // 2 + bounce,
                  x + eye_size + 2, y + eye_size // 2 + bounce], fill="#FFF")
    draw.ellipse([x - eye_size, y + bounce, x - eye_size + 2, y + 2 + bounce], fill="#000")
    draw.ellipse([x + eye_size - 2, y + bounce, x + eye_size, y + 2 + bounce], fill="#000")

def draw_wolf(draw, size, variation="normal", anim_frame=0):
    """Draw a wolf enemy."""
    colors = WOLF_COLORS
    body_color = colors["alpha"] if variation == "alpha" else colors["normal"]
    
    x, y = size // 2, size // 2
    
    # Body
    body_width = size // 2
    body_height = size // 3
    
    # Leg animation
    leg_offset = math.sin(anim_frame * 0.8) * 3
    
    # Back legs
    draw.rectangle([x - body_width//2, y + body_height//2 - 4,
                    x - body_width//4, y + body_height//2 + 4 + leg_offset], fill=body_color)
    draw.rectangle([x + body_width//4, y + body_height//2 - 4,
                    x + body_width//2, y + body_height//2 + 4 - leg_offset], fill=body_color)
    
    # Front legs
    draw.rectangle([x - body_width//2 + 8, y - 4,
                    x, y + 8 - leg_offset], fill=body_color)
    draw.rectangle([x, y - 4, x + body_width//2 - 8, y + 8 + leg_offset], fill=body_color)
    
    # Body main
    draw.ellipse([x - body_width//2, y - body_height//2,
                  x + body_width//2, y + body_height//2], fill=body_color)
    
    # Head
    head_size = size // 3
    head_x = x + body_width//2
    draw.ellipse([head_x, y - head_size//2,
                  head_x + head_size, y + head_size//2], fill=body_color)
    
    # Ears
    draw.polygon([(head_x + 8, y - head_size//2 - 6),
                  (head_x + 4, y - head_size//2 - 12),
                  (head_x + 12, y - head_size//2 - 4)], fill=body_color)
    draw.polygon([(head_x + head_size - 8, y - head_size//2 - 6),
                  (head_x + head_size - 4, y - head_size//2 - 12),
                  (head_x + head_size - 12, y - head_size//2 - 4)], fill=body_color)
    
    # Eyes (glowing for alpha)
    eye_color = "#FFD700" if variation == "alpha" else "#F4A460"
    draw.ellipse([head_x + 8, y - 4, head_x + 12, y], fill=eye_color)
    draw.ellipse([head_x + head_size - 12, y - 4, head_x + head_size - 8, y], fill=eye_color)
    
    # Nose
    draw.ellipse([head_x + head_size - 2, y - 2, head_x + head_size + 4, y + 4], fill="#000")

def draw_ai_agent(draw, size, anim_frame=0):
    """Draw an AI agent character."""
    colors = AI_AGENT_COLORS
    
    x, y = size // 2, size // 2
    
    # Hover effect
    hover = math.sin(anim_frame * 0.3) * 3
    
    # Body (robotic shape)
    body_width = size // 2
    body_height = size // 2
    
    # Main body
    draw.rounded_rectangle([x - body_width//2, y - body_height//2 + hover,
                            x + body_width//2, y + body_height//2 + hover],
                           radius=8, fill=colors["body"])
    
    # Head
    head_size = size // 3
    draw.ellipse([x - head_size//2, y - head_size + hover,
                  x + head_size//2, y - head_size//2 + hover], fill=colors["accent"])
    
    # Face/Visor
    draw.ellipse([x - head_size//2 + 4, y - head_size + 4 + hover,
                  x + head_size//2 - 4, y - head_size//2 - 2 + hover], fill="#000")
    
    # Glowing eyes
    eye_glow = 100 + int(math.sin(anim_frame * 0.5) * 50)
    draw.ellipse([x - head_size//4, y - head_size + 8 + hover,
                  x - head_size//6, y - head_size + 14 + hover],
                 fill=(255, 255, 255, eye_glow))
    draw.ellipse([x + head_size//6, y - head_size + 8 + hover,
                  x + head_size//4, y - head_size + 14 + hover],
                 fill=(255, 255, 255, eye_glow))
    
    # Accent lines
    draw.line([x, y - body_height//2 + hover, x, y + body_height//2 + hover],
              fill=colors["glow"], width=2)

def darken_color(color_hex):
    """Darken a hex color for outlines."""
    from PIL import ImageColor
    r, g, b = ImageColor.getcolor(color_hex, "RGB")
    dark_r, dark_g, dark_b = int(r * 0.7), int(g * 0.7), int(b * 0.7)
    return f"#{dark_r:02x}{dark_g:02x}{dark_b:02x}"

def generate_player_sprites():
    """Generate player character sprite sheets."""
    ensure_dir(f"{OUTPUT_DIR}/player")
    
    animations = ["idle", "walk", "attack", "hurt"]
    directions = ["north", "south", "east", "west"]
    frame_counts = {"idle": 4, "walk": 6, "attack": 4, "hurt": 2}
    
    for anim in animations:
        frames = frame_counts[anim]
        sprite_sheet = create_sprite_canvas(BASE_SIZE * 8)  # 8x8 grid
        
        for frame in range(frames):
            for direction in directions:
                # Calculate grid position
                sheet_x = (frame % 8) * (BASE_SIZE * SCALE)
                sheet_y = directions.index(direction) * (BASE_SIZE * SCALE)
                
                draw = ImageDraw.Draw(sprite_sheet)
                draw_chibi_player(draw, BASE_SIZE, direction=anim if frame == 2 else direction, 
                                 anim_frame=frame, direction="attack" if anim == "attack" else direction)
                
                # Save individual frame (for reference)
                frame_img = create_sprite_canvas(BASE_SIZE)
                frame_draw = ImageDraw.Draw(frame_img)
                draw_chibi_player(frame_draw, BASE_SIZE, direction="attack" if anim == "attack" else direction,
                                 anim_frame=frame)
                frame_img.save(f"{OUTPUT_DIR}/player/player_{anim}_{direction}_{frame:02d}.png")
        
        sprite_sheet.save(f"{OUTPUT_DIR}/player/player_{anim}_sheet.png")
        print(f"Generated player {anim} animation ({frames} frames × 4 directions)")

def generate_slime_sprites():
    """Generate slime enemy sprite sheets."""
    ensure_dir(f"{OUTPUT_DIR}/enemies")
    
    variations = ["small", "medium", "large"]
    animations = ["idle", "move", "attack"]
    frame_counts = {"idle": 3, "move": 4, "attack": 3}
    
    for variation in variations:
        for anim in animations:
            frames = frame_counts[anim]
            
            for frame in range(frames):
                sprite = create_sprite_canvas(BASE_SIZE)
                draw = ImageDraw.Draw(sprite)
                draw_slime(draw, BASE_SIZE, variation=variation, anim_frame=frame)
                sprite.save(f"{OUTPUT_DIR}/enemies/slime_{variation}_{anim}_{frame:02d}.png")
            
            print(f"Generated slime {variation} {anim} animation ({frames} frames)")

def generate_wolf_sprites():
    """Generate wolf enemy sprite sheets."""
    ensure_dir(f"{OUTPUT_DIR}/enemies")
    
    variations = ["normal", "alpha"]
    animations = ["idle", "walk", "attack", "death"]
    frame_counts = {"idle": 2, "walk": 6, "attack": 4, "death": 3}
    
    for variation in variations:
        for anim in animations:
            frames = frame_counts[anim]
            
            for frame in range(frames):
                sprite = create_sprite_canvas(BASE_SIZE)
                draw = ImageDraw.Draw(sprite)
                draw_wolf(draw, BASE_SIZE, variation=variation, anim_frame=frame)
                sprite.save(f"{OUTPUT_DIR}/enemies/wolf_{variation}_{anim}_{frame:02d}.png")
            
            print(f"Generated wolf {variation} {anim} animation ({frames} frames)")

def generate_ai_agent_sprites():
    """Generate AI agent character sprite sheets."""
    ensure_dir(f"{OUTPUT_DIR}/ai-agent")
    
    animations = ["idle", "talk", "cast"]
    frame_counts = {"idle": 4, "talk": 3, "cast": 5}
    
    for anim in animations:
        frames = frame_counts[anim]
        
        for frame in range(frames):
            sprite = Image.new("RGBA", (BASE_SIZE * SCALE, BASE_SIZE * SCALE), (0, 0, 0, 0))
            draw = ImageDraw.Draw(sprite)
            draw_ai_agent(draw, BASE_SIZE, anim_frame=frame)
            sprite.save(f"{OUTPUT_DIR}/ai-agent/agent_{anim}_{frame:02d}.png")
        
        print(f"Generated AI agent {anim} animation ({frames} frames)")

def generate_combat_effects():
    """Generate combat effect sprites."""
    ensure_dir(f"{OUTPUT_DIR}/effects")
    ensure_dir(f"{OUTPUT_DIR}/effects/damage")
    ensure_dir(f"{OUTPUT_DIR}/effects/attack")
    ensure_dir(f"{OUTPUT_DIR}/effects/healing")
    ensure_dir(f"{OUTPUT_DIR}/effects/death")
    
    # Damage numbers
    colors = [("damage", "#FF0000"), ("heal", "#00FF00"), ("neutral", "#FFFFFF")]
    for effect_type, color in colors:
        for frame in range(6):
            sprite = Image.new("RGBA", (32 * SCALE, 48 * SCALE), (0, 0, 0, 0))
            draw = ImageDraw.Draw(sprite)
            # Simple text representation
            y_offset = int(frame * 4 * SCALE)
            alpha = int(255 * (1 - frame / 6))
            draw.text((8 * SCALE, y_offset), "!" if effect_type == "damage" else "+", 
                     fill=color if alpha == 255 else (color[0], color[1], color[2], alpha))
            sprite.save(f"{OUTPUT_DIR}/effects/damage/{effect_type}_{frame:02d}.png")
    print("Generated damage number effects")
    
    # Attack slash
    for frame in range(4):
        sprite = Image.new("RGBA", (64 * SCALE, 64 * SCALE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(sprite)
        x, y = 32 * SCALE, 32 * SCALE
        # Slash arc
        alpha = int(255 * (1 - frame / 4))
        draw.arc([x - 20, y - 20, x + 20, y + 20], start=frame * 30, end=180 + frame * 30,
                fill=(255, 255, 0, alpha), width=4)
        sprite.save(f"{OUTPUT_DIR}/effects/attack/slash_{frame:02d}.png")
    print("Generated attack slash effects")
    
    # Healing glow
    for frame in range(8):
        sprite = Image.new("RGBA", (48 * SCALE, 48 * SCALE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(sprite)
        x, y = 24 * SCALE, 24 * SCALE
        # Pulsing glow
        pulse = int(100 + 50 * math.sin(frame * 0.8))
        alpha = int(255 * (pulse / 150))
        draw.ellipse([x - pulse//2, y - pulse//2, x + pulse//2, y + pulse//2],
                    fill=(0, 255, 0, alpha))
        sprite.save(f"{OUTPUT_DIR}/effects/healing/glow_{frame:02d}.png")
    print("Generated healing glow effects")
    
    # Death explosion
    for frame in range(10):
        sprite = Image.new("RGBA", (96 * SCALE, 96 * SCALE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(sprite)
        x, y = 48 * SCALE, 48 * SCALE
        # Expanding particles
        spread = frame * 8 * SCALE
        alpha = int(255 * (1 - frame / 10))
        
        for i in range(8):
            angle = i * 45
            px = x + int(spread * math.cos(math.radians(angle)))
            py = y + int(spread * math.sin(math.radians(angle)))
            size = int((10 - frame) * SCALE / 2)
            if size > 0:
                draw.ellipse([px - size, py - size, px + size, py + size],
                            fill=(100 - frame * 10, 50, 50, alpha))
        sprite.save(f"{OUTPUT_DIR}/effects/death/explosion_{frame:02d}.png")
    print("Generated death explosion effects")

def main():
    """Main function to generate all sprites."""
    print("=" * 50)
    print("AI Odyssey - Sprite Generation")
    print("=" * 50)
    
    print("\nGenerating player sprites...")
    generate_player_sprites()
    
    print("\nGenerating slime sprites...")
    generate_slime_sprites()
    
    print("\nGenerating wolf sprites...")
    generate_wolf_sprites()
    
    print("\nGenerating AI agent sprites...")
    generate_ai_agent_sprites()
    
    print("\nGenerating combat effects...")
    generate_combat_effects()
    
    print("\n" + "=" * 50)
    print("All sprites generated successfully!")
    print(f"Output directory: {OUTPUT_DIR}")
    print("=" * 50)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
AI Odyssey MMORPG - Tileset Generation Script
Generates seamless tilesets for different zones.
"""

import os
from PIL import Image, ImageDraw
import math
import random

# Configuration
OUTPUT_DIR = "assets/tiles"
TILE_SIZE = 32
GRID_SIZE = 16  # 16x16 grid = 512x512 tileset
SCALE = 2

# Zone Color Palettes
FOREST_PALETTE = {
    "primary": "#2d5016",
    "secondary": "#4a7c23",
    "light": "#8bc34a",
    "dark": "#1b3300",
    "brown": "#5d4037",
    "accent": "#cddc39"
}

DUNGEON_PALETTE = {
    "primary": "#455a64",
    "secondary": "#607d8b",
    "dark": "#263238",
    "light": "#90a4ae",
    "red": "#d32f2f",
    "purple": "#7b1fa2"
}

TOWN_PALETTE = {
    "primary": "#d7ccc8",
    "secondary": "#8d6e63",
    "dark": "#4e342e",
    "light": "#a1887f",
    "blue": "#1976d2",
    "gold": "#fbc02d"
}

def ensure_dir(path):
    """Create directory if it doesn't exist."""
    os.makedirs(path, exist_ok=True)

def add_noise(img, intensity=10):
    """Add subtle noise to an image for texture."""
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if a > 0:  # Only modify non-transparent pixels
                noise = random.randint(-intensity, intensity)
                pixels[x, y] = (
                    max(0, min(255, r + noise)),
                    max(0, min(255, g + noise)),
                    max(0, min(255, b + noise)),
                    a
                )
    return img

def generate_grass_tile(palette, variation):
    """Generate a grass tile with variation."""
    img = Image.new("RGBA", (TILE_SIZE * SCALE, TILE_SIZE * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Base grass color
    base_color = palette["primary"] if variation % 3 == 0 else (
        palette["secondary"] if variation % 3 == 1 else palette["light"])
    
    draw.rectangle([0, 0, img.width, img.height], fill=base_color)
    
    # Add grass details
    for i in range(8):
        x = random.randint(0, img.width - 1)
        y = random.randint(img.height // 2, img.height - 1)
        height = random.randint(2, 6)
        draw.line([(x, y), (x, y - height)], fill=palette["accent"], width=1)
    
    return add_noise(img, 15)

def generate_dirt_tile(palette, variation):
    """Generate a dirt/ground tile."""
    img = Image.new("RGBA", (TILE_SIZE * SCALE, TILE_SIZE * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    base_color = palette["brown"] if "brown" in palette else "#5d4037"
    draw.rectangle([0, 0, img.width, img.height], fill=base_color)
    
    # Add texture dots
    for i in range(20):
        x = random.randint(0, img.width - 1)
        y = random.randint(0, img.height - 1)
        size = random.randint(1, 3)
        color = random.choice([palette["dark"], palette["light"]])
        draw.ellipse([x, y, x + size, y + size], fill=color)
    
    return add_noise(img, 20)

def generate_stone_tile(palette, variation):
    """Generate a stone tile."""
    img = Image.new("RGBA", (TILE_SIZE * SCALE, TILE_SIZE * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    base_color = palette["primary"]
    draw.rectangle([0, 0, img.width, img.height], fill=base_color)
    
    # Add stone cracks and variations
    for i in range(5):
        start_x = random.randint(0, img.width)
        start_y = random.randint(0, img.height)
        length = random.randint(10, 25)
        angle = random.randint(0, 360)
        
        end_x = start_x + int(length * math.cos(math.radians(angle)))
        end_y = start_y + int(length * math.sin(math.radians(angle)))
        
        draw.line([(start_x, start_y), (end_x, end_y)], 
                 fill=palette["dark"], width=random.randint(1, 2))
    
    return add_noise(img, 12)

def generate_water_tile(palette, variation):
    """Generate a water tile."""
    img = Image.new("RGBA", (TILE_SIZE * SCALE, TILE_SIZE * SCALE), (0, 0, 0, 180))
    draw = ImageDraw.Draw(img)
    
    draw.rectangle([0, 0, img.width, img.height], fill="#2196F3")
    
    # Add wave patterns
    for i in range(3):
        y = random.randint(0, img.height - 5)
        draw.line([(0, y), (img.width, y)], fill=(255, 255, 255, 100), width=2)
    
    return img

def generate_forest_tileset():
    """Generate forest zone tileset."""
    ensure_dir(f"{OUTPUT_DIR}/forest")
    
    palette = FOREST_PALETTE.copy()
    # Add brown to palette for consistency
    palette["brown"] = "#5d4037"
    
    tileset = Image.new("RGBA", (GRID_SIZE * TILE_SIZE * SCALE, GRID_SIZE * TILE_SIZE * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tileset)
    
    # Generate tile patterns
    grass_tiles = []
    dirt_tiles = []
    stone_tiles = []
    
    for i in range(4):
        grass_tiles.append(generate_grass_tile(palette, i))
        dirt_tiles.append(generate_dirt_tile(palette, i))
        stone_tiles.append(generate_stone_tile(palette, i))
    
    # Fill the tileset with variations
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            tile_type = (row + col) % 4
            
            # Get tile from cache
            if tile_type == 0:
                tile = grass_tiles[0]
            elif tile_type == 1:
                tile = grass_tiles[1]
            elif tile_type == 2:
                tile = dirt_tiles[row % 2]
            else:
                tile = grass_tiles[2 if random.random() > 0.5 else 3]
            
            # Place tile
            x = col * TILE_SIZE * SCALE
            y = row * TILE_SIZE * SCALE
            tileset.paste(tile, (x, y), tile if tile.mode == "RGBA" else None)
    
    # Save individual tiles and full tileset
    tileset.save(f"{OUTPUT_DIR}/forest/forest_tileset.png")
    
    # Extract and save individual tiles
    for row in range(min(4, GRID_SIZE)):
        for col in range(min(4, GRID_SIZE)):
            x = col * TILE_SIZE * SCALE
            y = row * TILE_SIZE * SCALE
            tile = tileset.crop((x, y, x + TILE_SIZE * SCALE, y + TILE_SIZE * SCALE))
            tile.save(f"{OUTPUT_DIR}/forest/tile_{row}_{col}.png")
    
    print(f"Generated forest tileset ({GRID_SIZE}x{GRID_SIZE} tiles)")

def generate_dungeon_tileset():
    """Generate dungeon zone tileset."""
    ensure_dir(f"{OUTPUT_DIR}/dungeon")
    
    palette = DUNGEON_PALETTE
    
    tileset = Image.new("RGBA", (GRID_SIZE * TILE_SIZE * SCALE, GRID_SIZE * TILE_SIZE * SCALE), (0, 0, 0, 0))
    
    # Generate tile patterns
    stone_tiles = []
    dark_tiles = []
    blood_tiles = []
    magic_tiles = []
    
    for i in range(4):
        stone_tiles.append(generate_stone_tile(palette, i))
        
        # Dark stone variation
        img = Image.new("RGBA", (TILE_SIZE * SCALE, TILE_SIZE * SCALE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, img.width, img.height], fill=palette["dark"])
        dark_tiles.append(add_noise(img, 8))
        
        # Blood stain variation
        img = stone_tiles[i].copy()
        draw = ImageDraw.Draw(img)
        for _ in range(3):
            x = random.randint(0, img.width - 10)
            y = random.randint(0, img.height - 10)
            draw.ellipse([x, y, x + random.randint(5, 15), y + random.randint(5, 15)], 
                        fill=palette["red"])
        blood_tiles.append(img)
        
        # Magic rune variation
        img = stone_tiles[i].copy()
        draw = ImageDraw.Draw(img)
        cx, cy = img.width // 2, img.height // 2
        draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=palette["purple"])
        draw.line([(cx - 5, cy), (cx + 5, cy)], fill="#FFF", width=1)
        draw.line([(cx, cy - 5), (cx, cy + 5)], fill="#FFF", width=1)
        magic_tiles.append(img)
    
    all_tiles = stone_tiles + dark_tiles + blood_tiles + magic_tiles
    
    # Fill the tileset
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            tile_idx = ((row * GRID_SIZE + col) % len(all_tiles))
            tile = all_tiles[tile_idx].copy()
            
            x = col * TILE_SIZE * SCALE
            y = row * TILE_SIZE * SCALE
            tileset.paste(tile, (x, y), tile if tile.mode == "RGBA" else None)
    
    tileset.save(f"{OUTPUT_DIR}/dungeon/dungeon_tileset.png")
    
    # Save individual tiles
    for row in range(min(4, GRID_SIZE)):
        for col in range(min(4, GRID_SIZE)):
            x = col * TILE_SIZE * SCALE
            y = row * TILE_SIZE * SCALE
            tile = tileset.crop((x, y, x + TILE_SIZE * SCALE, y + TILE_SIZE * SCALE))
            tile.save(f"{OUTPUT_DIR}/dungeon/tile_{row}_{col}.png")
    
    print(f"Generated dungeon tileset ({GRID_SIZE}x{GRID_SIZE} tiles)")

def generate_town_tileset():
    """Generate town zone tileset."""
    ensure_dir(f"{OUTPUT_DIR}/town")
    
    palette = TOWN_PALETTE
    
    tileset = Image.new("RGBA", (GRID_SIZE * TILE_SIZE * SCALE, GRID_SIZE * TILE_SIZE * SCALE), (0, 0, 0, 0))
    
    # Generate tile patterns
    cobblestone_tiles = []
    wood_tiles = []
    roof_tiles = []
    decoration_tiles = []
    
    for i in range(4):
        # Cobblestone
        img = Image.new("RGBA", (TILE_SIZE * SCALE, TILE_SIZE * SCALE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, img.width, img.height], fill=palette["primary"])
        
        # Draw cobblestone pattern
        for row in range(4):
            for col in range(4):
                x = col * (TILE_SIZE // 4) * SCALE
                y = row * (TILE_SIZE // 4) * SCALE
                stone_color = palette["light"] if (row + col) % 2 == 0 else palette["secondary"]
                draw.rectangle([x + 1, y + 1, x + TILE_SIZE // 2 * SCALE - 1, 
                               y + TILE_SIZE // 2 * SCALE - 1], fill=stone_color)
        cobblestone_tiles.append(add_noise(img, 10))
        
        # Wood floor
        img = Image.new("RGBA", (TILE_SIZE * SCALE, TILE_SIZE * SCALE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, img.width, img.height], fill=palette["secondary"])
        
        # Draw wood planks
        for i in range(4):
            y = i * (TILE_SIZE // 4) * SCALE
            draw.line([(0, y), (img.width, y)], fill=palette["dark"], width=2)
        wood_tiles.append(add_noise(img, 15))
        
        # Roof tile
        img = Image.new("RGBA", (TILE_SIZE * SCALE, TILE_SIZE * SCALE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, img.width, img.height], fill=palette["blue"])
        
        # Add roof pattern
        for x in range(0, img.width, 8 * SCALE):
            draw.ellipse([x, 0, x + 8 * SCALE, 4 * SCALE], fill=palette["gold"])
        roof_tiles.append(add_noise(img, 8))
        
        # Decoration
        img = cobblestone_tiles[i].copy()
        draw = ImageDraw.Draw(img)
        cx, cy = img.width // 2, img.height // 2
        draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=palette["gold"])
        decoration_tiles.append(img)
    
    all_tiles = cobblestone_tiles + wood_tiles + roof_tiles + decoration_tiles
    
    # Fill the tileset
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            tile_idx = ((row * GRID_SIZE + col) % len(all_tiles))
            tile = all_tiles[tile_idx].copy()
            
            x = col * TILE_SIZE * SCALE
            y = row * TILE_SIZE * SCALE
            tileset.paste(tile, (x, y), tile if tile.mode == "RGBA" else None)
    
    tileset.save(f"{OUTPUT_DIR}/town/town_tileset.png")
    
    # Save individual tiles
    for row in range(min(4, GRID_SIZE)):
        for col in range(min(4, GRID_SIZE)):
            x = col * TILE_SIZE * SCALE
            y = row * TILE_SIZE * SCALE
            tile = tileset.crop((x, y, x + TILE_SIZE * SCALE, y + TILE_SIZE * SCALE))
            tile.save(f"{OUTPUT_DIR}/town/tile_{row}_{col}.png")
    
    print(f"Generated town tileset ({GRID_SIZE}x{GRID_SIZE} tiles)")

def generate_seamless_test():
    """Create a test to verify seamless tiling."""
    ensure_dir(f"{OUTPUT_DIR}/tests")
    
    # Load a tile and create a larger tiled image
    tile = Image.new("RGBA", (TILE_SIZE * SCALE, TILE_SIZE * SCALE), (255, 0, 0, 255))
    draw = ImageDraw.Draw(tile)
    draw.rectangle([0, 0, tile.width, tile.height], fill="#2d5016")
    
    # Create 4x4 tiled pattern
    test_img = Image.new("RGBA", (TILE_SIZE * SCALE * 4, TILE_SIZE * SCALE * 4), (0, 0, 0, 0))
    
    for row in range(4):
        for col in range(4):
            x = col * TILE_SIZE * SCALE
            y = row * TILE_SIZE * SCALE
            test_img.paste(tile, (x, y), tile if tile.mode == "RGBA" else None)
    
    test_img.save(f"{OUTPUT_DIR}/tests/tile_seamless_test.png")
    print("Generated seamless tiling test")

def main():
    """Main function to generate all tilesets."""
    print("=" * 50)
    print("AI Odyssey - Tileset Generation")
    print("=" * 50)
    
    random.seed(42)  # For reproducible results
    
    print("\nGenerating forest tileset...")
    generate_forest_tileset()
    
    print("\nGenerating dungeon tileset...")
    generate_dungeon_tileset()
    
    print("\nGenerating town tileset...")
    generate_town_tileset()
    
    print("\nGenerating seamless test...")
    generate_seamless_test()
    
    print("\n" + "=" * 50)
    print("All tilesets generated successfully!")
    print(f"Output directory: {OUTPUT_DIR}")
    print("=" * 50)

if __name__ == "__main__":
    main()

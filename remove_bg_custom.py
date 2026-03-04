import sys
import math
from PIL import Image

def remove_bg(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    # Use top-left pixel as the background color reference
    bg_r, bg_g, bg_b, _ = pixels[0, 0]
    
    # We want a very smooth transition from the dark background to the bright glowing neon
    # Max distance in RGB space is sqrt(255^2*3) = 441
    threshold_transparent = 30
    threshold_solid = 100
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            dist = math.sqrt((r-bg_r)**2 + (g-bg_g)**2 + (b-bg_b)**2)
            
            if dist <= threshold_transparent:
                pixels[x, y] = (r, g, b, 0)
            elif dist < threshold_solid:
                # Smooth alpha blending
                perc = (dist - threshold_transparent) / (threshold_solid - threshold_transparent)
                alpha = int(perc * 255)
                # Slightly boost the colors so they don't look muddy when partially transparent
                r_new = min(255, int(r * (1 + (1-perc))))
                g_new = min(255, int(g * (1 + (1-perc))))
                b_new = min(255, int(b * (1 + (1-perc))))
                pixels[x, y] = (r_new, g_new, b_new, alpha)
            else:
                pixels[x, y] = (r, g, b, 255)
                
    img.save(output_path, "PNG")
    print(f"Saved {output_path}")

if __name__ == "__main__":
    remove_bg(sys.argv[1], sys.argv[2])

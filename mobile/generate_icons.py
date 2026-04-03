"""
Generates app launcher icons for Android from SVG path.
Requires: pip install Pillow
"""
import os
from PIL import Image, ImageDraw

def draw_icon(size):
    """Draw the music app icon: green circle with white play triangle."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background circle — #1db954
    margin = size * 0.04
    draw.ellipse([margin, margin, size - margin, size - margin], fill='#1db954')

    # Play triangle (white)
    cx, cy = size / 2, size / 2
    r = size * 0.28  # triangle radius
    # Slightly right-offset for visual balance
    ox = size * 0.04
    pts = [
        (cx - r * 0.6 + ox, cy - r),
        (cx - r * 0.6 + ox, cy + r),
        (cx + r + ox,        cy),
    ]
    draw.polygon(pts, fill='white')

    return img

# Android icon sizes: folder -> size
SIZES = {
    'mipmap-mdpi':    48,
    'mipmap-hdpi':    72,
    'mipmap-xhdpi':   96,
    'mipmap-xxhdpi':  144,
    'mipmap-xxxhdpi': 192,
}

base = os.path.join(os.path.dirname(__file__), 'android', 'app', 'src', 'main', 'res')

for folder, size in SIZES.items():
    out_dir = os.path.join(base, folder)
    os.makedirs(out_dir, exist_ok=True)
    img = draw_icon(size)
    img.save(os.path.join(out_dir, 'ic_launcher.png'))
    print(f'✅ {folder}/ic_launcher.png ({size}x{size})')

# Also generate a round version (same design)
for folder, size in SIZES.items():
    out_dir = os.path.join(base, folder)
    img = draw_icon(size)
    img.save(os.path.join(out_dir, 'ic_launcher_round.png'))
    print(f'✅ {folder}/ic_launcher_round.png ({size}x{size})')

print('\nDone! Icons generated in android/app/src/main/res/')

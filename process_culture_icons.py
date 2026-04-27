import os
import glob
from PIL import Image

brain_dir = '/Users/aaronr/.gemini/antigravity/brain/9c76bfe9-9af2-40cb-b5cd-a0d620ebcf62'
out_dir = '/Users/aaronr/Development/civ-app/assets/images/icons'

# Find all culture_*.png in the brain dir
files = glob.glob(os.path.join(brain_dir, 'culture_*.png'))

for in_path in files:
    # Get the base name without timestamp
    base_name = os.path.basename(in_path)
    # The names are like culture_anglo_saxons_1777290732806.png
    # Let's extract the part before the last underscore if there is one
    parts = base_name.split('_')
    if len(parts) > 2 and parts[-1].split('.')[0].isdigit():
        out_name = '_'.join(parts[:-1]) + '.png'
    else:
        out_name = base_name
        
    out_path = os.path.join(out_dir, out_name)
    
    img = Image.open(in_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        r, g, b, a = item
        if r > 240 and g > 240 and b > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(out_path, "PNG")
    print(f"Processed {out_name}")

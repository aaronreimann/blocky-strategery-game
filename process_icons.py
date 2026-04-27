import glob
import os
import re
from PIL import Image

brain_dir = '/Users/aaronr/.gemini/antigravity/brain/9c76bfe9-9af2-40cb-b5cd-a0d620ebcf62'
out_dir = '/Users/aaronr/Development/civ-app/assets/images/icons'

files = glob.glob(os.path.join(brain_dir, 'icon_*.png'))

for f in files:
    # Extract the base name without the timestamp
    basename = os.path.basename(f)
    match = re.match(r'(icon_[a-z_]+)_\d+\.png', basename)
    if not match:
        continue
    
    clean_name = match.group(1) + '.png'
    out_path = os.path.join(out_dir, clean_name)
    preview_path = os.path.join(brain_dir, clean_name)
    
    img = Image.open(f).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(out_path, "PNG")
    img.save(preview_path, "PNG")
    print(f"Processed {clean_name}")

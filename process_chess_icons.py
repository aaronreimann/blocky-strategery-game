import os
from PIL import Image

brain_dir = '/Users/aaronr/.gemini/antigravity/brain/9c76bfe9-9af2-40cb-b5cd-a0d620ebcf62'
out_dir = '/Users/aaronr/Development/civ-app/assets/images/icons'

files = [
    ('icon_wayfarer_chess_1777286161529.png', 'icon_wayfarer.png'),
    ('icon_serf_chess_1777286172318.png', 'icon_serf.png'),
    ('icon_footman_chess_1777286184400.png', 'icon_footman.png')
]

for in_name, out_name in files:
    in_path = os.path.join(brain_dir, in_name)
    out_path = os.path.join(out_dir, out_name)
    
    img = Image.open(in_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # white background threshold
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(out_path, "PNG")
    print(f"Processed {out_name}")

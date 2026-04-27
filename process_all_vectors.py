import os
from PIL import Image

brain_dir = '/Users/aaronr/.gemini/antigravity/brain/9c76bfe9-9af2-40cb-b5cd-a0d620ebcf62'
out_dir = '/Users/aaronr/Development/civ-app/assets/images/icons'

files = [
    ('vector_wayfarer_1777288206031.png', 'icon_pioneer.png'),
    ('vector_serf_1777288216914.png', 'icon_worker.png'),
    ('vector_footman_1777288229596.png', 'icon_footman.png'),
    ('vector_spearman_1777288245948.png', 'icon_spearman.png'),
    ('vector_horseman_1777288265513.png', 'icon_horseman.png'),
    ('vector_swordsman_1777288279182.png', 'icon_swordsman.png'),
    ('vector_catapult_1777288291523.png', 'icon_catapult.png'),
    ('vector_galley_1777288305089.png', 'icon_galley.png'),
    ('vector_town_1777288327217.png', 'icon_town.png'),
    ('vector_capital_1777288338201.png', 'icon_capital.png'),
    ('vector_goody_hut_1777288350250.png', 'icon_goody_hut.png')
]

for in_name, out_name in files:
    in_path = os.path.join(brain_dir, in_name)
    out_path = os.path.join(out_dir, out_name)
    
    if not os.path.exists(in_path):
        print(f"Missing {in_path}")
        continue
        
    img = Image.open(in_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    # Just standard white background removal
    for item in datas:
        r, g, b, a = item
        # Make white pixels transparent (handling slight off-whites as well)
        if r > 240 and g > 240 and b > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(out_path, "PNG")
    print(f"Processed {out_name}")

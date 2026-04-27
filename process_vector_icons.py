import os
from PIL import Image

brain_dir = '/Users/aaronr/.gemini/antigravity/brain/9c76bfe9-9af2-40cb-b5cd-a0d620ebcf62'
out_dir = '/Users/aaronr/Development/civ-app/assets/images/icons'

files = [
    ('icon_wayfarer_vector_1777286194866.png', 'icon_wayfarer.png'),
    ('icon_serf_vector_1777286207135.png', 'icon_serf.png'),
    ('icon_footman_vector_1777286219759.png', 'icon_footman.png')
]

for in_name, out_name in files:
    in_path = os.path.join(brain_dir, in_name)
    out_path = os.path.join(out_dir, out_name)
    
    img = Image.open(in_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        r, g, b, a = item
        # white background threshold
        if r > 240 and g > 240 and b > 240:
            newData.append((255, 255, 255, 0))
        # red background threshold (assuming the red is predominantly high R, low G and B)
        elif r > 160 and g < 100 and b < 100:
            newData.append((255, 255, 255, 0))
        # dark red outline from Wayfarer/Serf (r around 130-180, g<50, b<50)
        elif r > 100 and g < 60 and b < 60:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(out_path, "PNG")
    print(f"Processed {out_name}")

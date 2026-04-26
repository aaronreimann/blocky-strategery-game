from PIL import Image

img = Image.open('/Users/aaronr/.gemini/antigravity/brain/9c76bfe9-9af2-40cb-b5cd-a0d620ebcf62/blocky_voxel_top_heavy_1777236052601.png')

# Target ratio 16:9 -> 1024x576
# Crop from top (y=0 to y=576) to capture the top-left mountains and top-right castle
left = 0
top = 0
right = 1024
bottom = 576

img_cropped = img.crop((left, top, right, bottom))
img_cropped.save('/Users/aaronr/Development/civ-app/assets/images/title-bg.png')
img_cropped.save('/Users/aaronr/.gemini/antigravity/brain/9c76bfe9-9af2-40cb-b5cd-a0d620ebcf62/blocky_voxel_top_heavy_16_9.png')
print("Cropped top half successfully to 16:9")

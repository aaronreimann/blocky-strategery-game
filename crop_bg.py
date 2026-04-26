from PIL import Image

img = Image.open('/Users/aaronr/.gemini/antigravity/brain/9c76bfe9-9af2-40cb-b5cd-a0d620ebcf62/blocky_voxel_map_bg_1777235933337.png')
# Target ratio 16:9 -> 1024x576
# Crop from y=250 to y=826 to capture the central plain and the castle/mountains
left = 0
top = 250
right = 1024
bottom = 826

img_cropped = img.crop((left, top, right, bottom))
img_cropped.save('/Users/aaronr/Development/civ-app/assets/images/title-bg.png')
img_cropped.save('/Users/aaronr/.gemini/antigravity/brain/9c76bfe9-9af2-40cb-b5cd-a0d620ebcf62/blocky_voxel_map_bg_16_9.png')
print("Cropped successfully to 16:9")

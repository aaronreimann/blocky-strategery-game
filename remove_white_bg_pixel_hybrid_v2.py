from PIL import Image

# Open the logo image
img = Image.open('/Users/aaronr/.gemini/antigravity/brain/9c76bfe9-9af2-40cb-b5cd-a0d620ebcf62/pixelated_hybrid_logo_v2_1777253627218.png').convert("RGBA")
datas = img.getdata()

newData = []
# Make anything close to white transparent
for item in datas:
    # If RGB values are high (close to white)
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)

# Save over the assets directory
img.save('/Users/aaronr/Development/civ-app/assets/images/logo.png', "PNG")
# Also save to brain dir for the preview
img.save('/Users/aaronr/.gemini/antigravity/brain/9c76bfe9-9af2-40cb-b5cd-a0d620ebcf62/pixelated_hybrid_logo_v2_transparent.png', "PNG")
print("Background removed and pixelated hybrid logo v2 updated.")

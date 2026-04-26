from PIL import Image, ImageDraw
import collections

def remove_background(img_path):
    img = Image.open(img_path).convert('RGBA')
    width, height = img.size
    pixels = img.load()
    
    visited = set()
    # start from the four corners
    queue = collections.deque([(0,0), (width-1,0), (0,height-1), (width-1,height-1)])
    
    def is_white_ish(c):
        return c[0] > 220 and c[1] > 220 and c[2] > 220
        
    for start in queue:
        if start not in visited and is_white_ish(pixels[start[0], start[1]]):
            q = collections.deque([start])
            visited.add(start)
            while q:
                x, y = q.popleft()
                pixels[x, y] = (255, 255, 255, 0)
                
                for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        if (nx, ny) not in visited and is_white_ish(pixels[nx, ny]):
                            visited.add((nx, ny))
                            q.append((nx, ny))
                            
    img.save(img_path)

if __name__ == '__main__':
    remove_background('assets/images/logo.png')

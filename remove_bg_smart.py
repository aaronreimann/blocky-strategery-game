from PIL import Image
import collections

def remove_background(img_path):
    img = Image.open(img_path).convert('RGBA')
    width, height = img.size
    pixels = img.load()
    
    visited = set()
    queue = collections.deque([(0,0), (width-1,0), (0,height-1), (width-1,height-1)])
    
    def is_bg(c):
        return c[0] > 200 and c[1] > 200 and c[2] > 200
        
    for start in queue:
        if start not in visited and is_bg(pixels[start[0], start[1]]):
            q = collections.deque([start])
            visited.add(start)
            while q:
                x, y = q.popleft()
                pixels[x, y] = (255, 255, 255, 0)
                
                for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        if (nx, ny) not in visited:
                            c = pixels[nx, ny]
                            if is_bg(c):
                                visited.add((nx, ny))
                                q.append((nx, ny))
                            else:
                                # Edge pixel: make it semi-transparent and darker
                                visited.add((nx, ny))
                                pixels[nx, ny] = (int(c[0]*0.5), int(c[1]*0.5), int(c[2]*0.5), 150)
                            
    img.save(img_path)

if __name__ == '__main__':
    remove_background('/Users/aaronr/Development/civ-app/assets/images/logo.png')

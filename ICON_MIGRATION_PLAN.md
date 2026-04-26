# Feature Plan: Medieval Icon Integration

## Overview
Currently, the app relies on standard web/UI icons (likely via `@expo/vector-icons`). To better fit the "Blocky Strategery" medieval fantasy aesthetic, we need to migrate our unit, building, and UI icons to **Game-icons.net** (or RPG Awesome). 

This plan details the implementation of a custom SVG icon system to support highly specific medieval units (like Knights, Serfs, Archers, Castles, and resources).

## Implementation Approach

We will use the **Direct SVG Method** using `react-native-svg`. This is the recommended approach for React Native/Expo as it avoids the headache of custom font bundling while giving us access to the massive 4,000+ library of Game-icons.net.

## Step-by-Step Instructions for Claude

### 1. Install Dependencies
Run the following command to add SVG support to the Expo project:
```bash
npx expo install react-native-svg
```
*(Note: Expo handles the linking automatically. We do not strictly need `react-native-svg-transformer` unless we want to import SVGs directly as React components. A cleaner approach for standardizing icons is to manually convert the downloaded SVGs into a single mapping file or individual React components).*

### 2. Create the Icon Wrapper Component
Create a new file `src/ui/GameIcon.tsx` that will serve as our unified icon rendering component.

```tsx
import Svg, { Path } from 'react-native-svg';
import { View } from 'react-native';

// Example map of downloaded SVG paths from Game-icons.net
const ICON_PATHS = {
  knight: "M12...", // Replace with actual SVG path data
  serf: "M14...", 
  castle: "M10...",
  wheat: "M8..."
};

type IconName = keyof typeof ICON_PATHS;

interface GameIconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function GameIcon({ name, size = 24, color = "#FFFFFF" }: GameIconProps) {
  const pathData = ICON_PATHS[name];
  
  if (!pathData) return <View style={{ width: size, height: size, backgroundColor: 'red' }} />;

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path d={pathData} fill={color} />
    </Svg>
  );
}
```

### 3. Source the Icons
- Navigate to [game-icons.net](https://game-icons.net/).
- Search for the specific units/resources needed (e.g., "knight", "peasant", "wheat", "stone tower").
- Download the raw `.svg` files.
- Open the `.svg` files in a text editor, copy the `d="..."` attribute from the `<path>` element, and paste it into the `ICON_PATHS` object in `src/ui/GameIcon.tsx`.

### 4. Refactor Existing UI
Search the codebase for imports from `@expo/vector-icons` (such as FontAwesome, Ionicons, MaterialIcons). 
- Replace those imports with the new `GameIcon` component.
- Example: Swap a generic `<FontAwesome name="user" />` representing a unit with `<GameIcon name="knight" />`.

## UI Audit Checklist
When executing this plan, Claude should ensure the following areas are updated:
- [ ] Top HUD resource indicators (food, gold, tech).
- [ ] Kingdom Menu tabs (Cities, Tech).
- [ ] Unit badges on the game map.
- [ ] Combat UI / action buttons.

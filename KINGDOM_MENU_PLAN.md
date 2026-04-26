# Feature Plan: Kingdom Menu & Navigation

## Overview
This document outlines the implementation plan for centralizing empire management in Blocky Strategery. The goal is to move the active country indicator to the top right and use it as a trigger for a comprehensive "Kingdom Menu" that allows players to manage cities and research technologies.

## UX / UI Flow

1. **Top Bar Reorganization:**
   - Move the active country indicator (e.g., the badge showing "France" or "Turkey") to the **top right** of the game HUD.
   - Ensure this indicator is wrapped in a touchable/pressable component.

2. **Kingdom Menu Modal / Dropdown:**
   - Tapping the country indicator in the top right will open the **Kingdom Menu**.
   - This menu will serve as the central hub for high-level empire management, specifically focusing on **Cities** and **Tech**.

3. **City Management & Jumping:**
   - The menu will display a list of all cities currently owned by the player.
   - **Action:** Tapping on a specific city in this list will:
     1. Close the Kingdom Menu.
     2. Immediately pan/jump the game camera to focus on the selected city's tile.
   - This allows players to rapidly cycle through and check on their empire without manually scrolling across the map.

4. **Tech / Research Management:**
   - The menu will feature a dedicated section or tab for Technology.
   - Players will be able to see their current active research.
   - **Action:** Provide UI controls to select, change, or "tweak" the active tech research directly from this menu.

## Implementation Steps for Claude

1. **Refactor HUD Layout (`src/ui/...`):**
   - Update the main game HUD screen to position the country badge `absolute` to the `top-right`, or flex it to the end of the top bar container.
   - Add an `onPress` handler to the country badge to toggle a new `showKingdomMenu` state.

2. **Create `KingdomMenu` Component:**
   - Build a new overlay/modal component (`<KingdomMenu />`).
   - Connect it to the game state store (e.g., Zustand) to pull the player's `cities` array and current `tech` progress.

3. **Implement Camera Jump Logic:**
   - Inside the city list render, hook up the `onPress` event for each city row to trigger the map camera's `centerOnTile(city.x, city.y)` function (or equivalent).

4. **Wire up Tech Selection:**
   - Integrate the existing research selection logic into the new menu, allowing players to dispatch research changes directly to the game store.

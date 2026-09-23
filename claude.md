# Claude Project Guidelines & Known Issues

## React Native Gesture Handler + Fabric (New Architecture)
**Issue:** `Gesture.Simultaneous(pan, pinch)` causes a hard native crash (`IndexOutOfBoundsException` or `SIGSEGV`) on Android when using the New Architecture (Fabric).
**Cause:** When multiple gestures track the exact same pointers simultaneously and one is lifted, the native C++ pointer tracking arrays can get out of sync, causing the gesture handler to crash natively.
**Workaround:** Restrict the `Pan` gesture to a maximum of 1 pointer using `.maxPointers(1)`. This forces the pan gesture to ignore the second finger, preventing the pointer arrays from colliding during a pinch-to-zoom, while still allowing both panning and pinching to be composed via `Gesture.Simultaneous`.

```tsx
const pan = Gesture.Pan()
  .minDistance(8)
  .maxPointers(1) // CRITICAL: Prevents Android Fabric crash during simultaneous pinch
  // ...
```

## React Native Skia + Reanimated Shared Values
**Issue:** Exponential feedback loop causing Skia transforms to receive `NaN` or `Infinity`, resulting in an instant `SIGSEGV` native crash.
**Cause:** If `Gesture.Pan` and `Gesture.Pinch` use the exact same `startTx` and `startTy` shared values as their anchor offsets, they will overwrite each other's state during a simultaneous gesture. `pan` rebases the start value while `pinch` multiplies it, causing an exponential math explosion.
**Fix:** 
1. Always use isolated anchor states: `panStartTx`/`panStartTy` for Pan, and `pinchStartTx`/`pinchStartTy` for Pinch.
2. Android RNGH can occasionally emit `undefined` or `NaN` translations during chaotic multi-touch moments. Always add `if (!Number.isFinite(e.translationX)) return;` early exits in worklets.
3. When using `useDerivedValue` to pass a `transform` array to Skia, always apply a safe fallback (e.g. `Number.isFinite(tx.value) ? tx.value : 0`) to guarantee the C++ renderer never receives a fatal value.

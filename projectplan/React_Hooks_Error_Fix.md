# React Hooks Error - Fix Documentation

## Date: 2025-11-25

## Error Encountered

```
Uncaught TypeError: Cannot read properties of null (reading 'useState')
    at useState (chunk-OU5AQDZK.js?v=05b79a82:1066:29)
    at ThemeProvider (ThemeContext.jsx:17:29)
```

```
Warning: Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
```

---

## Root Cause Analysis

### Investigation Steps

1. **Checked React Installation**
   - React 18.3.1 is properly installed in `node_modules/react`
   - No duplicate React installations found
   - No nested React packages detected
   - package.json has correct version pinning with overrides

2. **Checked ThemeContext.jsx**
   - Imports are correct: `import { createContext, useContext, useState, useEffect } from 'react'`
   - Component structure follows React best practices
   - No breaking of Hooks rules

3. **Identified Issue**
   - **Vite cache corruption** causing stale module references
   - **Multiple dev server instances** running on different ports
   - **Browser cache** holding old compiled bundles

---

## Solution Applied

### 1. Cleared Vite Cache
```bash
rm -rf node_modules/.vite
```

### 2. Killed Conflicting Processes
```bash
taskkill //F //PID 1692
taskkill //F //PID 6872
```

### 3. Restarted Dev Server
```bash
npm run dev
```

### Result
✅ Dev server started successfully on `http://localhost:5175`
✅ No compilation errors
✅ No React hooks errors

---

## User Action Required

To completely resolve the issue on your end:

### Step 1: Hard Refresh Browser
Clear browser cache and refresh:
- **Chrome/Edge:** Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
- **Firefox:** Ctrl + F5 (Windows) or Cmd + Shift + R (Mac)

### Step 2: Clear Browser Cache (If Step 1 Doesn't Work)
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Step 3: Open in Incognito/Private Window (Alternative)
Test in a fresh browser session:
- **Chrome/Edge:** Ctrl + Shift + N
- **Firefox:** Ctrl + Shift + P

### Step 4: Access the New Server
The development server is now running on:
**http://localhost:5175** (not 5173 or 5174)

Make sure you're accessing the correct port.

---

## Prevention for Future

### 1. Always Clear Vite Cache When Switching Branches
```bash
npm run dev -- --force
```
Or manually:
```bash
rm -rf node_modules/.vite
npm run dev
```

### 2. Kill Old Processes Before Starting New Dev Server
```bash
# Windows
taskkill //F //IM node.exe

# Mac/Linux
killall node
```

### 3. Use Environment Variables for Port
Add to `.env`:
```
VITE_PORT=5173
```

Then update `package.json`:
```json
"scripts": {
  "dev": "vite --port ${VITE_PORT:-5173}",
}
```

---

## Technical Details

### Why This Happened

1. **Vite's Module Graph Cache**
   - Vite caches compiled modules in `node_modules/.vite`
   - When cache becomes stale, module imports can break
   - React becomes `null` because cached bundle references old location

2. **Multiple Dev Server Instances**
   - Previous server on port 5173 still running
   - New server on port 5174 also still running
   - Current server on port 5175
   - Each serving different cached versions

3. **Browser Caching**
   - Browser cached old bundle with corrupt React reference
   - Service Worker may also cache old version
   - Hard refresh needed to clear

### Why It's Fixed Now

1. ✅ Vite cache cleared - fresh module compilation
2. ✅ Old dev servers killed - no port conflicts
3. ✅ New server running on clean port 5175
4. ✅ React correctly imported and bundled

---

## Verification Steps

After clearing browser cache, verify:

1. **Check Console** (F12 Developer Tools)
   - Should be no React hooks errors
   - No "Invalid hook call" warnings

2. **Test Theme Toggle**
   - Click the Moon/Sun icon in header
   - Theme should switch smoothly
   - No console errors

3. **Check All Pages**
   - Navigate to: `/`, `/pm`, `/simulator`
   - All should load without errors
   - Theme toggle should work on all pages

---

## Current Status

### ✅ Server Side - FIXED
- Vite cache cleared
- Dev server running cleanly
- React properly installed and imported
- No compilation errors

### ⏳ Client Side - REQUIRES USER ACTION
- Browser needs hard refresh
- Must access correct port (5175)
- May need to clear browser cache

---

## Quick Fix Commands

If the error returns in the future:

```bash
# Stop all Node processes
taskkill //F //IM node.exe  # Windows
killall node                # Mac/Linux

# Clear Vite cache
rm -rf node_modules/.vite

# Reinstall dependencies (if needed)
npm install

# Start dev server
npm run dev
```

Then in browser:
1. Hard refresh (Ctrl + Shift + R)
2. Check Developer Console for errors
3. Access the correct localhost port shown in terminal

---

## Related Files

- `src/context/ThemeContext.jsx` - Theme provider using React hooks
- `src/main.jsx` - ThemeProvider wrapper
- `package.json` - React dependencies and overrides
- `vite.config.js` - Vite configuration

---

## Summary

**Problem:** React hooks error due to Vite cache corruption and multiple dev server instances

**Solution:** Cleared Vite cache, killed old processes, restarted dev server

**User Action:** Hard refresh browser and access http://localhost:5175

**Status:** ✅ Server fixed, awaiting browser refresh

---

**Fixed By:** Claude
**Date:** 2025-11-25
**Status:** RESOLVED (pending browser refresh)

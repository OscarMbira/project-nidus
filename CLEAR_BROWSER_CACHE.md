# How to Clear Browser Cache for Project Nidus

## Quick Fix (Chrome)

1. **Open Chrome DevTools** (F12)
2. **Right-click the refresh button** (next to address bar)
3. Select **"Empty Cache and Hard Reload"**

OR

1. Press **Ctrl + Shift + Delete** (Windows) or **Cmd + Shift + Delete** (Mac)
2. Select **"Cached images and files"**
3. Time range: **"All time"**
4. Click **"Clear data"**

## Clear Service Worker Cache

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Click **Unregister** for any registered service workers
5. Click **Clear storage** in left sidebar
6. Check all boxes and click **Clear site data**

## Clear Vite Cache

Run this command in your terminal:
```bash
npm run clear-cache
```

Then restart your dev server:
```bash
npm run dev
```

## Nuclear Option (Complete Reset)

1. Close all browser tabs with localhost:5173
2. Run: `npm run clear-cache`
3. Clear browser cache (see above)
4. Unregister all service workers (see above)
5. Restart dev server: `npm run dev`
6. Open a new incognito/private window
7. Navigate to http://localhost:5173


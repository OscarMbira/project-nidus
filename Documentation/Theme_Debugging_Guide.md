# Theme Toggle Debugging Guide

## Overview
Comprehensive debugging has been added to diagnose theme toggle issues. This guide explains how to use the debugging tools.

## Debugging Tools Available

### 1. Browser Console Logging
All theme operations now log detailed information to the browser console. Look for logs prefixed with:
- `[ThemeProvider]` - Theme context operations
- `[ThemeToggle]` - Button click and render events
- `[main.jsx]` - Initial theme setup
- `[useThemeContext]` - Context retrieval

### 2. Global Debug Functions

#### `window.__themeDebugUtils.debugTheme()`
Run this in the browser console to get a complete theme diagnostic report:
```javascript
window.__themeDebugUtils.debugTheme()
```

This will show:
- localStorage theme value
- DOM dark class status
- All DOM classes on root element
- Computed styles
- Number of theme toggle buttons found
- Button states

#### `window.__themeDebugUtils.checkTheme()`
Quick check of current theme state:
```javascript
window.__themeDebugUtils.checkTheme()
```

#### `window.__themeDebug`
Direct access to ThemeProvider internals:
```javascript
// Get current theme
window.__themeDebug.getTheme()

// Get localStorage value
window.__themeDebug.getLocalStorage()

// Check DOM class
window.__themeDebug.getDOMClass()

// Force theme change (for testing)
window.__themeDebug.forceTheme('light')
window.__themeDebug.forceTheme('dark')
```

## Debugging Steps

### Step 1: Check Initial State
1. Open browser console (F12)
2. Run: `window.__themeDebugUtils.debugTheme()`
3. Note the initial state

### Step 2: Click the Toggle Button
1. Click the theme toggle button
2. Watch the console for logs starting with `[ThemeToggle]`
3. Look for:
   - "BUTTON CLICKED" message
   - Current theme before click
   - Whether toggleTheme function is called
   - Any errors

### Step 3: Check State After Click
1. After clicking, run: `window.__themeDebugUtils.checkTheme()`
2. Verify:
   - localStorage updated
   - DOM class changed
   - Theme state updated

### Step 4: Check for Errors
Look for any console errors:
- Context errors
- Function call errors
- State update errors

## Common Issues to Check

### Issue 1: Button Not Clickable
**Symptoms:** No console logs when clicking
**Check:**
- Is button visible? `document.querySelector('[data-testid="theme-toggle-button"]')`
- Is button disabled?
- Are there CSS issues blocking clicks?

### Issue 2: Function Not Called
**Symptoms:** "BUTTON CLICKED" appears but no "toggleTheme() called"
**Check:**
- Is toggleTheme function defined?
- Check: `window.__themeDebug.getTheme()` returns a function?

### Issue 3: State Not Updating
**Symptoms:** Function called but theme doesn't change
**Check:**
- Look for `[ThemeProvider] setTheme callback executed!` log
- Check if state update is queued
- Verify React is re-rendering

### Issue 4: DOM Not Updating
**Symptoms:** State changes but UI doesn't
**Check:**
- DOM class logs show class being added/removed?
- Check computed styles
- Verify Tailwind is processing the dark class

### Issue 5: localStorage Not Persisting
**Symptoms:** Theme resets on page reload
**Check:**
- localStorage.setItem logs show success?
- Verify localStorage.getItem returns correct value
- Check browser localStorage permissions

## Manual Testing Commands

```javascript
// Force theme to light
window.__themeDebug.forceTheme('light')

// Force theme to dark
window.__themeDebug.forceTheme('dark')

// Check current state
window.__themeDebugUtils.checkTheme()

// Full diagnostic
window.__themeDebugUtils.debugTheme()

// Manually toggle (if button doesn't work)
const btn = document.querySelector('[data-testid="theme-toggle-button"]')
btn.click()

// Check if ThemeProvider exists
document.querySelector('[data-theme-provider]')

// Check all toggle buttons
document.querySelectorAll('[data-testid="theme-toggle-button"]')
```

## What to Report

If the toggle still doesn't work, please provide:

1. **Console Logs**: Copy all logs from console when:
   - Page loads
   - Button is clicked
   - After clicking

2. **Debug Output**: Run and share:
   ```javascript
   window.__themeDebugUtils.debugTheme()
   ```

3. **Browser Info**:
   - Browser name and version
   - Operating system
   - Any browser extensions that might interfere

4. **Steps to Reproduce**:
   - Which page (Home, PM, Simulator)?
   - What happens when you click?
   - Does anything change at all?

## Expected Console Output

When working correctly, you should see:
```
[main.jsx] Initializing theme before React render...
[ThemeProvider] Initializing with theme: dark
[ThemeProvider] Render #1, Current theme state: dark
[ThemeToggle] Render #1
[ThemeToggle] Context retrieved: { theme: 'dark', hasToggleTheme: true }
[ThemeToggle] ========== BUTTON CLICKED ==========
[ThemeProvider] toggleTheme CALLED!
[ThemeProvider] setTheme callback executed!
[ThemeProvider] Previous theme: dark
[ThemeProvider] New theme: light
[ThemeProvider] useEffect triggered. Theme changed to: light
[ThemeProvider] Added "dark" class to root element (or removed)
```

If you see errors or missing logs, that's where the problem is!


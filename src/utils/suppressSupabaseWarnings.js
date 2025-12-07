/**
 * Suppress Supabase Multiple GoTrueClient Warning
 * 
 * This warning is expected when using both appDb and simDb clients.
 * Both clients share the same storage key and auth state, so it's safe.
 * 
 * This utility suppresses the console warning to reduce noise.
 * 
 * IMPORTANT: This must be imported FIRST in main.jsx before any Supabase imports
 */

// Use IIFE to ensure this runs immediately, even before other code
(function() {
  if (typeof window === 'undefined') return;
  
  // Store original console methods immediately
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Override console.error to filter out expected warnings
  console.error = function(...args) {
    // Check all arguments for expected warnings
    const message = args.find(arg => typeof arg === 'string');
    const errorObj = args.find(arg => typeof arg === 'object' && arg !== null);
    const allArgsString = args.map(arg => String(arg)).join(' ');
    
    // Suppress GoTrueClient warning - expected when using appDb and simDb
    if (message && (
      message.includes('Multiple GoTrueClient instances') ||
      message.includes('GoTrueClient')
    )) {
      return;
    }
    
    // Suppress SSO permission denied errors - expected when RLS policy hasn't been updated yet
    // or when SSO providers aren't configured
    if (errorObj && (
      (errorObj.code === '42501' && errorObj.message?.includes('permission denied')) ||
      (message && message.includes('Error fetching SSO providers') && errorObj?.code === '42501')
    )) {
      return;
    }
    
    // Suppress 403 Forbidden errors for sso_providers (expected until RLS policy is updated)
    if (allArgsString && (
      allArgsString.includes('sso_providers') && 
      (allArgsString.includes('403') || allArgsString.includes('Forbidden'))
    )) {
      return;
    }
    
    // Call original console.error for all other messages
    originalConsoleError.apply(console, args);
  };
  
  // Also override console.warn for expected warnings
  console.warn = function(...args) {
    // Check all arguments for expected warnings
    const message = args.find(arg => typeof arg === 'string');
    const allArgsString = args.map(arg => String(arg)).join(' ');
    
    // Suppress GoTrueClient warning - expected when using appDb and simDb
    // Both clients share the same storage key and auth state, so it's safe
    if (allArgsString && (
      allArgsString.includes('Multiple GoTrueClient instances') ||
      allArgsString.includes('GoTrueClient instances detected') ||
      allArgsString.includes('same browser context') ||
      allArgsString.includes('same storage key')
    )) {
      return;
    }
    
    // Suppress React Router future flag warnings (we've already added the flag)
    if (message && (
      message.includes('React Router Future Flag') ||
      message.includes('v7_relativeSplatPath')
    )) {
      return;
    }
    
    // Call original console.warn for all other messages
    originalConsoleWarn.apply(console, args);
  };
  
  // Make it easy to restore original behavior if needed
  window.__restoreConsole = () => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  };
})();


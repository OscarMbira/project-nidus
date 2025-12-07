/**
 * Theme Debugging Utility
 * Use this to diagnose theme issues in the browser console
 */

export function debugTheme() {
  console.log('========== THEME DEBUG REPORT ==========')
  
  // Check localStorage
  const storedTheme = localStorage.getItem('theme')
  console.log('1. localStorage theme:', storedTheme)
  
  // Check DOM
  const root = document.documentElement
  const hasDarkClass = root.classList.contains('dark')
  console.log('2. DOM dark class present:', hasDarkClass)
  console.log('3. DOM classes:', Array.from(root.classList))
  
  // Check computed styles
  const computedStyle = window.getComputedStyle(root)
  console.log('4. Root background color:', computedStyle.backgroundColor)
  console.log('5. Root color:', computedStyle.color)
  
  // Check if Tailwind dark mode is working
  const testElement = document.createElement('div')
  testElement.className = 'bg-white dark:bg-gray-900'
  testElement.style.position = 'absolute'
  testElement.style.visibility = 'hidden'
  document.body.appendChild(testElement)
  const testComputed = window.getComputedStyle(testElement)
  const testBgColor = testComputed.backgroundColor
  document.body.removeChild(testElement)
  console.log('6. Tailwind dark mode test - bg-white dark:bg-gray-900 computed color:', testBgColor)
  console.log('7. Tailwind dark mode working:', testBgColor !== 'rgb(255, 255, 255)' || hasDarkClass)
  
  // Check if ThemeProvider exists
  const themeProvider = document.querySelector('[data-theme-provider]')
  console.log('6. ThemeProvider element found:', !!themeProvider)
  
  // Check all theme toggle buttons
  const toggleButtons = document.querySelectorAll('[data-testid="theme-toggle-button"]')
  console.log('7. Theme toggle buttons found:', toggleButtons.length)
  toggleButtons.forEach((btn, index) => {
    console.log(`   Button ${index + 1}:`, {
      theme: btn.getAttribute('data-theme'),
      visible: btn.offsetParent !== null,
      disabled: btn.disabled
    })
  })
  
  // Check React context (if accessible)
  try {
    const reactRoot = document.getElementById('root')
    console.log('8. React root element:', reactRoot)
  } catch (e) {
    console.log('8. Could not access React root')
  }
  
  console.log('========================================')
  
  return {
    localStorage: storedTheme,
    domHasDark: hasDarkClass,
    toggleButtonsCount: toggleButtons.length
  }
}

/**
 * Force a visual refresh of the theme
 * This can help if the DOM class changes but the visual doesn't update
 */
export function forceThemeRefresh() {
  console.log('========== FORCING THEME REFRESH ==========')
  const root = document.documentElement
  const currentTheme = localStorage.getItem('theme') || 'dark'
  
  // Remove and re-add the class to force a repaint
  const hadDark = root.classList.contains('dark')
  root.classList.remove('dark')
  void root.offsetHeight // Force reflow
  
  if (currentTheme === 'dark') {
    root.classList.add('dark')
    console.log('Forced dark class addition')
  } else {
    console.log('Ensured dark class is removed')
  }
  
  void root.offsetHeight // Force another reflow
  
  // Trigger a repaint
  window.getComputedStyle(root).backgroundColor
  
  console.log('Theme refresh complete. Current class:', root.classList.contains('dark'))
  console.log('==========================================')
}

/**
 * Test if Tailwind dark mode is working
 */
export function testTailwindDarkMode() {
  console.log('========== TESTING TAILWIND DARK MODE ==========')
  
  const root = document.documentElement
  const hasDark = root.classList.contains('dark')
  
  // Create test elements
  const testContainer = document.createElement('div')
  testContainer.style.position = 'fixed'
  testContainer.style.top = '10px'
  testContainer.style.right = '10px'
  testContainer.style.zIndex = '99999'
  testContainer.style.padding = '10px'
  testContainer.style.border = '2px solid red'
  testContainer.style.backgroundColor = 'white'
  
  const lightTest = document.createElement('div')
  lightTest.className = 'bg-white text-black p-2 mb-2'
  lightTest.textContent = 'Light: bg-white (should be white)'
  
  const darkTest = document.createElement('div')
  darkTest.className = 'dark:bg-gray-900 dark:text-white bg-gray-100 text-gray-900 p-2'
  darkTest.textContent = `Dark: dark:bg-gray-900 (should be ${hasDark ? 'dark gray' : 'light gray'})`
  
  testContainer.appendChild(lightTest)
  testContainer.appendChild(darkTest)
  document.body.appendChild(testContainer)
  
  setTimeout(() => {
    const lightComputed = window.getComputedStyle(lightTest)
    const darkComputed = window.getComputedStyle(darkTest)
    
    console.log('Light test element background:', lightComputed.backgroundColor)
    console.log('Dark test element background:', darkComputed.backgroundColor)
    console.log('Dark test element color:', darkComputed.color)
    console.log('Has dark class:', hasDark)
    console.log('Tailwind dark mode working:', darkComputed.backgroundColor !== 'rgb(243, 244, 246)')
    
    // Remove test after 5 seconds
    setTimeout(() => {
      document.body.removeChild(testContainer)
      console.log('Test elements removed')
    }, 5000)
  }, 100)
  
  console.log('==========================================')
}

// Make debugging utilities available globally (silently)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.debugTheme = debugTheme
  window.forceThemeRefresh = forceThemeRefresh
  window.testTailwindDarkMode = testTailwindDarkMode
  // Utilities are available but don't log on import
  // Use window.debugTheme() in console to debug
}


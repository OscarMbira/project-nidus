/**
 * Test if Tailwind dark mode is working
 * Run this in the browser console to diagnose
 */
export function testTailwindDarkMode() {
  console.log('========== TESTING TAILWIND DARK MODE ==========')
  
  const html = document.documentElement
  const hasDark = html.classList.contains('dark')
  
  console.log('1. Current state:')
  console.log('   - HTML has dark class:', hasDark)
  console.log('   - localStorage theme:', localStorage.getItem('theme'))
  
  // Create a test element with dark: classes
  const testDiv = document.createElement('div')
  testDiv.className = 'bg-white dark:bg-gray-900 text-black dark:text-white p-4 m-4 border border-gray-300 dark:border-gray-700'
  testDiv.textContent = 'Tailwind Dark Mode Test'
  testDiv.style.position = 'fixed'
  testDiv.style.top = '10px'
  testDiv.style.right = '10px'
  testDiv.style.zIndex = '99999'
  document.body.appendChild(testDiv)
  
  // Check computed styles
  setTimeout(() => {
    const computed = window.getComputedStyle(testDiv)
    console.log('2. Test element styles:')
    console.log('   - Background color:', computed.backgroundColor)
    console.log('   - Color:', computed.color)
    console.log('   - Border color:', computed.borderColor)
    
    // Expected values
    const expectedBg = hasDark ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)' // gray-900 or white
    const expectedColor = hasDark ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)' // white or black
    
    console.log('3. Expected vs Actual:')
    console.log('   - Background matches:', computed.backgroundColor === expectedBg || 
      (hasDark && computed.backgroundColor.includes('17')) ||
      (!hasDark && computed.backgroundColor.includes('255')))
    console.log('   - Color matches:', computed.color === expectedColor ||
      (hasDark && computed.color.includes('255')) ||
      (!hasDark && computed.color.includes('0')))
    
    // Check if Tailwind is generating dark: classes
    const styleSheets = Array.from(document.styleSheets)
    const tailwindSheet = styleSheets.find(sheet => {
      try {
        return sheet.href && sheet.href.includes('tailwind') || 
               (sheet.ownerNode && sheet.ownerNode.textContent && sheet.ownerNode.textContent.includes('dark:'))
      } catch (e) {
        return false
      }
    })
    
    console.log('4. Tailwind stylesheet found:', !!tailwindSheet)
    
    // Remove test element after 5 seconds
    setTimeout(() => {
      document.body.removeChild(testDiv)
      console.log('5. Test element removed')
      console.log('==========================================')
    }, 5000)
  }, 100)
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.testTailwindDarkMode = testTailwindDarkMode
}


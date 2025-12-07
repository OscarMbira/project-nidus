/**
 * Cache clearing script
 * Run this to clear all caches before starting dev server
 */

import { rmSync } from 'fs'
import { join } from 'path'

const projectRoot = process.cwd()

console.log('Clearing all caches...')

// Clear Vite cache
try {
  rmSync(join(projectRoot, 'node_modules', '.vite'), { recursive: true, force: true })
  console.log('✓ Cleared Vite cache')
} catch (e) {
  console.log('⚠ Vite cache already cleared or doesn\'t exist')
}

// Clear dist folder
try {
  rmSync(join(projectRoot, 'dist'), { recursive: true, force: true })
  console.log('✓ Cleared dist folder')
} catch (e) {
  console.log('⚠ dist folder already cleared or doesn\'t exist')
}

console.log('Cache clearing complete!')
console.log('Now restart your dev server with: npm run dev')


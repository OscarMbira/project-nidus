#!/usr/bin/env node

/**
 * Documentation Watcher
 * Monitors the Documentation folder and automatically syncs changes to public/Documentation
 */

import { watch } from 'chokidar';
import { copyFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const sourceDir = join(projectRoot, 'Documentation');
const targetDir = join(projectRoot, 'public', 'Documentation');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}]${colors.reset} ${message}`);
}

// Ensure target directory exists
async function ensureTargetDir() {
  try {
    await mkdir(targetDir, { recursive: true });
    log('Target directory ready: public/Documentation', colors.cyan);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      log(`Error creating target directory: ${error.message}`, colors.red);
      throw error;
    }
  }
}

// Copy a single file
async function copyMarkdownFile(filePath) {
  try {
    const relativePath = relative(sourceDir, filePath);
    const targetPath = join(targetDir, relativePath);
    const targetFileDir = dirname(targetPath);

    // Ensure target subdirectory exists
    await mkdir(targetFileDir, { recursive: true });

    // Copy the file
    await copyFile(filePath, targetPath);
    log(`✓ Copied: ${relativePath}`, colors.green);
    return true;
  } catch (error) {
    log(`✗ Error copying file: ${error.message}`, colors.red);
    return false;
  }
}

// Delete a file from target
async function deleteMarkdownFile(filePath) {
  try {
    const relativePath = relative(sourceDir, filePath);
    const targetPath = join(targetDir, relativePath);

    await unlink(targetPath);
    log(`✓ Deleted: ${relativePath}`, colors.yellow);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      log(`✗ Error deleting file: ${error.message}`, colors.red);
      return false;
    }
    return true; // File doesn't exist, that's fine
  }
}

// Recursive function to read directory
async function readDirRecursive(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await readDirRecursive(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Initial sync - copy all markdown files
async function initialSync() {
  log('Starting initial sync...', colors.blue);
  
  try {
    const files = await readDirRecursive(sourceDir);
    let copied = 0;
    let skipped = 0;

    for (const filePath of files) {
      try {
        // Check if target file exists and is newer
        const sourceStat = await stat(filePath);
        const relativePath = relative(sourceDir, filePath);
        const targetPath = join(targetDir, relativePath);

        try {
          const targetStat = await stat(targetPath);
          if (targetStat.mtimeMs >= sourceStat.mtimeMs) {
            skipped++;
            continue;
          }
        } catch {
          // Target doesn't exist, will copy
        }

        await copyMarkdownFile(filePath);
        copied++;
      } catch (error) {
        const relativePath = relative(sourceDir, filePath);
        log(`Error syncing ${relativePath}: ${error.message}`, colors.red);
      }
    }

    log(`Initial sync complete: ${copied} files copied, ${skipped} files skipped`, colors.green);
  } catch (error) {
    log(`Error during initial sync: ${error.message}`, colors.red);
  }
}

// Start watching
async function startWatcher() {
  await ensureTargetDir();
  await initialSync();

  log('Watching for changes in Documentation folder...', colors.blue);
  log('Press Ctrl+C to stop', colors.cyan);

  const watcher = watch(sourceDir, {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    persistent: true,
    ignoreInitial: false,
  });

  // Debounce function to avoid multiple rapid updates
  let debounceTimers = new Map();
  const DEBOUNCE_MS = 300;

  function debouncedAction(filePath, action) {
    if (debounceTimers.has(filePath)) {
      clearTimeout(debounceTimers.get(filePath));
    }

    const timer = setTimeout(async () => {
      debounceTimers.delete(filePath);
      await action(filePath);
    }, DEBOUNCE_MS);

    debounceTimers.set(filePath, timer);
  }

  watcher
    .on('add', (filePath) => {
      if (filePath.endsWith('.md')) {
        debouncedAction(filePath, copyMarkdownFile);
      }
    })
    .on('change', (filePath) => {
      if (filePath.endsWith('.md')) {
        log(`Changed: ${relative(sourceDir, filePath)}`, colors.yellow);
        debouncedAction(filePath, copyMarkdownFile);
      }
    })
    .on('unlink', (filePath) => {
      if (filePath.endsWith('.md')) {
        debouncedAction(filePath, deleteMarkdownFile);
      }
    })
    .on('error', (error) => {
      log(`Watcher error: ${error.message}`, colors.red);
    })
    .on('ready', () => {
      log('Documentation watcher is ready!', colors.green);
    });

  // Graceful shutdown
  process.on('SIGINT', () => {
    log('\nStopping watcher...', colors.yellow);
    watcher.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('\nStopping watcher...', colors.yellow);
    watcher.close();
    process.exit(0);
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWatcher().catch((error) => {
    log(`Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

export { startWatcher };


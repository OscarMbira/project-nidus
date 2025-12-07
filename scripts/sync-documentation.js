#!/usr/bin/env node

/**
 * One-time Documentation Sync Script
 * Syncs all markdown files from Documentation to public/Documentation
 * Useful for build processes or manual syncing
 */

import { copyFile, mkdir, readdir, stat } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const sourceDir = join(projectRoot, 'Documentation');
const targetDir = join(projectRoot, 'public', 'Documentation');

async function syncDocumentation() {
  console.log('📚 Syncing documentation files...\n');

  try {
    // Ensure target directory exists
    await mkdir(targetDir, { recursive: true });

    // Read all files recursively
    const files = await readdir(sourceDir, { recursive: true, withFileTypes: true });
    let copied = 0;
    let skipped = 0;
    let errors = 0;

    for (const file of files) {
      if (file.isFile() && file.name.endsWith('.md')) {
        const filePath = join(file.parentPath || sourceDir, file.name);
        const relativePath = relative(sourceDir, filePath);
        const targetPath = join(targetDir, relativePath);
        const targetFileDir = dirname(targetPath);

        try {
          // Ensure target subdirectory exists
          await mkdir(targetFileDir, { recursive: true });

          // Check if we need to copy (source is newer or target doesn't exist)
          let shouldCopy = true;
          try {
            const sourceStat = await stat(filePath);
            try {
              const targetStat = await stat(targetPath);
              if (targetStat.mtimeMs >= sourceStat.mtimeMs) {
                shouldCopy = false;
              }
            } catch {
              // Target doesn't exist, will copy
            }

            if (shouldCopy) {
              await copyFile(filePath, targetPath);
              console.log(`✓ ${relativePath}`);
              copied++;
            } else {
              skipped++;
            }
          } catch (statError) {
            // If stat fails, try to copy anyway
            await copyFile(filePath, targetPath);
            console.log(`✓ ${relativePath}`);
            copied++;
          }
        } catch (error) {
          console.error(`✗ Error copying ${relativePath}: ${error.message}`);
          errors++;
        }
      }
    }

    console.log(`\n✅ Sync complete!`);
    console.log(`   Copied: ${copied} files`);
    console.log(`   Skipped: ${skipped} files (up to date)`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} files`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

syncDocumentation();


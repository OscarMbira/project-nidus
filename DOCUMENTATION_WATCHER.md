# Documentation Auto-Sync Feature

## Overview

The documentation auto-sync feature automatically monitors the `Documentation/` folder and syncs any changes to `public/Documentation/` in real-time. This ensures that your documentation is always up-to-date without manual intervention.

## Features

- ✅ **Automatic file watching** - Monitors the Documentation folder for changes
- ✅ **Real-time syncing** - Instantly copies new, updated, or deleted markdown files
- ✅ **Initial sync** - Syncs all existing files on startup
- ✅ **Debounced updates** - Prevents duplicate copies during rapid file changes
- ✅ **Subdirectory support** - Handles nested folder structures
- ✅ **Build integration** - Automatically syncs before production builds

## Usage

### Development Mode (Automatic)

When you run the dev server, the watcher starts automatically:

```bash
npm run dev
```

This runs both the documentation watcher and the Vite dev server simultaneously.

### Manual Watch (Standalone)

To run just the documentation watcher:

```bash
npm run watch:docs
```

### One-Time Sync

To sync all documentation files once (useful for builds or manual syncing):

```bash
npm run sync:docs
```

### Development Server Only (No Watcher)

If you want to run the dev server without the watcher:

```bash
npm run dev:only
```

## How It Works

1. **Watcher Process** (`scripts/watch-documentation.js`):
   - Monitors `Documentation/` folder using chokidar
   - Detects file additions, modifications, and deletions
   - Automatically copies `.md` files to `public/Documentation/`
   - Uses debouncing to prevent rapid duplicate operations

2. **Sync Process** (`scripts/sync-documentation.js`):
   - One-time synchronization script
   - Copies all markdown files from source to target
   - Skips files that are already up-to-date
   - Used during build process

## File Structure

```
Project Root/
├── Documentation/              # Source markdown files
│   ├── User_Guide.md
│   ├── Project_Manager_Guide.md
│   └── Training/
│       └── README.md
└── public/
    └── Documentation/          # Auto-synced files (served by Vite)
        ├── User_Guide.md
        ├── Project_Manager_Guide.md
        └── Training/
            └── README.md
```

## What Gets Synced

- ✅ All `.md` files in the Documentation folder
- ✅ Files in subdirectories
- ✅ Preserves folder structure

## What Doesn't Get Synced

- ❌ Non-markdown files (`.txt`, `.pdf`, etc.)
- ❌ Hidden files (starting with `.`)
- ❌ Files in `.git` or other hidden directories

## Console Output

The watcher provides color-coded console output:

- 🟢 **Green**: Files successfully copied
- 🟡 **Yellow**: Files deleted or changed
- 🔵 **Blue**: Informational messages
- 🔴 **Red**: Errors

Example output:
```
[10:30:15] Starting initial sync...
[10:30:15] Target directory ready: public/Documentation
[10:30:16] ✓ Copied: User_Guide.md
[10:30:16] Initial sync complete: 15 files copied, 62 files skipped
[10:30:16] Watching for changes in Documentation folder...
[10:30:45] Changed: Project_Manager_Guide.md
[10:30:45] ✓ Copied: Project_Manager_Guide.md
```

## Build Integration

The build process automatically syncs documentation:

```bash
npm run build
```

This runs `sync:docs` before building, ensuring all documentation is current.

## Troubleshooting

### Files Not Syncing

1. Check that the watcher is running (you should see console output)
2. Verify file extensions are `.md`
3. Check file permissions
4. Ensure `public/Documentation/` directory exists and is writable

### Watcher Not Starting

1. Check Node.js version (requires Node 14+)
2. Verify chokidar is installed: `npm list chokidar`
3. Check for errors in console output

### Performance Issues

If you have many documentation files and notice performance issues:

1. The watcher uses debouncing (300ms) to prevent rapid updates
2. Initial sync may take a few seconds with 100+ files
3. Consider organizing files into subdirectories

## Manual Override

If you need to manually sync files:

1. Run `npm run sync:docs` for a one-time sync
2. Or manually copy files from `Documentation/` to `public/Documentation/`

## Stopping the Watcher

To stop the watcher:
- Press `Ctrl+C` in the terminal where it's running
- The watcher will gracefully shut down

---

**Note**: The watcher runs in the background when using `npm run dev`. You don't need to manage it separately unless you want to run it standalone.


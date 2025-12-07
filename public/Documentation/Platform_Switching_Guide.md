# Platform Switching Guide

## Overview

Users can have access to both Platform and Simulator Platform with a single account. This guide explains how platform switching works.

## Platform Access

### Registration

During registration, users can select:
- Platform only
- Simulator Platform only
- Both platforms

Each platform has its own subscription and can be managed independently.

### Login Flow

1. User logs in with email and password
2. System checks platform access:
   - **Single platform**: Auto-redirect to that platform
   - **Multiple platforms**: Show platform selector modal
3. User selects platform
4. Redirected to chosen platform dashboard

## Platform Switching

### Using Platform Switcher

For users with multiple platforms:
1. Platform switcher appears in header
2. Click switcher to see available platforms
3. Select desired platform
4. System switches context and redirects

### Platform Context

- Current platform stored in session
- Platform-specific data isolated
- Separate subscriptions per platform
- Independent onboarding flows

## Platform Features

### Platform
- Account-based organization
- Multi-tenant structure
- Team collaboration
- Project management
- Role-based permissions

### Simulator Platform
- Individual-based
- Learning scenarios
- Progress tracking
- Badges and achievements
- No team concept

## Technical Details

### Platform Context Provider

```javascript
import { usePlatform } from '../context/PlatformContext'

const { currentPlatform, changePlatform, platforms } = usePlatform()
```

### Manual Platform Switch

```javascript
import { switchPlatform } from '../services/unifiedAuthService'

await switchPlatform(userId, 'pm') // or 'simulator'
```

## Best Practices

1. **Clear Indication**: Always show current platform in UI
2. **Easy Switching**: Make platform switcher easily accessible
3. **Context Preservation**: Maintain user's work when switching
4. **Separate Sessions**: Keep platform data isolated


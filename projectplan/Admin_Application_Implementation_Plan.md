# Admin Application Implementation Plan

## Overview

This document outlines the implementation plan for a **separate standalone Admin application** (`project-nidus-admin`) that will centrally administer both the PM (Project Management) and Simulator applications. The Admin app will be located at `E:\Hifo\AI Business\project-nidus-admin` as a completely independent application.

## Architecture Design

### Application Separation

```
E:\Hifo\AI Business\
├── Project Nidus/              # Main application (PM + Simulator)
│   ├── src/
│   ├── package.json
│   └── ...
│
└── project-nidus-admin/        # Admin application (NEW - SEPARATE)
    ├── src/
    ├── package.json
    └── ...
```

### Shared Infrastructure

Both applications share:
- **Same Supabase project** (same database, auth, storage)
- **Same user authentication** (Supabase Auth)
- **Same database schemas** (public for PM, sim for Simulator)

---

## Admin Application Folder Structure

```
project-nidus-admin/
├── public/
│   └── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── components/
│   │   ├── layout/
│   │   ├── auth/
│   │   ├── ui/
│   │   ├── pm/
│   │   └── simulator/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── pm/
│   │   ├── simulator/
│   │   ├── security/
│   │   ├── support/
│   │   ├── monitoring/
│   │   └── auth/
│   ├── services/
│   │   ├── supabase/
│   │   ├── pm/
│   │   ├── simulator/
│   │   ├── security/
│   │   └── common/
│   ├── hooks/
│   ├── context/
│   └── utils/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── CLAUDE.md
└── README.md
```

---

## Route Structure

```
/dashboard                    # Admin Dashboard
/pm/*                        # PM Administration
/simulator/*                 # Simulator Administration
/security/*                  # Security Management
/support/*                   # Support & Content
/monitoring/*                # System Monitoring
```

---

## Implementation Phases

### Phase 1: Project Setup & Core Infrastructure
- [x] Write implementation plan
- [x] Create project folder structure
- [x] Copy CLAUDE.md
- [x] Initialize React + Vite
- [x] Configure Tailwind CSS
- [x] Set up Supabase client
- [x] Create auth system
- [x] Create theme system
- [x] Create layout components
- [x] Create core UI components
- [x] Set up routing
- [x] Create database schema SQL

### Phase 2: Admin Dashboard
- [x] Dashboard service
- [x] Dashboard page with metrics

### Phase 3: PM Administration
- [x] User Management (placeholder)
- [x] Role Management (placeholder)
- [x] Permission Management (placeholder)
- [x] Menu Configuration (placeholder)
- [x] Organization Management (placeholder)
- [x] Methodology Configuration (placeholder)
- [x] System Settings (placeholder)

### Phase 4: Simulator Administration
- [x] Scenario Management (placeholder)
- [x] Module Configuration (placeholder)
- [x] AI Event Configuration (placeholder)
- [x] Pricing Management (placeholder)
- [x] Certificate Templates (placeholder)
- [x] Leaderboard Configuration (placeholder)
- [x] Simulator Analytics (placeholder)

### Phase 5: Security Pages
- [x] Security Monitoring (placeholder)
- [x] Security Alerts (placeholder)
- [x] Security Incidents (placeholder)
- [x] Audit Logs (placeholder)
- [x] GDPR Compliance (placeholder)
- [x] SSO Management (placeholder)

### Phase 6: Support & Monitoring
- [x] Help Management (placeholder)
- [x] Bug Tracking (placeholder)
- [x] Feedback Analysis (placeholder)
- [x] Feature Requests (placeholder)
- [x] Maintenance Dashboard (placeholder)
- [x] Performance Dashboard (placeholder)
- [x] System Monitoring (placeholder)

### Phase 7: Testing & Documentation (COMPLETED)
- [x] Testing infrastructure (Vitest + React Testing Library)
- [x] Unit tests for services (supabaseClient)
- [x] Unit tests for contexts (ThemeContext, AuthContext)
- [x] Unit tests for components (AdminProtectedRoute, AdminSidebar, AdminHeader)
- [x] Unit tests for pages (Login)
- [x] Integration tests (auth, navigation, dashboard)
- [x] Test utilities and mock helpers
- [x] Testing Guide documentation
- [x] README documentation

---

## Technical Specifications

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase
- **Dev Port**: localhost:5174

---

## Review Section

### Implementation Summary (November 22, 2025)

**Phase 1 Complete** - Core infrastructure for the Admin application has been successfully implemented.

### Files Created

#### Configuration Files
- `package.json` - Project dependencies and scripts
- `vite.config.js` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS with custom PM/Simulator color schemes
- `postcss.config.js` - PostCSS configuration
- `index.html` - Entry HTML with dark mode default
- `.gitignore` - Git ignore patterns
- `.env.example` - Environment variable template
- `CLAUDE.md` - Development instructions for admin app
- `README.md` - Project documentation

#### Core Application Files
- `src/main.jsx` - React entry point with providers
- `src/App.jsx` - Main routing with all admin routes
- `src/index.css` - Global styles with Tailwind

#### Context & Services
- `src/context/ThemeContext.jsx` - Theme management (dark/light)
- `src/context/AuthContext.jsx` - Authentication state and role checking
- `src/services/supabase/supabaseClient.js` - Dual schema clients (appDb, simDb)

#### Layout Components
- `src/components/layout/AdminLayout.jsx` - Main layout with sidebar
- `src/components/layout/AdminSidebar.jsx` - Collapsible dual-domain sidebar
- `src/components/layout/AdminHeader.jsx` - Header with user menu and theme toggle
- `src/components/auth/AdminProtectedRoute.jsx` - Route protection for admin roles

#### Pages Created (27 total)
- **Auth**: Login, Unauthorized
- **Dashboard**: Main admin dashboard with PM and Simulator stats
- **PM Admin** (7): User, Role, Permission, Menu, Organization, Methodology, System Settings
- **Simulator Admin** (7): Scenarios, Modules, AI Config, Pricing, Certificates, Leaderboards, Analytics
- **Security** (6): Monitoring, Alerts, Incidents, Audit Logs, GDPR, SSO
- **Support** (5): Help, Bugs, Feedback, Features, Maintenance
- **Monitoring** (2): Performance, System

#### Database
- `SQL/v80_admin_application_tables.sql` - Admin tables, permissions, and RLS policies

#### Testing (Phase 7)
- `vitest.config.js` - Test configuration
- `src/test/setup.js` - Global test setup and mocks
- `src/test/testUtils.jsx` - Custom render and mock utilities
- `src/services/__tests__/supabaseClient.test.js` - Supabase client tests
- `src/context/__tests__/ThemeContext.test.jsx` - Theme context tests
- `src/context/__tests__/AuthContext.test.jsx` - Auth context tests
- `src/components/__tests__/AdminProtectedRoute.test.jsx` - Protected route tests
- `src/components/__tests__/AdminSidebar.test.jsx` - Sidebar tests
- `src/components/__tests__/AdminHeader.test.jsx` - Header tests
- `src/pages/__tests__/Login.test.jsx` - Login page tests
- `src/test/integration/auth.integration.test.jsx` - Auth flow tests
- `src/test/integration/navigation.integration.test.jsx` - Navigation tests
- `src/test/integration/dashboard.integration.test.jsx` - Dashboard tests
- `Documentation/Testing_Guide.md` - Comprehensive testing documentation

### Key Features Implemented

1. **Dual-Domain Sidebar** - Distinct menus for PM (blue) and Simulator (purple) administration
2. **Authentication System** - Supabase Auth with admin role verification
3. **Theme System** - Dark/light mode with dark as default
4. **Protected Routes** - Only system_admin and org_admin can access
5. **Dashboard** - Central hub with PM and Simulator metrics
6. **40+ Admin Permissions** - Granular permissions for all admin features

### Next Steps

1. **Install dependencies**: `cd project-nidus-admin && npm install`
2. **Configure .env**: Copy `.env.example` to `.env` and add Supabase credentials
3. **Run SQL**: Execute `v80_admin_application_tables.sql` in Supabase
4. **Start dev server**: `npm run dev`
5. **Implement page functionality**: Replace placeholder content with actual CRUD operations

### Notes

- All pages are currently placeholders ready for full implementation
- The sidebar supports collapsible mode for better screen real estate
- Color coding: PM (Blue), Simulator (Purple), Security (Red), Support (Green), Monitoring (Yellow)
- Database RLS policies ensure only admins can access admin tables

---

*Document Created: November 22, 2025*
*Last Updated: November 22, 2025*

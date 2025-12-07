# Repository Structure
**Project:** Project Nidus
**Date:** 2025-11-15
**Version:** 1.0

---

## 📁 Complete Folder Structure

```
Project Nidus/
├── .git/                         # Git version control
├── .gitignore                    # Git ignore rules
├── .env                          # Environment variables (NOT in Git)
├── .env.example                  # Environment template (in Git)
│
├── node_modules/                 # Node dependencies (NOT in Git)
├── dist/                         # Production build output (NOT in Git)
│
├── src/                          # React application source code
│   ├── components/               # React components
│   │   ├── common/               # Shared components
│   │   ├── structured/           # Structured/Traditional PM components
│   │   ├── agile-scrum/          # Scrum framework components
│   │   ├── kanban/               # Kanban method components
│   │   └── planning/             # Universal planning components
│   ├── pages/                    # Page components
│   │   ├── auth/                 # Authentication pages
│   │   ├── dashboard/            # Dashboard pages
│   │   ├── projects/             # Project pages
│   │   └── settings/             # Settings pages
│   ├── services/                 # API and service layers
│   │   ├── api/                  # API client
│   │   ├── auth/                 # Authentication service
│   │   └── supabase/             # Supabase client
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Utility functions
│   ├── context/                  # React Context providers
│   ├── styles/                   # Global styles
│   ├── assets/                   # Static assets (images, fonts, etc.)
│   ├── types/                    # TypeScript types/interfaces
│   ├── constants/                # Constants and enums
│   ├── App.jsx                   # Main App component
│   ├── main.jsx                  # Application entry point
│   └── index.css                 # Global CSS
│
├── SQL/                          # Database scripts (versioned)
│   ├── v01_core_tables.sql
│   ├── v02_structured_pm_tables.sql
│   ├── v03_agile_scrum_tables.sql
│   ├── v04_kanban_tables.sql
│   └── ...
│
├── Documentation/                # Project documentation
│   ├── PRD_Multi_Methodology_PM_System.md
│   ├── Repository_Structure.md (this file)
│   ├── Development_Guidelines.md
│   ├── Supabase_Setup_Guide.md
│   ├── Database_Schema_Documentation.md (future)
│   └── API_Documentation.md (future)
│
├── projectplan/                  # Planning and tracking documents
│   ├── Phase_1_Implementation_Plan.md
│   ├── Day_1_Execution_Plan.md
│   ├── PRD_Review_Summary.md
│   └── ...
│
├── CSV Files/                    # CSV data files
│   └── .gitkeep
│
├── Developer Images/             # Developer resources and mockups
├── Documents/                    # Other project documents
│
├── public/                       # Public static files
│   └── favicon.ico
│
├── package.json                  # Node.js dependencies and scripts
├── package-lock.json             # Locked dependency versions
├── vite.config.js               # Vite build configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
├── index.html                   # HTML entry point
├── README.md                    # Project README
└── CLAUDE.md                    # AI assistant workflow
```

---

## 📂 Folder Purposes

### `/src` - Application Source Code
**Purpose:** Contains all React application source code

**Key Subdirectories:**
- **`/components`** - Reusable React components
  - `/common` - Shared components (buttons, forms, modals)
  - `/structured` - Traditional/Structured PM components (copyright-safe naming)
  - `/agile-scrum` - Scrum framework components
  - `/kanban` - Kanban method components
  - `/planning` - Universal planning components (Gantt, calendars, etc.)

- **`/pages`** - Top-level page components
  - Each page represents a route in the application
  - Organized by feature area (auth, dashboard, projects, etc.)

- **`/services`** - Business logic and API calls
  - API clients
  - Authentication service
  - Supabase integration
  - Third-party integrations

- **`/hooks`** - Custom React hooks
  - Reusable stateful logic
  - Example: `useAuth`, `useProjects`, `useTasks`

- **`/utils`** - Utility functions
  - Helper functions
  - Data formatters
  - Validators

- **`/context`** - React Context providers
  - Global state management
  - Theme context, Auth context, etc.

- **`/styles`** - Global styles and CSS

- **`/assets`** - Static assets
  - Images, icons, fonts
  - Logo files

- **`/types`** - TypeScript definitions (if using TypeScript)

- **`/constants`** - Application constants
  - API endpoints
  - Configuration values
  - Enum definitions

---

### `/SQL` - Database Scripts
**Purpose:** All SQL scripts for database schema and migrations

**Naming Convention:** `vXX_description.sql`
- `v01_core_tables.sql` - Core system tables
- `v02_structured_pm_tables.sql` - Structured PM tables
- `v03_agile_scrum_tables.sql` - Scrum tables
- `v04_kanban_tables.sql` - Kanban tables
- `v05_database_functions_triggers.sql` - Functions and triggers
- `v06_seed_data.sql` - Initial data
- `v07_rls_policies.sql` - Row Level Security

**Important:**
- Always version SQL files sequentially
- Include table registration statements
- Test on dev database before production
- Document all schema changes

---

### `/Documentation` - Project Documentation
**Purpose:** All project documentation and guides

**Key Documents:**
- **PRD** - Product Requirements Document
- **Repository Structure** - This document
- **Development Guidelines** - Coding standards
- **Supabase Setup** - Database setup guide
- **API Documentation** - API reference (future)
- **Database Schema** - Schema documentation (future)

**Format:** Markdown (.md) files

---

### `/projectplan` - Planning Documents
**Purpose:** Project planning, tracking, and execution plans

**Contains:**
- Implementation plans for each phase
- Daily execution plans
- Progress tracking
- Milestone documentation
- Sprint/iteration plans

**Important:** Do not delete planning files (per CLAUDE.md rules)

---

### `/CSV Files` - CSV Data
**Purpose:** CSV data files for imports, exports, and data seeding

**Examples:**
- User import templates
- Country/region data
- Sample project data
- Bulk data operations

---

### `/Developer Images` - Developer Resources
**Purpose:** UI mockups, wireframes, design assets for developers

---

### `/Documents` - Other Documents
**Purpose:** Miscellaneous project documents

---

## 📝 File Naming Conventions

### JavaScript/React Files
- **Components:** PascalCase - `Button.jsx`, `ProjectCard.jsx`
- **Utilities:** camelCase - `formatDate.js`, `validators.js`
- **Constants:** UPPER_CASE - `API_ENDPOINTS.js`, `CONSTANTS.js`
- **Hooks:** camelCase with 'use' prefix - `useAuth.js`, `useProjects.js`

### SQL Files
- **Format:** `vXX_description.sql`
- **Example:** `v01_core_tables.sql`, `v02_structured_pm_tables.sql`
- **Version:** Always sequential

### Documentation Files
- **Format:** `Title_With_Underscores.md`
- **Example:** `Repository_Structure.md`, `Development_Guidelines.md`

### CSS Files
- **Components:** Match component name - `Button.css`
- **Global:** Descriptive - `global.css`, `utilities.css`

---

## 🔒 Copyright-Safe Naming

### ✅ Use Generic Terms in Code:
- `/structured/` - NOT `/prince2/`
- `StructuredDashboard.jsx` - NOT `Prince2Dashboard.jsx`
- `structuredConfig` - NOT `prince2Config`

### ✅ Trademarked Names OK In:
- User-facing text/labels
- Database string values
- Documentation (with disclaimers)
- Comments

**Reference:** See `projectplan/Copyright_Safe_Naming_Strategy.md`

---

## 🚫 What NOT to Commit

### Never Commit:
- `.env` - Environment variables with secrets
- `node_modules/` - Dependencies (installed via npm)
- `dist/` - Build output
- `.DS_Store` - macOS system files
- `Thumbs.db` - Windows system files
- IDE-specific files (except `.vscode/extensions.json`)

**Check `.gitignore` for complete list**

---

## 🔄 Adding New Files/Folders

### Adding Components:
1. Determine category (common, structured, agile-scrum, kanban, planning)
2. Create file in appropriate `/src/components/` subfolder
3. Follow naming conventions (PascalCase for components)
4. Export from component file
5. Import where needed

### Adding SQL Scripts:
1. Determine next version number
2. Create file: `SQL/vXX_description.sql`
3. Include table registration statements
4. Document in Database Schema Documentation
5. Test on dev database
6. Commit to Git

### Adding Documentation:
1. Create in `/Documentation` folder
2. Use Markdown format
3. Follow naming convention: `Title_With_Underscores.md`
4. Update this document if adding new doc type
5. Commit to Git

### Adding CSV Files:
1. Place in `/CSV Files` folder
2. Use descriptive names
3. Include header row
4. Document purpose in README or separate doc

---

## 📦 Build Output

### Development:
```bash
npm run dev
```
- Runs on `http://localhost:5173`
- Hot reload enabled
- Source maps included

### Production Build:
```bash
npm run build
```
- Output: `/dist` folder
- Minified and optimized
- Ready for deployment

---

## 🔍 Finding Files

### By Feature:
- **Authentication:** `/src/pages/auth/`, `/src/services/auth/`
- **Dashboard:** `/src/pages/dashboard/`, `/src/components/dashboard/`
- **Projects:** `/src/pages/projects/`, `/src/components/projects/`
- **Kanban:** `/src/components/kanban/`, `/src/pages/kanban/`

### By Type:
- **Components:** `/src/components/`
- **API Calls:** `/src/services/api/`
- **Utilities:** `/src/utils/`
- **Styles:** `/src/styles/`

### By Methodology:
- **Structured PM:** `/src/components/structured/`
- **Scrum:** `/src/components/agile-scrum/`
- **Kanban:** `/src/components/kanban/`

---

## 📚 Related Documentation

- **Setup Guide:** `README.md`
- **Development Guidelines:** `Documentation/Development_Guidelines.md`
- **Supabase Setup:** `Documentation/Supabase_Setup_Guide.md`
- **PRD:** `Documentation/PRD_Multi_Methodology_PM_System.md`
- **Copyright-Safe Naming:** `projectplan/Copyright_Safe_Naming_Strategy.md`

---

## ✅ Quick Checklist

New developers should:
- [ ] Read this document
- [ ] Read `README.md`
- [ ] Read `Development_Guidelines.md`
- [ ] Set up `.env` from `.env.example`
- [ ] Run `npm install`
- [ ] Run `npm run dev` to start
- [ ] Understand folder structure
- [ ] Follow naming conventions
- [ ] Check `.gitignore` before committing

---

**Last Updated:** 2025-11-15
**Maintained By:** Development Team

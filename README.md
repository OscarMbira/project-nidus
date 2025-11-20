# Project Nidus
## Multi-Methodology Project Management System

A comprehensive, enterprise-grade web-based project management system supporting multiple methodologies including Structured/Traditional PM, Scrum, Kanban, Agile, and hybrid approaches.

---

## 🎯 Overview

Project Nidus is a unified project management platform that empowers organizations to manage projects using their chosen methodology—whether traditional, agile, or hybrid—with seamless transitions, consistent tooling, and enterprise security.

### Key Features

- ✅ **Multi-Methodology Support:** Structured/Traditional PM, Scrum, Kanban, Agile, and custom hybrid approaches
- ✅ **Adaptive Interface:** UI adapts based on selected methodology and user role
- ✅ **Advanced Planning:** Microsoft Project-like Gantt charts alongside Kanban boards
- ✅ **Enterprise Security:** Multi-layered security with separate admin application
- ✅ **Role-Based Access:** Customized access and menus for different roles
- ✅ **Real-Time Collaboration:** Built on Supabase for real-time updates

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **State Management:** React Context

### Backend
- **Database:** PostgreSQL (via Supabase)
- **API:** Supabase REST API + Edge Functions
- **Authentication:** Supabase Auth (with MFA support)
- **Storage:** Supabase Storage
- **Real-time:** Supabase Realtime

### Development Tools
- **Version Control:** Git
- **Package Manager:** npm
- **Code Quality:** ESLint, Prettier (to be configured)
- **Testing:** Vitest, React Testing Library (to be set up)

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com)
- **Code Editor** - VS Code recommended

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Project Nidus"
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including React, Vite, Tailwind CSS, and Supabase client.

### 3. Set Up Environment Variables

#### Copy the environment template:
```bash
cp .env.example .env
```

#### Edit `.env` file and add your Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here

# Application Configuration
VITE_APP_NAME=Project Nidus
VITE_APP_VERSION=1.0.0

# Environment
VITE_ENV=development
```

**How to get Supabase credentials:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** and **anon/public key**

📖 **Detailed Guide:** See `Documentation/Supabase_Setup_Guide.md`

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:5173**

---

## 📦 Available Scripts

### Development
```bash
npm run dev          # Start development server
```

### Production
```bash
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Code Quality (to be configured)
```bash
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Testing (to be configured)
```bash
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run coverage     # Generate coverage report
```

---

## 📁 Project Structure

```
Project Nidus/
├── src/                          # Application source code
│   ├── components/               # React components
│   │   ├── common/               # Shared components
│   │   ├── structured/           # Structured PM components
│   │   ├── agile-scrum/          # Scrum framework components
│   │   ├── kanban/               # Kanban method components
│   │   └── planning/             # Universal planning components
│   ├── pages/                    # Page components
│   ├── services/                 # API and service layers
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Utility functions
│   └── context/                  # React Context providers
│
├── SQL/                          # Database scripts (versioned)
│   ├── v01_core_tables.sql
│   ├── v02_structured_pm_tables.sql
│   └── ...
│
├── Documentation/                # Project documentation
│   ├── PRD_Multi_Methodology_PM_System.md
│   ├── Repository_Structure.md
│   ├── Development_Guidelines.md
│   └── Supabase_Setup_Guide.md
│
├── projectplan/                  # Planning documents
│   ├── Phase_1_Implementation_Plan.md
│   └── ...
│
├── CSV Files/                    # CSV data files
├── .env.example                  # Environment template
├── package.json                  # Dependencies and scripts
└── README.md                    # This file
```

📖 **Detailed Structure:** See `Documentation/Repository_Structure.md`

---

## 🗄️ Database Setup

### Initial Setup

1. **Create Supabase Project** (if not done)
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Choose organization and settings
   - Wait for project to initialize

2. **Run SQL Scripts** (Day 2 of Phase 1)
   ```sql
   -- Execute in Supabase SQL Editor
   -- In order: v01, v02, v03, etc.
   ```

3. **Verify Connection**
   - Start dev server
   - Check browser console for errors
   - Verify Supabase connection successful

📖 **Database Guide:** See `Documentation/Supabase_Setup_Guide.md`

---

## 👥 Supported Methodologies

### 1. Structured/Traditional PM
- Complete implementation of structured project management processes
- Stage-gate governance
- Comprehensive documentation
- **Best for:** Large-scale projects, regulated industries

### 2. Scrum Framework
- Sprint-based delivery
- Product backlog and sprint planning
- Daily scrums, reviews, retrospectives
- **Best for:** Software development, product teams

### 3. Kanban Method
- Visual workflow boards
- WIP limits and continuous flow
- Flow metrics tracking
- **Best for:** Operations, support teams

### 4. Agile (General)
- User stories and epics
- Flexible iteration planning
- Continuous delivery
- **Best for:** Innovation projects, startups

### 5. Hybrid Methodologies
- Mix and match from different frameworks
- Custom workflows
- **Best for:** Complex organizations, unique needs

---

## 🔐 Security Features

- ✅ Multi-Factor Authentication (MFA)
- ✅ Role-Based Access Control (RBAC)
- ✅ Row Level Security (RLS)
- ✅ Data encryption (at rest & in transit)
- ✅ Comprehensive audit trails
- ✅ Session management
- ✅ Separate admin application with enhanced security

---

## 📖 Documentation

### For Developers
- [Repository Structure](Documentation/Repository_Structure.md)
- [Development Guidelines](Documentation/Development_Guidelines.md)
- [Supabase Setup Guide](Documentation/Supabase_Setup_Guide.md)
- [Copyright-Safe Naming](projectplan/Copyright_Safe_Naming_Strategy.md)

### For Project Managers
- [Product Requirements Document](Documentation/PRD_Multi_Methodology_PM_System.md)
- [PRD Review Summary](projectplan/PRD_Review_Summary.md)
- [Phase 1 Implementation Plan](projectplan/Phase_1_Implementation_Plan.md)

### For Users (to be created)
- User Guide
- Admin Guide
- FAQ

---

## 🤝 Contributing

### Development Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow coding standards in `Documentation/Development_Guidelines.md`
   - Use copyright-safe naming (see `projectplan/Copyright_Safe_Naming_Strategy.md`)

3. **Test your changes**
   ```bash
   npm run dev
   # Test manually in browser
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add feature: description"
   ```

5. **Push to repository:**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format
```
type: brief description

- Detailed point 1
- Detailed point 2

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** feat, fix, docs, style, refactor, test, chore

---

## 🐛 Troubleshooting

### Common Issues

#### "Module not found" errors
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### "Invalid Supabase credentials"
- Check `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Verify no extra spaces or quotes
- Restart dev server after changing `.env`

#### Build fails
```bash
# Solution: Clear cache and rebuild
npm run clean  # (to be added)
npm run build
```

#### Port 5173 already in use
```bash
# Solution: Kill the process or use different port
# Vite will automatically try next available port
```

---

## 📞 Support & Resources

### Documentation
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **React Docs:** [react.dev](https://react.dev/)
- **Vite Docs:** [vitejs.dev](https://vitejs.dev/)
- **Tailwind CSS:** [tailwindcss.com/docs](https://tailwindcss.com/docs)

### Project Resources
- **Full PRD:** `Documentation/PRD_Multi_Methodology_PM_System.md`
- **Implementation Plan:** `projectplan/Phase_1_Implementation_Plan.md`
- **Repository Structure:** `Documentation/Repository_Structure.md`

---

## 📜 License

[To be determined]

---

## ⚖️ Legal Disclaimers

This software implements structured/traditional project management methodologies and is not affiliated with, endorsed by, or certified by any specific methodology certification body.

---

## ✅ Quick Start Checklist

For new developers:

- [ ] Node.js installed (v18+)
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created from `.env.example`
- [ ] Supabase credentials added to `.env`
- [ ] Development server running (`npm run dev`)
- [ ] Can access http://localhost:5173
- [ ] Read `Documentation/Repository_Structure.md`
- [ ] Read `Documentation/Development_Guidelines.md`

---

## 🚀 Project Status

**Current Phase:** Phase 1 - Foundation (Week 1)
**Current Day:** Day 1 - Project Initialization ✅

**Next Steps:**
- Day 2: Database schema design
- Day 3: Core database implementation
- Week 2: Authentication & Authorization
- Week 3-4: Admin application
- Week 5-6: Main application UI framework

**See:** `projectplan/Phase_1_Implementation_Plan.md` for detailed roadmap

---

**Version:** 1.0.0
**Last Updated:** 2025-11-15
**Maintained By:** Development Team

---

🚀 **Ready to build the future of project management!**

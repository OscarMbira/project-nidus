# 📘 **Simulation System Architecture Guide**
### *Instructions for VibeCoding Tools (Cursor/Claude)*
#### Version 1.0 — November 2025
#### Author: Oscar

---

# ✅ **Purpose of This Document**

This document contains the **rules, boundaries, conventions, and architectural principles** that must ALWAYS be followed when creating or modifying the **Project Management Simulator (SIM Module)** so that it works **seamlessly** with the existing **Project Management System (PM Module)**.

Your task as an AI coding tool is to fully respect this architecture and never violate these domain boundaries or schema boundaries.

---

# 🚀 **High-Level Overview**

The platform contains **ONE unified application**, with **TWO major domains**:

---

### **1. Project Management Application (PM Domain)**  
- Real projects  
- Real tasks  
- Real schedules  
- Runs on **Supabase `public` schema**  
- Uses **`appDb` client**  
- UI routes start with:  
  `/app/...`

---

### **2. Project Management Simulator (SIM Domain)**  
- Simulation scenarios  
- Simulation runs  
- AI events  
- Modular and full-cycle simulations  
- Runs on **Supabase `sim` schema**  
- Uses **`simDb` client**  
- UI routes start with:  
  `/simulator/...`

---

# 🧱 **1. Folder & Codebase Architecture**

You MUST keep this structure:

```
src/
  app/
    app/                    # Main PM system routes
    simulator/              # Simulation system routes
  modules/
    core/                   # Shared logic (auth, subscriptions, roles)
    pm/                     # PM logic (public schema)
    sim/                    # SIM logic (sim schema)
  services/
    supabase/
      appClient.ts          # Schema = public
      simClient.ts          # Schema = sim
  components/
    ui/                     # Shared UI components
    app/                    # PM-specific components
    sim/                    # Simulator-specific components
```

Never mix PM and SIM components, modules, or database calls.

---

# 🔐 **2. Supabase Schema Rules**

The system uses:

### ✔ **One Supabase project**  
### ✔ **Two schemas:**  
- `public` → PM application  
- `sim` → Simulation engine  

You MUST use the correct client in each domain.

---

## **Supabase Clients**

### `appDb` — **public schema**
```ts
export const appDb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'public' },
});
```

### `simDb` — **sim schema**
```ts
export const simDb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'sim' },
});
```

---

# 📂 **3. Domain Responsibilities**

## **PM Domain (`modules/pm`)**
- Uses `appDb`
- Handles:
  - Real tasks  
  - Real projects  
  - Real risks/issues  
  - Real stakeholder/communication logs  
  - Project health dashboards  

**It must never store simulation data.**

---

## **SIM Domain (`modules/sim`)**
- Uses `simDb`
- Handles:
  - Scenarios (pre-built + user-uploaded)  
  - Simulation runs  
  - Module-only simulations (Initiation only, Planning only, etc.)  
  - Full lifecycle simulations  
  - AI events  
  - Scorecards  
  - Certificates  

**It must never write to real project tables in `public`.**

---

## **Core Domain (`modules/core`)**
Shared across both domains:
- Auth  
- Subscription handling  
- Monetization  
- Shared permissions  
- User identity  
- Utility functions  

**Core logic must stay domain-neutral.**

---

# 🧪 **4. Simulation Modes (Required)**

The system MUST support:

### ✔ **Full Lifecycle Simulation**
Startup → Initiation → Planning → Execution → Control → Closure.

### ✔ **Modular Simulation**
Each module separately:
- Initiation  
- Planning  
- Execution  
- Risk-only  
- Issue-only  
- Sprint simulation  
- Kanban simulation  

### ✔ **Custom Scenario Simulation**
User pastes or uploads:
- Case study  
- Project brief  
- PID  
- RAID log  
- WBS spreadsheet  
- Any narrative input

System extracts and structures:
- Scope  
- Deliverables  
- Stakeholders  
- PBS / WBS  
- Risks  
- Issues  
- Timeline  
- Constraints  

---

# 🏗 **5. Database Requirements (SIM Schema)**

All simulation tables MUST live inside the `sim` schema.

### Required tables:
```
sim.scenarios
sim.runs
sim.module_scores
sim.user_scenarios
sim.custom_scenario_uploads
sim.simulator_settings
```

### Rules:
- All simulation IDs MUST be UUID.
- All tables MUST include:
  - `created_at`
  - `updated_at`
  - `user_id` reference

### Row-Level Security MUST be enabled.

---

# 💸 **6. Monetization Rules**

The SIM module integrates with existing PM monetization.

The system must support the following access tiers:

### ✔ Free Tier  
Limited access to one basic simulation module.

### ✔ Premium (Monthly / Yearly)  
Full simulator unlocked.

### ✔ Lifetime Access  
All future modules and updates unlocked permanently.

### ✔ Scenario Packs  
Sell bundled industry-specific simulations.

### ✔ Certificates  
Sell completion certificates.

### ✔ Corporate Licensing  
Bulk access for organizations.

---

# 💬 **7. Page & Routing Conventions**

### PM Pages  
```
/app/projects
/app/tasks
/app/reports
```

### SIM Pages  
```
/simulator
/simulator/scenarios
/simulator/runs
/simulator/modules
/simulator/custom-scenarios
```

Do NOT mix PM and SIM routing.

---

# 🎨 **8. UI Guidelines**

### Shared Components → `components/ui`
### PM Components → `components/app`
### SIM Components → `components/sim`

SIM components include:
- Scenario editor  
- Module selector  
- Simulation dashboard  
- Scorecards  
- AI events feed  
- Baseline / WBS / Planning simulator  

---

# 🧠 **9. AI Event Engine Requirements**

The simulator MUST support AI-driven:
- Risk triggers  
- Schedule disruptions  
- Vendor delays  
- Stakeholder conflicts  
- Surprise events  

AI events MUST BE:
- Stored in `sim.runs` or `sim.ai_events`  
- Reproducible through seed values  

---

# 📝 **10. Rules for Cursor/Claude/Claude When Generating Code**

Cursor/Claude MUST follow these rules:

### ✔ Always place simulation logic in `modules/sim`  
### ✔ Always use `simDb` for simulation operations  
### ✔ Never write simulation data to `public` schema  
### ✔ Always respect the folder structure  
### ✔ Always isolate domains (PM vs SIM)  
### ✔ Always use TypeScript  
### ✔ Always return typed responses  
### ✔ Always generate RLS-enabled SQL for new tables  

---

# 🔚 **Summary Rule for AI**

**This is ONE app with TWO clean domains.  
Each domain has its OWN schema, modules, components, and API client.  
Never mix the domains.  
Always respect the architecture.**

---

# ✔ End of Document  
**Filename:** `SIMULATOR_ARCHITECTURE_GUIDE.md`

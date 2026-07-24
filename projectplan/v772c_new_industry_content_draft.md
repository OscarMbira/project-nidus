# v772c — New Industry Content Draft (30 → 50)

**Status:** COMPLETE  
**Date completed:** 2026-07-16  
**Parent plan:** `projectplan/v772_industry_template_springboard_content_plan.md` (Phase 0)

Same format and quality bar as the 30 existing industries in `projectplan/v575_Industry_Plan_Templates.md` §8. Numbered 31–50 to continue that sequence.

---

## Deliverables (all done)

| Step | Outcome |
|------|---------|
| 1. Confirm draft content (industries 31–50) | This file (canonical draft) |
| 2. Append into `v575_Industry_Plan_Templates.md` §8 | Done — sections ### 31–50 under “Industries 31–50 (v772b expansion)” |
| 3. Register meta in generators | `NEW_INDUSTRY_META` in `scripts/generate-v772b-industry-expansion.mjs`; `INDUSTRY_META_V772B` documented in `scripts/generate-v576-industry-seed.mjs` |
| 4. Generate seed SQL | `SQL/v772b_seed/industries/*.sql` + `batches/batch_01…05.sql` (pointer `SQL/v772b_industry_template_catalog_expansion.sql`) |
| 5. `database_tables` registration | No-op — no new tables (existing `pmo_industry_templates*` only) |

**Apply (Platform catalog):** after `SQL/v576_seed/`, run `SQL/v772b_seed/batches/batch_01_of_05.sql` … `batch_05_of_05.sql` (the pointer `v772b_industry_template_catalog_expansion.sql` does **not** load data).  
**Apply (Admin Global Template Library):** then Admin `SQL/v169_global_template_v772b_industries_catchup.sql` (or re-run `v167`) — otherwise Admin only shows the original 30.  
**Regenerate:** `node scripts/generate-v772b-industry-expansion.mjs` (reads this draft).

---

## Todo

- [x] Author industries 31–50 content (this draft)
- [x] Append sections into `projectplan/v575_Industry_Plan_Templates.md` §8
- [x] Update §1 industry table in v575 (codes 31–50 + seed column)
- [x] Add matching meta to generators (`generate-v772b` + documented on `generate-v576`)
- [x] Generate `SQL/v772b_seed/` industry + batch SQL
- [x] Confirm no new `database_tables` rows required

## Review

### Completed 2026-07-16

Catalog expansion content is authored, documented in v575 §1/§8, and materialised as idempotent SQL under `SQL/v772b_seed/`. Parent v772 Phase 0 remains COMPLETE. No schema changes.

**Content index (31–50):** Automotive Manufacturing; Insurance & Underwriting; Utilities Water & Power; Renewable Energy; Rail & Mass Transit; Maritime/Shipping/Ports; Aviation/Airports; Gaming & Esports; Publishing & Print; Fashion/Apparel; Food & Beverage Manufacturing; Chemical/Process Manufacturing; Semiconductor/Electronics; Biotechnology/Genomics; Data Centres/Cloud; Waste Management/Recycling; Sports/Recreation; Museums/Arts/Heritage; Veterinary/Animal Health; Franchise/Multi-Site Retail.

---

## Draft body (source for generator)

_The numbered industry sections below remain the generator input. They are also mirrored in `v575` §8._

### 31. Automotive Manufacturing & Engineering
**Phases:** Concept & Feasibility (4–8w) → Design Engineering (12–20w) → Prototyping (8–16w) → Testing & Validation (8–12w) → Tooling & Pre-Production (12–20w) → Production Ramp-Up (6–10w) → Full Production (ongoing) → Post-Launch Review (2–4w)
**Activities (per phase):**
- *Concept & Feasibility:* Market & competitor benchmarking [task, 5–10d, 30h, Product Planner], Feasibility & cost target study [task, 5–8d, 24h, Program Mgr], Concept sign-off gate [approval, 1d, 4h, Program Mgr]
- *Design Engineering:* CAD design & packaging [task, 15–25d, 100h, Design Eng], CAE simulation & crash analysis [task, 10–15d, 60h, CAE Eng], Design review (DFMEA) [review, 2d, 8h, Design Eng+Quality]
- *Prototyping:* Prototype build [task, 15–20d, 120h, Build Team], Prototype bench testing [task, 5–10d, 40h, Test Eng], Prototype review with stakeholders [meeting, 1d, 4h, Program Mgr]
- *Testing & Validation:* Durability & environmental testing [task, 10–20d, 80h, Test Eng], Regulatory homologation testing [task, 15–25d, 60h, Compliance Eng], Validation sign-off [approval, 1d, 4h, Quality Mgr]
- *Tooling & Pre-Production:* Tooling design & fabrication [task, 20–40d, ongoing, Tooling Eng], Pre-production trial builds [task, 5–10d, 60h, Manufacturing Eng], PPAP submission [deliverable, 3–5d, 20h, Quality Eng]
- *Production Ramp-Up:* Line trial runs [task, 5–10d, 60h, Manufacturing Eng], Operator training [task, 3–5d, 24h, Training Lead], Ramp-up readiness review [review, 1d, 4h, Plant Mgr]
- *Full Production:* Daily production monitoring [task, ongoing, 2h/d, Line Supervisor], Quality audits [review, 1d/week, 4h, Quality Eng], Supplier performance review [meeting, 1d/month, 4h, Procurement]
- *Post-Launch Review:* Warranty data analysis [task, 5–8d, 24h, Quality Eng], Lessons learned workshop [meeting, 1d, 4h, Program Mgr], Post-launch report [deliverable, 3–5d, 16h, Program Mgr]
**Deliverables:** Product Requirements Document, CAD Design Package, DFMEA Report, Prototype Test Report, Homologation Certificate, PPAP Package, Production Control Plan, Post-Launch Review Report
**Risks:** Supplier part delay [medium/high], Design change late-stage [medium/high], Regulatory approval delay [low/high], Tooling defect [medium/medium], Quality escape to field [low/high]
**Milestones:** Concept Approval, Design Freeze, Prototype Build Complete, Validation Sign-Off, Start of Production
**Roles:** Program Manager ★, Design Engineer ★, Quality Engineer ★, Manufacturing Engineer, CAE Engineer, Test Engineer, Procurement Lead, Tooling Engineer

### 32. Insurance & Underwriting Transformation
**Phases:** Discovery (2–4w) → Requirements & Rating Design (4–8w) → System Configuration (8–16w) → Integration (4–8w) → UAT (3–6w) → Regulatory Filing (4–12w) → Rollout (2–6w) → Post-Implementation Review (2–4w)
**Activities (per phase):**
- *Discovery:* Current-state process mapping [task, 5–8d, 32h, BA], Underwriting guideline review [task, 3–5d, 20h, Underwriter], Kick-off workshop [meeting, 1d, 4h, PM]
- *Requirements & Rating Design:* Rating algorithm design [task, 10–15d, 60h, Actuary], Product & rules documentation [task, 5–10d, 30h, BA], Requirements sign-off [approval, 1d, 3h, Product Owner]
- *System Configuration:* Policy admin system configuration [task, 20–30d, ongoing, Config Eng], Rating engine build [task, 15–20d, 80h, Dev], Configuration peer review [review, 2d, 8h, Tech Lead]
- *Integration:* Third-party data feed integration (credit, MVR) [task, 5–10d, 40h, Integration Eng], Claims system integration [task, 5–10d, 40h, Integration Eng], Integration testing [task, 5–8d, 32h, QA]
- *UAT:* UAT scenario preparation [task, 3–5d, 20h, BA], Underwriter UAT sessions [meeting, 5–10d, 40h, Underwriters], UAT defect triage [task, ongoing, 4h/d, QA]
- *Regulatory Filing:* Rate & form filing preparation [deliverable, 5–10d, 40h, Compliance], State/regulator submission [task, ongoing, varies, Compliance], Filing approval tracking [task, ongoing, 2h/d, Compliance]
- *Rollout:* Agent/broker training [task, 3–5d, 24h, Training Lead], Phased state rollout [task, 10–20d, ongoing, PM], Go-live support [task, 5d, 8h/d, Support Team]
- *Post-Implementation Review:* Loss ratio monitoring [task, ongoing, 4h/week, Actuary], Stakeholder feedback review [meeting, 1d, 4h, PM], Close-out report [deliverable, 3d, 16h, PM]
**Deliverables:** Business Requirements Document, Rating Algorithm Spec, Product Configuration Guide, Regulatory Filing Package, UAT Test Results, Training Materials, Go-Live Readiness Checklist, Post-Implementation Report
**Risks:** Regulatory filing rejection [medium/high], Rating engine calculation error [low/high], Legacy data migration issue [medium/high], Agent adoption resistance [medium/medium], Third-party data feed outage [low/medium]
**Milestones:** Requirements Sign-Off, Configuration Complete, UAT Sign-Off, Regulatory Approval, Go-Live
**Roles:** Project Manager ★, Actuary ★, Underwriter, Business Analyst, Compliance Officer ★, Integration Engineer, QA Lead, Product Owner

### 33. Utilities — Water & Power
**Phases:** Planning & Feasibility (4–8w) → Regulatory Approval (8–16w) → Engineering Design (8–16w) → Procurement (4–8w) → Construction & Installation (16–40w) → Commissioning (4–8w) → Energisation/Go-Live (1–2w) → Handover & Close-Out (2–4w)
**Activities (per phase):**
- *Planning & Feasibility:* Load/demand forecasting study [task, 5–10d, 40h, Planning Eng], Route/site feasibility survey [task, 5–10d, 30h, Field Eng], Feasibility sign-off [approval, 1d, 4h, Program Mgr]
- *Regulatory Approval:* Environmental impact assessment [deliverable, 15–25d, 80h, Environmental Eng], Regulator submission & hearings [task, ongoing, varies, Regulatory Affairs], Permit approval tracking [task, ongoing, 2h/week, Regulatory Affairs]
- *Engineering Design:* Detailed engineering design [task, 15–25d, 100h, Design Eng], Design review & clash detection [review, 3d, 12h, Design Eng], Design freeze [approval, 1d, 4h, Chief Engineer]
- *Procurement:* Long-lead equipment ordering [task, 5–10d, 20h, Procurement], Contractor tendering [task, 10–15d, 40h, Procurement], Contract award [approval, 2d, 8h, Program Mgr]
- *Construction & Installation:* Civil works & excavation [task, 20–40d, ongoing, Contractor], Equipment installation [task, 20–40d, ongoing, Installation Team], Progress inspections [review, 1d/week, 4h, Site Eng]
- *Commissioning:* System testing (dry/wet) [task, 5–10d, 40h, Commissioning Eng], Protection & control testing [task, 5–8d, 32h, Protection Eng], Commissioning sign-off [approval, 1d, 4h, Chief Engineer]
- *Energisation/Go-Live:* Switching & energisation [task, 1–2d, 8h, Ops Team], Live monitoring [task, ongoing, 24h, Control Room], Go-live confirmation [approval, 1d, 2h, Ops Manager]
- *Handover & Close-Out:* As-built documentation [deliverable, 5–8d, 24h, Design Eng], O&M manual handover [deliverable, 3–5d, 16h, Design Eng], Close-out meeting [meeting, 1d, 4h, Program Mgr]
**Deliverables:** Feasibility Study, Environmental Impact Assessment, Detailed Design Package, Permit/License Approvals, Commissioning Test Reports, As-Built Drawings, O&M Manual, Handover Certificate
**Risks:** Regulatory/permit delay [high/high], Weather/access delays [medium/medium], Equipment supply delay [medium/high], Public/community objection [low/medium], Safety incident during construction [low/high]
**Milestones:** Feasibility Approved, Permits Granted, Design Freeze, Construction Complete, Energisation/Go-Live
**Roles:** Program Manager ★, Chief Engineer ★, Design Engineer, Regulatory Affairs Lead ★, Commissioning Engineer, Site Engineer, Environmental Engineer, Procurement Lead

### 34. Renewable Energy (Solar/Wind)
**Phases:** Site Assessment (4–8w) → Permitting & Grid Connection (12–24w) → Financing & Contracts (6–12w) → Detailed Design (6–12w) → Procurement (6–10w) → Construction (12–30w) → Commissioning (3–6w) → Operations Handover (2–4w)
**Activities (per phase):**
- *Site Assessment:* Resource assessment (solar irradiance/wind) [task, 20–40d, ongoing, Resource Analyst], Site survey & geotechnical study [task, 5–10d, 40h, Site Eng], Site feasibility sign-off [approval, 1d, 4h, Program Mgr]
- *Permitting & Grid Connection:* Environmental & planning permit application [deliverable, 10–20d, 60h, Environmental Eng], Grid connection application & studies [task, ongoing, varies, Grid Eng], Permit approval tracking [task, ongoing, 2h/week, Regulatory Affairs]
- *Financing & Contracts:* PPA negotiation [task, 10–20d, 40h, Commercial Lead], EPC contract negotiation [task, 10–15d, 40h, Commercial Lead], Financial close [approval, 1d, 8h, Finance Director]
- *Detailed Design:* Layout & yield modelling [task, 10–15d, 60h, Design Eng], Electrical design (SCADA, inverters/turbines) [task, 10–15d, 60h, Electrical Eng], Design review [review, 2d, 8h, Chief Engineer]
- *Procurement:* Panel/turbine procurement [task, 5–10d, 20h, Procurement], BOP contractor tendering [task, 10–15d, 40h, Procurement], Contract award [approval, 2d, 8h, Program Mgr]
- *Construction:* Civil & foundation works [task, 15–30d, ongoing, Contractor], Panel/turbine installation [task, 20–40d, ongoing, Installation Team], HSE inspections [review, 1d/week, 4h, HSE Officer]
- *Commissioning:* String/turbine testing [task, 5–10d, 40h, Commissioning Eng], Grid synchronisation testing [task, 3–5d, 20h, Grid Eng], Commissioning sign-off [approval, 1d, 4h, Chief Engineer]
- *Operations Handover:* Performance ratio verification [task, 5–8d, 24h, Performance Eng], O&M contract mobilisation [task, 3–5d, 16h, O&M Manager], Handover to asset management [meeting, 1d, 4h, Program Mgr]
**Deliverables:** Resource Assessment Report, Environmental Permit, Grid Connection Agreement, PPA, Detailed Design Package, Commissioning Test Reports, Performance Ratio Report, O&M Handover Package
**Risks:** Grid connection delay [high/high], Permitting delay [medium/high], Resource underperformance vs. forecast [low/medium], Equipment supply chain delay [medium/high], Extreme weather during construction [low/medium]
**Milestones:** Site Assessment Complete, Permits Granted, Financial Close, Construction Complete, Commercial Operations Date
**Roles:** Program Manager ★, Chief Engineer ★, Grid Engineer, Commercial Lead ★, Environmental Engineer, Commissioning Engineer, HSE Officer, O&M Manager

### 35. Rail & Mass Transit
**Phases:** Planning & Business Case (8–16w) → Design & Engineering (16–30w) → Land/Right-of-Way Acquisition (12–24w) → Procurement (8–16w) → Construction & Track-laying (30–80w) → Systems Integration & Testing (12–20w) → Trial Running (4–8w) → Revenue Service Handover (2–4w)
**Activities (per phase):**
- *Planning & Business Case:* Demand & ridership forecasting [task, 10–15d, 60h, Transport Planner], Route options assessment [task, 10–20d, 60h, Planning Eng], Business case approval [approval, 2d, 8h, Steering Committee]
- *Design & Engineering:* Track & alignment design [task, 20–30d, ongoing, Rail Eng], Signalling & systems design [task, 20–30d, ongoing, Systems Eng], Design review gate [review, 3d, 12h, Chief Engineer]
- *Land/Right-of-Way Acquisition:* Land survey & valuation [task, 10–15d, 40h, Land Surveyor], Compensation negotiation [task, ongoing, varies, Land Acquisition Officer], Acquisition sign-off [approval, ongoing, varies, Program Mgr]
- *Procurement:* Rolling stock procurement [task, 15–20d, 40h, Procurement], Civil works contractor tender [task, 15–20d, 40h, Procurement], Contract award [approval, 2d, 8h, Program Mgr]
- *Construction & Track-laying:* Earthworks & civil structures [task, 40–80d, ongoing, Contractor], Track-laying & ballasting [task, 30–60d, ongoing, Track Team], Progress & safety inspections [review, 1d/week, 4h, Site Eng]
- *Systems Integration & Testing:* Signalling integration testing [task, 15–25d, 80h, Systems Eng], Rolling stock acceptance testing [task, 10–20d, 60h, Rolling Stock Eng], Systems integration sign-off [approval, 2d, 8h, Chief Engineer]
- *Trial Running:* Driver training & familiarisation [task, 10–15d, 40h, Operations], Shadow running / trial operations [task, 10–20d, ongoing, Ops Team], Trial running review [review, 2d, 8h, Ops Manager]
- *Revenue Service Handover:* Safety case / operational readiness approval [approval, 2–3d, 12h, Safety Authority], Revenue service launch [task, 1–2d, 8h, Ops Manager], Post-launch performance review [deliverable, 5–8d, 24h, Program Mgr]
**Deliverables:** Business Case, Detailed Design Package, Land Acquisition Records, Rolling Stock Contracts, Construction Progress Reports, Systems Integration Test Reports, Safety Case, Revenue Service Certificate
**Risks:** Land acquisition delay [high/high], Signalling integration failure [medium/high], Construction access/utility clash [medium/medium], Rolling stock delivery delay [medium/high], Safety case rejection [low/high]
**Milestones:** Business Case Approved, Design Freeze, Land Acquired, Construction Complete, Revenue Service Start
**Roles:** Program Manager ★, Chief Engineer ★, Rail Engineer, Systems Engineer, Land Acquisition Officer, Safety Manager, Operations Manager, Procurement Lead

### 36. Maritime, Shipping & Ports
**Phases:** Feasibility & Demand Study (4–8w) → Design & Engineering (8–16w) → Permitting & Environmental (8–16w) → Procurement (6–12w) → Construction / Dry Dock Works (16–40w) → Equipment Installation (8–16w) → Commissioning & Trials (4–8w) → Handover & Operations (2–4w)
**Activities (per phase):**
- *Feasibility & Demand Study:* Cargo/traffic demand forecast [task, 5–10d, 40h, Port Planner], Berth/capacity feasibility [task, 5–8d, 30h, Marine Eng], Feasibility sign-off [approval, 1d, 4h, Program Mgr]
- *Design & Engineering:* Marine structures design [task, 15–25d, 100h, Marine Eng], Port layout & operations design [task, 10–15d, 60h, Port Planner], Design review [review, 3d, 12h, Chief Engineer]
- *Permitting & Environmental:* Coastal/environmental permit applications [deliverable, 15–25d, 80h, Environmental Eng], Navigational risk assessment [task, 5–10d, 40h, Marine Surveyor], Permit approval tracking [task, ongoing, 2h/week, Regulatory Affairs]
- *Procurement:* Marine contractor tendering [task, 10–15d, 40h, Procurement], Crane/equipment procurement [task, 5–10d, 20h, Procurement], Contract award [approval, 2d, 8h, Program Mgr]
- *Construction / Dry Dock Works:* Marine civil works [task, 30–60d, ongoing, Contractor], Quay/berth construction [task, 20–40d, ongoing, Contractor], Progress & diver inspections [review, 1d/week, 4h, Site Eng]
- *Equipment Installation:* Crane & cargo handling installation [task, 15–25d, ongoing, Installation Team], Port systems (TOS/VTS) installation [task, 10–15d, 60h, Systems Eng], Installation inspections [review, 2d, 8h, Site Eng]
- *Commissioning & Trials:* Equipment load trials [task, 5–10d, 40h, Commissioning Eng], Berth/navigational trials [task, 3–5d, 20h, Marine Pilot], Commissioning sign-off [approval, 1d, 4h, Chief Engineer]
- *Handover & Operations:* O&M manuals & training [deliverable, 5–8d, 24h, Ops Manager], Operational readiness review [review, 1d, 4h, Port Director], Handover certificate [approval, 1d, 2h, Port Director]
**Deliverables:** Feasibility Study, Marine Design Package, Environmental Permits, Construction Contracts, Equipment Acceptance Certificates, Commissioning Reports, O&M Manuals, Handover Certificate
**Risks:** Weather/sea state delays [high/medium], Environmental permit delay [medium/high], Marine contractor delay [medium/high], Equipment delivery delay [medium/medium], Navigational safety incident [low/high]
**Milestones:** Feasibility Approved, Permits Granted, Construction Complete, Equipment Accepted, Operational Handover
**Roles:** Program Manager ★, Chief Engineer ★, Marine Engineer, Port Planner, Environmental Engineer, Commissioning Engineer, Ops Manager, Procurement Lead

### 37. Aviation Operations & Airports
**Phases:** Planning & Capacity Study (4–8w) → Design & Engineering (8–16w) → Regulatory Approvals (8–16w) → Procurement (6–12w) → Construction / Fit-Out (16–40w) → Systems Integration (6–12w) → Operational Trials (4–8w) → Certification & Go-Live (2–4w)
**Activities (per phase):**
- *Planning & Capacity Study:* Passenger/cargo demand forecast [task, 5–10d, 40h, Airport Planner], Capacity & masterplan options [task, 5–10d, 40h, Airport Planner], Planning sign-off [approval, 1d, 4h, Program Mgr]
- *Design & Engineering:* Airside/landside design [task, 15–25d, 100h, Airport Eng], Terminal systems design [task, 10–15d, 60h, Systems Eng], Design review gate [review, 3d, 12h, Chief Engineer]
- *Regulatory Approvals:* CAA/aviation authority submissions [deliverable, 15–25d, 80h, Regulatory Affairs], Security/safety case preparation [task, 10–15d, 60h, Safety Mgr], Approval tracking [task, ongoing, 2h/week, Regulatory Affairs]
- *Procurement:* Contractor & systems tendering [task, 10–15d, 40h, Procurement], Long-lead equipment orders [task, 5–10d, 20h, Procurement], Contract award [approval, 2d, 8h, Program Mgr]
- *Construction / Fit-Out:* Airside/landside construction [task, 30–60d, ongoing, Contractor], Terminal fit-out [task, 20–40d, ongoing, Fit-Out Team], Progress inspections [review, 1d/week, 4h, Site Eng]
- *Systems Integration:* BHS/AODB/security systems integration [task, 15–25d, 80h, Systems Eng], Integration testing [task, 10–15d, 60h, QA], Integration sign-off [approval, 2d, 8h, Chief Engineer]
- *Operational Trials:* Staff training & familiarisation [task, 10–15d, 40h, Training Lead], Operational readiness exercises [task, 5–10d, 40h, Ops Manager], Trial review [review, 2d, 8h, Airport Director]
- *Certification & Go-Live:* Aerodrome/ops certification [approval, 2–3d, 12h, Regulator], Go-live cutover [task, 1–2d, 16h, Ops Manager], Post-go-live review [deliverable, 5–8d, 24h, Program Mgr]
**Deliverables:** Capacity Study, Design Package, Regulatory Approvals, Construction Contracts, Systems Integration Reports, Training Records, Operational Readiness Certificate, Go-Live Report
**Risks:** Regulatory approval delay [high/high], Systems integration failure [medium/high], Construction airside safety incident [low/high], Stakeholder/airline coordination failure [medium/medium], Budget overrun [medium/high]
**Milestones:** Planning Approved, Design Freeze, Regulatory Approval, Construction Complete, Certification & Go-Live
**Roles:** Program Manager ★, Chief Engineer ★, Airport Planner, Systems Engineer, Safety Manager, Regulatory Affairs Lead ★, Ops Manager, Procurement Lead

### 38. Gaming & Esports
**Phases:** Concept & Greenlight (2–4w) → Pre-Production (4–8w) → Production (12–40w) → Alpha (4–8w) → Beta (4–8w) → Certification & Store Submission (2–6w) → Launch (1–2w) → Live Ops / Post-Launch (ongoing)
**Activities (per phase):**
- *Concept & Greenlight:* Game design document (GDD) drafting [task, 5–8d, 32h, Game Designer], Market & competitor analysis [task, 3–5d, 20h, Product Manager], Greenlight pitch [approval, 1d, 4h, Studio Head]
- *Pre-Production:* Vertical slice planning [task, 5–10d, 40h, Producer], Tech prototype [task, 10–15d, 60h, Tech Lead], Pre-production review [review, 2d, 8h, Creative Director]
- *Production:* Sprint planning & backlog grooming [meeting, 1d/sprint, 4h, Producer], Feature implementation [task, ongoing, varies, Dev Team], Art/audio production [task, ongoing, varies, Art/Audio Leads]
- *Alpha:* Feature-complete alpha build [deliverable, 5–10d, 40h, Build Eng], Internal playtest [task, 5–10d, 40h, QA], Alpha go/no-go [approval, 1d, 4h, Producer]
- *Beta:* External beta programme [task, 10–20d, ongoing, Community Manager], Bug triage & polish [task, ongoing, 8h/d, QA+Dev], Beta review [review, 2d, 8h, Producer]
- *Certification & Store Submission:* Platform certification prep (console/PC/mobile) [task, 5–15d, 60h, Release Mgr], Store page & age rating submission [deliverable, 3–5d, 16h, Release Mgr], Certification pass [approval, ongoing, varies, Platform Holder]
- *Launch:* Launch day ops & monitoring [task, 1–3d, 24h, Live Ops], Marketing launch coordination [task, 3–5d, 20h, Marketing], Launch retrospective [meeting, 1d, 4h, Producer]
- *Live Ops / Post-Launch:* Patch/hotfix cadence [task, ongoing, varies, Live Ops], Community & telemetry review [meeting, 1d/week, 4h, Product Manager], Season/content roadmap [deliverable, ongoing, 8h/sprint, Game Designer]
**Deliverables:** Game Design Document, Vertical Slice, Alpha Build, Beta Build, Certification Submission Pack, Store Page Assets, Launch Checklist, Live Ops Runbook
**Risks:** Scope creep / feature cut late [high/medium], Certification failure [medium/high], Key talent attrition [medium/high], Platform SDK change [medium/medium], Soft launch performance issues [medium/high]
**Milestones:** Greenlight, Vertical Slice Approved, Alpha, Beta, Certification Pass, Launch
**Roles:** Producer ★, Creative Director ★, Tech Lead ★, Game Designer, Art Director, QA Lead, Release Manager, Live Ops Lead

### 39. Publishing & Print Media
**Phases:** Commissioning & Brief (1–3w) → Content Development (4–12w) → Editing & Fact-Check (2–6w) → Design & Layout (2–6w) → Pre-Press & Proofing (1–3w) → Print Production (2–6w) → Distribution (1–4w) → Post-Publication Review (1–2w)
**Activities (per phase):**
- *Commissioning & Brief:* Title/brief development [task, 2–5d, 16h, Commissioning Editor], Author/contributor contracting [task, 3–5d, 12h, Rights Manager], Brief sign-off [approval, 1d, 2h, Publisher]
- *Content Development:* Manuscript drafting [task, ongoing, varies, Author], Progress editorial check-ins [meeting, 1d/fortnight, 2h, Editor], Draft delivery [deliverable, 1d, 2h, Author]
- *Editing & Fact-Check:* Structural/copy edit [task, 5–15d, 40h, Editor], Fact-check & legal read [task, 3–8d, 24h, Fact-Checker/Legal], Edit sign-off [approval, 1d, 2h, Managing Editor]
- *Design & Layout:* Cover & interior design [task, 5–10d, 40h, Designer], Typesetting/layout [task, 5–10d, 40h, Typesetter], Design review [review, 2d, 6h, Art Director]
- *Pre-Press & Proofing:* Proof pages generation [task, 2–4d, 12h, Production], Author/editor proof rounds [task, 3–5d, 16h, Editor], Final files approval [approval, 1d, 2h, Production Manager]
- *Print Production:* Print vendor scheduling [task, 2–5d, 8h, Production Manager], Print run monitoring [task, ongoing, varies, Production], Print quality inspection [review, 1–2d, 8h, Production]
- *Distribution:* Warehouse/distributor handoff [task, 2–5d, 12h, Distribution Mgr], Retail/online listing go-live [task, 2–3d, 8h, Sales], Distribution confirmation [deliverable, 1d, 2h, Distribution Mgr]
- *Post-Publication Review:* Sales & returns review [task, 3–5d, 12h, Sales], Errata/reissue decision [meeting, 1d, 3h, Publisher], Lessons learned [deliverable, 2d, 8h, Managing Editor]
**Deliverables:** Commissioning Brief, Manuscript, Edited Proof, Design Package, Final Print Files, Print Delivery Note, Distribution Plan, Post-Publication Report
**Risks:** Author delay [high/medium], Legal/libel issue [low/high], Print quality failure [medium/medium], Distribution bottleneck [medium/medium], Rights clearance gap [medium/high]
**Milestones:** Brief Approved, Manuscript Delivered, Final Files Approved, Print Complete, On Sale
**Roles:** Publisher ★, Managing Editor ★, Commissioning Editor, Designer, Production Manager, Rights Manager, Distribution Manager, Author

### 40. Fashion, Apparel & Textiles
**Phases:** Concept & Trend Research (2–4w) → Design Development (4–8w) → Sampling (4–8w) → Costing & Sourcing (3–6w) → Production (8–16w) → QC & Compliance (2–4w) → Logistics & Launch (2–4w) → Sell-Through Review (2–4w)
**Activities (per phase):**
- *Concept & Trend Research:* Trend & competitor research [task, 5–8d, 24h, Designer], Range plan drafting [task, 3–5d, 16h, Merchandiser], Concept sign-off [approval, 1d, 3h, Creative Director]
- *Design Development:* Sketching & tech packs [task, 10–15d, 60h, Designer], Fabric/trim selection [task, 5–8d, 24h, Fabric Buyer], Design review [review, 2d, 8h, Creative Director]
- *Sampling:* Proto/sample development [task, 10–15d, ongoing, Sample Room], Fit sessions [meeting, 2–5d, 16h, Designer+Tech], Sample approval [approval, 1d, 3h, Creative Director]
- *Costing & Sourcing:* Costing & margin review [task, 5–8d, 24h, Costing Analyst], Supplier nomination [task, 5–10d, 20h, Sourcing Mgr], PO placement [approval, 1–2d, 4h, Merchandiser]
- *Production:* Bulk production monitoring [task, ongoing, 4h/week, Production Mgr], In-line quality checks [review, 1d/week, 4h, QC], Production completion [deliverable, ongoing, varies, Factory]
- *QC & Compliance:* Final inspection (AQL) [task, 3–5d, 20h, QC], Compliance/lab testing [task, 5–10d, 24h, Compliance], QC release [approval, 1d, 2h, QC Manager]
- *Logistics & Launch:* Shipping & customs [task, 5–10d, 20h, Logistics], Wholesale/retail allocation [task, 3–5d, 16h, Merchandiser], Launch readiness review [review, 1d, 4h, Brand Manager]
- *Sell-Through Review:* Sell-through analysis [task, 3–5d, 16h, Merchandiser], Markdown/replenishment decisions [meeting, 1d, 3h, Merchandiser], Season review report [deliverable, 3d, 12h, Brand Manager]
**Deliverables:** Range Plan, Tech Packs, Approved Samples, Cost Sheets, Purchase Orders, QC Reports, Compliance Certificates, Season Review Report
**Risks:** Sample approval delay [medium/medium], Fabric lead-time slip [medium/high], Factory capacity issue [medium/high], Compliance test failure [low/high], Weak sell-through [medium/medium]
**Milestones:** Concept Approved, Sample Approved, PO Placed, Production Complete, Launch
**Roles:** Creative Director ★, Designer ★, Merchandiser ★, Sourcing Manager, Production Manager, QC Manager, Compliance Officer, Logistics Coordinator

### 41. Food & Beverage Manufacturing
**Phases:** Concept & Formulation (2–4w) → Pilot & Shelf-Life (4–8w) → Regulatory & Labelling (3–6w) → Scale-Up Engineering (4–8w) → Procurement & Packaging (3–6w) → Production Validation (3–6w) → Launch (2–4w) → Post-Launch Quality Review (2–4w)
**Activities (per phase):**
- *Concept & Formulation:* Recipe/formulation development [task, 5–10d, 40h, Food Technologist], Sensory screening [task, 3–5d, 16h, Sensory Panel], Formulation freeze [approval, 1d, 3h, R&D Manager]
- *Pilot & Shelf-Life:* Pilot plant trials [task, 5–10d, 40h, Process Eng], Shelf-life study [task, 10–20d, ongoing, QA], Pilot review [review, 2d, 8h, R&D Manager]
- *Regulatory & Labelling:* Ingredient & claim compliance check [task, 5–8d, 24h, Regulatory], Label artwork approval [deliverable, 3–5d, 16h, Packaging], Regulatory sign-off [approval, 1d, 3h, Regulatory Affairs]
- *Scale-Up Engineering:* Process scale-up design [task, 10–15d, 60h, Process Eng], Equipment readiness [task, 5–10d, 30h, Manufacturing Eng], Scale-up review [review, 2d, 8h, Plant Manager]
- *Procurement & Packaging:* Ingredient contracting [task, 5–10d, 20h, Procurement], Packaging procurement [task, 5–8d, 16h, Packaging Buyer], Supply readiness [approval, 1d, 3h, Supply Chain]
- *Production Validation:* Validation batches [task, 5–10d, 40h, QA], HACCP/process validation [task, 5–8d, 24h, QA], Validation sign-off [approval, 1d, 4h, QA Manager]
- *Launch:* First commercial production [task, 3–5d, 24h, Production], Distribution fill [task, 3–5d, 16h, Logistics], Launch review [meeting, 1d, 4h, Brand Manager]
- *Post-Launch Quality Review:* Complaint/quality monitoring [task, ongoing, 4h/week, QA], Formulation tweak decisions [meeting, 1d, 3h, R&D], Post-launch report [deliverable, 3d, 12h, QA Manager]
**Deliverables:** Formulation Spec, Pilot Trial Report, Shelf-Life Report, Label Artwork Pack, Scale-Up Plan, Validation Batch Records, HACCP Docs, Post-Launch Quality Report
**Risks:** Shelf-life failure [medium/high], Regulatory labelling rejection [medium/high], Scale-up yield loss [medium/medium], Ingredient supply disruption [medium/high], Food safety incident [low/high]
**Milestones:** Formulation Frozen, Pilot Approved, Regulatory Sign-Off, Validation Complete, Launch
**Roles:** R&D Manager ★, Food Technologist ★, QA Manager ★, Process Engineer, Regulatory Affairs, Production Manager, Procurement Lead, Brand Manager

### 42. Chemical & Process Manufacturing
**Phases:** Process Concept (3–6w) → Lab/Pilot Development (6–12w) → Process Design Package (6–12w) → HAZOP & Safety (4–8w) → Detailed Engineering (8–16w) → Construction & Install (16–40w) → Commissioning (4–8w) → Performance Test & Handover (2–4w)
**Activities (per phase):**
- *Process Concept:* Process options study [task, 5–10d, 40h, Process Eng], Mass/energy balance draft [task, 5–8d, 32h, Process Eng], Concept gate [approval, 1d, 4h, Program Mgr]
- *Lab/Pilot Development:* Lab trials [task, 10–20d, ongoing, Chemist], Pilot plant runs [task, 10–20d, ongoing, Pilot Eng], Pilot data review [review, 2d, 8h, Process Eng]
- *Process Design Package:* PFD/P&ID development [task, 15–25d, 100h, Process Eng], Equipment datasheets [task, 10–15d, 60h, Mech Eng], PDP review [review, 3d, 12h, Chief Engineer]
- *HAZOP & Safety:* HAZOP workshops [meeting, 5–10d, 40h, Process Safety], SIL/LOPA studies [task, 5–10d, 40h, Process Safety], Safety case sign-off [approval, 2d, 8h, HSE Manager]
- *Detailed Engineering:* Detailed design packages [task, 20–30d, ongoing, Design Team], 3D model reviews [review, 2d/month, 8h, Design Lead], Design freeze [approval, 1d, 4h, Chief Engineer]
- *Construction & Install:* Site construction [task, 30–60d, ongoing, Contractor], Equipment installation [task, 20–40d, ongoing, Installation], Progress inspections [review, 1d/week, 4h, Site Eng]
- *Commissioning:* Pre-commissioning & loop checks [task, 10–15d, 60h, Commissioning Eng], Start-up sequence [task, 5–10d, 40h, Ops], Commissioning sign-off [approval, 1d, 4h, Plant Manager]
- *Performance Test & Handover:* Performance guarantee test [task, 5–10d, 40h, Process Eng], Punch-list close-out [task, 5–8d, 24h, Site Eng], Handover certificate [approval, 1d, 2h, Plant Manager]
**Deliverables:** Process Concept Report, Pilot Report, Process Design Package, HAZOP Report, Detailed Design, Commissioning Dossiers, Performance Test Report, Handover Certificate
**Risks:** HAZOP major findings late [medium/high], Pilot scale-up failure [medium/high], Long-lead equipment delay [medium/high], Construction HSE incident [low/high], Performance test fail [medium/high]
**Milestones:** Concept Approved, PDP Approved, HAZOP Complete, Design Freeze, Performance Test Pass
**Roles:** Program Manager ★, Process Engineer ★, Process Safety Lead ★, Chief Engineer, Commissioning Engineer, HSE Manager, Site Engineer, Plant Manager

### 43. Semiconductor & Electronics Manufacturing
**Phases:** Product Definition (2–4w) → Design & Tape-Out (8–20w) → Mask/Tooling (4–8w) → Prototype Fab (6–12w) → Characterisation & Qualification (6–12w) → Ramp (6–12w) → Volume Production (ongoing) → Yield & Continuous Improvement (ongoing)
**Activities (per phase):**
- *Product Definition:* Spec & target market definition [task, 5–8d, 24h, Product Mgr], Feasibility with foundry [task, 3–5d, 16h, Process Eng], Definition freeze [approval, 1d, 3h, Program Mgr]
- *Design & Tape-Out:* RTL/analog design [task, 20–40d, ongoing, Design Eng], Verification & DRC/LVS [task, 10–20d, 80h, Verification Eng], Tape-out [approval, 1–2d, 8h, Design Lead]
- *Mask/Tooling:* Mask order & review [task, 5–10d, 20h, Mask Eng], Tooling/fixture prep [task, 5–10d, 24h, Packaging Eng], Mask ready [deliverable, 1d, 2h, Mask Eng]
- *Prototype Fab:* Fab lot tracking [task, ongoing, 4h/week, Foundry Liaison], Prototype packaging [task, 5–10d, 30h, Packaging Eng], Silicon arrival review [review, 1d, 4h, Design Lead]
- *Characterisation & Qualification:* Electrical characterisation [task, 10–20d, 80h, Test Eng], Reliability qualification [task, 15–25d, 100h, Reliability Eng], Qual sign-off [approval, 2d, 8h, Quality Mgr]
- *Ramp:* Yield ramp plan [task, 5–10d, 30h, Yield Eng], Process tweak cycles [task, ongoing, varies, Process Eng], Ramp gate [approval, 1d, 4h, Ops Manager]
- *Volume Production:* Production monitoring [task, ongoing, 2h/d, Production], Quality lot release [review, ongoing, 2h/lot, QA], Capacity planning [meeting, 1d/month, 4h, Ops Manager]
- *Yield & Continuous Improvement:* Yield analysis [task, ongoing, 8h/week, Yield Eng], Corrective actions [task, ongoing, varies, Process Eng], CI report [deliverable, 1d/month, 4h, Yield Eng]
**Deliverables:** Product Spec, Tape-Out Package, Mask Set, Characterisation Report, Qualification Report, Ramp Plan, Yield Reports, Production Release
**Risks:** Tape-out respins [medium/high], Foundry schedule slip [medium/high], Qualification failure [medium/high], Yield below target [high/high], Supply chain tool downtime [medium/medium]
**Milestones:** Spec Freeze, Tape-Out, First Silicon, Qualification Pass, Production Release
**Roles:** Program Manager ★, Design Lead ★, Verification Engineer, Process Engineer, Test Engineer, Reliability Engineer, Yield Engineer, Quality Manager

### 44. Biotechnology & Genomics
**Phases:** Discovery / Target ID (8–16w) → Assay Development (6–12w) → Preclinical / Lab Validation (12–24w) → Process Development (8–16w) → Regulatory Path (ongoing) → Pilot Manufacturing (8–16w) → Clinical/Field Trial Support (12–52w) → Tech Transfer & Review (4–8w)
**Activities (per phase):**
- *Discovery / Target ID:* Literature & target screening [task, 10–20d, 60h, Scientist], Experimental design [task, 5–8d, 24h, Principal Scientist], Target nomination [approval, 1d, 4h, R&D Director]
- *Assay Development:* Assay protocol development [task, 10–15d, 60h, Assay Dev], Assay qualification [task, 5–10d, 40h, QA], Assay sign-off [approval, 1d, 3h, Lab Manager]
- *Preclinical / Lab Validation:* In vitro/in vivo studies [task, ongoing, varies, Study Director], Data analysis & QC [task, 5–10d, 40h, Biostatistician], Validation report [deliverable, 5–8d, 24h, Study Director]
- *Process Development:* Upstream/downstream process design [task, 15–25d, 100h, Process Dev], Process characterisation [task, 10–15d, 60h, Process Dev], Process freeze [approval, 1d, 4h, CMC Lead]
- *Regulatory Path:* Regulatory strategy & meetings [task, ongoing, varies, Regulatory], Dossier section drafting [deliverable, ongoing, 8h/week, Regulatory], Submission readiness [review, 2d, 8h, RA Head]
- *Pilot Manufacturing:* Pilot batch manufacture [task, 10–20d, ongoing, Manufacturing], Batch release testing [task, 5–10d, 40h, QC], Batch release [approval, 1d, 4h, QP/QA]
- *Clinical/Field Trial Support:* Trial material supply [task, ongoing, varies, Supply Chain], Protocol deviations & CAPA [task, ongoing, 4h/week, QA], Interim data reviews [meeting, ongoing, 4h, Medical Lead]
- *Tech Transfer & Review:* Tech transfer package [deliverable, 10–15d, 60h, CMC Lead], Receiving site readiness [task, 5–10d, 30h, Manufacturing], Transfer sign-off [approval, 1d, 4h, R&D Director]
**Deliverables:** Target Nomination Report, Assay Protocols, Validation Study Report, Process Description, Regulatory Dossier Sections, Pilot Batch Records, Trial Supply Plan, Tech Transfer Package
**Risks:** Assay irreproducibility [medium/high], Preclinical failure [medium/high], Regulatory hold [medium/high], Pilot batch failure [medium/high], Tech transfer gaps [medium/medium]
**Milestones:** Target Nominated, Assay Qualified, Validation Complete, Process Frozen, Pilot Released, Tech Transfer Complete
**Roles:** R&D Director ★, Principal Scientist ★, Assay Development Lead, Study Director, CMC Lead ★, Regulatory Affairs, QA/QP, Manufacturing Lead

### 45. Data Centres & Cloud Infrastructure
**Phases:** Capacity & Site Selection (4–8w) → Design (8–16w) → Power/Cooling Procurement (6–12w) → Construction & Fit-Out (16–40w) → Network & Compute Build (6–12w) → Commissioning (4–8w) → Migration / Go-Live (2–6w) → Hypercare & Optimisation (4–8w)
**Activities (per phase):**
- *Capacity & Site Selection:* Capacity forecast & TCO [task, 5–10d, 40h, Capacity Planner], Site due diligence [task, 5–10d, 30h, Site Eng], Site selection sign-off [approval, 1d, 4h, Program Mgr]
- *Design:* MEP & white space design [task, 15–25d, 100h, Data Centre Eng], Network architecture design [task, 10–15d, 60h, Network Arch], Design review [review, 3d, 12h, Chief Engineer]
- *Power/Cooling Procurement:* Utility & generator contracts [task, 10–15d, 40h, Procurement], Cooling plant procurement [task, 5–10d, 20h, Procurement], Contract award [approval, 2d, 8h, Program Mgr]
- *Construction & Fit-Out:* Shell & core / fit-out [task, 30–60d, ongoing, Contractor], Raised floor & containment [task, 15–25d, ongoing, Fit-Out], Progress inspections [review, 1d/week, 4h, Site Eng]
- *Network & Compute Build:* Spine-leaf / WAN build [task, 15–25d, 80h, Network Eng], Server/storage deployment [task, 10–20d, 60h, Infra Eng], Build review [review, 2d, 8h, Infra Lead]
- *Commissioning:* Integrated systems testing (IST) [task, 10–15d, 60h, Commissioning Eng], Failover tests [task, 5–8d, 32h, Ops], Commissioning sign-off [approval, 1d, 4h, Ops Manager]
- *Migration / Go-Live:* Workload migration waves [task, 10–20d, ongoing, Migration Lead], Cutover & DNS/traffic switch [task, 2–5d, 24h, Infra Lead], Go-live confirmation [approval, 1d, 2h, Program Mgr]
- *Hypercare & Optimisation:* Incident triage [task, ongoing, 8h/d, Ops], Capacity & PUE tuning [task, 5–10d, 30h, Facilities Eng], Hypercare exit report [deliverable, 3–5d, 16h, Program Mgr]
**Deliverables:** Site Selection Report, Design Package, Procurement Contracts, Construction Progress Reports, Network/Compute Build Docs, IST Reports, Migration Runbooks, Hypercare Exit Report
**Risks:** Power utility delay [high/high], Long-lead cooling equipment [medium/high], Construction delay [medium/high], Migration outage [medium/high], Cooling failure at load [low/high]
**Milestones:** Site Selected, Design Freeze, Construction Complete, IST Pass, Migration Complete
**Roles:** Program Manager ★, Data Centre Engineer ★, Network Architect ★, Infra Lead, Commissioning Engineer, Facilities Engineer, Migration Lead, Ops Manager

### 46. Waste Management & Recycling
**Phases:** Baseline & Options (3–6w) → Design & Permitting (8–16w) → Procurement (4–8w) → Construction / Plant Install (12–30w) → Commissioning (3–6w) → Operations Mobilisation (2–4w) → Ramp-Up (4–8w) → Performance Review (2–4w)
**Activities (per phase):**
- *Baseline & Options:* Waste stream characterisation [task, 5–10d, 40h, Env Eng], Technology options appraisal [task, 5–8d, 30h, Process Eng], Options gate [approval, 1d, 4h, Program Mgr]
- *Design & Permitting:* Plant/process design [task, 15–25d, 100h, Process Eng], Environmental permit application [deliverable, 15–25d, 80h, Environmental Eng], Permit tracking [task, ongoing, 2h/week, Regulatory]
- *Procurement:* EPC/equipment tendering [task, 10–15d, 40h, Procurement], Contract award [approval, 2d, 8h, Program Mgr], Vendor kick-off [meeting, 1d, 4h, PM]
- *Construction / Plant Install:* Civil & plant installation [task, 30–60d, ongoing, Contractor], Progress & HSE inspections [review, 1d/week, 4h, Site Eng], Mechanical completion [deliverable, 1d, 4h, Site Eng]
- *Commissioning:* Cold/hot commissioning [task, 10–15d, 60h, Commissioning Eng], Environmental compliance tests [task, 5–8d, 32h, Env Eng], Commissioning sign-off [approval, 1d, 4h, Plant Manager]
- *Operations Mobilisation:* Operator training [task, 5–8d, 30h, Training Lead], SOPs & emergency plans [deliverable, 5–8d, 24h, Ops], Readiness review [review, 1d, 4h, Plant Manager]
- *Ramp-Up:* Throughput ramp plan [task, 10–20d, ongoing, Ops], Quality of recyclate monitoring [task, ongoing, 4h/week, QA], Ramp review [meeting, 1d, 4h, Plant Manager]
- *Performance Review:* KPI & diversion rate review [task, 3–5d, 16h, Env Eng], Lessons learned [meeting, 1d, 4h, Program Mgr], Close-out report [deliverable, 3–5d, 16h, Program Mgr]
**Deliverables:** Options Appraisal, Design Package, Environmental Permit, Construction Contracts, Commissioning Reports, SOPs, Ramp Plan, Performance Review Report
**Risks:** Permit delay [high/high], Feedstock variability [medium/medium], Equipment performance shortfall [medium/high], Community objection [medium/medium], HSE incident [low/high]
**Milestones:** Options Approved, Permit Granted, Mechanical Completion, Commissioning Pass, Steady-State Ops
**Roles:** Program Manager ★, Process Engineer ★, Environmental Engineer ★, Site Engineer, Commissioning Engineer, Plant Manager, Procurement Lead, HSE Officer

### 47. Sports & Recreation Facilities
**Phases:** Feasibility & Programme (3–6w) → Design (8–16w) → Funding & Approvals (6–12w) → Procurement (4–8w) → Construction (16–40w) → FF&E & Systems (4–8w) → Soft Opening (2–4w) → Full Opening & Review (2–4w)
**Activities (per phase):**
- *Feasibility & Programme:* Demand & utilisation study [task, 5–8d, 24h, Leisure Planner], Schedule of accommodation [task, 3–5d, 16h, Architect], Feasibility sign-off [approval, 1d, 4h, Program Mgr]
- *Design:* Concept & detailed design [task, 15–25d, 100h, Architect], Sports surface/systems design [task, 10–15d, 60h, Specialist Eng], Design review [review, 3d, 12h, Client]
- *Funding & Approvals:* Funding applications [task, 10–20d, 40h, Funding Lead], Planning/building approvals [deliverable, 15–25d, 60h, Planning Consultant], Approval tracking [task, ongoing, 2h/week, PM]
- *Procurement:* Contractor tendering [task, 10–15d, 40h, Procurement], Award [approval, 2d, 8h, Program Mgr], Pre-start meeting [meeting, 1d, 4h, PM]
- *Construction:* Construction programme [task, 30–60d, ongoing, Contractor], Site inspections [review, 1d/week, 4h, Site Eng], Practical completion [deliverable, 1d, 4h, Contract Admin]
- *FF&E & Systems:* FF&E install [task, 10–15d, 40h, FF&E Coord], AV/access/security systems [task, 5–10d, 30h, Systems Eng], Systems acceptance [approval, 1d, 4h, Ops Manager]
- *Soft Opening:* Staff training [task, 5–8d, 24h, Ops Manager], Soft opening events [task, 5–10d, ongoing, Ops], Soft opening review [review, 1d, 4h, Facility Manager]
- *Full Opening & Review:* Grand opening [task, 1–2d, 12h, Marketing], Utilisation monitoring [task, 5–10d, 20h, Facility Manager], Post-opening review [deliverable, 3–5d, 16h, Program Mgr]
**Deliverables:** Feasibility Study, Design Package, Funding/Approval Pack, Construction Contract, PC Certificate, FF&E Schedules, Training Records, Post-Opening Review
**Risks:** Funding shortfall [medium/high], Planning delay [medium/high], Construction delay [medium/medium], Specialist surface defects [medium/medium], Low utilisation at opening [medium/medium]
**Milestones:** Feasibility Approved, Design Freeze, Approvals Secured, Practical Completion, Full Opening
**Roles:** Program Manager ★, Architect ★, Facility Manager ★, Site Engineer, Funding Lead, Ops Manager, Procurement Lead, FF&E Coordinator

### 48. Museums, Arts & Cultural Heritage
**Phases:** Concept & Collections Brief (3–6w) → Design & Interpretation (8–16w) → Conservation & Loans (6–12w) → Fit-Out & AV (8–16w) → Install & Conditioning (4–8w) → Soft Opening (2–4w) → Public Opening (1–2w) → Evaluation (2–4w)
**Activities (per phase):**
- *Concept & Collections Brief:* Narrative & audience brief [task, 5–8d, 24h, Curator], Collections audit [task, 5–10d, 30h, Collections Mgr], Concept sign-off [approval, 1d, 3h, Director]
- *Design & Interpretation:* Exhibition design [task, 15–25d, 80h, Exhibition Designer], Interpretation plan [task, 5–10d, 30h, Interpretation Lead], Design review [review, 2d, 8h, Curator]
- *Conservation & Loans:* Conservation treatments [task, 10–20d, ongoing, Conservator], Loan agreements [deliverable, 5–15d, 30h, Registrar], Loans/conservation readiness [approval, 1d, 3h, Collections Mgr]
- *Fit-Out & AV:* Gallery fit-out [task, 15–25d, ongoing, Contractor], AV/interactives install [task, 10–15d, 40h, AV Specialist], Fit-out inspection [review, 2d, 8h, Project Mgr]
- *Install & Conditioning:* Object install [task, 10–15d, 60h, Install Team], Environmental conditioning [task, 5–8d, 24h, Conservator], Install sign-off [approval, 1d, 3h, Curator]
- *Soft Opening:* Staff/volunteer training [task, 3–5d, 16h, Education Lead], Invite-only preview [task, 2–3d, 12h, Marketing], Soft opening review [review, 1d, 3h, Director]
- *Public Opening:* Public launch event [task, 1–2d, 12h, Marketing], Opening-week ops [task, 5–7d, 4h/d, Ops], Launch report [deliverable, 2d, 8h, Project Mgr]
- *Evaluation:* Visitor evaluation study [task, 5–10d, 24h, Evaluation Lead], Lessons learned [meeting, 1d, 3h, Director], Evaluation report [deliverable, 3–5d, 16h, Evaluation Lead]
**Deliverables:** Concept Brief, Exhibition Design Pack, Loan Agreements, Conservation Reports, Fit-Out Completion, Install Condition Reports, Training Records, Evaluation Report
**Risks:** Loan denial/delay [medium/high], Conservation discovery [medium/medium], Environmental control failure [low/high], Fit-out delay [medium/medium], Soft attendance [medium/medium]
**Milestones:** Concept Approved, Design Freeze, Install Complete, Soft Opening, Public Opening
**Roles:** Project Manager ★, Curator ★, Exhibition Designer, Conservator, Registrar, Collections Manager, Education Lead, Marketing Lead

### 49. Veterinary & Animal Health Services
**Phases:** Service/Facility Planning (3–6w) → Regulatory & Licensing (4–10w) → Facility Design & Fit-Out (8–16w) → Equipment & Systems Procurement (4–8w) → Staffing & Training (4–8w) → Systems & Compliance Testing (2–4w) → Soft Opening (2–4w) → Full Launch & Review (2–4w)
**Activities (per phase):**
- *Service/Facility Planning:* Service line & demand assessment [task, 5–8d, 24h, Practice Manager], Site/facility feasibility [task, 5–8d, 24h, Facilities Planner], Feasibility sign-off [approval, 1d, 4h, Program Mgr]
- *Regulatory & Licensing:* Veterinary licensing/accreditation application [deliverable, 10–15d, 40h, Regulatory Affairs], Controlled substances licensing [task, 5–10d, 20h, Regulatory Affairs], Licensing approval tracking [task, ongoing, 2h/week, Regulatory Affairs]
- *Facility Design & Fit-Out:* Clinical facility design (surgery/imaging) [task, 10–15d, 60h, Design Eng], Fit-out construction [task, 20–30d, ongoing, Contractor], Design/fit-out review [review, 2d, 8h, Practice Manager]
- *Equipment & Systems Procurement:* Clinical equipment procurement (imaging/lab) [task, 5–10d, 20h, Procurement], Practice management system setup [task, 5–8d, 24h, IT Coordinator], Procurement sign-off [approval, 1d, 4h, Practice Manager]
- *Staffing & Training:* Clinical staff recruitment [task, 10–20d, ongoing, HR Manager], Onboarding & protocol training [task, 5–8d, 30h, Head Veterinarian], Training sign-off [approval, 1d, 4h, Head Veterinarian]
- *Systems & Compliance Testing:* Equipment calibration & testing [task, 3–5d, 20h, Biomedical Technician], Infection control/compliance audit [review, 2–3d, 12h, Compliance Officer], Compliance sign-off [approval, 1d, 4h, Head Veterinarian]
- *Soft Opening:* Limited-capacity soft launch [task, 5–10d, ongoing, Practice Manager], Client feedback collection [task, ongoing, 2h/d, Practice Manager], Soft opening review [review, 1d, 4h, Practice Manager]
- *Full Launch & Review:* Marketing & community outreach [task, 5–8d, 24h, Marketing Coordinator], Full-capacity operations start [task, 1–2d, 8h, Practice Manager], Post-launch performance review [deliverable, 3–5d, 16h, Practice Manager]
**Deliverables:** Feasibility Study, Licensing/Accreditation Approval, Facility Design Package, Equipment Procurement Records, Staff Training Records, Compliance Audit Report, Soft Opening Feedback Report, Post-Launch Review
**Risks:** Licensing/accreditation delay [medium/high], Clinical staff recruitment delay [medium/medium], Equipment delivery delay [medium/medium], Compliance/infection control failure [low/high], Low client uptake at launch [medium/medium]
**Milestones:** Feasibility Approved, Licensing Granted, Fit-Out Complete, Compliance Sign-Off, Full Launch
**Roles:** Program Manager ★, Head Veterinarian ★, Practice Manager ★, Regulatory Affairs Lead, Facilities Planner, Compliance Officer, HR Manager, Biomedical Technician

### 50. Franchise & Multi-Site Retail Rollout
**Phases:** Market & Site Feasibility (3–6w) → Franchise/Site Agreement (4–8w) → Design & Permitting (6–10w) → Fit-Out & Construction (8–16w) → Systems & Inventory Setup (2–4w) → Staff Recruitment & Training (3–6w) → Pre-Opening Marketing (2–4w) → Store Opening & Review (2–4w)
**Activities (per phase):**
- *Market & Site Feasibility:* Market/demographic analysis [task, 5–8d, 24h, Site Selection Analyst], Site visit & lease negotiation [task, 5–10d, 30h, Real Estate Manager], Feasibility sign-off [approval, 1d, 4h, Franchise Development Mgr]
- *Franchise/Site Agreement:* Franchise/lease agreement drafting [deliverable, 5–10d, 30h, Legal Counsel], Agreement negotiation & sign-off [task, 5–10d, 20h, Franchise Development Mgr], Agreement execution [approval, 1d, 4h, Franchisee]
- *Design & Permitting:* Store design & layout planning [task, 10–15d, 50h, Design Eng], Permit & signage approval [deliverable, 10–15d, 30h, Regulatory Affairs], Design sign-off [approval, 1d, 4h, Brand Standards Mgr]
- *Fit-Out & Construction:* Store build-out & fit-out [task, 20–40d, ongoing, Contractor], Brand standards compliance inspection [review, 1d/week, 4h, Brand Standards Mgr], Fit-out completion sign-off [approval, 1d, 4h, Franchise Development Mgr]
- *Systems & Inventory Setup:* POS/inventory systems installation [task, 3–5d, 20h, IT Coordinator], Initial stock ordering & merchandising [task, 5–8d, 24h, Store Manager], Systems readiness sign-off [approval, 1d, 4h, Store Manager]
- *Staff Recruitment & Training:* Store staff recruitment [task, 10–15d, ongoing, HR Manager], Brand & operations training [task, 5–8d, 30h, Training Lead], Training sign-off [approval, 1d, 4h, Store Manager]
- *Pre-Opening Marketing:* Local marketing campaign & launch promotions [task, 5–10d, 24h, Marketing Coordinator], Soft opening trial [task, 2–3d, 12h, Store Manager], Pre-opening readiness review [review, 1d, 4h, Franchise Development Mgr]
- *Store Opening & Review:* Grand opening event [task, 1–2d, 12h, Marketing Coordinator], Opening-week sales monitoring [task, 5–7d, 4h/d, Store Manager], Post-opening performance review [deliverable, 3–5d, 16h, Franchise Development Mgr]
**Deliverables:** Site Feasibility Report, Franchise/Lease Agreement, Store Design Package, Permits & Signage Approval, Fit-Out Completion Certificate, Staff Training Records, Marketing/Launch Plan, Post-Opening Performance Report
**Risks:** Site/lease negotiation delay [medium/medium], Permit approval delay [medium/high], Brand standards non-compliance [low/medium], Staffing shortfall at opening [medium/medium], Weak opening-week sales [medium/medium]
**Milestones:** Site Approved, Agreement Signed, Fit-Out Complete, Staff Trained, Store Opening
**Roles:** Franchise Development Manager ★, Store Manager ★, Real Estate Manager, Brand Standards Manager, Legal Counsel, HR Manager, Marketing Coordinator, Design Engineer

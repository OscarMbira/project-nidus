# v946 — Industry Capability Content Taxonomy (15 Industries, PM-Filtered) — PRD

> Source documents: `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` (11 usable industries —
> GEN excluded, see decision 7), `Documentation/Marketing_and_Creative_Menu_Taxonomy.md` (12th),
> `Documentation/Human_Resources_and_Legal_Compliance_Menu_Taxonomy.md` (13th and 14th — Human
> Resources, Legal & Compliance), and `Documentation/SaaS_Industry_Tenant_Provisioning_Revamp_
> Brief.md` (the architecture brief this content plugs into). This PRD does not restate their raw
> content; it defines how that content maps onto the existing v930/v931 pack-grouped sidebar +
> Local Register Engine, filtered through decision 0 (PM-of-projects only), and what to build.
> **Every one of these documents was written for a broader audience than "what a PMIS should
> build" — each carries substantial operational system-of-record content by design. Decision 0
> and section g)'s per-industry tables are the record of what was kept vs deliberately dropped.**

## a) Problem statement

The sidebar's pack-grouping (v930) and the Local Register Engine's 28 seeded registers (v931/
v933) only give each industry a handful of genuinely curated items (e.g. IT & Software currently
has just Releases and Deployments). The organisation has three approved, much deeper content
taxonomy documents defining what each industry pack could contain — up to 4 levels deep, covering
14 industries in total across the three documents — that have never been built. Users selecting
an industry today see almost nothing industry-specific; the taxonomies exist but aren't wired to
any real feature, and (per decision 0) most of their content describes operating that industry's
systems day-to-day rather than managing projects within it — the PM-relevant subset is smaller
than any one document's raw size suggests.

## b) Solution

Extend the existing Local Register Engine (v931) — the generic, config-driven register system
already powering Releases/Deployments/Permits/etc. — to cover the PM-relevant subset of all three
taxonomy documents (decision 0). Every surviving taxonomy leaf item becomes a Local Register
(system-defined, `is_system_defined = true`, same mechanism as the existing 28); every surviving
taxonomy category becomes a real menu category node grouping that industry's registers under its
own themed header (e.g. "Technology Delivery" for Information Technology, "Core Banking" /
"Testing & Assurance" / etc. for Banking & Financial Services); every industry pack gets its own
dedicated set of category headers instead of everything defaulting to "Portfolio & Delivery". The
database's `industry_categories` table expands from the 10 rows actually live (not the 9 assumed
from old seed files) to 16 (14 real industries with content from this initiative + the two
pre-existing but content-less Human Resources/Legal & Compliance rows now getting real content +
Cross-Industry unchanged). No new Postgres tables, RLS policies, or bespoke React pages are
needed — this is a large but now-bounded *content* addition through the mechanism that already
exists, not a new engine.

## c) User stories

1. As an organisation with IT & Software selected, I see a "Technology Delivery" pack section in
   my sidebar containing category headers (Requirements, Architecture, Design, Environments,
   Development, Interfaces, Data, Testing, Defects, Releases, Deployments, Technical Debt,
   Cybersecurity, Production Readiness) matching the taxonomy's ICT section.
2. As an organisation with Financial Services selected, I see the full Banking & Financial
   Services taxonomy (Banking Transformation, Core Banking, Data Migration, Testing & Assurance,
   Regulatory & Compliance, Payments & Channels, Cutover, Operational Readiness, Go-Live,
   Hypercare) as real category headers with real registers underneath.
3. As an organisation with any of the other 9 `Core_PM_and_Industry_Menu_Taxonomy.md` industries
   selected (Construction & Engineering, Healthcare, Government & Public Sector,
   Telecommunications, Energy & Utilities, Manufacturing, Education, NGO/Development, Retail), I
   see that industry's PM-relevant categories (section g's per-industry table) built out the same
   way — not its full operational taxonomy.
3a. As an organisation with Marketing/Advertising/Creative Services, Human Resources, or Legal &
    Compliance selected, I see that industry's PM-relevant subset (a handful of categories, per
    decisions 6a/6b/6c) — not the full 35-40 category operational taxonomy those two documents
    define, since most of each is HRIS/GRC/marketing-operations content out of scope per
    decision 0.
4. As a user, clicking any taxonomy leaf item that survived the filter takes me to a working
   Local Register list page (create/edit/view/delete records) with fields appropriate to that
   item — not an empty page.
5. As a user, where a surviving taxonomy leaf genuinely duplicates an already-working Platform
   feature (Requirements → the existing Requirements Register; Defects → the existing Testing/
   Defects module; Releases/Deployments → the already-built v931 Local Registers), I am taken to
   that existing feature, not a second, competing, empty register for the same concept.
6. As a PMO Admin, I can see every register across every industry (including all the new ones
   from this initiative) in the existing "Manage Local Registers" oversight page — no new admin
   surface needed.
7. As an organisation selecting "General Project Management" as its industry, nothing changes —
   there is no separate GEN row; this maps onto the pre-existing Cross-Industry pack, which
   already provides exactly this (Core Project Management only, no industry-specific content).
8. As a Simulator user, the same industry pack content is available in Simulator's practice
   hierarchy scope, per the v938 Simulator extension already built for the existing 28 registers
   (Platform-Simulator parity, rule 34.1).
9. As a developer extending this later, adding a new industry or a new leaf within an existing
   one follows the exact same seed-data pattern, gated by the same decision-0 filter — no new
   code path, and no obligation to build a taxonomy document's full operational depth just
   because it's written down somewhere.

## d) Implementation decisions

0. **Governing filter — PM-of-projects only, not an operational system of record.** Project
   Nidus is a PMIS, not a core banking system, EMR, HRIS, GRC platform, MES, POS, or network
   operations centre. Every taxonomy category is tested against one question before it becomes a
   register: *does this describe managing a bounded project/programme/initiative (has a scope, a
   delivery team, milestones, a start and an end/go-live), or does it describe ongoing,
   day-to-day operation of that industry's own systems?* Only the former survives. **In scope**:
   portfolio/programme-of-projects overviews; build/configure/implement phases of a system or
   capability; testing, migration, cutover, go-live, hypercare, operational-readiness (classic
   project transition activities); named, bounded initiatives (a specific campaign, a specific
   regulatory-change project, a specific org restructure, a specific system implementation).
   **Out of scope, dropped entirely** (not built as a register, not linked anywhere — genuinely
   absent from this initiative): ongoing case/record-management systems (Employee Records,
   Litigation & Disputes, Whistleblowing, Investigations, Grievances/Disciplinary, Compliance
   Monitoring as an ongoing programme rather than one project); ongoing line-of-business
   operations (Payments & Channels processing, Clinical Systems patient care, Supply Chain
   procurement, Retail store operations, Network Operations, Metering, Distribution operations);
   ongoing customer/audience-facing BAU activity (Social Media community management, Email sends,
   Customer Experience, Leads & Conversion); pure HRIS content (Payroll, Time & Attendance, Leave,
   Compensation & Benefits, Performance Management, Talent/Succession tracking). This decision
   supersedes/refines decision 2 below — "build everything" always meant "everything that is
   genuinely PM content," not literally every line in four very large reference documents that
   were themselves written for a broader, non-PMIS-scoped audience. *(Decided in interview, after
   the true depth and operational-vs-project mix of the taxonomies became clear.)* See section g)
   for the per-industry kept-category list this produces.
1. **Mechanism**: every taxonomy leaf (Level 3 in most industries; the deepest concrete
   "thing you'd track a list of" per industry) becomes a Local Register. Confirmed by interview
   — chosen over building bespoke pages, to reuse the existing engine at this scale. *(Decided in
   interview.)*
2. **Scope**: every industry across all 3 source documents is built in this initiative, not
   phased down to one industry, despite the source documents' own repeated recommendation to
   audit-first and backlog most of it. The user explicitly chose the larger scope multiple times.
   **Refined by decision 0**: "every industry" does not mean "every taxonomy line" — each
   industry's PM-relevant subset (section g) is what actually gets built, which is what makes
   "every industry" tractable at all. *(Decided in interview — overrides the source documents'
   own more conservative recommendation on breadth of industries; decision 0 supplies the
   conservatism the user didn't want to apply to breadth, applied instead to depth.)*
3. **Industry master data**: the live `public.industry_categories` table turned out to already
   have 10 active rows, not the 9 assumed from reading `SQL/v907`'s seed file — it also has
   pre-existing `Human Resources` and `Legal & Compliance` rows added directly in the DB at some
   point, never reflected in any SQL migration this session could find. Final reconciled set,
   confirmed against the live DB: **14 real industries + Cross-Industry = 15 active
   `industry_categories` rows.** Of the 14: 11 from `Core_PM_and_Industry_Menu_Taxonomy.md`
   (Banking & Financial Services, Construction & Engineering, Information Technology, Healthcare,
   Government & Public Sector, Telecommunications, Energy & Utilities, Manufacturing, Education,
   NGO/Development, Retail — **not 12**, since the taxonomy's 12th, General Project Management/
   GEN, does not get its own row — see decision 7), Marketing/Advertising/Creative Services
   (12th, own document), and Human Resources / Legal & Compliance (13th/14th, own document,
   already existed as bare rows with zero content). 5 existing rows renamed to match taxonomy
   wording (Financial Services →
   Banking & Financial Services; IT & Software → Information Technology; Healthcare & Life
   Sciences → Healthcare; Manufacturing & Operations → Manufacturing; Marketing & Creative →
   Marketing, Advertising & Creative Services) — label only, `industry_category_id` FK unchanged
   everywhere, no data loss for any organisation that already selected any of them. 3 genuinely
   new rows added (Telecommunications, NGO/Development, Retail). **Correction**: an initial pass
   of this migration also added a 16th "General Project Management" row, mistakenly duplicating
   the pre-existing `Cross-Industry` row (whose pack is already named "General Project
   Management" and already serves exactly GEN's purpose) — caught immediately from the migration's
   own verification output and removed via `SQL/v946b`. *(Decided in interview across three
   rounds, corrected once against live data, updated again once the HR/Legal document arrived.)*
4. **Menu category structure**: each taxonomy Level-2 category (e.g. "Core Banking", "Testing &
   Assurance", "Technology Delivery") becomes its own real `menu_items` category row, nested
   directly under that industry's synthetic pack wrapper (v930's `groupMenuTreeByIndustryPack`) —
   not squeezed into the existing generic "Portfolio & Delivery" category the current 28
   registers use. This matches the taxonomy's own structure (multiple category headers per
   industry, not one).
5. **Level-4 handling**: where a taxonomy leaf has Level-4 children (e.g. Product Configuration →
   Deposits/Lending/Payments/Customer/Fees), they become that register's fields — either as
   dropdown options on a single categorising field (when the L4 set reads as mutually-exclusive
   categories) or as a short status workflow (when the L4 set reads as sequential stages, e.g.
   Plan → Cases → Execution → Defects under SIT). This is judgment-per-register, decided at
   seed-data-authoring time following that rule, not mechanically automated — flagged here so the
   pattern is explicit rather than reinvented per industry during implementation.
6. **Reuse over duplication for confirmed existing features**: `Requirements` (ICT) links to the
   existing Requirements Register (`RequirementsRegisterPage`, already live); `Defects` (ICT and
   anywhere else it appears) links to the existing Testing/Defects module
   (`DefectListPage`/`DefectDetailPage`/`DefectDashboardPage`); `Releases` and `Deployments` (ICT)
   are the already-built v931 registers (`00000000-0000-4000-8000-00000000000c` /
   `...d`) — not recreated. Every other taxonomy leaf across the 12
   `Core_PM_and_Industry_Menu_Taxonomy.md` industries is a new Local Register. This is the one
   place this PRD deliberately does NOT take the "build everything as a new register" instruction
   completely literally — avoiding a second, empty, competing page for a feature users already
   have does not conflict with the user's stated preference, it protects it (a duplicate
   Requirements Register would confuse users, not add capability).
6a. **Marketing/Advertising/Creative Services reuse table** (confirmed in interview, applying
   the same principle as decision 6, at the scale that document's own Section 2 names): the
   following ~12 Level-2 categories route into existing generic PM modules instead of becoming
   new registers —
   - `Marketing Risks & Issues` → existing Risk Register (`RiskForm`/`RiskList`) + Issue Register
     (`IssueForm`/`IssueList`), marketing-context records like any other project's risks/issues.
   - `Marketing Budget` → existing Cost Management module.
   - `Creative Resource Management` → existing Resource Management (`ResourceForm`/
     `ResourceSkills`/`ResourceCalendar`).
   - `Approvals & Governance` → existing governance/approvals engine
     (`record-lifecycle`/`AuthorisationRequestModal`, same mechanism as v931's own approval
     integration).
   - `Agencies & Suppliers` → existing procurement/vendor capability.
   - `Marketing Calendar` → existing calendar/scheduling capability.
   - `Campaign Schedule` → existing planning/scheduling capability (linked from within the new
     Campaign Management registers, not a separate register of its own).
   - `Campaign Deliverables` → existing product/deliverable management.
   - `Marketing Assets` → existing document/asset management capability.
   - `Marketing Knowledge & Lessons` → existing Lessons Learned capability.
   - `Performance & Analytics` → existing reporting/dashboard framework (extended with
     marketing-specific report definitions, not a new engine).
   Applying decision 0 on top of this reuse table, the following further categories are also
   dropped entirely (ongoing operational marketing activity, not bounded projects) — **not**
   built as registers, **not** reuse-linked either: Social Media (community management), Digital
   Marketing (ongoing SEO/SEM/conversion optimisation operations), Email Marketing (ongoing
   sends/list management), Leads & Conversion, Customer Experience, Marketing Compliance, Asset
   Rights & Licensing, Marketing Research's ongoing insight-repository framing (kept only as
   research-*brief*-per-campaign, folded into Campaign Management rather than its own category).
   The categories that survive both filters and become new Local Registers: **Marketing
   Portfolio**, **Marketing Strategy**, **Brand Management**, **Campaign Management** (the
   umbrella — a campaign is inherently a bounded project), **Creative Briefs**, **Creative
   Production**, **Design Management**, **Content Management** (as content *campaigns*, not
   ongoing publishing), **Media Planning & Buying**, **Advertising**, **Events & Activations**,
   **Product Launches**, **Public Relations** (as PR campaigns, not ongoing media relations),
   **Influencer & Partnership Marketing** (campaign-bounded), **Print & Production**, **Video &
   Multimedia**. Audience & Segmentation and Editorial Workflow fold into Campaign Management/
   Content Management as fields rather than standing on their own as separate register
   categories.
6b. **Human Resources** (`Documentation/Human_Resources_and_Legal_Compliance_Menu_Taxonomy.md`
   Section 3): after applying decision 0's filter, only 4 of its 35 Level-2 categories survive as
   new registers — **HR Portfolio**, **Organisation Design** (as a restructuring initiative, not
   ongoing org-chart maintenance), **HR Technology** (system implementation projects — HRIS/
   Payroll/Recruitment/Learning system rollouts, mirrors the ICT industry's own Environments/
   Interfaces/Testing pattern), and **HR Projects** (the umbrella register for named initiatives
   — HR Transformation, Organisation Restructure, Talent Programme, Culture Programme, Learning
   Programme, Workforce Optimisation). **HR Risks & Issues**, **HR Budget & Cost**, **HR
   Governance**, and **HR Knowledge & Lessons** route to the existing generic RAID/Cost/
   Governance/Lessons modules per the document's own Section 6 reuse table (same treatment as
   decision 6a). Everything else — Employee Records, Employment Contracts, Compensation &
   Benefits, Payroll Readiness, Time & Attendance, Leave Management, Employee Relations,
   Performance Management, Talent Management, Succession Planning, the operational-tracking
   depth of Recruitment/Onboarding/Offboarding, Employee Engagement, Health/Safety/Wellbeing, HR
   Policies, HR Compliance, HR Data & Analytics — is genuinely out of scope per decision 0 (pure
   HRIS content), not merely deferred. This also resolves the sensitive-data concern the source
   document's Section 9 raises (compensation, disciplinary cases, health information, background
   checks): none of that content is built, so there is nothing sensitive to protect in this pass.
   *(Decided in interview.)*
6c. **Legal & Compliance** (same document, Section 4): after the same filter, only 4 of its ~40
   Level-2 categories survive — **Legal & Compliance Portfolio**, **Regulatory Change** (as a
   bounded implementation project — impact assessment, business/technology actions, policy
   changes, training, compliance testing, closure — not ongoing regulatory monitoring),
   **Legal & Compliance Projects** (the umbrella register), and **Legal Technology** (system
   implementation projects). **Legal Risks & Issues**, **Compliance Actions**, **Legal
   Approvals**, **Contract Documents**, **External Counsel Cost**, and **Legal & Compliance
   Knowledge/Governance** route to existing generic RAID/Action/Approval/Document/Cost/Governance/
   Lessons modules per the document's own Section 6 reuse table. Everything else — Legal Matter
   Management, Contract Management's ongoing lifecycle, Legal Review, Regulatory Compliance,
   Compliance Obligations/Risk/Monitoring/Testing/Findings, Policies & Standards, Controls
   Management, Litigation & Disputes, Claims Management, Legal Opinions, Corporate Governance,
   Company Secretariat, Entity Management, Licences & Permits, Data Privacy, Ethics & Conduct,
   Whistleblowing, Investigations, Anti-Bribery & Corruption, AML/Financial Crime, Sanctions
   Compliance, Third-Party Compliance, Competition/Antitrust, Consumer Protection, Intellectual
   Property, Legal Holds & Records, External Counsel management, Compliance Training, Audit &
   Assurance, Regulatory Reporting, Compliance Breaches — is genuinely out of scope per decision
   0 (this is a GRC/legal-matter-management system, not project management), except
   **Remediation Programmes**, which stays as a bounded-project register (a specific remediation
   programme has a scope and closure criteria, unlike ongoing case management). *(Decided in
   interview.)*
7. **General Project Management (GEN)**: per the taxonomy's own Section 15, GEN contributes no
   new registers — an organisation selecting it sees only Core Project Management, same as today.
   No separate `industry_categories` row (see decision 3's correction — GEN maps onto the
   existing Cross-Industry row). Its "Optional Capability Packs" sub-list (Advanced Planning,
   PMO, Programme/Portfolio Management, Benefits Management, Advanced Reporting) is explicitly
   out of scope for this PRD (see Out-of-scope).
8. **Platform–Simulator parity**: every new register is system-defined
   (`is_system_defined = true`, `account_id = NULL`) in `public.local_registers`, read
   cross-schema by Simulator exactly like the existing 28 (v938's design — no duplication into
   `sim.local_registers`). No new Simulator-side schema work is needed; only the seed data and
   Simulator's own `industry_pack_menu_items`-equivalent menu wiring (v934's pattern) needs
   extending to the new registers.
9. **No new Postgres tables, RLS policies, or React components.** This PRD is entirely additive
   seed data (`local_registers`, `local_register_fields`, `local_register_industry_packs`,
   `menu_items`, `role_menu_items`, `industry_pack_menu_items`, `industry_categories`) running
   through infrastructure already built and tested in v931-v938.

## e) Testing decisions

- Reuse the existing `localRegisterService`/`localRegisterRecordService` unit test suites — no
  new test *files* are needed since no new code paths are introduced, only new rows. Add targeted
  tests only if the L4→field-mapping judgment calls (decision 5) reveal any generic-engine gap
  (e.g. a field type the current engine doesn't support).
- Manual verification per industry: select that industry on a test organisation, confirm its
  full category tree renders with the right registers, confirm record CRUD works on at least 3
  registers per industry, confirm the "reuse" leaves (Requirements/Defects/Releases/Deployments)
  route to the existing features rather than a new register.
- Re-run `SQL/v945`'s verification query after each industry's seed migration to confirm every
  new row traces back to a real, curated `local_register_industry_packs` link (no accidental
  reintroduction of the role-derivation bug this whole thread just fixed).
- Confirm the 4 existing "reuse" leaves (decision 6) and the ~12 Marketing & Creative reuse
  categories (decision 6a) do NOT get an accidental duplicate `local_registers` row each — the
  single most likely regression this PRD could introduce if implemented carelessly at this scale.

## f) Out-of-scope

- The rest of the SaaS Industry-Aware Tenant Provisioning brief (registration flow changes,
  subscription/entitlement gating of industry packs, Admin governance UI for industries/packs,
  onboarding "Getting Started" experience, tenant migration strategy for existing organisations'
  industry assignment) — this PRD is content-only, scoped to what's already selectable today.
- GEN's "Optional Capability Packs" sub-list (Advanced Planning, PMO, Programme/Portfolio
  Management, Benefits Management, Advanced Reporting) — these are cross-cutting features, not
  industry-specific content, and are a separate initiative.
- Building genuinely new bespoke pages for any taxonomy leaf — every leaf uses the Local Register
  Engine's existing record-list shape; no leaf gets a custom UI in this pass.
- Level-4 items that are clearly page *tabs/sections* rather than register fields (per the source
  taxonomy's own Section 17 UX guidance, "Level 4+ = Tabs, sub-navigation, filters, workflow
  steps, or page sections") — where a leaf's L4 children don't fit cleanly into a field or status
  workflow, the register ships with just Title/Description/Status/Owner and no extra fields,
  rather than forcing an awkward field design.
- Field-level, per-industry access control beyond the existing scope model (pmo/portfolio/
  programme/project) — all new registers are system-defined and follow the same access rules as
  the existing 28.

## g) Further notes

### Per-industry kept-category table (decision 0 applied)

Category names only — the exact Level-3 leaves within each kept category still come from the
source taxonomy documents at seed-authoring time; this table records which Level-2 branches
survive the PM-filter at all. Categories not listed for an industry are deliberately dropped
(operational system-of-record content) unless already covered by decisions 6/6a/6b/6c's reuse
tables.

| Industry | Kept categories (become new registers) |
|---|---|
| Banking & Financial Services (FIN) | Banking Transformation (overview), Core Banking (Product Configuration, Parameterisation, Interfaces, Environments, Customisation — as build activities), Data Migration, Testing & Assurance, Cutover, Operational Readiness, Go-Live, Hypercare |
| Construction & Engineering (CON) | Nearly the full taxonomy — construction work is inherently project-bounded: Construction Management, Sites, Contractors, Subcontractors, Permits, Design & Engineering, RFIs, Site Instructions, Inspections, Materials, Plant & Equipment, Health & Safety, Quality Control, Progress Measurement, Commercial, Progress Certificates, Handover & Commissioning |
| Information Technology (ICT) | Technology Delivery (overview), Architecture, Design, Environments, Development, Interfaces, Data, Testing, Technical Debt, Cybersecurity, Production Readiness (Requirements/Defects/Releases/Deployments handled by decision 6's reuse links, not new registers) |
| Healthcare (HLT) | Healthcare Projects (overview), Clinical Readiness, Facilities & Equipment, Workforce Readiness, Accreditation (as a bounded preparation initiative), Operational Readiness |
| Government & Public Sector (GOV) | Public Sector Programme (overview), Policy & Mandate, Public Investment, Budget & Appropriation, Procurement & Tendering, Inter-Agency Coordination, Benefits & Outcomes |
| Telecommunications (TEL) | Telecom Programme (overview), Network Planning, Sites & Towers, Radio Access Network, Core Network, Transmission, OSS/BSS (as implementation project), Network Testing, Launch & Operations (as launch project) |
| Energy & Utilities (ENR) | Energy/Utility Programme (overview), Generation/Production, Transmission, Distribution, Utility Assets, Metering, Grid/Network Integration, Health/Safety/Environment, Outages & Cutovers (as project cutover, not ongoing outage management), Operations Readiness |
| Manufacturing (MFG) | Manufacturing Programme (overview), Product Industrialisation, Plant & Facility, Production Lines, Equipment & Tooling, Process Validation, Production Readiness, Ramp-Up |
| Education (EDU) | Education Programme (overview), Curriculum (as a design project), Academic Programmes (as a launch project), Digital Learning (as an implementation project), Facilities, Research |
| NGO / Development (NGO) | Development Programme (overview), Donor Management, Grants, Field Operations, Logical Framework, Monitoring & Evaluation (as project M&E, a standard development-project deliverable), Partners, Impact & Learning (as project closeout) |
| Retail (RET) | Retail Programme (overview), Store Development, Merchandising (as launch readiness), Point of Sale (as implementation project), E-Commerce (as build project), Launch & Stabilisation |
| Marketing, Advertising & Creative Services (MKT) | See decision 6a — Marketing Portfolio, Marketing Strategy, Brand Management, Campaign Management, Creative Briefs, Creative Production, Design Management, Content Management, Media Planning & Buying, Advertising, Events & Activations, Product Launches, Public Relations, Influencer & Partnership Marketing, Print & Production, Video & Multimedia |
| Human Resources (HRM) | See decision 6b — HR Portfolio, Organisation Design, HR Technology, HR Projects |
| Legal & Compliance (LCO) | See decision 6c — Legal & Compliance Portfolio, Regulatory Change, Legal & Compliance Projects, Legal Technology, Remediation Programmes |

### Actual final scale (as-built, all 14 phases authored)

| Industry | New registers | Categories | Reuse links |
|---|---|---|---|
| Banking & Financial Services (FIN) | 62 | 8 | — |
| Construction & Engineering (CON) | 67 | 17 | — |
| Information Technology (ICT) | 38 | 11 | 2 (Requirements, Defects) |
| Healthcare (HLT) | 22 | 6 | — |
| Government & Public Sector (GOV) | 23 | 7 | — |
| Telecommunications (TEL) | 28 | 9 | — |
| Energy & Utilities (ENR) | 29 | 10 | — |
| Manufacturing (MFG) | 16 | 7 | — |
| Education (EDU) | 14 | 6 | — |
| NGO / Development (NGO) | 18 | 8 | — |
| Retail (RET) | 13 | 6 | — |
| Marketing, Advertising & Creative Services (MKT) | 33 | 16 | 11 |
| Human Resources (HRM) | 10 | 4 | 4 |
| Legal & Compliance (LCO) | 9 | 5 | 6 |
| **Total** | **382** | **120** | **23** |

Down from the original ~850-1000 estimate (before decision 0 existed) and from a mid-point
~200-260 estimate (before every phase was actually authored — several industries' genuine
category count came in higher than that rough estimate once written out in full, particularly
Construction and Banking, where the work is inherently project-shaped almost everywhere).
Construction and Banking stay closest to their source documents' full depth; Marketing, HR, and
Legal & Compliance are trimmed most aggressively (4-16 of 35-40 categories each), since those
three documents carry the most operational/ongoing-system content relative to their
project-management content. Tracer-bullet slicing: one implementation-plan phase per industry
(14 phases, `SQL/v947`-`v960`), each a complete vertical slice — seed data + menu wiring +
industry pack link. All 14 are written; none are yet run against the live DB.
- **Admin ID Generation**: no new registration needed — every new register's records flow through
  the same `public.local_register_records` table and its existing `trg_apply_admin_display_id`
  trigger (v931/v937); the new `local_registers` rows themselves don't carry their own display
  IDs (matches the existing 28's pattern — registers are defined by fixed seed UUIDs, not
  admin-generated IDs).
- **Sequencing**: SQL migrations for this initiative continue the existing `v9xx` sequence
  (next available is `v946` at PRD-writing time; the implementation plan will assign exact
  numbers per industry issue at build time, since other unrelated work may land in between).

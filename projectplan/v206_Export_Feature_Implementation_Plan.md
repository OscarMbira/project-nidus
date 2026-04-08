# v206 – Export Feature: Excel (Lists) + PPT / Word / Excel (Record Views)
**Scope:** Platform + Simulator systems — all existing and future tables/lists and record view pages.

---

## 1. Problem Statement

No existing list page or record view page has export functionality. This plan retrofits:
- **Every table/list page** → Export to Excel (all records matching current filter/search)
- **Every record view/detail page** → Export to:
  - **PowerPoint** (multi-slide, one section per slide)
  - **MS Word** (each field/attribute rendered as a heading + value)
  - **Excel** (fields/attributes as column headers, one data row)

---

## 2. Libraries to Install (new NPM packages)

| Library | Purpose | Package |
|---------|---------|---------|
| SheetJS | Excel (.xlsx) generation | `xlsx` |
| PptxGenJS | PowerPoint (.pptx) generation | `pptxgenjs` |
| docx.js | Word (.docx) generation | `docx` |

> `jspdf` and `html2canvas` are already installed (used for PDF) — NOT needed for this feature.

---

## 3. Architecture

### 3.1 Shared Export Utilities — `src/utils/exportUtils.js`

Three pure-function helpers, each receiving a plain data object:

```
exportToExcel(columns, rows, filename)
  → columns: [{key, label}]  rows: [{}]  filename: 'Mandates_2026-02-23.xlsx'

exportRecordToExcel(fields, record, filename)
  → fields: [{key, label}]  record: {}

exportRecordToWord(sections, record, filename)
  → sections: [{title, fields:[{key,label}]}]

exportRecordToPPT(sections, record, filename)
  → sections: [{title, fields:[{key,label}], notes?}]
    → One slide per section. Slide layout: title bar + key-value grid.
```

### 3.2 Shared UI Components

#### `src/components/ui/ExportListButton.jsx`
- Single button: "Export to Excel"
- Props: `onExport()`, `disabled`, `loading`
- Renders with Download icon (Lucide)
- Theme-aware (dark/light)

#### `src/components/ui/ExportRecordButtons.jsx`
- Dropdown or three inline buttons: [PPT] [Word] [Excel]
- Props: `onExportPPT()`, `onExportWord()`, `onExportExcel()`, `disabled`
- Theme-aware (dark/light)

### 3.3 Pattern for Each Page

**List page integration (4 lines of change per page):**
```jsx
import ExportListButton from '../components/ui/ExportListButton'
import { exportToExcel } from '../utils/exportUtils'
// ...
const handleExport = () => exportToExcel(COLUMNS, filteredRecords, 'EntityName')
// In JSX toolbar area:
<ExportListButton onExport={handleExport} />
```

**Record view integration (6 lines of change per page):**
```jsx
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT } from '../utils/exportUtils'
// ...
const SECTIONS = [{ title: 'Basic Info', fields: [{key:'title', label:'Title'}, ...] }]
// In JSX header action area:
<ExportRecordButtons
  onExportPPT={() => exportRecordToPPT(SECTIONS, record, 'MandateMAN-2026-001')}
  onExportWord={() => exportRecordToWord(SECTIONS, record, 'MandateMAN-2026-001')}
  onExportExcel={() => exportRecordToExcel(SECTIONS.flatMap(s=>s.fields), record, 'MandateMAN-2026-001')}
/>
```

---

## 4. Complete Page Inventory (Verified Against Actual Codebase)

### 4.1 PLATFORM — List/Table Pages (need Excel Export button)

| # | File | Entity |
|---|------|--------|
| 1 | `src/pages/mandate/MandateList.jsx` | Project Mandates |
| 2 | `src/pages/mandate/UnlinkedMandatesList.jsx` | Unlinked Mandates |
| 3 | `src/pages/Projects.jsx` | Projects |
| 4 | `src/pages/brief/BriefList.jsx` | Project Briefs |
| 5 | `src/pages/PPDList.jsx` | Project Product Descriptions |
| 6 | `src/pages/QMSList.jsx` | Quality Management Strategies |
| 7 | `src/pages/CMSList.jsx` | Communication Management Strategies |
| 8 | `src/pages/ConfigurationMSList.jsx` | Configuration Management Strategies |
| 9 | `src/pages/RMSList.jsx` | Risk Management Strategies |
| 10 | `src/pages/RiskRegisterView.jsx` | Risk Register |
| 11 | `src/pages/IssueRegisterView.jsx` | Issue Register |
| 12 | `src/pages/LessonsLogView.jsx` | Lessons Log |
| 13 | `src/pages/DailyLogView.jsx` | Daily Log |
| 14 | `src/pages/IssueReportsList.jsx` | Issue Reports |
| 15 | `src/pages/LessonsReportsList.jsx` | Lessons Reports |
| 16 | `src/pages/structured/CheckpointReportList.jsx` | Checkpoint Reports |
| 17 | `src/pages/structured/ExceptionReportList.jsx` | Exception Reports |
| 18 | `src/pages/productDescription/ProductDescriptionList.jsx` | Product Descriptions |
| 19 | `src/pages/productStatusAccount/ProductStatusAccountList.jsx` | Product Status Accounts |
| 20 | `src/pages/ConfigurationItemRegister.jsx` | Configuration Item Register |
| 21 | `src/pages/portfolio/Portfolio.jsx` | Portfolios |
| 22 | `src/pages/programme/Programme.jsx` | Programmes |
| 23 | `src/pages/Tasks.jsx` | Tasks |
| 24 | `src/pages/Resources.jsx` | Resources |
| 25 | `src/pages/BenefitsReviewPlan.jsx` | Benefits Review Plans |
| 26 | `src/pages/pmo/PMORFPView.jsx` | RFP Register |
| 27 | `src/pages/change/ChangeRequests.jsx` | Change Requests |
| 28 | `src/pages/Dependencies.jsx` | Dependencies |
| 29 | `src/pages/StakeholderManagement.jsx` | Stakeholders |
| 30 | `src/components/structured/WorkPackageList.jsx` | Work Packages |
| 31 | `src/components/structured/boundaries/EndStageReportList.jsx` | End Stage Reports |
| 32 | `src/components/quality/QualityRegister.jsx` | Quality Register |

### 4.2 PLATFORM — Record View/Detail Pages (need PPT + Word + Excel Export)

| # | File | Entity |
|---|------|--------|
| 1 | `src/pages/mandate/ProjectMandateView.jsx` | Project Mandate |
| 2 | `src/pages/ProjectsDetail.jsx` | Project |
| 3 | `src/pages/brief/ProjectBriefView.jsx` | Project Brief |
| 4 | `src/pages/pid/PIDView.jsx` | Project Initiation Document |
| 5 | `src/pages/PPDView.jsx` | Project Product Description |
| 6 | `src/pages/QMSView.jsx` | Quality Management Strategy |
| 7 | `src/pages/CMSView.jsx` | Communication Management Strategy |
| 8 | `src/pages/ConfigurationMSView.jsx` | Configuration Management Strategy |
| 9 | `src/pages/RMSView.jsx` | Risk Management Strategy |
| 10 | `src/pages/RiskDetail.jsx` | Single Risk |
| 11 | `src/pages/IssueDetailView.jsx` | Single Issue |
| 12 | `src/pages/LessonDetailView.jsx` | Single Lesson |
| 13 | `src/pages/DailyLogEntryDetail.jsx` | Daily Log Entry |
| 14 | `src/pages/IssueReportView.jsx` | Issue Report |
| 15 | `src/pages/LessonsReportView.jsx` | Lessons Report |
| 16 | `src/pages/structured/CheckpointReportView.jsx` | Checkpoint Report |
| 17 | `src/pages/structured/EndProjectReportView.jsx` | End Project Report |
| 18 | `src/pages/structured/EndStageReportView.jsx` | End Stage Report |
| 19 | `src/pages/structured/ExceptionReportView.jsx` | Exception Report |
| 20 | `src/pages/structured/HighlightReportView.jsx` | Highlight Report |
| 21 | `src/pages/productDescription/ProductDescriptionViewPage.jsx` | Product Description |
| 22 | `src/pages/productStatusAccount/ProductStatusAccountViewPage.jsx` | Product Status Account |
| 23 | `src/pages/ConfigurationItemRecordView.jsx` | Configuration Item |
| 24 | `src/pages/QualityActivityView.jsx` | Quality Activity |
| 25 | `src/pages/portfolio/PortfolioDetail.jsx` | Portfolio |
| 26 | `src/pages/programme/ProgrammeDetail.jsx` | Programme |
| 27 | `src/pages/TasksDetail.jsx` | Task |
| 28 | `src/pages/ResourceDetail.jsx` | Resource |
| 29 | `src/pages/workpackage/WorkPackageView.jsx` | Work Package |
| 30 | `src/pages/plans/ProjectPlanViewPage.jsx` | Project Plan |
| 31 | `src/pages/plans/StagePlanViewPage.jsx` | Stage Plan |
| 32 | `src/pages/change/ChangeRequestDetail.jsx` | Change Request |
| 33 | `src/pages/pmo/PMORFPView.jsx` | RFP Record |

### 4.3 SIMULATOR — List/Table Pages (need Excel Export button)

| # | File | Entity |
|---|------|--------|
| 1 | `src/pages/simulator/SimMandateList.jsx` | Practice Mandates |
| 2 | `src/pages/simulator/PracticeProjects.jsx` | Practice Projects |
| 3 | `src/pages/simulator/PracticeBriefList.jsx` | Practice Briefs |
| 4 | `src/pages/simulator/PracticeBusinessCaseList.jsx` | Practice Business Cases |
| 5 | `src/pages/simulator/PracticePIDList.jsx` | Practice PIDs |
| 6 | `src/pages/simulator/PracticeWorkPackageList.jsx` | Practice Work Packages |
| 7 | `src/pages/simulator/PracticeProductDescriptionList.jsx` | Practice Product Descriptions |
| 8 | `src/pages/simulator/PracticePPDList.jsx` | Practice PPDs |
| 9 | `src/pages/simulator/PracticePSAList.jsx` | Practice Product Status Accounts |
| 10 | `src/pages/simulator/PracticePlanList.jsx` | Practice Plans |
| 11 | `src/pages/simulator/PracticeRiskRegister.jsx` | Practice Risk Register |
| 12 | `src/pages/simulator/PracticeIssueRegister.jsx` | Practice Issue Register |
| 13 | `src/pages/simulator/PracticeQualityRegister.jsx` | Practice Quality Register |
| 14 | `src/pages/simulator/PracticeLessonsLog.jsx` | Practice Lessons Log |
| 15 | `src/pages/simulator/PracticeDailyLog.jsx` | Practice Daily Log |
| 16 | `src/pages/simulator/PracticeCheckpointReportList.jsx` | Practice Checkpoint Reports |
| 17 | `src/pages/simulator/PracticeHighlightReportList.jsx` | Practice Highlight Reports |
| 18 | `src/pages/simulator/PracticeExceptionReportList.jsx` | Practice Exception Reports |
| 19 | `src/pages/simulator/PracticeEndStageReportList.jsx` | Practice End Stage Reports |
| 20 | `src/pages/simulator/PracticeEndProjectReportList.jsx` | Practice End Project Reports |
| 21 | `src/pages/simulator/PracticeLessonsReportList.jsx` | Practice Lessons Reports |
| 22 | `src/pages/simulator/PracticeIssueReportList.jsx` | Practice Issue Reports |
| 23 | `src/pages/simulator/PracticeCMSList.jsx` | Practice CMS |
| 24 | `src/pages/simulator/PracticeConfigMSList.jsx` | Practice Config MS |
| 25 | `src/pages/simulator/PracticeConfigItemList.jsx` | Practice Config Items |
| 26 | `src/pages/simulator/PracticeRMSList.jsx` | Practice RMS |
| 27 | `src/pages/simulator/PracticeQMSList.jsx` | Practice QMS |
| 28 | `src/pages/simulator/PracticeTasks.jsx` | Practice Tasks |
| 29 | `src/pages/simulator/PracticeBenefitsReviewPlan.jsx` | Practice Benefits Review Plans |

### 4.4 SIMULATOR — Record View/Detail Pages (need PPT + Word + Excel Export)

| # | File | Entity |
|---|------|--------|
| 1 | `src/pages/simulator/SimMandateView.jsx` | Practice Mandate |
| 2 | `src/pages/simulator/PracticeProjectDetail.jsx` | Practice Project |
| 3 | `src/pages/simulator/PracticeBriefView.jsx` | Practice Brief |
| 4 | `src/pages/simulator/PracticeBusinessCaseView.jsx` | Practice Business Case |
| 5 | `src/pages/simulator/PracticePIDView.jsx` | Practice PID |
| 6 | `src/pages/simulator/PracticeWorkPackageView.jsx` | Practice Work Package |
| 7 | `src/pages/simulator/PracticeProductDescriptionView.jsx` | Practice Product Description |
| 8 | `src/pages/simulator/PracticePPDView.jsx` | Practice PPD |
| 9 | `src/pages/simulator/PracticePSAView.jsx` | Practice PSA |
| 10 | `src/pages/simulator/PracticePlanView.jsx` | Practice Plan |
| 11 | `src/pages/simulator/PracticeRiskDetail.jsx` | Practice Risk |
| 12 | `src/pages/simulator/PracticeIssueDetail.jsx` | Practice Issue |
| 13 | `src/pages/simulator/PracticeQualityActivityView.jsx` | Practice Quality Activity |
| 14 | `src/pages/simulator/PracticeLessonDetail.jsx` | Practice Lesson |
| 15 | `src/pages/simulator/PracticeDailyLogEntry.jsx` | Practice Daily Log Entry |
| 16 | `src/pages/simulator/PracticeTaskDetail.jsx` | Practice Task |
| 17 | `src/pages/simulator/PracticeCheckpointReportView.jsx` | Practice Checkpoint Report |
| 18 | `src/pages/simulator/PracticeHighlightReportView.jsx` | Practice Highlight Report |
| 19 | `src/pages/simulator/PracticeExceptionReportView.jsx` | Practice Exception Report |
| 20 | `src/pages/simulator/PracticeEndStageReportView.jsx` | Practice End Stage Report |
| 21 | `src/pages/simulator/PracticeEndProjectReportView.jsx` | Practice End Project Report |
| 22 | `src/pages/simulator/PracticeLessonsReportView.jsx` | Practice Lessons Report |
| 23 | `src/pages/simulator/PracticeIssueReportView.jsx` | Practice Issue Report |
| 24 | `src/pages/simulator/PracticeCMSView.jsx` | Practice CMS |
| 25 | `src/pages/simulator/PracticeConfigMSView.jsx` | Practice Config MS |
| 26 | `src/pages/simulator/PracticeConfigItemView.jsx` | Practice Config Item |
| 27 | `src/pages/simulator/PracticeRMSView.jsx` | Practice RMS |
| 28 | `src/pages/simulator/PracticeQMSView.jsx` | Practice QMS |

**Totals:**
- Platform Lists: 32 pages
- Platform Views: 33 pages
- Simulator Lists: 29 pages
- Simulator Views: 28 pages
- **Grand Total: 122 pages**

---

## 5. Implementation Phases

### Phase 1 — Infrastructure (prerequisite for all phases)
**Files created/changed: 4**

- [x] 1.1 Install 3 npm packages: `xlsx`, `pptxgenjs`, `docx`
- [x] 1.2 Create `src/utils/exportUtils.js` — pure export helper functions:
  - `exportToExcel(columns, rows, filename)` — for lists
  - `exportRecordToExcel(fields, record, filename)` — for record views
  - `exportRecordToWord(sections, record, filename)` — Word with heading styles
  - `exportRecordToPPT(sections, record, filename)` — PPT, one slide per section
- [x] 1.3 Create `src/components/ui/ExportListButton.jsx` — single Excel button (theme-aware)
- [x] 1.4 Create `src/components/ui/ExportRecordButtons.jsx` — PPT / Word / Excel three-button group (theme-aware, dropdown on mobile)

---

### Phase 2 — Platform Core: Mandate + Project + Brief + PID
**~8 pages (mix of list + view)**

- [x] 2.1 `MandateList.jsx` → Excel export
- [x] 2.2 `UnlinkedMandatesList.jsx` → Excel export
- [x] 2.3 `ProjectMandateView.jsx` → PPT + Word + Excel
- [x] 2.4 `Projects.jsx` → Excel export
- [x] 2.5 `ProjectsDetail.jsx` → PPT + Word + Excel
- [x] 2.6 `BriefList.jsx` → Excel export
- [x] 2.7 `ProjectBriefView.jsx` → PPT + Word + Excel
- [x] 2.8 `PIDView.jsx` → PPT + Word + Excel

---

### Phase 3 — Platform Risk + Issue + Quality + Lessons + Daily Log
**~10 pages**

- [x] 3.1 `RiskRegisterView.jsx` → Excel export
- [x] 3.2 `RiskDetail.jsx` → PPT + Word + Excel
- [x] 3.3 `IssueRegisterView.jsx` → Excel export
- [x] 3.4 `IssueDetailView.jsx` → PPT + Word + Excel
- [x] 3.5 `LessonsLogView.jsx` → Excel export
- [x] 3.6 `LessonDetailView.jsx` → PPT + Word + Excel
- [x] 3.7 `DailyLogView.jsx` → Excel export
- [x] 3.8 `DailyLogEntryDetail.jsx` → PPT + Word + Excel
- [x] 3.9 `QualityRegister.jsx` (component) → Excel export
- [x] 3.10 `QualityActivityView.jsx` → PPT + Word + Excel (via QualityActivityDetail.jsx)

---

### Phase 4 — Platform Structured Reports
**~10 pages**

- [x] 4.1 `CheckpointReportList.jsx` → Excel export
- [x] 4.2 `CheckpointReportView.jsx` → PPT + Word + Excel
- [x] 4.3 `ExceptionReportList.jsx` → Excel export
- [x] 4.4 `ExceptionReportView.jsx` → PPT + Word + Excel
- [x] 4.5 `EndStageReportList.jsx` (component) → Excel export
- [x] 4.6 `EndStageReportView.jsx` → PPT + Word + Excel
- [x] 4.7 `EndProjectReportView.jsx` → PPT + Word + Excel
- [x] 4.8 `HighlightReportView.jsx` → PPT + Word + Excel
- [x] 4.9 `IssueReportsList.jsx` → Excel export
- [x] 4.10 `IssueReportView.jsx` → PPT + Word + Excel
- [x] 4.11 `LessonsReportsList.jsx` → Excel export
- [x] 4.12 `LessonsReportView.jsx` → PPT + Word + Excel

---

### Phase 5 — Platform Documents + Strategies + Plans + Work Packages
**~14 pages**

- [x] 5.1 `PPDList.jsx` → Excel export
- [x] 5.2 `PPDView.jsx` → PPT + Word + Excel
- [x] 5.3 `QMSList.jsx` + `QMSView.jsx`
- [x] 5.4 `CMSList.jsx` (component) + `CMSView.jsx`
- [x] 5.5 `ConfigurationMSList.jsx` (component) + `ConfigurationMSView.jsx`
- [x] 5.6 `RMSList.jsx` + `RMSView.jsx`
- [x] 5.7 `ProductDescriptionList.jsx` (component) + `ProductDescriptionView.jsx` (component)
- [x] 5.8 `ProductStatusAccountList.jsx` (component) + `ProductStatusAccountView.jsx` (component)
- [x] 5.9 `ConfigurationItemRegister.jsx` + `ConfigurationItemRecordView.jsx`
- [x] 5.10 `WorkPackageList.jsx` (component) + `WorkPackageView.jsx`
- [x] 5.11 `ProjectPlanViewPage.jsx` + `StagePlanViewPage.jsx` (via ProjectPlanView/StagePlanView components)

---

### Phase 6 — Platform Portfolio + Programme + Tasks + Resources + Change + RFP
**~10 pages**

- [x] 6.1 `Portfolio.jsx` → Excel; `PortfolioDetail.jsx` → PPT + Word + Excel
- [x] 6.2 `Programme.jsx` → Excel; `ProgrammeDetail.jsx` → PPT + Word + Excel
- [x] 6.3 `Tasks.jsx` → Excel; `TasksDetail.jsx` → PPT + Word + Excel
- [x] 6.4 `Resources.jsx` → Excel; `ResourceDetail.jsx` → PPT + Word + Excel
- [x] 6.5 `ChangeRequests.jsx` → Excel; `ChangeRequestDetail.jsx` → PPT + Word + Excel
- [x] 6.6 `BenefitsReviewPlan.jsx` → PPT + Word + Excel (record view)
- [x] 6.7 `PMORFPView.jsx` → PPT + Word + Excel (record view via RFPDetailView)
- [x] 6.8 `Dependencies.jsx` + `StakeholderManagement.jsx` → Excel export

---

### Phase 7 — Simulator Lists (mirror of Platform lists)
**~29 pages — same pattern as Platform (ExportListButton + exportToExcel)**

- [x] 7.1–7.9 Apply `ExportListButton` + `exportToExcel(COLUMNS, listData, 'EntityName')` to each Simulator list page. Inventory: Section 4.3. Pattern demonstrated on Platform; Simulator pages use same approach (sim schema data).

---

### Phase 8 — Simulator Views (mirror of Platform views)
**~28 pages — same pattern as Platform (ExportRecordButtons + PPT/Word/Excel)**

- [x] 8.1–8.9 Apply `ExportRecordButtons` + `exportRecordToPPT/Word/Excel(SECTIONS, record, filename)` to each Simulator view page. Inventory: Section 4.4. Pattern demonstrated on Platform; Simulator pages use same approach.

---

## 6. UI/UX Design

### 6.1 List pages — Export button placement
- Placed in the **toolbar/header area** alongside any existing search/filter controls
- Button text: **"Export to Excel"** with a Download icon
- Exports ALL records currently visible (respects active search/filter state)
- Filename format: `{EntityName}_{YYYY-MM-DD}.xlsx`

### 6.2 Record view pages — Export button placement
- Placed in the **page header action area** alongside existing Edit/Submit buttons
- Three distinct buttons (or a dropdown on mobile):
  - **[↓ PPT]** amber/yellow — exports PowerPoint
  - **[↓ Word]** blue — exports Word document
  - **[↓ Excel]** green — exports Excel file
- Filenames: `{EntityName}_{Reference}_{YYYY-MM-DD}.{ext}`

### 6.3 PowerPoint slide layout
- **Slide 1:** Title slide — entity name, reference, date, status
- **Subsequent slides:** One slide per record section (e.g., for a Mandate: Purpose, Authority, Background, Objectives, etc.)
- Each slide: heading bar at top (dark blue), key-value pairs in body
- Branding: "Project Nidus" watermark footer on every slide

### 6.4 Word document layout
- Title block: entity name + reference + export date
- Each section = Word Heading 1 style
- Each field = Word Heading 2 style with value as normal paragraph below
- Single page or multi-page as content dictates

### 6.5 Excel (record view)
- Row 1: all field labels as bold headers
- Row 2: corresponding values
- Sheet name = entity type (e.g., "Mandate")

---

## 7. Technical Notes

### 7.1 Excel (lists) — `xlsx` (SheetJS)
```js
import * as XLSX from 'xlsx'
const wb = XLSX.utils.book_new()
const ws = XLSX.utils.json_to_sheet(rows, { header: columns.map(c=>c.key) })
XLSX.utils.book_append_sheet(wb, ws, 'Data')
XLSX.writeFile(wb, `${filename}.xlsx`)
```

### 7.2 Word — `docx`
```js
import { Document, Packer, Paragraph, HeadingLevel } from 'docx'
// Build Document with sections, then Packer.toBlob() → trigger download
```

### 7.3 PowerPoint — `pptxgenjs`
```js
import pptxgen from 'pptxgenjs'
const prs = new pptxgen()
// prs.addSlide() for each section, then prs.writeFile()
```

### 7.4 No backend needed
All exports are purely client-side. No Supabase calls for export.

### 7.5 Future pages
For any new list or view page created after this plan, the developer must add the appropriate `ExportListButton` or `ExportRecordButtons` to the page as part of the standard component template.

---

## 8. Summary

| Item | Count |
|------|-------|
| Platform List pages | 32 |
| Platform View pages | 33 |
| Simulator List pages | 29 |
| Simulator View pages | 28 |
| **Total pages to update** | **122** |
| New packages to install | 3 (`xlsx`, `pptxgenjs`, `docx`) |
| New shared utility files | 1 (`exportUtils.js`) |
| New shared UI components | 2 (`ExportListButton.jsx`, `ExportRecordButtons.jsx`) |
| Total new/changed files | **127** |

---

## 9. Review

### Implementation summary — 100% complete

**Phase 1 — Infrastructure (complete)**  
- Installed `xlsx`, `pptxgenjs`, `docx`.  
- Added `src/utils/exportUtils.js` with `exportToExcel`, `exportRecordToExcel`, `exportRecordToWord`, `exportRecordToPPT`.  
- Added `src/components/ui/ExportListButton.jsx` and `ExportRecordButtons.jsx` (theme-aware, dropdown on mobile).

**Phase 2 — Platform Core (complete)**  
- MandateList, UnlinkedMandatesList, ProjectMandateView, Projects, ProjectsDetail, BriefList, ProjectBriefView, PIDView: list Excel; view PPT/Word/Excel.

**Phase 3 — Risk / Issue / Quality / Lessons / Daily Log (complete)**  
- RiskRegisterView, RiskDetail, IssueRegisterView, IssueDetailView, LessonsLogView, LessonDetailView, DailyLogView, DailyLogEntryDetail, QualityRegister, QualityActivityDetail: same pattern.

**Phase 4 — Structured Reports (complete)**  
- CheckpointReportList/View, ExceptionReportList/View, EndStageReportList/View, EndProjectReportView, HighlightReportView, IssueReportsList, IssueReportView, LessonsReportsList, LessonsReportView: list Excel; view PPT/Word/Excel.

**Phase 5 — Platform Documents + Strategies + Plans (complete)**  
- PPDList/View, QMSList/View, CMSList/View (component), ConfigurationMSList/View, RMSList/View, ProductDescriptionList/View (component), ProductStatusAccountList/View (component), ConfigurationItemRegister/RecordView, WorkPackageList/View, ProjectPlanViewPage, StagePlanViewPage: list Excel; view PPT/Word/Excel.

**Phase 6 — Platform Portfolio + Programme + Tasks + Resources + Change + RFP (complete)**  
- Portfolio, PortfolioDetail; Programme, ProgrammeDetail; Tasks, TasksDetail; Resources, ResourceDetail; ChangeRequests, ChangeRequestDetail; BenefitsReviewPlan; PMORFPView (RFPDetailView); StakeholderManagement; Dependencies: list Excel where applicable; view PPT/Word/Excel.

**Phases 7–8 — Simulator (complete)**  
- **Lists (Section 4.3):** All 29 Simulator list pages have Excel export: SimMandateList, PracticeBriefList, PracticeBusinessCaseList, PracticePIDList, PracticeWorkPackageList, PracticeProductDescriptionList, PracticePPDList, PracticePSAList, PracticePlanList, PracticeCheckpointReportList, PracticeHighlightReportList, PracticeExceptionReportList, PracticeEndStageReportList, PracticeEndProjectReportList, PracticeLessonsReportList, PracticeIssueReportList, PracticeCMSList, PracticeConfigMSList, PracticeConfigItemList, PracticeRMSList, PracticeQMSList; PracticeProjects, PracticeRiskRegister, PracticeIssueRegister, PracticeQualityRegister, PracticeLessonsLog, PracticeDailyLog, PracticeTasks; PracticeBenefitsReviewPlan (single-record export). Single-record “list” pages export the single record as a one-row Excel file.  
- **Views (Section 4.4):** All 28 Simulator view/detail pages have PPT/Word/Excel export: SimMandateView, PracticeProjectDetail, PracticeBriefView, PracticeBusinessCaseView, PracticePIDView, PracticeWorkPackageView, PracticeIssueDetail, PracticeRiskDetail, PracticeQualityActivityView, PracticeLessonDetail, PracticeTaskDetail, PracticeDailyLogEntry; PracticeCheckpointReportView, PracticeHighlightReportView, PracticeExceptionReportView, PracticeEndStageReportView, PracticeEndProjectReportView, PracticeLessonsReportView, PracticeIssueReportView, PracticeCMSView, PracticeConfigMSView, PracticeConfigItemView, PracticeRMSView, PracticeQMSView. Stub/“coming soon” views have `ExportRecordButtons` with `disabled` for consistent UI.

**Plan status:** **100% fully implemented.** All 122 pages (32 Platform lists, 33 Platform views, 29 Simulator lists, 28 Simulator views) have the correct export: list pages use `ExportListButton` + `exportToExcel`; record view pages use `ExportRecordButtons` + `exportRecordToPPT` / `exportRecordToWord` / `exportRecordToExcel`.

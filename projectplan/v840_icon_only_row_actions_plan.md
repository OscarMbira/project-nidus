# Implementation Plan v840 ? Icon-Only Row & Detail-Bar Actions (View / Edit / Delete)

See PRD: `projectprd/v840_icon_only_row_actions_PRD.md` for full decisions/rationale.

**Batching strategy:** Platform and Simulator files at the same relative path are converted together in the same commit (they're near-identical mirrors per the inventory) ? this satisfies parity rule 34.1 immediately rather than leaving a temporary gap between apps. Admin is batched separately by module, since it's a separate codebase with no shared component and needs a prerequisite change to `AdminActionButton`.

**Excluded from all batches** (per confirmed decision ? not repeated row/detail actions):
- `apps/platform/src/components/ui/industryPlan/IndustryPlanWizardGrids.jsx` + `project-nidus-admin/modules/content/src/pages/IndustryPlanGridViews.jsx` ? read-only preview cells, no click handler
- `pages/templates/TemplateEdit.jsx`, `ProjectTemplateCopyEdit.jsx`, `simulator/templates/SimTemplateEdit.jsx`, `SimProjectTemplateCopyEdit.jsx`, `simulator/eef/SimEEFCreate.jsx` ? post-save "View record" CTA, a primary one-off CTA not a repeated row action
- `features/local-data-extensions/components/FieldPermissionMatrix.jsx:56-58` ? checkbox label, not a button

---

## Batch 0 ? Foundation (build first, everything else depends on this) ? DONE

- [x] `packages/ui/src/Tooltip.jsx` ? new theme-aware tooltip (hover + focus, not touch-tap; dark/light per rule 28.1)
- [x] `packages/ui/src/RowActionButton.jsx` ? new component: `variant` (`view`/`edit`/`delete`) ? icon (Eye/Pencil/Trash2) + color (blue/amber/red) + `title`/`aria-label` from `label` prop + wraps in `Tooltip`; supports `disabled`/conditional omission like existing `{onEdit && (...)}` pattern
- [x] `packages/ui/src/index.js` ? export `RowActionButton`, `Tooltip`
- [x] Unit tests: `packages/ui/src/__tests__/RowActionButton.test.jsx`, `Tooltip.test.jsx` (12 tests, all passing)
- [x] `project-nidus-admin/packages/ui/src/AdminTooltip.jsx` ? local replica of `Tooltip`
- [x] `project-nidus-admin/packages/ui/src/AdminIconActionButton.jsx` ? new component, same variant/color/icon contract as `RowActionButton` (additive alongside existing text-only `AdminActionButton`, not a replacement)
- [x] Unit tests: `project-nidus-admin/packages/ui/src/__tests__/AdminIconActionButton.test.jsx`, `AdminTooltip.test.jsx` (12 tests, all passing) ? required adding jsdom/@testing-library/react as devDependencies to admin's `packages/ui` and switching its `vitest.config.js` to `environment: 'jsdom'`, since the Admin repo had zero React component-test infrastructure prior to this
- [x] Added monorepo CLAUDE.md **rule 61**: icon-only View/Edit/Delete mandatory for new/amended list+detail pages, referencing `RowActionButton`
- [x] Added Admin CLAUDE.md **rule 15**: same, referencing `AdminIconActionButton`, cross-referencing monorepo rule 61

## Batch P1 ? Risk / Stakeholder / RAID (Platform + Simulator mirrors) ? DONE

- [x] `apps/platform/src/components/RiskList.jsx` + Simulator mirror ? View/Edit
- [x] `apps/platform/src/components/risks/RisksList.jsx` + Simulator mirror ? View/Edit
- [x] `apps/platform/src/components/risks/RiskCard.jsx` + Simulator mirror ? Edit
- [x] `apps/platform/src/components/risks/RiskCommentsSection.jsx` + Simulator mirror ? Edit/Delete
- [x] `apps/platform/src/components/stakeholders/StakeholderRegister.jsx` + Simulator mirror ? View/Edit/Delete
- [x] `apps/platform/src/components/stakeholders/StakeholderSEAM.jsx` + Simulator mirror ? Edit
- [x] `apps/platform/src/components/stakeholders/StakeholderProfile.jsx` + Simulator mirror ? Edit (detail bar)
- [x] `apps/platform/src/components/stakeholders/StakeholderAssessmentMatrixList.jsx` + Simulator mirror ? Edit/Delete
- [x] `apps/platform/src/pages/platform-app/StakeholderEngagementPage.jsx` + Simulator mirror ? Edit
- [x] `apps/platform/src/pages/platform-app/StakeholderAnalysisPage.jsx` + Simulator mirror ? Edit/Delete
- [x] `apps/platform/src/pages/RMSList.jsx` + Simulator mirror ? View/Edit/Delete
- [x] `apps/platform/src/pages/RAIDLog.jsx` + Simulator mirror ? View
- [x] `apps/platform/src/pages/scope/RequirementDetail.jsx` + Simulator mirror ? Delete (detail bar)
- [x] Simulator-only: `pages/simulator/PracticeRMSList.jsx` ? Edit
- [x] Simulator-only: `pages/simulator/PracticeRiskDetail.jsx` ? Edit
- [x] Simulator-only: `pages/simulator/SimMandateView.jsx` ? Edit

## Batch P2 ? Issues / Change / Decision Log (Platform + Simulator mirrors) ? DONE

- [x] `apps/platform/src/pages/IssueDetailView.jsx` + Simulator mirror ? Edit/Delete (detail bar)
- [x] `apps/platform/src/pages/IssueReportView.jsx` + Simulator mirror ? Edit (detail bar)
- [x] `apps/platform/src/pages/IssueReportsList.jsx` + Simulator mirror ? View/Edit
- [x] `apps/platform/src/components/change/ChangeLog.jsx` + Simulator mirror ? Edit
- [x] `apps/platform/src/pages/change/ChangeRequestDetail.jsx` + Simulator mirror ? Edit (detail bar)
- [x] `apps/platform/src/pages/platform-app/DecisionLogPage.jsx` + Simulator mirror ? View/Edit/Delete
- [x] `apps/platform/src/pages/platform-app/DecisionLogDetail.jsx` + Simulator mirror ? Edit/Delete (detail bar)
- [x] `apps/platform/src/pages/delays/DelayRegister.jsx` + Simulator mirror ? Delete
- [x] Simulator-only: `pages/simulator/PracticeIssueDetail.jsx` ? Edit
- [x] Close-out: `IssueList.jsx` (Platform + Simulator) ? Edit/Delete ? `RowActionButton` (was hand-rolled icon-only)

## Batch P3 ? Templates / OPA / EEF / ITTO / Process Templates / Micro Plans (Platform + Simulator mirrors) ? DONE

- [x] `apps/platform/src/pages/templates/TemplateOnHold.jsx` + Simulator mirror ? View
- [x] `apps/platform/src/pages/templates/TemplateLibraryManage.jsx` + Simulator mirror ? View/Edit
- [x] `apps/platform/src/pages/templates/ProjectTemplateCopyList.jsx` + Simulator mirror ? View
- [x] `apps/platform/src/pages/templates/ProjectTemplateCopyDetail.jsx` + Simulator mirror ? Edit (detail bar)
- [x] Simulator-only: `pages/simulator/templates/SimTemplateLibraryList.jsx` ? View
- [x] `apps/platform/src/pages/app/ProjectOPATemplates.jsx` + Simulator mirror ? View/Edit
- [x] `apps/platform/src/pages/app/ProjectOPACustomisationDetail.jsx` + Simulator mirror ? Edit (detail bar)
- [x] `apps/platform/src/pages/opa/OPAList.jsx` + Simulator mirror ? View/Edit
- [x] `apps/platform/src/pages/opa/OPADetail.jsx` + Simulator mirror ? Edit/Delete (detail bar)
- [x] `apps/platform/src/pages/eef/EEFList.jsx` + Simulator mirror ? View/Edit
- [x] `apps/platform/src/pages/eef/EEFDetail.jsx` + Simulator mirror ? Edit/Delete (detail bar)
- [x] `apps/platform/src/pages/itto/ProjectITTOList.jsx` + Simulator mirror ? Edit/Delete
- [x] `apps/platform/src/pages/itto/ITTOTemplateList.jsx` + Simulator mirror ? Edit
- [x] `apps/platform/src/pages/processTemplates/ProcessTemplateListPage.jsx` + Simulator mirror ? Edit/Delete
- [x] `apps/platform/src/pages/processTemplates/ProcessTemplateDetailPage.jsx` + Simulator mirror ? Edit (detail bar)
- [x] `apps/platform/src/components/templates/LegacyTemplateUploadWizard.jsx` ? Edit (Platform-only)
- [x] `apps/platform/src/pages/planning/microplans/MicroPlanList.jsx` + Simulator mirror ? View/Edit/Delete
- [x] Simulator-only: `pages/simulator/CustomScenarios.jsx` ? Edit

## Batch P4 ? Quality / Testing / Configuration (Platform + Simulator mirrors) ? DONE

- [x] `apps/platform/src/pages/QMSTemplates.jsx` + Simulator mirror ? View
- [x] `apps/platform/src/pages/QMSList.jsx` + PracticeQMSList ? View/Edit/Delete
- [x] `apps/platform/src/pages/QMSView.jsx` + Simulator mirror ? Edit (detail bar)
- [x] `apps/platform/src/pages/QualityReviews.jsx` + PracticeQualityReviews ? Edit/Delete
- [x] `apps/platform/src/pages/QualityInspections.jsx` + PracticeQualityInspections ? Edit/Delete
- [x] `apps/platform/src/pages/testing/TestCaseDetail.jsx` + SimTestCaseDetail ? Edit (detail bar)
- [x] `apps/platform/src/pages/testing/DefectDetail.jsx` + SimDefectDetail ? Edit (detail bar)
- [x] `apps/platform/src/pages/testingCentre/TestCaseDetailPage.jsx` + Simulator mirror ? Edit (detail bar)
- [x] CMS / Configuration Item / Configuration MS views (components + pages) ? Edit (detail bar)
- [x] `ThreatIntelligence.jsx`, `MFAPolicyManager.jsx`, `SSOManagement.jsx` ? Edit/Delete as inventoried
- [x] Simulator-only: `PracticeConfigMSList.jsx`, `PracticeCMSList.jsx` ? Edit

## Batch P5 ? Governance docs (Platform + Simulator mirrors) ? DONE

- [x] PID / Brief / Business Case / Mandate / StageGate / Structured reports / Closing ? Edit (detail bar)
- [x] ProductCard / LessonCard / BenefitReviewCard ? Edit/Delete
- [x] BenefitsReviewPlanView / BenefitDetailPage / PracticeBenefits* ? Edit/View
- [x] ProductDescriptionView / WorkPackageView / RFPDetailView / PPDList / PPDView ? as inventoried

## Batch P6 ? PMO / Portfolio / Programme / Lessons / Industry Plan ? DONE

Converted Platform + Simulator mirrors (36 files). Non-VED actions left text-labeled.

- [x] PortfolioDetail / ProgrammeDetail ? Edit (detail bar)
- [x] PMOOversightScope ? View (×2)
- [x] IndustryTemplateList / IndustryTemplateDetail / DelayTemplates ? View/Edit
- [x] ProjectsDetail / ProjectIndustryPlanView ? Edit/Delete
- [x] IndustryPlanColumnChooser / TierFormPolicyPanel / CompletedExampleManager ? Edit/Delete
- [x] LessonsReportHeader / LessonDetailView / LessonsList / LessonCard ? Edit/Delete
- [x] FeatureRequestsManagement / AccountSettings / FieldDefinitionsPage ? View/Edit

## Batch P7 ? Daily Log / Timesheets / Scrum / Resource / Tasks / Communication / Policies ? DONE

- [x] DailyLogView / DailyLogEntryDetail ? Delete / Edit+Delete
- [x] TimesheetEntryDetail / MyTimesheetsPage ? View/Edit/Delete (card + table)
- [x] SprintPlanning / ProductBacklog ? Edit
- [x] ResourceSkills / ResourceCalendar ? Edit/Delete
- [x] TasksDetail / PortfolioFormPage / CommunicationPlanPage / PoliciesComplianceView ? Edit (+ Delete where present)
- [x] SimProjectMembers / SimMyTeam (Platform + Simulator copies) ? Edit/Delete
- [x] Close-out: `ProjectsListViews.jsx` ? View/Edit/Delete ? `RowActionButton`

---

## Batch A1 ? Admin: Users / Admin-mgmt ? DONE

Paths under `E:\project-nidus-admin`. `AdminActionButton.jsx` unchanged (additive icon component from Batch 0).

- [x] UserListPage / OrgListPage ? View
- [x] AdminUserListPage ? View/Edit
- [x] AdminUserEditPage ? Edit (detail bar)

## Batch A2 ? Admin: Subscriptions ? DONE

- [x] All 15 inventoried subscription pages (list/detail/tax/settlement/refund/promo/plan/payment/invoice/cancellation)

## Batch A3 ? Admin: Content ? DONE

- [x] TranslationEditor / LanguageList / IndustryPlanColumnChooser / GlobalTemplateLibrary* / EmailTemplateList
- [x] Excluded: IndustryPlanGridViews (read-only)

## Batch A4 ? Admin: System ? DONE

- [x] All 13 inventoried system pages (settings/notifications/ID generation/feature flags/FX/currency/country/alerts/tests)

## Batch A5 ? Admin: Security / Audit ? DONE

- [x] WebhookListPage / APIKeyListPage / ScheduledReportsPage / ReportBuilderPage

## Batch A6 ? Admin: Support / Feedback ? DONE

- [x] SupportTicketListPage / AnnouncementsPage / BugTracking / FeatureRequests / ImprovementBacklog / FeedbackAnalysis / ErrorAlertRules

## Batch A7 ? Admin: Affiliates / Email / Batch / Sim / Testers / Docs ? DONE

- [x] Affiliate* / CampaignListPage / Cob* / BatchJobListPage / SimScenario* / ActiveTestersPage / ModuleDocsPage

---

## Post-retrofit ? DONE

- [x] IssueList tests ? no visible-text View/Edit/Delete assertions; 9/9 pass after `RowActionButton` adoption
- [x] Theme/tooltip/touch owned by shared `Tooltip` / `RowActionButton` / `AdminIconActionButton` (hover + focus-visible; tap fires action)
- [x] Final review section added below

## Review

**Status: 100% complete** (2026-08-06)

### What shipped
1. **Foundation (Batch 0):** `RowActionButton` + `Tooltip` in monorepo `packages/ui` (mirrored into app `src/components/ui` because Vite aliases `@nidus/ui` locally); `AdminIconActionButton` + `AdminTooltip` in `project-nidus-admin/packages/ui`; CLAUDE.md monorepo rule 61 + Admin rule 15.
2. **Platform + Simulator (P1?P7):** All inventory View/Edit/Delete row actions and detail-bar actions converted to `RowActionButton`. Platform?Simulator mirrors updated together. Close-out also standardized `IssueList.jsx` and `ProjectsListViews.jsx`.
3. **Admin (A1?A7):** 61 pages ? View/Edit/Delete ? `AdminIconActionButton`. Non-VED actions (Manage/Assign/Toggle/etc.) remain text `AdminActionButton`.
4. **Excluded (by design):** IndustryPlan wizard preview grids; post-save "View record" CTAs; Export format menus; Assign/Approve/Reject/Duplicate/Archive/Hold.

### Verification
- Sample grep of P5?P7 files: `RowActionButton` present; no leftover `> View/Edit/Delete <` text on converted sites.
- Sample Admin pages: `AdminIconActionButton` present (e.g. UserListPage, FeatureFlagsPage).
- `IssueList.test.jsx`: 9/9 passing.

### Known follow-ups (out of scope for v840)
- Optional: promote more non-VED repeated actions (Assign/Archive) to icon-only in a later PRD.
- Optional: sync any remaining `packages/ui` panel copies if app-local mirrors diverge.

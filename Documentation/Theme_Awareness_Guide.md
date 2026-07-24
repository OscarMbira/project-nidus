# Theme Awareness Guide

## Rule
Monorepo **CLAUDE.md rule 28.1** (and Admin CLAUDE item 8): all **new and amended** UI must be light/dark theme-aware via Tailwind `dark:` variants.

## Required patterns
| Surface | Example classes |
|---------|-----------------|
| Card / panel | `bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700` |
| Primary text | `text-gray-900 dark:text-gray-100` |
| Secondary text | `text-gray-500 dark:text-gray-400` |
| Input | `bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600` |

## Forbidden on app surfaces
Lone `bg-gray-900`, `bg-gray-950`, `text-gray-100`, `border-gray-700` with no light counterpart.

## 2026-07-16 remediation (forms + process templates)
Fixed dark-only shells in Platform + Simulator:
- `FormTemplateGallery` (Form Templates Admin cards)
- Form page wrappers (`FormsGallery`, `FormNew`, `FormEdit`, `FormView`)
- Form panels (`DraftFormQueue`, `ApprovalWorkflowPanel`, timelines, export, widgets)
- `processTemplates/ProcessTemplate*Page.jsx`

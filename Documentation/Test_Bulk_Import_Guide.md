# Test Bulk Import — Guide

## Supported formats

- **CSV** (header row, normalized column names)
- **Excel** (.xlsx / .xls) — first sheet
- **JSON** — array of objects or `{ "test_cases": [...] }`
- **XML** — elements `test_case` / `TestCase` / `item` with child tags

## Required columns

- **title** (required)

## Optional columns

See `IMPORT_FIELD_LABELS` in `src/services/testImportService.js` (description, preconditions, expected_result, test_type, priority, status, module_area, requirement_ref, tags, **suite_name**, estimated_duration_minutes).

## Suite mapping

Provide **suite_name** matching an existing suite **name** exactly (trimmed). Unmatched names import the case with no suite.

## Batching

Imports run in batches of **50** rows server-side to limit payload size.

## Simulator

Use the practice Testing **Bulk Import** page; rows use **practice_project_id** automatically when importing for a practice project.

## Templates

The wizard exposes template downloads (CSV, JSON, XML) from `TestCaseImportTemplate.jsx`.

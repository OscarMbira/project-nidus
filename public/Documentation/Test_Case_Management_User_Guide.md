# Test Case Management — User Guide

**Module:** Platform Testing & QA (`/platform/testing`) and Simulator (`/simulator/practice-testing`)

## Overview

- **Test suites** group related cases (functional, regression, smoke, UAT, etc.).
- **Test cases** hold title, description, steps, priority, type, and optional suite link.
- **Test runs** execute cases in a suite; each case has an **execution** row (pending / passed / failed / blocked / skipped).

## Typical workflow

1. Select your **project** (Platform) or **practice project** (Simulator) in the page header.
2. Create **suites** under Test Suites, then **cases** under Test Cases (or assign cases to a suite).
3. Start a **Test Run** tied to a suite; open **Execute** to step through cases.
4. On **Failed**, the system can **auto-create a defect** (see Defect Management guide).

## Bulk import

Use **Bulk Import** for CSV, Excel, JSON, or XML. Map **suite name** in the file to existing suite names to link cases. See `Test_Bulk_Import_Guide.md`.

## Exports

List pages support Excel, Word, PowerPoint, CSV, XML, JSON, and Print via the export menu. Case and run detail pages include a record-level export dropdown.

## Draft status

Cases and suites support a **draft** status in forms. Organisation-wide **draft queue** integration (save and resume later) is planned as a follow-up; see implementation summary.

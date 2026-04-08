# Defect Management — User Guide

## Overview

Defects track issues found in testing or raised manually. Each defect has severity, priority, status, environment, and optional links to a **test case** and **execution**.

## Auto-created defects

When a test execution is marked **Failed**, the database trigger creates a defect with a title like `[FAILED] TC-… - …`. Open the defect from the banner on the execute page to add screenshots, severity, and assignee.

## Manual defects

From **Defects**, choose **New defect**. After save, use **comments**, **attachments** (images/PDF in the storage bucket), and **history** on the detail page.

## Reports

**Defect Reports** shows trend and severity charts for the selected project.

## Exports

The defect register supports list export formats. Defect detail supports full record export (Excel, Word, PowerPoint, CSV, XML, JSON, Print).

## Simulator

Practice projects use the same flows under `/simulator/practice-testing/defects` with the `sim-defect-attachments` bucket.

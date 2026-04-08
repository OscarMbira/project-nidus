# Export Multi-Valued Fields Formatting Fix

## Issue
After implementing the v206 Export Feature plan, multi-valued fields (e.g. Project Objectives, Scope, Interfaces) were exported as raw comma-separated or JSON-like strings (e.g. `["Item1","Item2","Item3"]`) instead of human-readable bulleted or numbered lists.

## Fix (centralised in `src/utils/exportUtils.js`)
All export types (Excel list, Excel record, Word, PowerPoint) now treat multi-valued data as lists and format them consistently.

### Changes
1. **`parseFieldValue(val)`**  
   Normalises any field value to either:
   - `{ isList: true, items: string[] }` for arrays or JSON array strings, or  
   - `{ isList: false, text: string }` for single values.  
   Handles: `null`/`undefined`, arrays, stringified JSON arrays, dates, objects, primitives.

2. **`formatCellValue(val)`**  
   Uses `parseFieldValue`. For lists it returns a single string with bullet characters and newlines (e.g. `• Item1\n• Item2`) so Excel cells show one line per item.

3. **Excel (list and record)**  
   Both `exportToExcel` and `exportRecordToExcel` use `formatCellValue`, so any column/field that is an array or JSON array string is exported as bulleted lines in the cell.

4. **Word (`exportRecordToWord`)**  
   For each field, if the value is a list, the label is output as Heading 2 and each item as a **bullet paragraph** (`Paragraph` with `bullet: { level: 0 }`). Single values remain a single paragraph.

5. **PowerPoint (`exportRecordToPPT`)**  
   For each field, if the value is a list, the label is output in bold and the items are added as a **bullet list** using pptxgen’s `addText(..., { bullet: true, breakLine: true })`. Single values remain a single text block.

## Scope
Because all record and list exports use `exportUtils.js`, this behaviour applies to **all pages** that use the export buttons (Platform and Simulator, list and record views) for **all document types** (Excel, Word, PowerPoint). No per-page changes are required.

---

## Header numbering (hierarchical)

### Requirement
Sub-headers under a section (e.g. "In-Scope", "Out-of-Scope Exclusions" under "5. Scope") should be numbered hierarchically (e.g. "5.1 In-Scope", "5.2 Out-of-Scope Exclusions") in all export formats.

### Implementation
In `src/utils/exportUtils.js`:

1. **`stripLeadingNumber(title)`** — Removes a leading "N." or "N.M " from section titles so numbering is applied consistently (e.g. "5. Scope" → "Scope" before applying "5. Scope" for section index 5).

2. **`getNumberedSectionInfo(sections)`** — Returns:
   - **sectionTitles**: Main section titles as "1. …", "2. …", "5. …" (1-based index + stripped title).
   - **flatNumberedFields**: All fields with labels like "5.1 In-Scope", "5.2 Out-of-Scope Exclusions" (sectionNum.fieldNum + label).

3. **Word**: Uses `sectionTitles[sIdx]` for Heading 1 and `flatNumberedFields` labels for Heading 2.

4. **PowerPoint**: Uses `sectionTitles[sIdx]` for the slide title bar and `numberedLabel` (e.g. "5.1 In-Scope:") for each field.

5. **Excel (record)**: `exportRecordToExcel` accepts **sections** as the first argument. When given sections (array of `{ title, fields }`), it uses `getNumberedSectionInfo` so column headers are "5.1 In-Scope", "5.2 Out-of-Scope Exclusions", etc. All record-export call sites were updated to pass the full `SECTIONS` array instead of `SECTIONS.flatMap(s => s.fields)` so Excel gets the same numbered headers.

This applies globally to all record export pages (Platform and Simulator) for Word, PPT, and Excel.

## Date
2026-02-23

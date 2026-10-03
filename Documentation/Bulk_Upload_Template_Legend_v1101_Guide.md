# Bulk Upload Template Legend / Data Dictionary (v1101)

## Rule

Monorepo `CLAUDE.md` **rule 71** · Admin `CLAUDE.md` **rule 22**.

Every downloadable bulk-upload template (CSV, Excel, JSON, …) on **Platform, Simulator, and Admin** must include an embedded **legend / data dictionary**.

## Embed pattern

| Format | Legend placement |
|--------|------------------|
| Excel | `Instructions` + `Legend` sheets + data sheet |
| CSV | `# DATA DICTIONARY` comment lines above the header row |
| JSON | `DATA_DICTIONARY` key beside the data array |

## Reference implementations

- Contact Directory bulk: `projectContactsBulkService.js`
- Governance members bulk: `projectGovernanceMembersBulkService.js`

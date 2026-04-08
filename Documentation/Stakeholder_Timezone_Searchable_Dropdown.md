# Stakeholder form — searchable time zone field

## Change
On the Platform **Add/Edit Stakeholder** form (**Availability** tab), the **Time Zone** field is no longer a plain text input. It uses the shared **`SearchableSelect`** component (theme-aware, dark/light).

## Behaviour
- Options are built from **`Intl.supportedValuesOf('timeZone')`** when the browser supports it (IANA IDs such as `Africa/Harare`, `Europe/London`).
- **`UTC`** is always included.
- **`allowCustom`** is enabled so existing free-text values (e.g. legacy `EST`) can still be entered if they are not in the list.
- Stored value remains a **string** in `time_zone` (same column as before).

## Files
- `src/components/stakeholders/StakeholderForm.jsx`
- `src/utils/ianaTimezoneOptions.js` (IANA option list)
- `src/utils/__tests__/ianaTimezoneOptions.test.js` (unit tests)

## Plan reference
- `projectplan/v228_Stakeholder_Timezone_Searchable_Dropdown_Plan.md`

# v228 Stakeholder Timezone Searchable Dropdown Plan

## Objective
Replace the free-text timezone field on the Platform stakeholder create/edit form with a searchable dropdown so users can quickly select valid timezones.

## Scope
- In scope: `src/components/stakeholders/StakeholderForm.jsx`
- Out of scope: Database schema, API changes, Simulator module (not applicable for this specific platform-only stakeholder form route)

## Todo
- [x] Confirm the existing timezone input location and reuse existing `SearchableSelect` UI behavior.
- [x] Add a timezone options source (IANA timezone list generated safely in-browser, with UTC fallback option).
- [x] Replace `time_zone` text input with `SearchableSelect` bound to `formData.time_zone`.
- [x] Keep dark-mode styling and existing validation/submit payload behavior unchanged.
- [x] Run lint check for edited file and fix any introduced issues.

## Implementation Notes
- Use browser-supported timezone values (`Intl.supportedValuesOf('timeZone')`) when available.
- Include `UTC` explicitly so users always have a default standard option.
- Keep changes minimal and localized to avoid side effects.

## Review (to complete after implementation)
- **Implemented:** `StakeholderForm.jsx` — `SearchableSelect` for `time_zone`; options from `buildIanaTimezoneSelectOptions()` in `src/utils/ianaTimezoneOptions.js` (`Intl.supportedValuesOf('timeZone')` + `UTC`); `allowCustom` for legacy text; `openAbove` for dropdown placement.
- **Tests:** `src/utils/__tests__/ianaTimezoneOptions.test.js`
- **Docs:** `Documentation/Stakeholder_Timezone_Searchable_Dropdown.md`

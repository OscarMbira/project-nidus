# Stakeholder Multiple Contact Entries

## Overview
Stakeholders can have multiple email addresses, phone numbers, and mobile numbers. The Contact Information tab on the Add/Edit Stakeholder form supports adding and removing entries for each type.

## Database
- **Migration:** `SQL/v304_stakeholder_multiple_contacts.sql`
- **Platform:** `public.stakeholders` has optional columns: `emails TEXT[]`, `phones TEXT[]`, `mobiles TEXT[]`
- **Simulator:** `sim.practice_stakeholder_register` has the same columns for parity
- The existing single columns `email`, `phone`, `mobile` are kept; the first value in each array is synced to these for backward compatibility.

## Form Behaviour
- **Emails:** "Email addresses" section with one input per row; "Add another email" adds a row; trash icon removes a row (at least one row remains).
- **Phones / Mobiles:** Same pattern for "Phone numbers" and "Mobile numbers".
- **Save:** Only non-empty trimmed values are stored. The first value in each list is also written to `email`, `phone`, and `mobile`.
- **Load:** If `emails`/`phones`/`mobiles` exist and are non-empty, they are used; otherwise the form is filled from the single `email`/`phone`/`mobile` fields.

## Component
- **File:** `src/components/stakeholders/StakeholderForm.jsx`
- Helpers: `updateContactEntry(field, index, value)`, `addContactEntry(field)`, `removeContactEntry(field, index)` for the contact arrays.

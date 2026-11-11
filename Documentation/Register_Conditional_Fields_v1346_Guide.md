# Conditional Register Fields and the Environments Hosting Model (v1346)

## What changed

Local Register forms can now show a field only when another field has a given value. A tab
whose fields are all hidden disappears. The first register to use it is **Environments**
(Banking & Financial Services → Core Banking): the user picks a **Hosting Model** and sees the
tabs for that choice.

| Hosting Model | Tabs shown |
|---|---|
| (not chosen yet) | Details, Connection Details (ports, URL), Database, Availability & Refresh, Access, Notes |
| Non-cloud (on premise / data centre) | the above + **Infrastructure**; Data Centre / Site on Details; Host / Server Name, IP Address and Mount Point on Connection Details |
| Cloud | the above + **Cloud Setup** and **Cloud Compliance**; Managed Database Service on Database |
| Hybrid | both the cloud and the non-cloud tabs and fields |

- **Cloud Setup:** provider, service model (IaaS / PaaS / SaaS), deployment type, region,
  subscription / account, resource group / network, instance size, auto-scaling, connectivity to
  the bank, estimated monthly cost.
- **Cloud Compliance:** data residency, regulatory cloud approval and reference, encryption at rest,
  key management, backup / DR region.
- **Infrastructure:** server type, operating system, CPU cores, memory, storage, rack / room
  location, hardware support until.

Changing the hosting model never deletes data: values on hidden fields are kept and come back if
the choice is changed back. Hidden fields are left out of the record view, exports and the complete
document. Existing Environments records were set to Non-cloud from their old Hosting Site value.

## How it works (for register designers)

`local_register_fields.visible_when` (public and sim) holds an optional condition:

```json
{ "field": "hosting_model", "in": ["cloud", "hybrid"] }
```

The field is shown while the controlling field's value — or any value, for a multi-select — is in
the list; while the controlling field is empty, the field is hidden. Conditions are one level deep
(the controlling field should itself be always visible). They are set in SQL for system registers;
the Register Definition Builder does not edit them yet.

Code: `isFieldVisible` and `groupRegisterFields(fields, values)` in
`packages/shared/src/utils/registerFieldGroups.js`, used by the form, the record view (both apps),
`registerRecordExport`, `registerDocumentModel` and `registerPlaceholders`.

## SQL

`SQL/v1346_register_conditional_fields_environments_hosting.sql` — column, Environments fields and
conditions, backfill of Hosting Model. Idempotent.

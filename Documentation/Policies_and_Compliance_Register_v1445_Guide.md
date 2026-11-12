# Policies & Compliance register (v1445)

**Menu:** Platform → Governance → Policies & Compliance
**Introduced:** SQL `v1444` (engine changes) and `v1445` (the register). PRD/plan `v1340`, wave 3.

## What changed

Policies & Compliance used to be a small hand-built form (`public.policies_compliance`, v687) with eight fields. It is now a register built on the Local Register engine, like the industry-pack registers. The menu opens the register directly.

That also fixes a security problem. The old table had no organisation column, and its rules let any signed-in user of any organisation read and change every policy. In the register, each policy belongs to one organisation and only that organisation's members can see it.

## Who can use it

- **Scope:** organisation-wide (new scope `organisation`, added in v1444). Any member of an organisation can read and add policies, as before.
- **Isolation:** each policy carries the organisation of the person who created it. A member sees only their own organisation's policies. A member is someone who owns the organisation, accepted an invitation to it, or has a role on one of its projects (`public.auth_user_is_account_member`).
- The same isolation now also applies to PMO-scope registers. Before v1444, a PMO admin in one organisation could read another organisation's PMO-level register records.

## Fields

| Tab | Fields |
|---|---|
| Details | Title, Description, Status, Policy Reference, Category, Policy Owner, Next Review Date, Document Type, Version, Effective Date, Approved By, Approval Date |
| Scope & Applicability | Purpose, Applies To, Exclusions, Regulatory & Standard References (table: Regulation / Standard · Clause · What it requires) |
| Requirements & Controls | Requirements, Controls (table: Control · Owner · Frequency · Evidence), Exceptions Process, Consequences of Non-Compliance |
| Review & Attestation | Review Frequency, Last Review Date, Compliance Status, Last Assessment Date, Staff Attestation Required, Attestation Frequency |
| Notes | Related Documents (table), Version History (table: Version · Date · Author · Change), Notes |

**Statuses:** Draft → Under Review → Active → Retired.

The list shows Policy Reference, Category, Policy Owner and Next Review Date. Exports, the Audit tab, record display IDs and custom fields come from the engine.

## Existing policies

v1445 copies every policy from the old table to the register, keeping its id:

- **Organisation:** the account the creator owns, otherwise an organisation they accepted an invitation to, otherwise the account of a project they have a role on.
- **Status:** `active` → Active, `archived` → Retired, anything else → Draft.
- **Category:** mapped to the new list by keyword (security, data / privacy, health / safety, finance, procurement, HR / people, environment, quality, legal / regulatory / compliance, governance). Anything else becomes **Other**, and the original text is kept in Notes as "Original category: …".
- **Other fields:** Compliance Owner → Policy Owner, Review Date → Next Review Date, Requirements → Requirements, Notes → Notes.

A policy whose creator has no organisation can't be placed. It stays in the old table, and the check at the end of v1445 counts it (`not_copied`).

## Old table

`public.policies_compliance` is kept for rollback but is no longer used by the menu. Its rules now allow only the creator to read or change their own rows. The old pages (`/platform/governance/policies…`) still exist for direct links.

**Rollback:** set the `plat_pm_s_policies` menu route back to `/platform/governance/policies`. The old rows are unchanged.

## Run order

1. `SQL/v1444_local_register_organisation_scope_and_isolation.sql`
2. `SQL/v1445_core_policies_compliance_register.sql`. Check: 26 fields, 4 tabs, `register_policies` = `old_policies` − `not_copied`.

## Simulator

The Simulator has no Policies & Compliance menu, so nothing changes there. The Simulator scope check doesn't accept `organisation` (practice records have no organisation).

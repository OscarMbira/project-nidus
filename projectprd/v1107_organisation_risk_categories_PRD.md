# v1107 — Organisation Risk Categories and Sub-categories PRD

**Status:** Draft — decisions settled in-session (interview 2026-09-26); awaiting user approval of PRD + plan.
**Related plan:** `projectplan/v1107_organisation_risk_categories_plan.md`
**Touches:** Platform (`apps/platform`), Simulator (`apps/simulator`), `public` schema.

## a) Problem statement

The risk form's Category list is a fixed set (Schedule, Cost, Quality, and the rest). Sub-category was free text, then a system list tied to that category (`SQL/v1111_risk_subcategories.sql`). An organisation cannot add a category or sub-category that the list missed, and the people logging the risk (Project Manager, Team Manager/Lead, Team Member) cannot fill the gap while they are on the form.

The same gap creates duplicates. Someone types a name that already exists, or a risk title that already exists, and nothing shows the near matches.

## b) Solution

One organisation catalogue of categories and sub-categories, shared by every project in the account. Built-in categories and their built-in sub-categories stay as the starting list. The organisation adds its own names beside them.

People add a missing name in two places: an **Add** action on the risk form, and a catalogue page opened from **PMO Configuration → Risk Categories** and from **RAID → Risks → Risk Categories** (same page). A new name is saved immediately. Typing a new name, or a risk title, shows similar names and up to five similar risks so the user can pick what already exists.

## c) User stories

1. As a Project Manager, on the risk form I choose Category from the built-in list plus my organisation's own categories.
2. After I choose a category, Sub-category lists the built-in sub-categories for that category plus my organisation's own sub-categories for it.
3. Sub-category stays disabled until a category is selected.
4. As a Project Manager, Team Manager/Lead, or Team Member, I can add a missing category by name from the risk form. It saves immediately, is selected on the risk I am logging, and is available on every project in the organisation.
5. I can add a missing sub-category by name under the selected category, with the same immediate save.
6. As a PMO Admin or Account Owner, I can do that add as well.
7. When I pause after typing a new category or sub-category name, I see similar catalogue names and up to five risks already using those names. I can choose an existing name instead of saving a new one. If none fit, I can still save the new name.
8. The same check runs when I pause after typing the risk title: up to five similar risks. Matches from the current project are listed first. The search covers the organisation and only returns risks I am already allowed to see.
9. The same name under the same category is blocked, ignoring capital letters.
10. A category and a sub-category are a name only.
11. On the catalogue page, each category shows its sub-categories underneath, with **Add sub-category** on that category.
12. As a PMO Admin or Account Owner, I can rename or deactivate an organisation-owned category or sub-category. A Project Manager, Team Manager/Lead, or Team Member cannot.
13. Deactivate hides the name from new risks. A risk that already stored the name keeps it. Nothing is hard-deleted.
14. Built-in categories cannot be renamed, deactivated, or deleted. The organisation can still add sub-categories under them.
15. The catalogue page is the same screen from both menus.
16. The same behaviour exists in the Simulator (rule 34.1).

## d) Implementation decisions (settled with the user)

- **Scope:** one catalogue per organisation, used by every project in that account.
- **Who may add:** PMO Admin, Account Owner, Project Manager, Team Manager/Lead, Team Member. Save is immediate. No approval queue.
- **Who may rename or deactivate:** PMO Admin and Account Owner only, and only organisation-owned rows.
- **Built-ins:** system rows stay read-only. Organisation sub-categories may hang off a built-in category code.
- **Where:** **Add** on the risk form (name only, so the user does not leave the risk) and a catalogue page. Create/edit of a catalogue row on that page is a routed page (rule 65). The risk-form add is a small name capture, not a second record form.
- **Menus:** `PMO Configuration → Risk Categories` and `RAID → Risks → Risk Categories`, same route.
- **Duplicates:** case-insensitive unique name under the same category. Similar-name prompt on category, sub-category, and risk title, capped at five risks, organisation-wide within existing row access, current project first on the risk form.
- **Stored value:** the risk keeps the name it was saved with. Rename and deactivate do not rewrite old risks.
- **Fields:** name only.
- **Catalogue tables stay in `public`.** `risk_categories` already lives there. `risk_subcategories` (v1111) gains an organisation owner. Both apps read and write that catalogue. Simulator similar-risk search reads practice risks in `sim` when that is the register the user is logging.

## e) Testing decisions

- Unit tests for: who may add vs who may rename/deactivate, duplicate-name rejection, similar-name matching and the five-risk cap with current-project ordering, and "already on the risk" values that are no longer in the active list still display.
- SQL checks the user can run after apply: organisation rows are unique per account and category by lower-cased name; system rows are unchanged; deactivate does not delete the row.
- Manual: add a category and a sub-category from the risk form and from the catalogue page; confirm both menus open the same page; confirm a Team Member cannot rename; confirm a similar title is offered and can be dismissed.

## f) Out of scope

- A description, code, or other field on the catalogue row beyond the name the user types (a stable code may be generated in the database for the existing `risk_category` column; the user does not enter it).
- An approval queue.
- Hard delete.
- Renaming, deactivating, or hiding a built-in category.
- Editing the category or sub-category already stored on an old risk when the catalogue name changes.
- Issue categories (the issue form has its own sub-category field and is not part of this change).

## g) Further notes

- Highest PRD at the time of writing is v1106. This feature is **v1107**. SQL already uses v1111 (system sub-categories) and v1112 (project industries), so the migration for this feature is **v1113**.
- The risk form's Category control must load the catalogue. The hardcoded `<option>` list cannot remain the source of truth (rule 25.1).

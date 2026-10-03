# Governance Members Bulk Upload (v1099)

## Where

Steering Committee and Project Board → **Bulk upload**.

## Form changes

- **Email** / **Phone**: multi-line lists (one address/number per row)
- **Role** placeholder: `Role` (not “Role / title”)

## Import

Templates: Excel, CSV, JSON. Columns: `member_name`, `role`, `organisation`, `email`, `phone`, `is_chair`, `appointed_date`, `notes`.

Multiple emails/phones: `;` or newline. `is_chair`: yes/true/1/chair. Optional `end_date` for term end (must be on or after `appointed_date`).

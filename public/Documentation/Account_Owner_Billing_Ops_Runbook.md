# Account Owner & Billing — Operations Runbook (v735)

Reference: `projectplan/v728_Account_Owner_Billing_Separation_Feature_Reference.md`

## SQL migration order

Apply in Supabase SQL editor (or migration pipeline):

1. `SQL/v728_account_owner_role_metadata.sql`
2. `SQL/v729_account_owner_menu_separation.sql`
3. `SQL/v730_backfill_account_owners.sql`
4. `SQL/v732_account_billing_delegates.sql` *(creates `has_billing_access()`)*
5. `SQL/v733_billing_rls.sql`

Hard-refresh the app after deploy (sidebar cache **v31**).

## Personas

| Persona | Roles | Billing menus |
|---------|-------|---------------|
| Founder | `account_owner` + `pmo_admin` | Yes (automatic) |
| Delegated PMO admin | `pmo_admin` + billing delegate record | Yes |
| Standard PMO admin | `pmo_admin` only | No |

## Support scenarios

### Org creator missing billing menus

1. Run `v730_backfill_account_owners.sql`
2. Confirm `accounts.owner_user_id` matches user
3. Confirm `user_roles` has `account_owner` and `pmo_admin`
4. Clear sidebar cache / hard refresh

### PMO admin needs billing access

1. Account owner opens **Administration → User Management** (`/platform/pmo-admin/users`)
2. Grant **Account Owner Privileges (billing)** on the user
3. Do **not** assign second `account_owner` role

### De facto billing contact who is not owner

**Do not auto-delegate.** Account owner must explicitly grant billing privileges in User Management.

### Ownership change

Account owner uses **Transfer ownership** on User Management page. All active billing delegates are revoked; new owner receives `account_owner` role.

## Verification queries

```sql
-- Founder roles for an account
SELECT u.email, r.role_name
FROM accounts a
JOIN users u ON u.id = a.owner_user_id
LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.is_active AND NOT ur.is_deleted
LEFT JOIN roles r ON r.id = ur.role_id
WHERE a.id = '<account_uuid>';

-- Active billing delegates
SELECT u.email, d.granted_at
FROM account_billing_delegates d
JOIN users u ON u.id = d.user_id
WHERE d.account_id = '<account_uuid>' AND d.is_active AND d.revoked_at IS NULL;
```

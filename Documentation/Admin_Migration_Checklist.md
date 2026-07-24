# Admin Migration Checklist

## Moved to Admin app (system-wide)

| Platform page | Admin equivalent |
|---------------|------------------|
| SecuritySettings | security/SecuritySettingsPage |
| DocumentationAdminList/Editor | content/DocumentationCMSPage |
| BugTracking | feedback/BugTrackingPage |
| ScenarioAdmin (sim) | simulator/SimScenarioAdminPage |
| AuditLogs | audit/AuditTrailPage |
| PmoAdminUserManagement (cross-org) | users/UserListPage |

## Kept in Platform (org-level PMO self-service)

- RoleAssignment, AssignRolesToProjects, SendRoleInvites
- PMORoleMenuManagement, DraftExpiryConfig
- Settings, AccountSettings, SubscriptionManagement

## Platform changes

Admin routes under `/app/admin/*` show `AdminFeatureMoved` redirect notice for migrated pages.

## Services migrated

- securityMonitoringService → admin security module
- pmoAdminService (system-wide ops) → admin users module
- supportTicketService (management) → admin support module

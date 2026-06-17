# Record Lifecycle Management — Implementation Guide

**Version:** v639  
**Date:** 2026-05-27

## Overview

Universal record flow: **Unauthorised → Live → History → Archive** for Category A (high volume) and Category B (status column) tables.

## SQL sequence

Run in order in Supabase:

1. `SQL/v651_record_lifecycle_infrastructure.sql`
2. `SQL/v652_category_a_separate_tables.sql`
3. `SQL/v653_category_b_status_columns.sql`
4. `SQL/v654_lifecycle_functions.sql`
5. `SQL/v655_lifecycle_rls_policies.sql`
6. `SQL/v656_sim_lifecycle_mirror.sql`
7. `SQL/v657_lifecycle_seed_migration.sql`
8. `SQL/v658_auto_archive_cron.sql`
9. `SQL/v659_archive_config_audit_trigger.sql`
10. `SQL/v662_record_lifecycle_menu_registry.sql`

## Routes

| Role | Platform | Simulator |
|---|---|---|
| PMO | `/pmo/authorisation/*` | `/simulator/pmo/authorisation/*` |
| PM | `/pm/authorisation/*` | `/simulator/pm/authorisation/*` |
| TM | — | `/simulator/tm/authorisation/submitted` |

## List page integration

Add to any Category A/B list page:

```jsx
import RecordLifecycleListHeader from '../components/ui/RecordLifecycleListHeader'
import useRecordLifecycleFilter from '../hooks/useRecordLifecycleFilter'
import { applyRecordStatusFilter } from '../utils/lifecycleListUtils'

const { statusFilter, setStatusFilter, counts } = useRecordLifecycleFilter('risks', { projectId })
// In query: applyRecordStatusFilter(query, statusFilter)
```

## Registry

Table mappings: `src/config/recordLifecycleRegistry.js`

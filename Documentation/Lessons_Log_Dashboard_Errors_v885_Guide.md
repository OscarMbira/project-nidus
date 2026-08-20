# Lessons Log dashboard console errors (v885)

## Errors

1. **`get_relevant_corporate_lessons` 400 / 42703**  
   `record "v_project" has no field "project_type"`  
   The v169 RPC read `projects.project_type`. Live schema uses `project_type_id` → `project_types.type_code`, and lesson rows live in `lessons_learned` (not `lessons`).

2. **`lessons_logs` GET 406**  
   `.single()` when no header log exists for the project (normal). App now uses `.maybeSingle()` and a simpler select.

## Fix

1. Apply in Supabase: `SQL/v885_fix_get_relevant_corporate_lessons.sql`
2. Refresh Lessons Log (Platform already has the JS changes).

Dashboard summary cards come from loaded lessons; corporate suggestions and reports widgets no longer depend on a broken RPC or a missing log header.

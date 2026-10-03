# Change requestor names and organisations (v1142)

On Submit Change Request, Requestor Name and Requestor Organization are searchable lists.

The lists already include people on the project, stakeholders, departments and organisations already used on this organisation’s projects, and names saved earlier on change requests.

A missing value can be added from the dropdown with **Add "…" for this organisation**. That value is stored on `public.change_requestor_catalogue` and then appears for other users in the same organisation.

Run `SQL/v1142_change_requestor_catalogue.sql` in the Supabase SQL editor before using Add. Refresh the change request form afterwards.

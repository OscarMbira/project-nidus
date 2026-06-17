-- v695: Fix incorrect route_path for "Add OPA" menu item
-- v681 accidentally seeded route_path = '/platform/opa/create' but the React
-- Router route is 'opa/new' (/platform/opa/new).  The mismatch caused
-- "invalid input syntax for type uuid: create" because the /:id detail route
-- was catching the path and passing "create" as a UUID to the DB.

UPDATE public.menu_items
SET    route_path = '/platform/opa/new',
       updated_at = NOW()
WHERE  menu_code  = 'plat_know_add_opa'
  AND  route_path = '/platform/opa/create'
  AND  COALESCE(is_deleted, FALSE) = FALSE;

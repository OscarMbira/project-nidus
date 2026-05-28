-- v659: Audit trigger for record_archive_config changes
-- @see projectplan/v639_Record_Lifecycle_Management_Plan.md

CREATE OR REPLACE FUNCTION public.audit_record_archive_config()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (table_name, record_id, action, action_details, performed_by)
  VALUES (
    'record_archive_config',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)),
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_record_archive_config ON public.record_archive_config;
CREATE TRIGGER trg_audit_record_archive_config
  AFTER INSERT OR UPDATE OR DELETE ON public.record_archive_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_record_archive_config();

DO $$ BEGIN RAISE NOTICE 'v659_archive_config_audit_trigger.sql completed'; END $$;

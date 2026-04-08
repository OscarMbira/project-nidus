-- ============================================================
-- v326: RFP multiple service provider contacts
-- Adds service_provider_contacts JSONB to store multiple contact rows
-- (contact_person, email, phone, mobile). Backward compatible with
-- existing single contact columns.
-- ============================================================

-- Platform: public.rfp_documents
ALTER TABLE public.rfp_documents
  ADD COLUMN IF NOT EXISTS service_provider_contacts JSONB DEFAULT '[]';

COMMENT ON COLUMN public.rfp_documents.service_provider_contacts IS 'Array of { contact_person, email, phone, mobile } for multiple provider contacts.';

-- Simulator: sim.rfp_documents
ALTER TABLE sim.rfp_documents
  ADD COLUMN IF NOT EXISTS service_provider_contacts JSONB DEFAULT '[]';

COMMENT ON COLUMN sim.rfp_documents.service_provider_contacts IS 'Simulator: array of { contact_person, email, phone, mobile } for multiple provider contacts.';

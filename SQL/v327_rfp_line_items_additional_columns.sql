-- v327: Add additional_columns JSONB to rfp_line_items for extra Excel/CSV columns
-- Enables capturing any additional columns from the import file beyond standard RFP fields.

-- Platform: public.rfp_line_items
ALTER TABLE public.rfp_line_items
  ADD COLUMN IF NOT EXISTS additional_columns JSONB DEFAULT '{}';

COMMENT ON COLUMN public.rfp_line_items.additional_columns IS 'Extra key-value data from import file columns not mapped to standard RFP fields (e.g. custom columns from Excel).';

-- Simulator: sim.rfp_line_items
ALTER TABLE sim.rfp_line_items
  ADD COLUMN IF NOT EXISTS additional_columns JSONB DEFAULT '{}';

COMMENT ON COLUMN sim.rfp_line_items.additional_columns IS 'Simulator: extra key-value data from import file columns not mapped to standard RFP fields.';

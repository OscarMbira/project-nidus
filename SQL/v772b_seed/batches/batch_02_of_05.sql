-- v772b batch 2/5
BEGIN;


-- Industry: Rail & Mass Transit (rail_mass_transit)
DELETE FROM public.pmo_industry_template_activities WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit');
DELETE FROM public.pmo_industry_template_deliverables WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit');
DELETE FROM public.pmo_industry_template_risks WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit');
DELETE FROM public.pmo_industry_template_milestones WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit');
DELETE FROM public.pmo_industry_template_roles WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit');
DELETE FROM public.pmo_industry_template_phases WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit');

INSERT INTO public.pmo_industry_templates (
  industry_code, industry_name, description, typical_duration, icon, tags, version, status, is_active, is_deleted
) VALUES (
  'rail_mass_transit',
  'Rail & Mass Transit',
  'PMO blueprint for Rail & Mass Transit projects — phases, activities, deliverables, risks, milestones, and roles.',
  '5–15 years',
  'train',
  ARRAY['Rail','industry-plan','v772b'],
  '1.0',
  'published',
  TRUE,
  FALSE
)
ON CONFLICT (industry_code) DO UPDATE SET
  industry_name = EXCLUDED.industry_name,
  description = EXCLUDED.description,
  typical_duration = EXCLUDED.typical_duration,
  icon = EXCLUDED.icon,
  status = 'published',
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 1, 'Planning & Business Case', 'Planning & Business Case phase for Rail & Mass Transit.', '8–16w', 1
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 2, 'Design & Engineering', 'Design & Engineering phase for Rail & Mass Transit.', '16–30w', 2
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 3, 'Land/Right-of-Way Acquisition', 'Land/Right-of-Way Acquisition phase for Rail & Mass Transit.', '12–24w', 3
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 4, 'Procurement', 'Procurement phase for Rail & Mass Transit.', '8–16w', 4
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 5, 'Construction & Track-laying', 'Construction & Track-laying phase for Rail & Mass Transit.', '30–80w', 5
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 6, 'Systems Integration & Testing', 'Systems Integration & Testing phase for Rail & Mass Transit.', '12–20w', 6
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 7, 'Trial Running', 'Trial Running phase for Rail & Mass Transit.', '4–8w', 7
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 8, 'Revenue Service Handover', 'Revenue Service Handover phase for Rail & Mass Transit.', '2–4w', 8
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Demand & ridership forecasting', 'Demand & ridership forecasting', 'task',
  '10–15d', '60h', 'Transport Planner',
  '', '', 0
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Route options assessment', 'Route options assessment', 'task',
  '10–20d', '60h', 'Planning Eng',
  '', '', 1
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Business case approval', 'Business case approval', 'approval',
  '2d', '8h', 'Steering Committee',
  '', '', 2
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Track & alignment design', 'Track & alignment design', 'task',
  '20–30d', 'ongoing', 'Rail Eng',
  '', '', 3
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Signalling & systems design', 'Signalling & systems design', 'task',
  '20–30d', 'ongoing', 'Systems Eng',
  '', '', 4
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Design review gate', 'Design review gate', 'review',
  '3d', '12h', 'Chief Engineer',
  '', '', 5
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Land survey & valuation', 'Land survey & valuation', 'task',
  '10–15d', '40h', 'Land Surveyor',
  '', '', 6
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Compensation negotiation', 'Compensation negotiation', 'task',
  'ongoing', 'varies', 'Land Acquisition Officer',
  '', '', 7
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Acquisition sign-off', 'Acquisition sign-off', 'approval',
  'ongoing', 'varies', 'Program Mgr',
  '', '', 8
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Rolling stock procurement', 'Rolling stock procurement', 'task',
  '15–20d', '40h', 'Procurement',
  '', '', 9
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Civil works contractor tender', 'Civil works contractor tender', 'task',
  '15–20d', '40h', 'Procurement',
  '', '', 10
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Contract award', 'Contract award', 'approval',
  '2d', '8h', 'Program Mgr',
  '', '', 11
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Earthworks & civil structures', 'Earthworks & civil structures', 'task',
  '40–80d', 'ongoing', 'Contractor',
  '', '', 12
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Track-laying & ballasting', 'Track-laying & ballasting', 'task',
  '30–60d', 'ongoing', 'Track Team',
  '', '', 13
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Progress & safety inspections', 'Progress & safety inspections', 'review',
  '1d/week', '4h', 'Site Eng',
  '', '', 14
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Signalling integration testing', 'Signalling integration testing', 'task',
  '15–25d', '80h', 'Systems Eng',
  '', '', 15
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Rolling stock acceptance testing', 'Rolling stock acceptance testing', 'task',
  '10–20d', '60h', 'Rolling Stock Eng',
  '', '', 16
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Systems integration sign-off', 'Systems integration sign-off', 'approval',
  '2d', '8h', 'Chief Engineer',
  '', '', 17
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Driver training & familiarisation', 'Driver training & familiarisation', 'task',
  '10–15d', '40h', 'Operations',
  '', '', 18
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Shadow running / trial operations', 'Shadow running / trial operations', 'task',
  '10–20d', 'ongoing', 'Ops Team',
  '', '', 19
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Trial running review', 'Trial running review', 'review',
  '2d', '8h', 'Ops Manager',
  '', '', 20
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Safety case / operational readiness approval', 'Safety case / operational readiness approval', 'approval',
  '2–3d', '12h', 'Safety Authority',
  '', '', 21
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Revenue service launch', 'Revenue service launch', 'task',
  '1–2d', '8h', 'Ops Manager',
  '', '', 22
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Post-launch performance review', 'Post-launch performance review', 'deliverable',
  '5–8d', '24h', 'Program Mgr',
  '', '', 23
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Business Case', 'document', true, 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Detailed Design Package', 'document', true, 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Land Acquisition Records', 'document', true, 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Rolling Stock Contracts', 'document', false, 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Construction Progress Reports', 'document', false, 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Systems Integration Test Reports', 'document', false, 5
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Safety Case', 'document', false, 6
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Revenue Service Certificate', 'document', false, 7
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Land acquisition delay', 'Land acquisition delay', 'General', 'high', 'high', 0
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Signalling integration failure', 'Signalling integration failure', 'General', 'medium', 'high', 1
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Construction access/utility clash', 'Construction access/utility clash', 'General', 'medium', 'medium', 2
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Rolling stock delivery delay', 'Rolling stock delivery delay', 'General', 'medium', 'high', 3
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Safety case rejection', 'Safety case rejection', 'General', 'low', 'high', 4
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Business Case Approved', 'Business Case Approved', 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Design Freeze', 'Design Freeze', 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Land Acquired', 'Land Acquired', 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Construction Complete', 'Construction Complete', 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Revenue Service Start', 'Revenue Service Start', 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Program Manager', 'Program Manager', true, 0
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Chief Engineer', 'Chief Engineer', true, 1
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Rail Engineer', 'Rail Engineer', false, 2
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Systems Engineer', 'Systems Engineer', false, 3
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Land Acquisition Officer', 'Land Acquisition Officer', false, 4
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Safety Manager', 'Safety Manager', false, 5
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Operations Manager', 'Operations Manager', false, 6
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Procurement Lead', 'Procurement Lead', false, 7
FROM public.pmo_industry_templates WHERE industry_code = 'rail_mass_transit';


-- Industry: Maritime, Shipping & Ports (maritime_shipping_ports)
DELETE FROM public.pmo_industry_template_activities WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports');
DELETE FROM public.pmo_industry_template_deliverables WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports');
DELETE FROM public.pmo_industry_template_risks WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports');
DELETE FROM public.pmo_industry_template_milestones WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports');
DELETE FROM public.pmo_industry_template_roles WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports');
DELETE FROM public.pmo_industry_template_phases WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports');

INSERT INTO public.pmo_industry_templates (
  industry_code, industry_name, description, typical_duration, icon, tags, version, status, is_active, is_deleted
) VALUES (
  'maritime_shipping_ports',
  'Maritime, Shipping & Ports',
  'PMO blueprint for Maritime, Shipping & Ports projects — phases, activities, deliverables, risks, milestones, and roles.',
  '2–7 years',
  'ship',
  ARRAY['Maritime,','industry-plan','v772b'],
  '1.0',
  'published',
  TRUE,
  FALSE
)
ON CONFLICT (industry_code) DO UPDATE SET
  industry_name = EXCLUDED.industry_name,
  description = EXCLUDED.description,
  typical_duration = EXCLUDED.typical_duration,
  icon = EXCLUDED.icon,
  status = 'published',
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 1, 'Feasibility & Demand Study', 'Feasibility & Demand Study phase for Maritime, Shipping & Ports.', '4–8w', 1
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 2, 'Design & Engineering', 'Design & Engineering phase for Maritime, Shipping & Ports.', '8–16w', 2
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 3, 'Permitting & Environmental', 'Permitting & Environmental phase for Maritime, Shipping & Ports.', '8–16w', 3
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 4, 'Procurement', 'Procurement phase for Maritime, Shipping & Ports.', '6–12w', 4
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 5, 'Construction / Dry Dock Works', 'Construction / Dry Dock Works phase for Maritime, Shipping & Ports.', '16–40w', 5
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 6, 'Equipment Installation', 'Equipment Installation phase for Maritime, Shipping & Ports.', '8–16w', 6
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 7, 'Commissioning & Trials', 'Commissioning & Trials phase for Maritime, Shipping & Ports.', '4–8w', 7
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 8, 'Handover & Operations', 'Handover & Operations phase for Maritime, Shipping & Ports.', '2–4w', 8
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Cargo/traffic demand forecast', 'Cargo/traffic demand forecast', 'task',
  '5–10d', '40h', 'Port Planner',
  '', '', 0
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Berth/capacity feasibility', 'Berth/capacity feasibility', 'task',
  '5–8d', '30h', 'Marine Eng',
  '', '', 1
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Feasibility sign-off', 'Feasibility sign-off', 'approval',
  '1d', '4h', 'Program Mgr',
  '', '', 2
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Marine structures design', 'Marine structures design', 'task',
  '15–25d', '100h', 'Marine Eng',
  '', '', 3
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Port layout & operations design', 'Port layout & operations design', 'task',
  '10–15d', '60h', 'Port Planner',
  '', '', 4
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Design review', 'Design review', 'review',
  '3d', '12h', 'Chief Engineer',
  '', '', 5
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Coastal/environmental permit applications', 'Coastal/environmental permit applications', 'deliverable',
  '15–25d', '80h', 'Environmental Eng',
  '', '', 6
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Navigational risk assessment', 'Navigational risk assessment', 'task',
  '5–10d', '40h', 'Marine Surveyor',
  '', '', 7
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Permit approval tracking', 'Permit approval tracking', 'task',
  'ongoing', '2h/week', 'Regulatory Affairs',
  '', '', 8
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Marine contractor tendering', 'Marine contractor tendering', 'task',
  '10–15d', '40h', 'Procurement',
  '', '', 9
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Crane/equipment procurement', 'Crane/equipment procurement', 'task',
  '5–10d', '20h', 'Procurement',
  '', '', 10
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Contract award', 'Contract award', 'approval',
  '2d', '8h', 'Program Mgr',
  '', '', 11
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Marine civil works', 'Marine civil works', 'task',
  '30–60d', 'ongoing', 'Contractor',
  '', '', 12
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Quay/berth construction', 'Quay/berth construction', 'task',
  '20–40d', 'ongoing', 'Contractor',
  '', '', 13
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Progress & diver inspections', 'Progress & diver inspections', 'review',
  '1d/week', '4h', 'Site Eng',
  '', '', 14
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Crane & cargo handling installation', 'Crane & cargo handling installation', 'task',
  '15–25d', 'ongoing', 'Installation Team',
  '', '', 15
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Port systems (TOS/VTS) installation', 'Port systems (TOS/VTS) installation', 'task',
  '10–15d', '60h', 'Systems Eng',
  '', '', 16
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Installation inspections', 'Installation inspections', 'review',
  '2d', '8h', 'Site Eng',
  '', '', 17
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Equipment load trials', 'Equipment load trials', 'task',
  '5–10d', '40h', 'Commissioning Eng',
  '', '', 18
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Berth/navigational trials', 'Berth/navigational trials', 'task',
  '3–5d', '20h', 'Marine Pilot',
  '', '', 19
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Commissioning sign-off', 'Commissioning sign-off', 'approval',
  '1d', '4h', 'Chief Engineer',
  '', '', 20
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'O&M manuals & training', 'O&M manuals & training', 'deliverable',
  '5–8d', '24h', 'Ops Manager',
  '', '', 21
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Operational readiness review', 'Operational readiness review', 'review',
  '1d', '4h', 'Port Director',
  '', '', 22
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Handover certificate', 'Handover certificate', 'approval',
  '1d', '2h', 'Port Director',
  '', '', 23
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Feasibility Study', 'document', true, 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Marine Design Package', 'document', true, 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Environmental Permits', 'document', true, 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Construction Contracts', 'document', false, 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Equipment Acceptance Certificates', 'document', false, 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Commissioning Reports', 'document', false, 5
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'O&M Manuals', 'document', false, 6
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Handover Certificate', 'document', false, 7
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Weather/sea state delays', 'Weather/sea state delays', 'General', 'high', 'medium', 0
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Environmental permit delay', 'Environmental permit delay', 'General', 'medium', 'high', 1
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Marine contractor delay', 'Marine contractor delay', 'General', 'medium', 'high', 2
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Equipment delivery delay', 'Equipment delivery delay', 'General', 'medium', 'medium', 3
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Navigational safety incident', 'Navigational safety incident', 'General', 'low', 'high', 4
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Feasibility Approved', 'Feasibility Approved', 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Permits Granted', 'Permits Granted', 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Construction Complete', 'Construction Complete', 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Equipment Accepted', 'Equipment Accepted', 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Operational Handover', 'Operational Handover', 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Program Manager', 'Program Manager', true, 0
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Chief Engineer', 'Chief Engineer', true, 1
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Marine Engineer', 'Marine Engineer', false, 2
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Port Planner', 'Port Planner', false, 3
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Environmental Engineer', 'Environmental Engineer', false, 4
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Commissioning Engineer', 'Commissioning Engineer', false, 5
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Ops Manager', 'Ops Manager', false, 6
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Procurement Lead', 'Procurement Lead', false, 7
FROM public.pmo_industry_templates WHERE industry_code = 'maritime_shipping_ports';


-- Industry: Aviation Operations & Airports (aviation_airports)
DELETE FROM public.pmo_industry_template_activities WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports');
DELETE FROM public.pmo_industry_template_deliverables WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports');
DELETE FROM public.pmo_industry_template_risks WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports');
DELETE FROM public.pmo_industry_template_milestones WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports');
DELETE FROM public.pmo_industry_template_roles WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports');
DELETE FROM public.pmo_industry_template_phases WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports');

INSERT INTO public.pmo_industry_templates (
  industry_code, industry_name, description, typical_duration, icon, tags, version, status, is_active, is_deleted
) VALUES (
  'aviation_airports',
  'Aviation Operations & Airports',
  'PMO blueprint for Aviation Operations & Airports projects — phases, activities, deliverables, risks, milestones, and roles.',
  '3–10 years',
  'plane',
  ARRAY['Aviation','industry-plan','v772b'],
  '1.0',
  'published',
  TRUE,
  FALSE
)
ON CONFLICT (industry_code) DO UPDATE SET
  industry_name = EXCLUDED.industry_name,
  description = EXCLUDED.description,
  typical_duration = EXCLUDED.typical_duration,
  icon = EXCLUDED.icon,
  status = 'published',
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 1, 'Planning & Capacity Study', 'Planning & Capacity Study phase for Aviation Operations & Airports.', '4–8w', 1
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 2, 'Design & Engineering', 'Design & Engineering phase for Aviation Operations & Airports.', '8–16w', 2
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 3, 'Regulatory Approvals', 'Regulatory Approvals phase for Aviation Operations & Airports.', '8–16w', 3
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 4, 'Procurement', 'Procurement phase for Aviation Operations & Airports.', '6–12w', 4
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 5, 'Construction / Fit-Out', 'Construction / Fit-Out phase for Aviation Operations & Airports.', '16–40w', 5
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 6, 'Systems Integration', 'Systems Integration phase for Aviation Operations & Airports.', '6–12w', 6
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 7, 'Operational Trials', 'Operational Trials phase for Aviation Operations & Airports.', '4–8w', 7
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 8, 'Certification & Go-Live', 'Certification & Go-Live phase for Aviation Operations & Airports.', '2–4w', 8
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Passenger/cargo demand forecast', 'Passenger/cargo demand forecast', 'task',
  '5–10d', '40h', 'Airport Planner',
  '', '', 0
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Capacity & masterplan options', 'Capacity & masterplan options', 'task',
  '5–10d', '40h', 'Airport Planner',
  '', '', 1
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Planning sign-off', 'Planning sign-off', 'approval',
  '1d', '4h', 'Program Mgr',
  '', '', 2
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Airside/landside design', 'Airside/landside design', 'task',
  '15–25d', '100h', 'Airport Eng',
  '', '', 3
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Terminal systems design', 'Terminal systems design', 'task',
  '10–15d', '60h', 'Systems Eng',
  '', '', 4
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Design review gate', 'Design review gate', 'review',
  '3d', '12h', 'Chief Engineer',
  '', '', 5
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'CAA/aviation authority submissions', 'CAA/aviation authority submissions', 'deliverable',
  '15–25d', '80h', 'Regulatory Affairs',
  '', '', 6
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Security/safety case preparation', 'Security/safety case preparation', 'task',
  '10–15d', '60h', 'Safety Mgr',
  '', '', 7
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Approval tracking', 'Approval tracking', 'task',
  'ongoing', '2h/week', 'Regulatory Affairs',
  '', '', 8
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Contractor & systems tendering', 'Contractor & systems tendering', 'task',
  '10–15d', '40h', 'Procurement',
  '', '', 9
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Long-lead equipment orders', 'Long-lead equipment orders', 'task',
  '5–10d', '20h', 'Procurement',
  '', '', 10
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Contract award', 'Contract award', 'approval',
  '2d', '8h', 'Program Mgr',
  '', '', 11
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Airside/landside construction', 'Airside/landside construction', 'task',
  '30–60d', 'ongoing', 'Contractor',
  '', '', 12
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Terminal fit-out', 'Terminal fit-out', 'task',
  '20–40d', 'ongoing', 'Fit-Out Team',
  '', '', 13
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Progress inspections', 'Progress inspections', 'review',
  '1d/week', '4h', 'Site Eng',
  '', '', 14
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'BHS/AODB/security systems integration', 'BHS/AODB/security systems integration', 'task',
  '15–25d', '80h', 'Systems Eng',
  '', '', 15
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Integration testing', 'Integration testing', 'task',
  '10–15d', '60h', 'QA',
  '', '', 16
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Integration sign-off', 'Integration sign-off', 'approval',
  '2d', '8h', 'Chief Engineer',
  '', '', 17
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Staff training & familiarisation', 'Staff training & familiarisation', 'task',
  '10–15d', '40h', 'Training Lead',
  '', '', 18
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Operational readiness exercises', 'Operational readiness exercises', 'task',
  '5–10d', '40h', 'Ops Manager',
  '', '', 19
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Trial review', 'Trial review', 'review',
  '2d', '8h', 'Airport Director',
  '', '', 20
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Aerodrome/ops certification', 'Aerodrome/ops certification', 'approval',
  '2–3d', '12h', 'Regulator',
  '', '', 21
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Go-live cutover', 'Go-live cutover', 'task',
  '1–2d', '16h', 'Ops Manager',
  '', '', 22
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Post-go-live review', 'Post-go-live review', 'deliverable',
  '5–8d', '24h', 'Program Mgr',
  '', '', 23
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Capacity Study', 'document', true, 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Design Package', 'document', true, 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Regulatory Approvals', 'document', true, 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Construction Contracts', 'document', false, 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Systems Integration Reports', 'document', false, 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Training Records', 'document', false, 5
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Operational Readiness Certificate', 'document', false, 6
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Go-Live Report', 'document', false, 7
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Regulatory approval delay', 'Regulatory approval delay', 'General', 'high', 'high', 0
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Systems integration failure', 'Systems integration failure', 'General', 'medium', 'high', 1
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Construction airside safety incident', 'Construction airside safety incident', 'General', 'low', 'high', 2
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Stakeholder/airline coordination failure', 'Stakeholder/airline coordination failure', 'General', 'medium', 'medium', 3
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Budget overrun', 'Budget overrun', 'General', 'medium', 'high', 4
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Planning Approved', 'Planning Approved', 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Design Freeze', 'Design Freeze', 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Regulatory Approval', 'Regulatory Approval', 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Construction Complete', 'Construction Complete', 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Certification & Go-Live', 'Certification & Go-Live', 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Program Manager', 'Program Manager', true, 0
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Chief Engineer', 'Chief Engineer', true, 1
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Airport Planner', 'Airport Planner', false, 2
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Systems Engineer', 'Systems Engineer', false, 3
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Safety Manager', 'Safety Manager', false, 4
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Regulatory Affairs Lead', 'Regulatory Affairs Lead', true, 5
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Ops Manager', 'Ops Manager', false, 6
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Procurement Lead', 'Procurement Lead', false, 7
FROM public.pmo_industry_templates WHERE industry_code = 'aviation_airports';


-- Industry: Gaming & Esports (gaming_esports)
DELETE FROM public.pmo_industry_template_activities WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');
DELETE FROM public.pmo_industry_template_deliverables WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');
DELETE FROM public.pmo_industry_template_risks WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');
DELETE FROM public.pmo_industry_template_milestones WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');
DELETE FROM public.pmo_industry_template_roles WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');
DELETE FROM public.pmo_industry_template_phases WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');

INSERT INTO public.pmo_industry_templates (
  industry_code, industry_name, description, typical_duration, icon, tags, version, status, is_active, is_deleted
) VALUES (
  'gaming_esports',
  'Gaming & Esports',
  'PMO blueprint for Gaming & Esports projects — phases, activities, deliverables, risks, milestones, and roles.',
  '1–4 years',
  'gamepad-2',
  ARRAY['Gaming','industry-plan','v772b'],
  '1.0',
  'published',
  TRUE,
  FALSE
)
ON CONFLICT (industry_code) DO UPDATE SET
  industry_name = EXCLUDED.industry_name,
  description = EXCLUDED.description,
  typical_duration = EXCLUDED.typical_duration,
  icon = EXCLUDED.icon,
  status = 'published',
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 1, 'Concept & Greenlight', 'Concept & Greenlight phase for Gaming & Esports.', '2–4w', 1
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 2, 'Pre-Production', 'Pre-Production phase for Gaming & Esports.', '4–8w', 2
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 3, 'Production', 'Production phase for Gaming & Esports.', '12–40w', 3
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 4, 'Alpha', 'Alpha phase for Gaming & Esports.', '4–8w', 4
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 5, 'Beta', 'Beta phase for Gaming & Esports.', '4–8w', 5
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 6, 'Certification & Store Submission', 'Certification & Store Submission phase for Gaming & Esports.', '2–6w', 6
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 7, 'Launch', 'Launch phase for Gaming & Esports.', '1–2w', 7
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 8, 'Live Ops / Post-Launch', 'Live Ops / Post-Launch phase for Gaming & Esports.', 'ongoing', 8
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Game design document (GDD) drafting', 'Game design document (GDD) drafting', 'task',
  '5–8d', '32h', 'Game Designer',
  '', '', 0
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Market & competitor analysis', 'Market & competitor analysis', 'task',
  '3–5d', '20h', 'Product Manager',
  '', '', 1
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Greenlight pitch', 'Greenlight pitch', 'approval',
  '1d', '4h', 'Studio Head',
  '', '', 2
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Vertical slice planning', 'Vertical slice planning', 'task',
  '5–10d', '40h', 'Producer',
  '', '', 3
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Tech prototype', 'Tech prototype', 'task',
  '10–15d', '60h', 'Tech Lead',
  '', '', 4
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Pre-production review', 'Pre-production review', 'review',
  '2d', '8h', 'Creative Director',
  '', '', 5
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Sprint planning & backlog grooming', 'Sprint planning & backlog grooming', 'meeting',
  '1d/sprint', '4h', 'Producer',
  '', '', 6
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Feature implementation', 'Feature implementation', 'task',
  'ongoing', 'varies', 'Dev Team',
  '', '', 7
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Art/audio production', 'Art/audio production', 'task',
  'ongoing', 'varies', 'Art/Audio Leads',
  '', '', 8
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Feature-complete alpha build', 'Feature-complete alpha build', 'deliverable',
  '5–10d', '40h', 'Build Eng',
  '', '', 9
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Internal playtest', 'Internal playtest', 'task',
  '5–10d', '40h', 'QA',
  '', '', 10
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Alpha go/no-go', 'Alpha go/no-go', 'approval',
  '1d', '4h', 'Producer',
  '', '', 11
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'External beta programme', 'External beta programme', 'task',
  '10–20d', 'ongoing', 'Community Manager',
  '', '', 12
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Bug triage & polish', 'Bug triage & polish', 'task',
  'ongoing', '8h/d', 'QA+Dev',
  '', '', 13
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Beta review', 'Beta review', 'review',
  '2d', '8h', 'Producer',
  '', '', 14
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Platform certification prep (console/PC/mobile)', 'Platform certification prep (console/PC/mobile)', 'task',
  '5–15d', '60h', 'Release Mgr',
  '', '', 15
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Store page & age rating submission', 'Store page & age rating submission', 'deliverable',
  '3–5d', '16h', 'Release Mgr',
  '', '', 16
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Certification pass', 'Certification pass', 'approval',
  'ongoing', 'varies', 'Platform Holder',
  '', '', 17
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Launch day ops & monitoring', 'Launch day ops & monitoring', 'task',
  '1–3d', '24h', 'Live Ops',
  '', '', 18
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Marketing launch coordination', 'Marketing launch coordination', 'task',
  '3–5d', '20h', 'Marketing',
  '', '', 19
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Launch retrospective', 'Launch retrospective', 'meeting',
  '1d', '4h', 'Producer',
  '', '', 20
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Patch/hotfix cadence', 'Patch/hotfix cadence', 'task',
  'ongoing', 'varies', 'Live Ops',
  '', '', 21
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Community & telemetry review', 'Community & telemetry review', 'meeting',
  '1d/week', '4h', 'Product Manager',
  '', '', 22
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Season/content roadmap', 'Season/content roadmap', 'deliverable',
  'ongoing', '8h/sprint', 'Game Designer',
  '', '', 23
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Game Design Document', 'document', true, 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Vertical Slice', 'document', true, 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Alpha Build', 'document', true, 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Beta Build', 'document', false, 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Certification Submission Pack', 'document', false, 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Store Page Assets', 'document', false, 5
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Launch Checklist', 'document', false, 6
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Live Ops Runbook', 'document', false, 7
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Scope creep / feature cut late', 'Scope creep / feature cut late', 'General', 'high', 'medium', 0
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Certification failure', 'Certification failure', 'General', 'medium', 'high', 1
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Key talent attrition', 'Key talent attrition', 'General', 'medium', 'high', 2
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Platform SDK change', 'Platform SDK change', 'General', 'medium', 'medium', 3
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Soft launch performance issues', 'Soft launch performance issues', 'General', 'medium', 'high', 4
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Greenlight', 'Greenlight', 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Vertical Slice Approved', 'Vertical Slice Approved', 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Alpha', 'Alpha', 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Beta', 'Beta', 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Certification Pass', 'Certification Pass', 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Launch', 'Launch', 5
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Producer', 'Producer', true, 0
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Creative Director', 'Creative Director', true, 1
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Tech Lead', 'Tech Lead', true, 2
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Game Designer', 'Game Designer', false, 3
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Art Director', 'Art Director', false, 4
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'QA Lead', 'QA Lead', false, 5
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Release Manager', 'Release Manager', false, 6
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Live Ops Lead', 'Live Ops Lead', false, 7
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';

COMMIT;

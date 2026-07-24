-- v772b expansion: Veterinary & Animal Health Services
BEGIN;

-- Industry: Veterinary & Animal Health Services (veterinary_animal_health)
DELETE FROM public.pmo_industry_template_activities WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health');
DELETE FROM public.pmo_industry_template_deliverables WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health');
DELETE FROM public.pmo_industry_template_risks WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health');
DELETE FROM public.pmo_industry_template_milestones WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health');
DELETE FROM public.pmo_industry_template_roles WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health');
DELETE FROM public.pmo_industry_template_phases WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health');

INSERT INTO public.pmo_industry_templates (
  industry_code, industry_name, description, typical_duration, icon, tags, version, status, is_active, is_deleted
) VALUES (
  'veterinary_animal_health',
  'Veterinary & Animal Health Services',
  'PMO blueprint for Veterinary & Animal Health Services projects — phases, activities, deliverables, risks, milestones, and roles.',
  '1–3 years',
  'paw-print',
  ARRAY['Veterinary','industry-plan','v772b'],
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
SELECT id, 1, 'Service/Facility Planning', 'Service/Facility Planning phase for Veterinary & Animal Health Services.', '3–6w', 1
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 2, 'Regulatory & Licensing', 'Regulatory & Licensing phase for Veterinary & Animal Health Services.', '4–10w', 2
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 3, 'Facility Design & Fit-Out', 'Facility Design & Fit-Out phase for Veterinary & Animal Health Services.', '8–16w', 3
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 4, 'Equipment & Systems Procurement', 'Equipment & Systems Procurement phase for Veterinary & Animal Health Services.', '4–8w', 4
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 5, 'Staffing & Training', 'Staffing & Training phase for Veterinary & Animal Health Services.', '4–8w', 5
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 6, 'Systems & Compliance Testing', 'Systems & Compliance Testing phase for Veterinary & Animal Health Services.', '2–4w', 6
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 7, 'Soft Opening', 'Soft Opening phase for Veterinary & Animal Health Services.', '2–4w', 7
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 8, 'Full Launch & Review', 'Full Launch & Review phase for Veterinary & Animal Health Services.', '2–4w', 8
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Service line & demand assessment', 'Service line & demand assessment', 'task',
  '5–8d', '24h', 'Practice Manager',
  '', '', 0
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Site/facility feasibility', 'Site/facility feasibility', 'task',
  '5–8d', '24h', 'Facilities Planner',
  '', '', 1
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Feasibility sign-off', 'Feasibility sign-off', 'approval',
  '1d', '4h', 'Program Mgr',
  '', '', 2
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Veterinary licensing/accreditation application', 'Veterinary licensing/accreditation application', 'deliverable',
  '10–15d', '40h', 'Regulatory Affairs',
  '', '', 3
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Controlled substances licensing', 'Controlled substances licensing', 'task',
  '5–10d', '20h', 'Regulatory Affairs',
  '', '', 4
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Licensing approval tracking', 'Licensing approval tracking', 'task',
  'ongoing', '2h/week', 'Regulatory Affairs',
  '', '', 5
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Clinical facility design (surgery/imaging)', 'Clinical facility design (surgery/imaging)', 'task',
  '10–15d', '60h', 'Design Eng',
  '', '', 6
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Fit-out construction', 'Fit-out construction', 'task',
  '20–30d', 'ongoing', 'Contractor',
  '', '', 7
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Design/fit-out review', 'Design/fit-out review', 'review',
  '2d', '8h', 'Practice Manager',
  '', '', 8
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Clinical equipment procurement (imaging/lab)', 'Clinical equipment procurement (imaging/lab)', 'task',
  '5–10d', '20h', 'Procurement',
  '', '', 9
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Practice management system setup', 'Practice management system setup', 'task',
  '5–8d', '24h', 'IT Coordinator',
  '', '', 10
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Procurement sign-off', 'Procurement sign-off', 'approval',
  '1d', '4h', 'Practice Manager',
  '', '', 11
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Clinical staff recruitment', 'Clinical staff recruitment', 'task',
  '10–20d', 'ongoing', 'HR Manager',
  '', '', 12
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Onboarding & protocol training', 'Onboarding & protocol training', 'task',
  '5–8d', '30h', 'Head Veterinarian',
  '', '', 13
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Training sign-off', 'Training sign-off', 'approval',
  '1d', '4h', 'Head Veterinarian',
  '', '', 14
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Equipment calibration & testing', 'Equipment calibration & testing', 'task',
  '3–5d', '20h', 'Biomedical Technician',
  '', '', 15
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Infection control/compliance audit', 'Infection control/compliance audit', 'review',
  '2–3d', '12h', 'Compliance Officer',
  '', '', 16
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Compliance sign-off', 'Compliance sign-off', 'approval',
  '1d', '4h', 'Head Veterinarian',
  '', '', 17
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Limited-capacity soft launch', 'Limited-capacity soft launch', 'task',
  '5–10d', 'ongoing', 'Practice Manager',
  '', '', 18
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Client feedback collection', 'Client feedback collection', 'task',
  'ongoing', '2h/d', 'Practice Manager',
  '', '', 19
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Soft opening review', 'Soft opening review', 'review',
  '1d', '4h', 'Practice Manager',
  '', '', 20
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Marketing & community outreach', 'Marketing & community outreach', 'task',
  '5–8d', '24h', 'Marketing Coordinator',
  '', '', 21
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Full-capacity operations start', 'Full-capacity operations start', 'task',
  '1–2d', '8h', 'Practice Manager',
  '', '', 22
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Post-launch performance review', 'Post-launch performance review', 'deliverable',
  '3–5d', '16h', 'Practice Manager',
  '', '', 23
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Feasibility Study', 'document', true, 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Licensing/Accreditation Approval', 'document', true, 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Facility Design Package', 'document', true, 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Equipment Procurement Records', 'document', false, 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Staff Training Records', 'document', false, 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Compliance Audit Report', 'document', false, 5
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Soft Opening Feedback Report', 'document', false, 6
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Post-Launch Review', 'document', false, 7
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Licensing/accreditation delay', 'Licensing/accreditation delay', 'General', 'medium', 'high', 0
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Clinical staff recruitment delay', 'Clinical staff recruitment delay', 'General', 'medium', 'medium', 1
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Equipment delivery delay', 'Equipment delivery delay', 'General', 'medium', 'medium', 2
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Compliance/infection control failure', 'Compliance/infection control failure', 'General', 'low', 'high', 3
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Low client uptake at launch', 'Low client uptake at launch', 'General', 'medium', 'medium', 4
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Feasibility Approved', 'Feasibility Approved', 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Licensing Granted', 'Licensing Granted', 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Fit-Out Complete', 'Fit-Out Complete', 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Compliance Sign-Off', 'Compliance Sign-Off', 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Full Launch', 'Full Launch', 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Program Manager', 'Program Manager', true, 0
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Head Veterinarian', 'Head Veterinarian', true, 1
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Practice Manager', 'Practice Manager', true, 2
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Regulatory Affairs Lead', 'Regulatory Affairs Lead', false, 3
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Facilities Planner', 'Facilities Planner', false, 4
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Compliance Officer', 'Compliance Officer', false, 5
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'HR Manager', 'HR Manager', false, 6
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Biomedical Technician', 'Biomedical Technician', false, 7
FROM public.pmo_industry_templates WHERE industry_code = 'veterinary_animal_health';

COMMIT;

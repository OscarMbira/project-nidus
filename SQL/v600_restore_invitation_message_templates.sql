-- =============================================================================
-- v600_restore_invitation_message_templates.sql
-- Re-seed missing invitation_message_templates per account (idempotent).
-- Does NOT delete or modify sent invitation rows (project_invitations).
-- Prerequisites: v529, v531
-- =============================================================================

INSERT INTO public.invitation_message_templates (
  account_id,
  role_name,
  template_label,
  subject_line,
  message_body,
  is_active
)
SELECT
  a.id,
  v.role_name,
  v.template_label,
  v.subject_line,
  v.message_body,
  TRUE
FROM public.accounts a
CROSS JOIN (
  VALUES
    (
      'project_board_member',
      'Project Board Member',
      NULL,
      'You have been invited to join **{{project_name}}** as a **{{role_name}}**. In this capacity, you will provide strategic direction and governance oversight for the project. We look forward to your valuable contribution.'
    ),
    (
      'project_sponsor',
      'Project Sponsor',
      NULL,
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. Your sponsorship and executive support will be critical to the success of this project. Thank you for championing this initiative.'
    ),
    (
      'programme_manager',
      'Programme Manager',
      NULL,
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. You will be responsible for coordinating delivery across the programme and ensuring benefits realisation. We look forward to working with you.'
    ),
    (
      'project_manager',
      'Project Manager',
      NULL,
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. You will lead day-to-day project delivery, manage the project team, and report progress to the project board. Welcome to the team.'
    ),
    (
      'team_manager',
      'Team Manager',
      NULL,
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. You will coordinate and lead your team''s work packages and contribute to successful project delivery. Looking forward to collaborating with you.'
    ),
    (
      'project_assurance',
      'Project Assurance',
      NULL,
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. Your independent assurance role will help ensure the project remains on track and aligned with organisational standards. Thank you for your involvement.'
    ),
    (
      'quality_assurance',
      'Quality Assurance',
      NULL,
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. You will oversee quality standards and ensure project deliverables meet the agreed quality criteria. Welcome aboard.'
    ),
    (
      'change_authority',
      'Change Authority',
      NULL,
      'You have been invited to join **{{project_name}}** as **{{role_name}}**. You will review and approve changes to project scope, schedule, and budget within defined tolerances. We appreciate your participation.'
    ),
    (
      'team_member',
      'Team Member',
      NULL,
      'You have been invited to join **{{project_name}}** as a **{{role_name}}**. Your contributions will be an important part of delivering this project successfully. Welcome to the team!'
    )
) AS v(role_name, template_label, subject_line, message_body)
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
ON CONFLICT (account_id, role_name) DO NOTHING;

UPDATE public.invitation_message_templates imt
SET
  message_body = rtrim(imt.message_body) || E'\n\n{{invitation_expiry_note}}',
  updated_at = NOW()
WHERE imt.message_body NOT LIKE '%{{invitation_expiry_%';

DO $$ BEGIN RAISE NOTICE 'v600_restore_invitation_message_templates.sql applied'; END $$;

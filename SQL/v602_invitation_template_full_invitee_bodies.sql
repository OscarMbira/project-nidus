-- =============================================================================
-- v602_invitation_template_full_invitee_bodies.sql
-- Align invitation_message_templates with full invitee email content:
-- Dear line, role-specific paragraph, expiry note (project context + buttons are
-- added automatically by the application when the email is sent).
-- Prerequisites: v529, v531
-- =============================================================================

UPDATE public.invitation_message_templates imt
SET
  message_body = v.body,
  updated_at = NOW()
FROM (
  VALUES
    (
      'project_board_member',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. In this capacity, you will provide strategic direction and governance oversight for the project. We look forward to your valuable contribution.\n\n{{invitation_expiry_note}}'
    ),
    (
      'project_sponsor',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. Your sponsorship and executive support will be critical to the success of this project. Thank you for championing this initiative.\n\n{{invitation_expiry_note}}'
    ),
    (
      'programme_manager',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. You will be responsible for coordinating delivery across the programme and ensuring benefits realisation. We look forward to working with you.\n\n{{invitation_expiry_note}}'
    ),
    (
      'project_manager',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. You will lead day-to-day project delivery, manage the project team, and report progress to the project board. Welcome to the team.\n\n{{invitation_expiry_note}}'
    ),
    (
      'team_manager',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. You will coordinate and lead your team''s work packages and contribute to successful project delivery. Looking forward to collaborating with you.\n\n{{invitation_expiry_note}}'
    ),
    (
      'project_assurance',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. Your independent assurance role will help ensure the project remains on track and aligned with organisational standards. Thank you for your involvement.\n\n{{invitation_expiry_note}}'
    ),
    (
      'quality_assurance',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. You will oversee quality standards and ensure project deliverables meet the agreed quality criteria. Welcome aboard.\n\n{{invitation_expiry_note}}'
    ),
    (
      'change_authority',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. You will review and approve changes to project scope, schedule, and budget within defined tolerances. We appreciate your participation.\n\n{{invitation_expiry_note}}'
    ),
    (
      'team_member',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as a **{{role_name}}**. Your contributions will be an important part of delivering this project successfully. Welcome to the team!\n\n{{invitation_expiry_note}}'
    )
) AS v(role_name, body)
WHERE imt.role_name = v.role_name;

-- New accounts / missing rows still get v531-style insert via ensureTemplatesForAccount; re-seed missing:
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
  NULL,
  v.message_body,
  TRUE
FROM public.accounts a
CROSS JOIN (
  VALUES
    (
      'project_board_member',
      'Project Board Member',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. In this capacity, you will provide strategic direction and governance oversight for the project. We look forward to your valuable contribution.\n\n{{invitation_expiry_note}}'
    ),
    (
      'project_sponsor',
      'Project Sponsor',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. Your sponsorship and executive support will be critical to the success of this project. Thank you for championing this initiative.\n\n{{invitation_expiry_note}}'
    ),
    (
      'programme_manager',
      'Programme Manager',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. You will be responsible for coordinating delivery across the programme and ensuring benefits realisation. We look forward to working with you.\n\n{{invitation_expiry_note}}'
    ),
    (
      'project_manager',
      'Project Manager',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. You will lead day-to-day project delivery, manage the project team, and report progress to the project board. Welcome to the team.\n\n{{invitation_expiry_note}}'
    ),
    (
      'team_manager',
      'Team Manager',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. You will coordinate and lead your team''s work packages and contribute to successful project delivery. Looking forward to collaborating with you.\n\n{{invitation_expiry_note}}'
    ),
    (
      'project_assurance',
      'Project Assurance',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. Your independent assurance role will help ensure the project remains on track and aligned with organisational standards. Thank you for your involvement.\n\n{{invitation_expiry_note}}'
    ),
    (
      'quality_assurance',
      'Quality Assurance',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. You will oversee quality standards and ensure project deliverables meet the agreed quality criteria. Welcome aboard.\n\n{{invitation_expiry_note}}'
    ),
    (
      'change_authority',
      'Change Authority',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. You will review and approve changes to project scope, schedule, and budget within defined tolerances. We appreciate your participation.\n\n{{invitation_expiry_note}}'
    ),
    (
      'team_member',
      'Team Member',
      E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as a **{{role_name}}**. Your contributions will be an important part of delivering this project successfully. Welcome to the team!\n\n{{invitation_expiry_note}}'
    )
) AS v(role_name, template_label, message_body)
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
ON CONFLICT (account_id, role_name) DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'v602_invitation_template_full_invitee_bodies.sql applied'; END $$;

# Stakeholder engagement plan elements (v1151)

The engagement plan form records one plan per stakeholder. Fields are split across Levels, Approach, Goals, Escalation, Relationships, Requirements & expectations, Notes, and Audit details. Save and Cancel stay available on every tab. These elements come from the engagement-plan content list, the plan element table, the paper plan, and the Plan Stakeholder Engagement checklist.

## Already on the form

- Current level and desired level
- Engagement approach (how to move the stakeholder to the desired level)
- Method and frequency
- Requirements and expectations, read from the stakeholder record
- Notes and audit details

## Added

- **Unaware** and **Resistant** on current level, desired level, and the planning board. Unsupportive and Blocking stay so existing plans still open.
- **Scope and impact of the change**
- **Engagement goals** (stored in `engagement_success_criteria`)
- **Engagement owner** (stored in `relationship_owner_user_id`)
- **Escalation path**
- **Pending stakeholder changes**
- **Interrelationships**
- **Links to risks, decisions, change, and adoption**

Apply `SQL/v1151_stakeholder_engagement_plan_elements.sql` before saving a plan that uses the new text fields.

Edit links use `engagement_reference` (`EPL-YYYY-###`) instead of the record UUID. Apply `SQL/v1157_engagement_plan_reference.sql` so existing plans receive that reference. An older UUID link still opens the plan, then the address bar switches to the reference.

Process inputs such as the project charter, assumption log, and issue log stay in their own registers. They are not copied onto this form.

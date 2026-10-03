# Communication plan elements (v1152)

The communication plan form records one plan for a project. Fields are split across Plan, Audience, Information, Delivery, Constraints, Glossary, Notes, and Audit details. Save and Cancel stay available on every tab.

## Already on the form

- Plan name, description, status, and start date
- Objectives
- Key messages
- Notes and audit details

## Added to the form from columns that already existed

- End date
- Method (`primary_channels`)

## Information fields (v1153)

Language, format, and level of detail are separate fields on the Information tab.

- **Language** — active rows from `languages`
- **Format** and **Level of detail** — active rows from `communication_information_options`

Apply `SQL/v1153_communication_plan_information_fields.sql` before saving these three fields, and `SQL/v1154_communication_information_options.sql` so the format and level lists have rows to show.

The plan list, the stakeholder chooser, and view/edit links use `plan_reference` (`CPL-YYYY-###`) and the stakeholder’s `stakeholder_reference` (`STK-YYYY-###`) instead of UUIDs. Apply `SQL/v1156_communication_plan_reference.sql` so existing plans receive that reference and the API schema cache reloads. An older UUID link still opens the plan, then the address bar switches to the references.

PMO, project managers, team managers, team leads, and team members maintain those lists from **Stakeholders → Communication formats** and from **PMO Configuration → Communication formats**. Both links open the same catalog. Apply `SQL/v1155_communication_information_options_access.sql` before create, edit, or delete will succeed.

## Added columns

- **Audience** — who needs the information, and what they need
- **Timing** — how often information is provided, and in what circumstances
- **Sender** — the person or group who provides the information
- **Assumptions**
- **Constraints**, including limits on sensitive or confidential information
- **Glossary**

Apply `SQL/v1152_communication_plan_elements.sql` before saving a plan that uses the new text fields.

The project charter, requirements documentation, resource plan, stakeholder register, and stakeholder engagement plan stay on their own pages. They are not copied onto this form.

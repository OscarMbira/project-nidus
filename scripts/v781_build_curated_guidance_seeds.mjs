/**
 * Build curated offline guidance inventory + SQL seeds for all form templates.
 * Run: node scripts/v781_build_curated_guidance_seeds.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const adminRoot = path.resolve(root, '..', 'project-nidus-admin')

const TEMPLATE_META = {
  F001: ['Project Charter', 'initiating'],
  F002: ['Assumption Log', 'initiating'],
  F003: ['Stakeholder Register', 'initiating'],
  F004: ['Stakeholder Analysis', 'initiating'],
  F005: ['Project Management Plan', 'planning'],
  F006: ['Change Management Plan', 'planning'],
  F007: ['Project Roadmap', 'planning'],
  F008: ['Scope Management Plan', 'planning'],
  F009: ['Requirements Management Plan', 'planning'],
  F010: ['Requirements Documentation', 'planning'],
  F011: ['Requirements Traceability Matrix', 'planning'],
  F012: ['Inter-Requirements Traceability Matrix', 'planning'],
  F013: ['Project Scope Statement', 'planning'],
  F014: ['Work Breakdown Structure', 'planning'],
  F015: ['WBS Dictionary', 'planning'],
  F016: ['Schedule Management Plan', 'planning'],
  F017: ['Activity List', 'planning'],
  F018: ['Activity Attributes', 'planning'],
  F019: ['Milestone List', 'planning'],
  F020: ['Network Diagram', 'planning'],
  F021: ['Duration Estimates', 'planning'],
  F022: ['Duration Estimating Worksheet', 'planning'],
  F023: ['Project Schedule', 'planning'],
  F024: ['Cost Management Plan', 'planning'],
  F025: ['Cost Estimates', 'planning'],
  F026: ['Cost Estimating Worksheet', 'planning'],
  F027: ['Bottom-Up Cost Estimating Worksheet', 'planning'],
  F028: ['Cost Baseline', 'planning'],
  F029: ['Quality Management Plan', 'planning'],
  F030: ['Quality Metrics', 'planning'],
  F031: ['Responsibility Assignment Matrix', 'planning'],
  F032: ['Resource Management Plan', 'planning'],
  F033: ['Team Charter', 'planning'],
  F034: ['Resource Requirements', 'planning'],
  F035: ['Resource Breakdown Structure', 'planning'],
  F036: ['Communications Management Plan', 'planning'],
  F037: ['Risk Management Plan', 'planning'],
  F038: ['Risk Register', 'planning'],
  F039: ['Risk Report', 'planning'],
  F040: ['Probability and Impact Assessment', 'planning'],
  F041: ['Probability and Impact Matrix', 'planning'],
  F042: ['Risk Data Sheet', 'planning'],
  F043: ['Procurement Management Plan', 'planning'],
  F044: ['Procurement Strategy', 'planning'],
  F045: ['Source Selection Criteria', 'planning'],
  F046: ['Stakeholder Engagement Plan', 'planning'],
  F047: ['Issue Log', 'executing'],
  F048: ['Decision Log', 'executing'],
  F049: ['Change Request', 'executing'],
  F050: ['Change Log', 'executing'],
  F051: ['Lessons Learned Register', 'executing'],
  F052: ['Quality Audit', 'executing'],
  F053: ['Team Performance Assessment', 'executing'],
  F054: ['Team Member Status Report', 'monitoring_controlling'],
  F055: ['Project Status Report', 'monitoring_controlling'],
  F056: ['Variance Analysis', 'monitoring_controlling'],
  F057: ['Earned Value Analysis', 'monitoring_controlling'],
  F058: ['Risk Audit', 'monitoring_controlling'],
  F059: ['Contractor Status Report', 'monitoring_controlling'],
  F060: ['Procurement Audit', 'monitoring_controlling'],
  F061: ['Contract Closeout Report', 'monitoring_controlling'],
  F062: ['Product Acceptance Form', 'monitoring_controlling'],
  F063: ['Lessons Learned Summary', 'closing'],
  F064: ['Project or Phase Closeout', 'closing'],
  F065: ['Product Vision', 'agile'],
  F066: ['Product Backlog', 'agile'],
  F067: ['Release Plan', 'agile'],
  F068: ['Retrospective', 'agile'],
}

/** Hand-curated overrides: template_code -> field_key -> { help, sample } */
const CURATED = {
  F001: {
    purpose: {
      help: 'Summarise why this project exists and the business problem or opportunity it addresses. Include strategic alignment and expected organisational benefit.',
      sample: 'Implement a unified Digital Workplace Platform to replace fragmented collaboration tools and improve hybrid-team productivity.',
    },
    objectives: {
      help: 'List measurable project objectives (SMART): outcome, measure, target date.',
      sample: '1. Deploy to 2,500 users by 30 Jun 2027. 2. Retire three legacy tools within 90 days of go-live.',
    },
    success_criteria: {
      help: 'Define how success will be judged at project close (acceptance, quality, benefit checkpoints).',
      sample: 'UAT accepted; migration defect reopen <2%; cost/schedule within ±10% of baseline.',
    },
    sponsor: {
      help: 'Name the executive sponsor and their role.',
      sample: 'Amina Okonkwo — Chief Operating Officer (Executive Sponsor)',
    },
    high_level_requirements: {
      help: 'Capture high-level must-have requirements that justify initiating the project. Defer detail to Requirements Documentation (F010).',
      sample: 'SSO via corporate IdP; secure external guest sharing; mobile iOS/Android with offline read.',
    },
    high_level_risks: {
      help: 'Identify top initiation risks and owners; detail later in the Risk Register (F038).',
      sample: 'Low adoption if change management is under-resourced — Owner: Change Lead.',
    },
    summary_budget: {
      help: 'Enter the approved high-level budget envelope (organisation currency).',
      sample: '1850000',
    },
    milestone_schedule: {
      help: 'List key initiation and early delivery milestones with target dates.',
      sample: 'Charter approved — 15 Aug 2026; Kick-off — 01 Sep 2026; Org-wide go-live — 30 Jun 2027',
    },
    pm_authority_level: {
      help: 'Select the authority level granted to the project manager for decisions and spend.',
      sample: 'medium',
    },
    assumptions: {
      help: 'Document assumptions that, if proven false, may impact scope, cost, or schedule.',
      sample: 'Corporate IdP and licensing available before build starts.',
    },
    constraints: {
      help: 'List known constraints (budget, dates, regulatory, resource, technology).',
      sample: 'Go-live before legacy licence renewal (30 Sep 2027).',
    },
    business_case_summary: {
      help: 'Provide a short business-case summary: options considered, preferred option, and expected value.',
      sample: 'Preferred option: unified platform. Approx. USD 2.4m benefit / USD 1.85m investment over 3 years.',
    },
    key_stakeholders: {
      help: 'List key stakeholders who must endorse or be informed of the charter (name, role, organisation).',
      sample: 'COO (sponsor); CIO; Business Owner — Shared Services; IT Operations Lead',
    },
    approval_signatures: {
      help: 'Record approver name, role, decision (approve/reject), and date for charter authorisation.',
      sample: 'Sponsor: ________  Date: ________  |  PMO: ________  Date: ________',
    },
    project_summary: {
      help: 'One-paragraph overview of what will be delivered and for whom.',
      sample: 'Cross-functional programme to standardise collaboration tooling for all employees.',
    },
    assigned_pm: {
      help: 'Name the assigned project manager (and organisation if relevant).',
      sample: 'Jordan Lee — PMO',
    },
    charter_date: {
      help: 'Date this charter version is authorised or issued.',
      sample: '2026-08-15',
    },
  },
  F004: {
    stakeholder_name: {
      help: 'Enter the stakeholder’s full name (or group name) as used in organisational records.',
      sample: 'Priya Nair — Head of Shared Services',
    },
    current_engagement: {
      help: 'Select how engaged this stakeholder is today (unaware → leading). Base this on recent behaviour, not aspiration.',
      sample: 'neutral',
    },
    desired_engagement: {
      help: 'Select the engagement level required for project success by the next major milestone.',
      sample: 'supportive',
    },
    key_requirements: {
      help: 'Summarise what this stakeholder needs from the project (outcomes, constraints, non-negotiables). Be factual and specific.',
      sample: 'Retain department file structures; SSO before pilot; weekly status for Shared Services leadership.',
    },
    engagement_strategy: {
      help: 'Describe how you will move them from current to desired engagement (forums, sponsors, incentives, escalation).',
      sample: 'Bi-weekly working sessions with Shared Services SMEs; COO sponsorship message at kick-off.',
    },
    communication_approach: {
      help: 'State channel, frequency, content, and owner for communications with this stakeholder.',
      sample: 'Monthly steering pack (email + 30-min call); owner: Project Manager.',
    },
    engagement_actions: {
      help: 'List near-term actions, owners, and due dates that will improve engagement.',
      sample: '1) Schedule discovery workshop by 05 Sep 2026 (PM). 2) Share draft RACI for review (BA).',
    },
    responsible_person: {
      help: 'Name the team member accountable for managing this stakeholder relationship.',
      sample: 'Jordan Lee — Project Manager',
    },
    review_date: {
      help: 'Enter the next date this engagement assessment will be reviewed and updated.',
      sample: '2026-09-30',
    },
  },
  F050: {
    change_id: {
      help: 'Enter the unique change identifier used in the change log / change request process (e.g. CR-2026-014).',
      sample: 'CR-2026-014',
    },
    change_summary: {
      help: 'Summarise what is changing in one or two sentences: scope, deliverable, or baseline impacted.',
      sample: 'Extend pilot from 200 to 500 users in Finance to validate SSO under peak load.',
    },
    status: {
      help: 'Select the current decision status of this change (submitted, approved, rejected, or deferred).',
      sample: 'approved',
    },
    decision_date: {
      help: 'Enter the date the CCB / sponsor decision was recorded.',
      sample: '2026-10-12',
    },
    corrective_actions: {
      help: 'List actions to correct the issue that triggered the change, with owners and due dates.',
      sample: 'Increase IdP connection pool — Owner: IT Ops — Due: 20 Oct 2026.',
    },
    preventive_actions: {
      help: 'List actions to prevent recurrence (process, monitoring, training), with owners and due dates.',
      sample: 'Add load test gate before each pilot expansion — Owner: QA Lead — Due: 25 Oct 2026.',
    },
    verification_date: {
      help: 'Enter the date corrective/preventive actions were (or will be) verified as complete.',
      sample: '2026-10-28',
    },
  },
}

const KEY_HINTS = [
  [/purpose|vision|summary|overview|description|narrative/i, (l, t) => [`Explain ${l} for ${t} so a reader without system access understands context, intent, and expected outcome.`, `For the Nidus Digital Workplace Platform: concise factual statement covering ${l.toLowerCase()}.`]],
  [/objective|goal|success|benefit|outcome/i, (l, t) => [`List measurable ${l.toLowerCase()} for ${t} (metric, target, and date where possible).`, `1. Achieve agreed ${l.toLowerCase()} by the next checkpoint.\n2. Confirm acceptance criteria with the sponsor.`]],
  [/assumption/i, (l) => [`Document each assumption that, if false, would affect scope, cost, schedule, or benefits. Include owner if known.`, `Licensing and identity services are available before build start.`]],
  [/constraint/i, (l) => [`List hard constraints (date, budget, regulatory, technology, resource) that the team must work within.`, `Must complete before legacy licence renewal date.`]],
  [/risk/i, (l, t) => [`Describe the risk for ${t}: cause, event, impact, and owner. Keep language factual.`, `Adoption risk if change support is under-resourced — Owner: Change Lead.`]],
  [/issue|problem|blocker/i, (l) => [`State the issue clearly: impact, urgency, owner, and next action.`, `Pilot blocked by SSO timeout under load — Owner: IT Ops.`]],
  [/decision/i, (l) => [`Record the decision, options considered, rationale, and decision-maker.`, `Approve pilot expansion to Finance — Decision maker: Sponsor.`]],
  [/change/i, (l, t) => [`Describe the change for ${t}: what differs from baseline, why, and impact on scope/schedule/cost.`, `Increase pilot cohort from 200 to 500 users in Finance.`]],
  [/stakeholder|sponsor|owner|pm|manager|responsible|assigned/i, (l) => [`Enter the person’s full name and role (organisation optional). Use names consistent with the stakeholder register.`, `Jordan Lee — Project Manager`]],
  [/requirement|expectation|criteria|acceptance/i, (l, t) => [`Capture ${l.toLowerCase()} for ${t} in testable language. Avoid vague adjectives.`, `SSO via corporate IdP; offline read on mobile; UAT signed by Business Owner.`]],
  [/scope|in_scope|out_scope|deliverable|wbs/i, (l, t) => [`Define ${l.toLowerCase()} for ${t} clearly enough to prevent later ambiguity.`, `In scope: core collaboration suites for 2,500 users. Out of scope: custom ERP connectors.`]],
  [/schedule|milestone|duration|activity|date|deadline|due/i, (l) => {
    if (/date|deadline|due/i.test(l) || /_date$|date$/i.test(l)) {
      return [`Enter the calendar date for ${l} (organisation local date).`, `2026-09-15`]
    }
    return [`Provide ${l.toLowerCase()} with dates and dependencies that matter to delivery.`, `Kick-off 01 Sep 2026; UAT 15 May 2027; Go-live 30 Jun 2027.`]
  }],
  [/cost|budget|estimate|baseline|price|amount|money/i, (l) => [`Enter ${l.toLowerCase()} using the organisation’s currency and note whether figures are estimate or approved.`, `1850000`]],
  [/quality|metric|audit|defect/i, (l, t) => [`State ${l.toLowerCase()} for ${t} with measure, target, and how it will be verified.`, `Critical defect reopen rate <2% after migration.`]],
  [/resource|role|team|raci|responsibility/i, (l) => [`Identify who does what: role, named person if known, and capacity or responsibility level.`, `BA — 0.5 FTE; Dev Lead — named; PMO support — shared.`]],
  [/communication|engagement|approach|strategy|action/i, (l, t) => [`Describe ${l.toLowerCase()} for ${t}: audience, channel, frequency, message, and owner.`, `Monthly steering pack by email + 30-min call; owner: Project Manager.`]],
  [/status|state|phase|level|priority|severity|impact|probability|authority/i, (l) => [`Select the value that best reflects current ${l.toLowerCase()}. Prefer evidence over aspiration.`, null]],
  [/lesson|retro|improvement/i, (l) => [`Capture the lesson or improvement: what happened, insight, and recommended change to process or product.`, `Earlier load testing would have caught IdP pool limits before pilot expansion.`]],
  [/id|reference|code|number/i, (l) => [`Enter the unique identifier used in project records for this item (keep format consistent with the log).`, `CR-2026-014`]],
  [/title|name|label/i, (l, t) => [`Enter a clear ${l.toLowerCase()} that uniquely identifies this ${t} entry.`, `Digital Workplace — Finance pilot expansion`]],
]

function sqlEscape(s) {
  return String(s ?? '').replace(/'/g, "''")
}

function firstOptionValue(field) {
  const opts = field.options
  if (!Array.isArray(opts) || !opts.length) return ''
  const mid = opts.find((o) => String(o.value || o).toLowerCase() === 'medium')
  if (mid) return String(mid.value ?? mid)
  const o = opts[0]
  return String(o.value ?? o.label ?? o)
}

function buildGuidance(templateCode, templateName, field) {
  const curated = CURATED[templateCode]?.[field.key]
  if (curated) return { help: curated.help, sample: curated.sample ?? '' }

  const label = field.label || field.key
  const type = field.type || 'text'
  let help = null
  let sample = null

  for (const [re, fn] of KEY_HINTS) {
    if (re.test(field.key) || re.test(label)) {
      const [h, s] = fn(label, templateName)
      help = h
      sample = s
      break
    }
  }

  if (!help) {
    if (type === 'date') {
      help = `Enter the date for ${label} using the organisation calendar.`
      sample = '2026-09-15'
    } else if (type === 'number' || type === 'money') {
      help = `Enter the numeric value for ${label}. Use organisation currency units for money fields; do not include currency symbols unless required.`
      sample = type === 'money' ? '1850000' : '12'
    } else if (type === 'select') {
      help = `Choose the option that best describes ${label} for ${templateName}. Prefer the current factual state.`
      sample = firstOptionValue(field)
    } else if (type === 'textarea') {
      help = `Describe ${label} for ${templateName} in enough detail that an offline reader can act without system context. Include owners, dates, and measures where relevant.`
      sample = `Sample entry for ${label} on the Nidus Digital Workplace Platform — customise names, dates, and owners for your project.`
    } else {
      help = `Enter ${label} for ${templateName}. Be specific and consistent with related project registers and baselines.`
      sample = `Sample ${label} — Nidus Digital Workplace Platform`
    }
  }

  if (type === 'select' && !sample) sample = firstOptionValue(field)
  if (type === 'date' && !sample) sample = '2026-09-15'
  if ((type === 'number' || type === 'money') && !sample) sample = type === 'money' ? '1850000' : '12'
  if (!sample) {
    sample = type === 'textarea'
      ? `Sample entry for ${label} on the Nidus Digital Workplace Platform — customise for your project.`
      : `Sample ${label} — Digital Workplace`
  }

  // Never emit banned boilerplate
  if (/Briefly complete|understood offline without system context/i.test(help)) {
    help = `Enter ${label} for ${templateName} with enough factual detail for offline readers.`
  }

  return { help, sample }
}

function parseInventory() {
  const txt = fs.readFileSync(path.join(root, 'SQL/v759_form_template_field_seeds_expanded.sql'), 'utf8')
  const templates = new Map()
  const re = /\('(F\d+)',\s*'(\{.*?})'::jsonb\)/gs
  let m
  while ((m = re.exec(txt))) {
    const code = m[1]
    if (templates.has(code)) continue
    try {
      const schema = JSON.parse(m[2])
      templates.set(code, {
        title: schema.title || TEMPLATE_META[code]?.[0] || code,
        process_group: TEMPLATE_META[code]?.[1] || '',
        sections: schema.sections || [],
      })
    } catch (e) {
      console.error('parse fail', code, e.message)
    }
  }
  return templates
}

function buildRows(templates) {
  const rows = []
  for (const [code, tmpl] of [...templates.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const name = tmpl.title
    for (const sec of tmpl.sections || []) {
      for (const field of sec.fields || []) {
        const { help, sample } = buildGuidance(code, name, field)
        rows.push({
          template_code: code,
          template_name: name,
          section_key: sec.key || 'general',
          field_key: field.key,
          label: field.label || field.key,
          type: field.type || 'text',
          help,
          sample,
        })
      }
    }
  }
  return rows
}

function emitAdminSql(rows) {
  const values = rows.map((r) =>
    `    ('${r.template_code}', '${sqlEscape(r.section_key)}', '${sqlEscape(r.field_key)}', '${sqlEscape(r.help)}', '${sqlEscape(r.sample)}')`
  ).join(',\n')

  return `-- =============================================================================
-- v179: Curated offline guidance (help) + sample for ALL Global form_template payloads
-- Plan: projectplans/v179_systemwide_form_template_curated_offline_guidance_plan.md
-- Companion: monorepo SQL/v781_form_template_curated_offline_guidance_seed.sql
-- Idempotent: overwrites help/sample; replaces v178 generic boilerplate
-- =============================================================================

CREATE TEMP TABLE IF NOT EXISTS tmp_v179_guidance (
    template_code TEXT NOT NULL,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    help_text TEXT NOT NULL,
    sample_text TEXT NOT NULL
);

TRUNCATE tmp_v179_guidance;

INSERT INTO tmp_v179_guidance (template_code, section_key, field_key, help_text, sample_text) VALUES
${values};

DO $$
DECLARE
    r RECORD;
    v_schema JSONB;
    v_sections JSONB;
    v_sec JSONB;
    v_new_fields JSONB;
    v_field JSONB;
    v_key TEXT;
    v_sec_key TEXT;
    v_help TEXT;
    v_sample TEXT;
    v_updated_templates INT := 0;
    v_updated_fields INT := 0;
BEGIN
    FOR r IN
        SELECT id, payload
        FROM admin.global_template_library
        WHERE domain = 'form_template'
          AND record_status <> 'history'
          AND COALESCE(payload->>'template_code', '') ~ '^F[0-9]+$'
    LOOP
        v_schema := COALESCE(r.payload->'schema', '{}'::jsonb);
        v_sections := '[]'::jsonb;

        FOR v_sec IN SELECT * FROM jsonb_array_elements(COALESCE(v_schema->'sections', '[]'::jsonb))
        LOOP
            v_sec_key := COALESCE(v_sec->>'key', 'general');
            v_new_fields := '[]'::jsonb;
            FOR v_field IN SELECT * FROM jsonb_array_elements(COALESCE(v_sec->'fields', '[]'::jsonb))
            LOOP
                v_key := v_field->>'key';
                SELECT g.help_text, g.sample_text
                  INTO v_help, v_sample
                  FROM tmp_v179_guidance g
                 WHERE g.template_code = r.payload->>'template_code'
                   AND g.field_key = v_key
                   AND (g.section_key = v_sec_key OR g.section_key = 'general')
                 ORDER BY CASE WHEN g.section_key = v_sec_key THEN 0 ELSE 1 END
                 LIMIT 1;

                IF v_help IS NOT NULL THEN
                    v_field := jsonb_set(v_field, '{help}', to_jsonb(v_help), true);
                    v_updated_fields := v_updated_fields + 1;
                END IF;
                IF v_sample IS NOT NULL AND NULLIF(trim(v_sample), '') IS NOT NULL THEN
                    v_field := jsonb_set(v_field, '{sample}', to_jsonb(v_sample), true);
                END IF;
                v_new_fields := v_new_fields || jsonb_build_array(v_field);
            END LOOP;
            v_sec := jsonb_set(v_sec, '{fields}', v_new_fields, true);
            v_sections := v_sections || jsonb_build_array(v_sec);
        END LOOP;

        v_schema := jsonb_set(COALESCE(v_schema, '{}'::jsonb), '{sections}', v_sections, true);
        UPDATE admin.global_template_library
        SET payload = jsonb_set(payload, '{schema}', v_schema, true),
            updated_at = NOW()
        WHERE id = r.id;
        v_updated_templates := v_updated_templates + 1;
    END LOOP;

    RAISE NOTICE 'v179 curated guidance: templates=%, field help writes=%', v_updated_templates, v_updated_fields;
END $$;
`
}

function emitMonorepoSql(rows) {
  const values = rows.map((r) =>
    `    ('${r.template_code}', '${sqlEscape(r.section_key)}', '${sqlEscape(r.field_key)}', '${sqlEscape(r.help)}', to_jsonb('${sqlEscape(r.sample)}'::text))`
  ).join(',\n')

  const schemaPatchFn = (schema) => `
-- Patch current ${schema}.form_template_versions.schema help/sample
DO $$
DECLARE
    r RECORD;
    v_schema JSONB;
    v_sections JSONB;
    v_sec JSONB;
    v_new_fields JSONB;
    v_field JSONB;
    v_key TEXT;
    v_sec_key TEXT;
    v_help TEXT;
    v_sample JSONB;
    v_n INT := 0;
BEGIN
    FOR r IN
        SELECT t.template_code, v.id AS version_id, v.schema
        FROM ${schema}.form_templates t
        JOIN ${schema}.form_template_versions v ON v.template_id = t.id AND v.is_current = TRUE
    LOOP
        v_schema := COALESCE(r.schema, '{}'::jsonb);
        v_sections := '[]'::jsonb;
        FOR v_sec IN SELECT * FROM jsonb_array_elements(COALESCE(v_schema->'sections', '[]'::jsonb))
        LOOP
            v_sec_key := COALESCE(v_sec->>'key', 'general');
            v_new_fields := '[]'::jsonb;
            FOR v_field IN SELECT * FROM jsonb_array_elements(COALESCE(v_sec->'fields', '[]'::jsonb))
            LOOP
                v_key := v_field->>'key';
                SELECT g.help_text, g.sample_value
                  INTO v_help, v_sample
                  FROM tmp_v781_guidance g
                 WHERE g.template_code = r.template_code
                   AND g.field_key = v_key
                   AND (g.section_key = v_sec_key OR g.section_key = 'general')
                 ORDER BY CASE WHEN g.section_key = v_sec_key THEN 0 ELSE 1 END
                 LIMIT 1;
                IF v_help IS NOT NULL THEN
                    v_field := jsonb_set(v_field, '{help}', to_jsonb(v_help), true);
                    v_n := v_n + 1;
                END IF;
                IF v_sample IS NOT NULL THEN
                    v_field := jsonb_set(v_field, '{sample}', to_jsonb(v_sample #>> '{}'), true);
                END IF;
                v_new_fields := v_new_fields || jsonb_build_array(v_field);
            END LOOP;
            v_sec := jsonb_set(v_sec, '{fields}', v_new_fields, true);
            v_sections := v_sections || jsonb_build_array(v_sec);
        END LOOP;
        UPDATE ${schema}.form_template_versions
        SET schema = jsonb_set(COALESCE(schema, '{}'::jsonb), '{sections}', v_sections, true)
        WHERE id = r.version_id;
    END LOOP;
    RAISE NOTICE 'v781 ${schema} schema help patches=%', v_n;
END $$;
`

  const orgUpsert = (schema) => `
INSERT INTO ${schema}.form_template_field_defaults (
    organisation_id, template_id, section_key, field_key, default_value, guidance_text
)
SELECT
    a.id,
    t.id,
    g.section_key,
    g.field_key,
    g.sample_value,
    g.help_text
FROM public.accounts a
CROSS JOIN ${schema}.form_templates t
JOIN tmp_v781_guidance g ON g.template_code = t.template_code
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
ON CONFLICT (organisation_id, template_id, section_key, field_key) DO UPDATE SET
    default_value = CASE
        WHEN ${schema}.form_template_field_defaults.default_value IS NULL
          OR NULLIF(trim(both '"' from ${schema}.form_template_field_defaults.default_value::text), '') IS NULL
          OR ${schema}.form_template_field_defaults.default_value::text ILIKE '%Sample (% — %)%Nidus Digital Workplace%'
          OR ${schema}.form_template_field_defaults.default_value::text ILIKE '%Customise names, dates, owners%'
        THEN EXCLUDED.default_value
        ELSE ${schema}.form_template_field_defaults.default_value
    END,
    guidance_text = CASE
        WHEN ${schema}.form_template_field_defaults.guidance_text IS NULL
          OR NULLIF(trim(${schema}.form_template_field_defaults.guidance_text), '') IS NULL
          OR ${schema}.form_template_field_defaults.guidance_text ILIKE 'Briefly complete %'
          OR ${schema}.form_template_field_defaults.guidance_text ILIKE '%understood offline without system context%'
          OR ${schema}.form_template_field_defaults.guidance_text ILIKE 'Complete % for %(%'
          OR ${schema}.form_template_field_defaults.guidance_text ILIKE 'Select the appropriate % for %(%'
        THEN EXCLUDED.guidance_text
        ELSE ${schema}.form_template_field_defaults.guidance_text
    END,
    updated_at = NOW();
`

  return `-- =============================================================================
-- v781: Curated offline guidance for ALL form templates (Platform + Simulator)
-- Plan: projectplan/v781_systemwide_form_template_curated_offline_guidance_plan.md
-- Companion Admin: SQL/v179_global_form_template_curated_guidance_seed.sql
-- Idempotent: patches schema help/sample; upserts org defaults (overwrites boilerplate only)
-- Apply after Admin v179 (optional publish) so catalogs stay aligned.
-- =============================================================================

CREATE TEMP TABLE IF NOT EXISTS tmp_v781_guidance (
    template_code TEXT NOT NULL,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    help_text TEXT NOT NULL,
    sample_value JSONB NOT NULL
);

TRUNCATE tmp_v781_guidance;

INSERT INTO tmp_v781_guidance (template_code, section_key, field_key, help_text, sample_value) VALUES
${values};

${schemaPatchFn('public')}
${schemaPatchFn('sim')}

${orgUpsert('public')}
${orgUpsert('sim')}

-- Smoke: remaining boilerplate should be 0 after apply (org defaults)
DO $$
DECLARE
    v_pub INT;
    v_sim INT;
BEGIN
    SELECT COUNT(*) INTO v_pub FROM public.form_template_field_defaults
    WHERE guidance_text ILIKE 'Briefly complete %'
       OR guidance_text ILIKE '%understood offline without system context%'
       OR guidance_text ILIKE 'Complete % for %(%Align with organisational standards%';
    SELECT COUNT(*) INTO v_sim FROM sim.form_template_field_defaults
    WHERE guidance_text ILIKE 'Briefly complete %'
       OR guidance_text ILIKE '%understood offline without system context%'
       OR guidance_text ILIKE 'Complete % for %(%Align with organisational standards%';
    RAISE NOTICE 'v781 leftover boilerplate guidance rows: public=%, sim=%', v_pub, v_sim;
END $$;
`
}

function emitSmokeAdmin() {
  return `-- v179b: smoke — count leftover boilerplate help on Admin global form_templates
SELECT COUNT(*) AS boilerplate_help_fields
FROM admin.global_template_library g
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(g.payload->'schema'->'sections', '[]'::jsonb)) sec
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(sec->'fields', '[]'::jsonb)) fld
WHERE g.domain = 'form_template'
  AND g.record_status <> 'history'
  AND (
    COALESCE(fld->>'help', '') ILIKE 'Briefly complete %'
    OR COALESCE(fld->>'help', '') ILIKE '%understood offline without system context%'
  );
-- Expect 0 after v179 seed.
`
}

const templates = parseInventory()
const rows = buildRows(templates)
console.log(`templates=${templates.size} fields=${rows.length}`)

const invPath = path.join(root, 'projectplan/_v781_form_template_inventory.json')
fs.writeFileSync(invPath, JSON.stringify({ count: rows.length, rows }, null, 2))

const adminSql = emitAdminSql(rows)
const adminSqlPath = path.join(adminRoot, 'SQL', 'v179_global_form_template_curated_guidance_seed.sql')
fs.writeFileSync(adminSqlPath, adminSql)
fs.writeFileSync(path.join(adminRoot, 'SQL', 'v179b_curated_guidance_boilerplate_smoke.sql'), emitSmokeAdmin())

const monoSql = emitMonorepoSql(rows)
const monoSqlPath = path.join(root, 'SQL', 'v781_form_template_curated_offline_guidance_seed.sql')
fs.writeFileSync(monoSqlPath, monoSql)

// Sample assertions for tests
const f004 = rows.filter((r) => r.template_code === 'F004')
const f050 = rows.filter((r) => r.template_code === 'F050')
fs.writeFileSync(
  path.join(root, 'packages/shared/src/utils/__tests__/fixtures/v781_curated_guidance_samples.json'),
  JSON.stringify({
    F004: Object.fromEntries(f004.map((r) => [r.field_key, { help: r.help, sample: r.sample }])),
    F050: Object.fromEntries(f050.map((r) => [r.field_key, { help: r.help, sample: r.sample }])),
  }, null, 2),
)

console.log('Wrote', adminSqlPath)
console.log('Wrote', monoSqlPath)
console.log('F004 help sample:', f004.find((r) => r.field_key === 'stakeholder_name')?.help)
console.log('F050 help sample:', f050.find((r) => r.field_key === 'change_id')?.help)

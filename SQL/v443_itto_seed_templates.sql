-- ============================================================================
-- v443: ITTO — seed organisation templates (v352) — generic process names only
-- Prerequisites: v439. Inserts once per organisation when tagged seed not present.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_uid UUID;
BEGIN
  FOR r IN
    SELECT a.id AS organisation_id
    FROM public.accounts a
    WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.itto_templates t
      WHERE t.organisation_id = r.organisation_id
        AND 'seed:v352' = ANY(t.tags)
    ) THEN
      CONTINUE;
    END IF;

    SELECT u.id INTO v_uid
    FROM public.users u
    WHERE u.id = (SELECT owner_user_id FROM public.accounts WHERE id = r.organisation_id LIMIT 1)
    LIMIT 1;

    INSERT INTO public.itto_templates (
      organisation_id, name, process_group, knowledge_area, description,
      inputs, tools_techniques, outputs, tags, status, is_draft, created_by
    )
    VALUES
      (
        r.organisation_id,
        'Develop Project Charter',
        'Initiating',
        'Integration',
        'High-level process to authorise the project and document initial stakeholder expectations.',
        '[
          {"id":"i1","name":"Business case","description":"Documented need and benefits","source":"Sponsor"},
          {"id":"i2","name":"Agreements","description":"Contracts or MOUs","source":"Legal / procurement"}
        ]'::jsonb,
        '[
          {"id":"t1","name":"Expert judgment","type":"Technique","description":"Consult subject matter experts"},
          {"id":"t2","name":"Facilitation","type":"Technique","description":"Workshops with stakeholders"}
        ]'::jsonb,
        '[
          {"id":"o1","name":"Project charter","description":"Authorised project definition","destination":"Project manager"},
          {"id":"o2","name":"Assumption log","description":"Initial assumptions","destination":"Risk register"}
        ]'::jsonb,
        ARRAY['seed:v352','charter','initiating'],
        'active',
        FALSE,
        v_uid
      ),
      (
        r.organisation_id,
        'Define Scope',
        'Planning',
        'Scope',
        'Progressively elaborate and document what is in and out of scope.',
        '[
          {"id":"i1","name":"Project charter","description":"High-level scope","source":"Initiating"},
          {"id":"i2","name":"Requirements documentation","description":"Collected needs","source":"Stakeholders"}
        ]'::jsonb,
        '[
          {"id":"t1","name":"Product analysis","type":"Technique","description":"Decompose deliverables"},
          {"id":"t2","name":"Alternatives analysis","type":"Technique","description":"Compare delivery options"}
        ]'::jsonb,
        '[
          {"id":"o1","name":"Scope statement","description":"Narrative scope boundaries","destination":"Baseline"},
          {"id":"o2","name":"Requirements trace matrix","description":"Links requirements to objectives","destination":"Configuration"}
        ]'::jsonb,
        ARRAY['seed:v352','scope'],
        'active',
        FALSE,
        v_uid
      ),
      (
        r.organisation_id,
        'Develop Schedule',
        'Planning',
        'Schedule',
        'Build a workable timetable for delivery milestones and dependencies.',
        '[
          {"id":"i1","name":"Scope baseline","description":"Work packages","source":"Scope"},
          {"id":"i2","name":"Resource calendars","description":"Availability","source":"HR"}
        ]'::jsonb,
        '[
          {"id":"t1","name":"Critical path method","type":"Technique","description":"Network analysis"},
          {"id":"t2","name":"Resource optimisation","type":"Technique","description":"Level and smooth workloads"}
        ]'::jsonb,
        '[
          {"id":"o1","name":"Schedule baseline","description":"Approved timeline","destination":"Performance reports"},
          {"id":"o2","name":"Milestone list","description":"Key dates","destination":"Steering"}
        ]'::jsonb,
        ARRAY['seed:v352','schedule'],
        'active',
        FALSE,
        v_uid
      ),
      (
        r.organisation_id,
        'Estimate Costs',
        'Planning',
        'Cost',
        'Forecast the financial resources needed to complete the work.',
        '[
          {"id":"i1","name":"Scope baseline","description":"Work to be costed","source":"Scope"},
          {"id":"i2","name":"Market rates","description":"Pricing references","source":"Procurement"}
        ]'::jsonb,
        '[
          {"id":"t1","name":"Analogous estimating","type":"Technique","description":"Use historical projects"},
          {"id":"t2","name":"Bottom-up estimating","type":"Technique","description":"Roll up work package costs"}
        ]'::jsonb,
        '[
          {"id":"o1","name":"Cost estimates","description":"Expected amounts by category","destination":"Budget"},
          {"id":"o2","name":"Basis of estimates","description":"Assumptions and sources","destination":"Finance"}
        ]'::jsonb,
        ARRAY['seed:v352','cost'],
        'active',
        FALSE,
        v_uid
      ),
      (
        r.organisation_id,
        'Identify Risks',
        'Planning',
        'Risk',
        'Discover and document uncertainties that may affect objectives.',
        '[
          {"id":"i1","name":"Scope and schedule baselines","description":"Context for uncertainty","source":"Planning"},
          {"id":"i2","name":"Stakeholder register","description":"Who to interview","source":"Stakeholders"}
        ]'::jsonb,
        '[
          {"id":"t1","name":"Brainstorming","type":"Technique","description":"Group ideation"},
          {"id":"t2","name":"Checklists","type":"Technique","description":"Standard risk categories"}
        ]'::jsonb,
        '[
          {"id":"o1","name":"Risk register","description":"List of risks with owners","destination":"Risk process"},
          {"id":"o2","name":"Risk report","description":"Summary for governance","destination":"PMO"}
        ]'::jsonb,
        ARRAY['seed:v352','risk'],
        'active',
        FALSE,
        v_uid
      ),
      (
        r.organisation_id,
        'Direct and Manage Project Work',
        'Executing',
        'Integration',
        'Lead and perform the work defined in the plan to deliver value.',
        '[
          {"id":"i1","name":"Project management plan","description":"How work is executed","source":"Planning"},
          {"id":"i2","name":"Approved changes","description":"Updates to scope or schedule","source":"Change control"}
        ]'::jsonb,
        '[
          {"id":"t1","name":"Meetings","type":"Tool","description":"Coordination and decisions"},
          {"id":"t2","name":"Issue log","type":"Tool","description":"Track and resolve blockers"}
        ]'::jsonb,
        '[
          {"id":"o1","name":"Deliverables","description":"Verified outputs","destination":"Customer"},
          {"id":"o2","name":"Work performance data","description":"Actuals vs plan","destination":"Monitoring"}
        ]'::jsonb,
        ARRAY['seed:v352','executing'],
        'active',
        FALSE,
        v_uid
      ),
      (
        r.organisation_id,
        'Monitor and Control Project Work',
        'Monitoring & Controlling',
        'Integration',
        'Track, review, and regulate progress to meet performance objectives.',
        '[
          {"id":"i1","name":"Performance reports","description":"Status and forecasts","source":"Teams"},
          {"id":"i2","name":"Change requests","description":"Proposed adjustments","source":"Stakeholders"}
        ]'::jsonb,
        '[
          {"id":"t1","name":"Variance analysis","type":"Technique","description":"Compare planned vs actual"},
          {"id":"t2","name":"Meetings","type":"Tool","description":"Steering and governance"}
        ]'::jsonb,
        '[
          {"id":"o1","name":"Change log updates","description":"Recorded decisions","destination":"Configuration"},
          {"id":"o2","name":"Corrective actions","description":"Recovery plans","destination":"Teams"}
        ]'::jsonb,
        ARRAY['seed:v352','monitoring'],
        'active',
        FALSE,
        v_uid
      ),
      (
        r.organisation_id,
        'Close Project or Phase',
        'Closing',
        'Integration',
        'Finalise activities and archive knowledge when work is complete.',
        '[
          {"id":"i1","name":"Accepted deliverables","description":"Verified outcomes","source":"Customer"},
          {"id":"i2","name":"Business case","description":"Benefits criteria","source":"Sponsor"}
        ]'::jsonb,
        '[
          {"id":"t1","name":"Lessons learned sessions","type":"Technique","description":"Capture improvements"},
          {"id":"t2","name":"Archiving","type":"Tool","description":"Store records per policy"}
        ]'::jsonb,
        '[
          {"id":"o1","name":"Final report","description":"Summary of outcomes","destination":"Sponsor"},
          {"id":"o2","name":"Lessons log updates","description":"Knowledge for future use","destination":"Org assets"}
        ]'::jsonb,
        ARRAY['seed:v352','closing'],
        'active',
        FALSE,
        v_uid
      );

    INSERT INTO sim.itto_templates (
      organisation_id, name, process_group, knowledge_area, description,
      inputs, tools_techniques, outputs, tags, status, is_draft, created_by
    )
    SELECT
      t.organisation_id, t.name, t.process_group, t.knowledge_area, t.description,
      t.inputs, t.tools_techniques, t.outputs, t.tags, t.status, t.is_draft, t.created_by
    FROM public.itto_templates t
    WHERE t.organisation_id = r.organisation_id
      AND 'seed:v352' = ANY(t.tags)
      AND NOT EXISTS (
        SELECT 1 FROM sim.itto_templates s
        WHERE s.organisation_id = t.organisation_id AND s.name = t.name
      );

  END LOOP;
END $$;

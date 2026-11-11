-- ============================================================================
-- v1408: Change Management and Training Strategy — system templates (PRD v1339 D8)
-- ============================================================================
-- Two shipped templates every account can start from (New → From template) on the new document
-- registers fin_change_strategy and fin_training_strategy. Each is the sample strategy made generic:
-- people become [Name], dates are left blank, bank and release names become [placeholders]. Content
-- check: no person, vendor or product names, no dates. Re-runnable: upserted by fixed id, version + 1
-- when the content changes. Records already created are not touched. Display ID left blank (rule 16.2).
-- Run after the Change Management and Training register files.
-- ============================================================================

BEGIN;

-- ── Change Management Strategy (core banking replacement) ──
INSERT INTO public.local_register_templates
  (id, display_id, register_key, template_scope, account_id, name, description, version,
   record_title, record_description, record_status, field_values)
VALUES (
  '00000000-0000-4000-b339-000000000001'::uuid, '', 'fin_change_strategy', 'system', NULL,
  $tp$Change Management Strategy (core banking replacement)$tp$,
  $tp$Generic change management strategy for a core banking replacement. Replace the [placeholders] and fill the blank dates and names.$tp$,
  1,
  $tp$Change Management Strategy – [Programme]$tp$,
  $tp$How [Bank] prepares its people for the new core banking platform, and how it knows the change has stuck.$tp$,
  'draft',
  $tp${"document_version":"1.0","change_scale":"transformational","purpose":"To make sure every affected employee knows what is changing, why, and what it means for them, is ready and able to work the new way at go-live, and keeps working that way afterwards.","objectives":"Every affected employee hears about the change from their own manager first\nReadiness score of 75% or more in every business unit before go-live\nChampion in every branch and operations team\nAdoption targets met within 90 days of go-live","scope":"All staff affected by [Release]: branches, contact centre, operations, finance, risk and IT\nChanges to roles, processes, controls and day-to-day tools\nChange network, engagement, readiness and adoption","out_of_scope":"Release 2 products\nOrganisation restructuring not caused by the new platform","assumptions":"Line managers release staff for briefings and training\nThe staff forum is consulted on role changes","constraints":"No large events during month-end weeks\nBranch staff can only attend sessions outside opening hours on two days a week","change_vision":"One modern banking platform that lets our people serve customers faster, with fewer manual steps and fewer handovers.","case_for_change":"The legacy core is out of support, needs heavy manual work for every new product and cannot support real-time payments. Customers expect instant service, and the regulator expects stronger controls.","what_changes":"Account opening\tPaper forms and overnight approval\tSame-day opening with on-screen approval\nTeller overrides\tPaper override slips\tOn-screen overrides in a work queue\nPayments\tBatch release three times a day\tReal-time release with exception queues\nReporting\tManual spreadsheets\tStandard reports from the reporting store","what_stays":"Customer account numbers stay the same for customers\nBranch opening hours\nWho approves high-value payments","change_approach":"Manager-led change supported by a champion in every team. Awareness first, then preparation through impact briefings and training, go-live support from floor walkers and champions, and reinforcement through adoption measures and recognition.","change_phases":"Awareness\t[Month]\tWhy we are changing and what it means\nPreparation\t[Month]\tImpact briefings, training, practice\nGo-live\t[Month]\tFloor walkers, champions, fast answers\nReinforcement\t[Month]\tAdoption measures, coaching, recognition","impacted_groups":"Tellers and customer service\t[Number]\tHigh\nPayments operations\t[Number]\tHigh\nContact centre agents\t[Number]\tHigh\nFinance\t[Number]\tMedium\nRelationship managers\t[Number]\tMedium\nRisk and compliance\t[Number]\tLow","governance":"The change lead reports to the programme board monthly. A change working group of business-unit change leads meets weekly. Readiness results feed the go / no-go decisions.","roles_and_responsibilities":"Executive sponsor\tVisible leadership, removes blockers\t[Name]\nChange management lead\tRuns the change plan and readiness measures\t[Name]\nBusiness-unit change leads\tOwn readiness in their unit\tUnit heads\nChange champions\tLocal voice and support in each team\tNamed in the Change Network register","network_model":"One champion for every 25–30 staff, at least one in every branch. Champions are volunteers nominated by their manager and briefed every two weeks.","champion_ratio":"1 : 25","champion_commitment":"About 2 hours a week, rising to full time in go-live week","engagement_principles":"Managers tell their teams first\nExplain what changes for each role, not just the system\nListen and act on feedback within two weeks","key_messages":"We are changing to serve customers faster and more safely\nYou will be trained and supported before and after go-live\nYour champion is your first port of call","engagement_calendar":"[Month]\tLeadership launch and town hall\tAll staff\t[Name]\n[Month]\tRegional roadshows\tBranch staff\t[Name]\n[Month]\tImpact briefings by manager\tEach team\tLine managers\n[Month]\tGo-live readiness huddles\tAll staff\tChampions","readiness_measures":"Readiness score by business unit\t75% or more\tBaseline, February, before go-live\nStaff who know their champion\t90% or more\tPulse checks","adoption_measures":"Transactions done in the new process\t95% or more\tSystem reports\nUse of paper workarounds\tBelow 2%\tBranch spot checks\nStaff confidence with the new system\t4 out of 5\tPost-go-live survey","sustainment":"Adoption reviewed monthly for 3 months after go-live\nChampions continue as super users\nProcess owners take over adoption measures","risks_mitigations":"Change fatigue alongside other initiatives\tLow engagement\tAlign timing with HR and operations calendars\t[Name]\nManagers not briefing teams\tInconsistent messages\tManager toolkit and briefing tracking\tUnit heads","glossary":"Change champion\tA volunteer in a team who supports colleagues through the change.\nReadiness score\tAverage of five readiness dimensions, as a percentage.","appendices":"Change Impact Assessment\tChange Impact Assessment register\nChange Network\tChange Network register","related_documents":"Training Strategy\t[Reference]\nCutover Strategy\t[Reference]\nHypercare Plan\t[Reference]"}$tp$::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name               = EXCLUDED.name,
  description        = EXCLUDED.description,
  record_title       = EXCLUDED.record_title,
  record_description = EXCLUDED.record_description,
  record_status      = EXCLUDED.record_status,
  version            = public.local_register_templates.version
                       + CASE WHEN public.local_register_templates.field_values IS DISTINCT FROM EXCLUDED.field_values THEN 1 ELSE 0 END,
  field_values       = EXCLUDED.field_values,
  is_archived        = FALSE,
  updated_at         = NOW();

-- ── Training Strategy (core banking replacement) ──
INSERT INTO public.local_register_templates
  (id, display_id, register_key, template_scope, account_id, name, description, version,
   record_title, record_description, record_status, field_values)
VALUES (
  '00000000-0000-4000-b339-000000000002'::uuid, '', 'fin_training_strategy', 'system', NULL,
  $tp$Training Strategy (core banking replacement)$tp$,
  $tp$Generic training strategy for a core banking replacement. Replace the [placeholders] and fill the blank dates and names.$tp$,
  1,
  $tp$Training Strategy – [Programme]$tp$,
  $tp$How [Bank] trains all affected staff to use the new core banking platform before go-live.$tp$,
  'draft',
  $tp${"document_version":"1.0","purpose":"To make sure every affected employee can do their job on the new platform from Day 1, with training timed close to go-live and support afterwards.","objectives":"95% of affected staff trained before go-live\nPass rate of 85% or more on course assessments\nEvery branch has a certified super user\nTraining completed no more than 8 weeks before go-live","scope":"End-user training for [Release] roles\nTrain-the-trainer for super users\nTraining environment and materials\nEffectiveness evaluation after go-live","out_of_scope":"Release 2 products\nIT support team technical training (covered by the vendor contract)","assumptions":"Training environment is ready by 4 [Month]\nManagers release staff for scheduled sessions","constraints":"Branch staff train on Tuesday and Thursday afternoons with branch cover\nNo training in the March month-end week","audiences":"Tellers and customer service\t[Number]\tHigh\tClassroom by super users\nContact centre agents\t[Number]\tHigh\tVirtual classroom and practice\nPayments operations\t[Number]\tHigh\tClassroom\nRelationship managers\t[Number]\tMedium\tBlended\nFinance\t[Number]\tMedium\tClassroom\nAll staff\t[Number]\tLow\tE-learning awareness","delivery_approach":"Super users are trained first and certified, then train their own branches and teams close to go-live. Role-based courses use the training environment with realistic data. E-learning covers awareness for everyone.","delivery_methods":"Classroom\tHands-on role courses\nVirtual classroom\tContact centre and remote teams\nE-learning\tAwareness and refreshers\nOn the job\tFloor walkers in go-live week","train_the_trainer":"Core trainers certify about 120 super users in November and [Month]. Each super user shadows one session before delivering alone.","curriculum_overview":"Branch operations\tTellers and customer service\t16 hours\tClassroom\nPayments operations\tPayments staff\t12 hours\tClassroom\nContact centre essentials\tAgents\t8 hours\tVirtual classroom\nPlatform awareness\tAll staff\t1 hour\tE-learning","trainer_model":"Six core trainers plus super users. Ratio of one super user to about ten learners per session.","environment_approach":"A dedicated training environment refreshed before every session from a masked copy of Mock 2 data.","training_schedule":"Train the trainer\t\t\tSuper user certification\nEnd-user training\t\t\tRole courses\nRefreshers\t\t\tPractice and quick refreshers","assessment_approach":"Every role course ends with a practical exercise in the training environment. Learners who fail repeat the exercise with their super user.","effectiveness_measures":"Reaction\tCourse rating\t4 out of 5\nLearning\tAssessment pass rate\t85%\nBehaviour\tTasks done without help 30 days after go-live\t90%\nResults\tTeller error rate after go-live\tBelow 1%","completion_criteria":"95% of target staff trained\nAll super users certified\nEvery learner who failed has re-sat","roles_and_responsibilities":"Training lead\tOwns the strategy and schedule\t[Name]\nCore trainers\tCertify super users, run specialist courses\tTraining team\nSuper users\tTrain their teams, support in go-live week\tNamed in the Trainers register","risks_mitigations":"Training environment late\tCourses cannot start in January\tWeekly environment checkpoint from December\t[Name]\nLow attendance at branch sessions\tStaff not ready\tManager accountability and make-up sessions\t[Name]","glossary":"Super user\tA trained member of staff who trains and supports colleagues.\nTrain the trainer\tCourse that prepares super users to deliver training.","appendices":"Training Needs Analysis\tTraining Needs Analysis register\nCurriculum\tCurriculum register","related_documents":"Change Management Strategy\t[Reference]\nCutover Strategy\t[Reference]"}$tp$::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name               = EXCLUDED.name,
  description        = EXCLUDED.description,
  record_title       = EXCLUDED.record_title,
  record_description = EXCLUDED.record_description,
  record_status      = EXCLUDED.record_status,
  version            = public.local_register_templates.version
                       + CASE WHEN public.local_register_templates.field_values IS DISTINCT FROM EXCLUDED.field_values THEN 1 ELSE 0 END,
  field_values       = EXCLUDED.field_values,
  is_archived        = FALSE,
  updated_at         = NOW();

COMMIT;

-- Check: the two templates and how many fields each fills.
SELECT t.register_key, t.name, t.version, (SELECT count(*) FROM jsonb_object_keys(t.field_values)) AS fields_filled
FROM public.local_register_templates t
WHERE t.id IN ('00000000-0000-4000-b339-000000000001'::uuid, '00000000-0000-4000-b339-000000000002'::uuid)
ORDER BY t.register_key;

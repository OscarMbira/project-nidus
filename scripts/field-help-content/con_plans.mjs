// v1345 slice 2, wave 5d — CON plan-document registers: commissioning, HSE, inspection, ITPs, method statements,
// recovery, site logistics (source for SQL/v1513).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies:
// role titles, "Example … Ltd", globally familiar places, no product or brand names.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const LINES = 'One item per line.'
const D = (key, title, purpose, notes = null) => [key, title, purpose, ['{example_date}'], DF, notes]
const CP = 'register:con_commissioning_plan:'
const HS = 'register:con_hse_plan:'
const IP = 'register:con_inspection_plan:'
const IT = 'register:con_itps:'
const MS = 'register:con_method_statements:'
const RP = 'register:con_recovery_plans:'
const SL = 'register:con_site_logistics:'

export const MODULE = 'registers_con_plans'
export const ROWS = [
  // ── Commissioning Plan ──
  [CP + 'commissioning_manager', 'Commissioning manager', 'The person who leads commissioning.', ['Commissioning Manager']],
  [CP + 'facility_system', 'Facility / system', 'The facility or system being commissioned.', ['Warehouse building services']],
  D(CP + 'planned_completion', 'Planned completion', 'When commissioning should be finished.'),
  [CP + 'systems_to_commission', 'Systems to commission', 'The systems that must be tested and started.', ['Fire alarm', 'Sprinklers', 'Heating and ventilation'], LINES],
  [CP + 'commissioning_stages', 'Commissioning stages', 'The stages the plan covers.', ['Pre-commissioning', 'Performance testing', 'Handover']],
  [CP + 'commissioning_sequence', 'Commissioning sequence', 'The order systems are commissioned, and why.', ['Power first', 'Then fire systems', 'Then heating and ventilation'], LINES],
  [CP + 'interfaces_and_dependencies', 'Interfaces & dependencies', 'Links between systems that affect the order.', ['Ventilation shuts down on fire alarm – test together'], LINES],
  [CP + 'test_procedures', 'Test procedures', 'The procedures used for each test.', ['CP-AHU-02 Air handling units', 'CP-FA-01 Fire alarm'], LINES],
  [CP + 'acceptance_criteria', 'Acceptance criteria', 'What each system must achieve to be accepted.', ['Air flow within 10% of design', 'All alarm devices respond'], LINES],
  [CP + 'witness_and_hold_points', 'Witness & hold points', 'Tests the client must attend or approve before work continues.', ['Sprinkler pressure test – hold point'], LINES],
  [CP + 'performance_guarantees', 'Performance guarantees', 'Performance the contractor guarantees.', ['Internal temperature 18–24 °C when outside is 45 °C'], LINES],
  [CP + 'safety_requirements', 'Safety requirements', 'Safety rules during commissioning.', ['Only authorised people in plant rooms', 'Warning signs on live equipment'], LINES],
  [CP + 'permit_to_work_required', 'Permit to work required', 'Tick if commissioning work needs a permit to work.', ['Ticked']],
  [CP + 'isolation_procedures', 'Isolation procedures', 'How equipment is made safe before work.', ['Lock off and tag the main switch', 'Prove dead before touching'], LINES],
  [CP + 'energisation_procedures', 'Energisation procedures', 'How systems are safely switched on for the first time.', ['Notify all trades 24 hours before', 'Energise one board at a time'], LINES],
  [CP + 'commissioning_records', 'Commissioning records', 'The records kept to prove the tests.', ['Signed test sheets', 'Calibration certificates'], LINES],
  [CP + 'oandm_training', 'O&M training', 'Training for the people who will run and maintain the systems.', ['Facilities team – 2 days – before handover'], LINES],
  [CP + 'handover_documents', 'Handover documents', 'Documents handed to the client.', ['O&M manuals', 'As-built drawings', 'Warranties'], LINES],
  [CP + 'punch_list_approach', 'Punch list approach', 'How remaining small items are recorded and closed.', ['Items logged at each walk-round, assigned to a trade and closed within 14 days.']],

  // ── HSE Plan ──
  [HS + 'hse_manager', 'HSE manager', 'The person accountable for health, safety and environment on site.', ['Health and Safety Manager']],
  [HS + 'peak_workforce', 'Peak workforce', 'The most workers expected on site at once.', ['220']],
  [HS + 'hse_policy_statement', 'HSE policy statement', 'The commitment to health, safety and the environment for this project.', ['Everyone goes home safe every day. We will stop any work that is not safe.']],
  [HS + 'hse_objectives', 'HSE objectives', 'Measurable safety and environment goals.', ['Zero lost-time injuries', '90% of waste recycled'], LINES],
  [HS + 'legal_requirements', 'Legal requirements', 'The laws and regulations that apply.', ['National construction safety regulations', 'Environmental protection law'], LINES],
  [HS + 'standards_applied', 'Standards applied', 'The safety and environment standards followed.', ['Occupational health and safety management standard'], LINES],
  [HS + 'high_risk_activities', 'High-risk activities', 'The most dangerous activities on this project.', ['Work at height', 'Lifting']],
  [HS + 'major_hazards', 'Major hazards', 'The main hazards on site.', ['Falls from the roof', 'Vehicles and pedestrians mixing'], LINES],
  [HS + 'risk_assessment_approach', 'Risk assessment approach', 'How risks are assessed and reviewed.', ['Every task has a risk assessment and method statement, reviewed by the HSE Manager before work starts.']],
  [HS + 'permit_to_work_system', 'Permit to work system', 'How high-risk work is authorised.', ['Hot work, confined space and electrical work need a signed permit issued daily by the Site Manager.']],
  [HS + 'method_statements_required', 'Method statements required', 'Tick if method statements are required for high-risk tasks.', ['Ticked']],
  [HS + 'ppe_requirements', 'PPE requirements', 'Protective equipment everyone must wear.', ['Hard hat, boots and high-visibility vest at all times', 'Gloves when handling materials'], LINES],
  [HS + 'site_rules', 'Site rules', 'Rules everyone on site must follow.', ['No smoking except in marked areas', 'Speed limit 10 km/h'], LINES],
  [HS + 'induction_requirements', 'Induction requirements', 'What everyone must complete before starting work.', ['Site induction', 'Drug and alcohol declaration'], LINES],
  [HS + 'training_matrix', 'Training matrix', 'The training each role needs.', ['Supervisors – site safety supervisor course', 'Operators – plant competence card'], LINES],
  [HS + 'toolbox_talk_frequency', 'Toolbox talk frequency', 'How often toolbox talks are held.', ['Weekly']],
  [HS + 'emergency_procedures', 'Emergency procedures', 'What to do in an emergency.', ['Fire – raise alarm, go to muster point at Gate 1'], LINES],
  [HS + 'first_aid_arrangements', 'First aid arrangements', 'First aid cover on site.', ['First aid room in the welfare block', 'One first aider per 50 workers'], LINES],
  [HS + 'emergency_contacts', 'Emergency contacts', 'Who to call in an emergency.', ['Site Manager – +44 20 7946 0123', 'Emergency services – local emergency number'], LINES],
  [HS + 'evacuation_drill_frequency', 'Evacuation drill frequency', 'How often evacuation drills are held.', ['Quarterly']],
  [HS + 'environmental_aspects', 'Environmental aspects', 'Ways the works could affect the environment.', ['Dust from earthworks', 'Run-off to storm drains'], LINES],
  [HS + 'pollution_prevention', 'Pollution prevention', 'How pollution is prevented.', ['Fuel stored in bunded tanks', 'Spill kits at each refuelling point'], LINES],
  [HS + 'inspections_and_audits', 'Inspections & audits', 'Planned safety inspections and audits.', ['Weekly site inspection – HSE Manager', 'Monthly audit – client'], LINES],
  [HS + 'hse_kpis', 'HSE KPIs', 'The measures used to track safety and environment performance.', ['Lost-time injury rate', 'Near misses reported per month'], LINES],
  [HS + 'incident_reporting_procedure', 'Incident reporting procedure', 'How incidents are reported and investigated.', ['Report to the supervisor at once; HSE Manager records it within 24 hours and investigates within 7 days.']],
  [HS + 'near_miss_reporting_in_place', 'Near-miss reporting in place', 'Tick if workers have a simple way to report near misses.', ['Ticked']],

  // ── Inspection Plan ──
  [IP + 'inspection_lead', 'Inspection lead', 'The person who leads inspections.', ['Quality Manager']],
  [IP + 'work_package', 'Work package', 'The package of work the plan covers.', ['PKG-02 Groundworks']],
  [IP + 'inspection_scope', 'Inspection scope', 'What will be inspected.', ['Excavations', 'Reinforcement', 'Concrete pours'], LINES],
  [IP + 'specifications_and_standards', 'Specifications & standards', 'The specifications and standards the work is checked against.', ['SPEC-03 Concrete', 'National concrete standard'], LINES],
  [IP + 'acceptance_criteria', 'Acceptance criteria', 'What the work must meet to pass.', ['Concrete cover 40 mm ±5 mm', 'Levels within ±5 mm'], LINES],
  [IP + 'inspection_types', 'Inspection types', 'The kinds of inspection used.', ['Visual', 'Material test']],
  [IP + 'inspection_activities', 'Inspection activities', 'Each activity, the method, how often and who is responsible.', ['Rebar check – visual and tape – every pour – Site Engineer'], 'One activity per line: Activity – Method – Frequency – Responsible.'],
  [IP + 'sampling_frequency', 'Sampling frequency', 'How often samples are taken.', ['1 set of cubes per 50 m³ of concrete']],
  [IP + 'notification_period', 'Notification period (hours)', 'How much notice the client needs before an inspection.', ['24']],
  [IP + 'nonconformance_procedure', 'Nonconformance procedure', 'What happens when work fails inspection.', ['Raise an NCR, stop the affected work, agree the fix with the engineer and re-inspect.']],
  [IP + 'inspector_competence', 'Inspector competence', 'Skills and qualifications inspectors need.', ['Qualified civil engineer', 'Concrete testing certificate'], LINES],
  [IP + 'equipment_calibration', 'Equipment calibration', 'How inspection equipment is kept accurate.', ['Levels calibrated every 6 months', 'Certificates kept on site'], LINES],

  // ── ITPs ──
  [IT + 'work_package', 'Work package', 'The package of work this ITP covers.', ['PKG-03 Steel frame']],
  [IT + 'specifications', 'Specifications', 'The specifications that apply.', ['SPEC-05 Structural steel'], LINES],
  [IT + 'drawings', 'Drawings', 'The drawings that apply.', ['S-200 series'], LINES],
  [IT + 'inspection_and_test_activities', 'Inspection & test activities', 'Each step with its acceptance criteria, verifying document and inspection type.', ['3 – Bolt tightening – torque to specification – torque record – Witness'], 'One activity per line: Seq – Activity – Acceptance Criteria – Verifying Document – Inspection Type.'],
  [IT + 'surveillance_points', 'Surveillance points', 'Points the client may check without notice.', ['Painting of steelwork'], LINES],
  [IT + 'review_points', 'Review points', 'Documents that must be reviewed.', ['Steel mill certificates'], LINES],
  [IT + 'contractor_responsibilities', 'Contractor responsibilities', 'What the contractor must do.', ['Give 24 hours’ notice of hold points', 'Keep all records'], LINES],
  [IT + 'client_responsibilities', 'Client responsibilities', 'What the client must do.', ['Attend hold points within 24 hours of notice'], LINES],
  [IT + 'third_party_inspection', 'Third-party inspection', 'Tick if an independent inspector is involved.', ['Ticked']],

  // ── Method Statements ──
  [MS + 'work_location', 'Work location', 'Where the work takes place.', ['Zone A – Warehouse, roof level']],
  [MS + 'supervisor', 'Supervisor', 'The person supervising the work.', ['Steel Erection Supervisor']],
  [MS + 'scope_description', 'Scope description', 'What work the method statement covers.', ['Erect roof steel bays 1–12 using a 60 t mobile crane.']],
  [MS + 'sequence_of_works', 'Sequence of works', 'The steps, in order.', ['Set up crane and exclusion zone', 'Lift rafters', 'Bolt and plumb'], LINES],
  [MS + 'labour', 'Labour', 'The people and roles needed.', ['1 supervisor', '4 erectors', '1 crane operator', '1 slinger'], LINES],
  [MS + 'plant_and_equipment', 'Plant & equipment', 'The machines and tools used.', ['60 t mobile crane', '2 mobile elevating work platforms'], LINES],
  [MS + 'materials', 'Materials', 'The materials used.', ['Steel rafters', 'Grade 8.8 bolts'], LINES],
  [MS + 'competence_requirements', 'Competence requirements', 'Training and cards workers need.', ['Erectors hold work-at-height training', 'Slinger holds lifting card'], LINES],
  [MS + 'hazards', 'Hazards', 'The hazards of the work.', ['Fall from height', 'Falling objects'], LINES],
  [MS + 'permits_required', 'Permits required', 'Permits to work needed.', ['Lifting', 'Work at height']],
  [MS + 'quality_checks', 'Quality checks', 'Checks made during the work.', ['Plumb and level each frame', 'Torque check bolts'], LINES],
  [MS + 'emergency_arrangements', 'Emergency arrangements', 'What to do in an emergency, including rescue.', ['Rescue from height using the work platform', 'First aider on site'], LINES],
  [MS + 'environmental_controls', 'Environmental controls', 'How the environment is protected.', ['Drip trays under the crane'], LINES],
  [MS + 'briefing_record', 'Briefing record', 'Who was briefed on the method statement and when.', ['Steel Erection Supervisor – {example_date}'], 'One person per line: Name – Date.'],

  // ── Recovery Plans ──
  [RP + 'recovery_owner', 'Recovery owner', 'The person accountable for recovering the delay.', ['Project Manager']],
  [RP + 'current_delay', 'Current delay (days)', 'How many days behind the programme is.', ['18']],
  D(RP + 'target_recovery_date', 'Target recovery date', 'When the programme should be back on track.'),
  [RP + 'delay_description', 'Delay description', 'What the delay is and how it arose.', ['Steel delivery arrived 3 weeks late, delaying the frame and roof.']],
  [RP + 'delay_categories', 'Delay categories', 'The kinds of cause behind the delay.', ['Procurement', 'Weather']],
  [RP + 'root_causes', 'Root causes', 'The underlying causes.', ['Supplier factory overloaded', 'Late approval of shop drawings'], LINES],
  [RP + 'critical_activities_affected', 'Critical activities affected', 'Critical-path activities that are late.', ['Roof steel', 'Roof cladding'], LINES],
  [RP + 'acceleration_options', 'Acceleration options', 'Ways being used to speed up.', ['Additional resources', 'Extended hours']],
  [RP + 'recovery_measures', 'Recovery measures', 'The specific actions to recover time.', ['Second crane from week 32', 'Saturday working for 6 weeks'], LINES],
  [RP + 'revised_milestones', 'Revised milestones', 'Milestones with their new dates.', ['Roof watertight – {example_date}'], LINES],
  [RP + 'additional_cost', 'Additional cost', 'The extra cost of the recovery measures.', ['85,000'], AM],
  [RP + 'additional_resources', 'Additional resources', 'Extra people or equipment needed.', ['1 crane and operator', '6 erectors'], LINES],
  [RP + 'funding_approval_required', 'Funding approval required', 'Tick if the extra cost needs approval.', ['Ticked']],
  [RP + 'progress_indicators', 'Progress indicators', 'Measures that show whether recovery is working.', ['Bays erected per week', 'Days of delay remaining'], LINES],
  [RP + 'review_frequency', 'Review frequency', 'How often the plan is reviewed.', ['Weekly']],
  [RP + 'early_warning_triggers', 'Early-warning triggers', 'Signs that recovery is failing and needs escalation.', ['Fewer than 3 bays erected in a week'], LINES],

  // ── Site Logistics ──
  [SL + 'logistics_manager', 'Logistics manager', 'The person who manages site logistics.', ['Logistics Manager']],
  [SL + 'layout_description', 'Layout description', 'How the site is laid out.', ['Main gate on the south side; laydown and welfare to the east; crane base in the centre.']],
  [SL + 'access_points', 'Access points', 'Gates and entrances.', ['Gate 1 – workers', 'Gate 2 – deliveries'], LINES],
  [SL + 'laydown_areas', 'Laydown areas', 'Where materials are stored before use.', ['East yard – steel', 'North yard – cladding'], LINES],
  [SL + 'welfare_facilities', 'Welfare facilities', 'Facilities for workers.', ['Canteen for 80', 'Toilets and drying room'], LINES],
  [SL + 'traffic_management_plan', 'Traffic management plan', 'How vehicles and people are kept apart and moved safely.', ['One-way haul road, banksmen at both gates, separate fenced walkway for workers.']],
  [SL + 'delivery_rules', 'Delivery rules', 'Rules every delivery must follow.', ['Book 24 hours ahead', 'Drivers wear PPE'], LINES],
  [SL + 'vehicle_routes', 'Vehicle routes', 'The routes vehicles must use.', ['Enter Gate 2, exit Gate 3'], LINES],
  [SL + 'delivery_hours', 'Delivery hours', 'When deliveries are accepted.', ['07:30–16:00, Monday–Friday']],
  [SL + 'storage_arrangements', 'Storage arrangements', 'How materials are stored.', ['Cement in a dry container', 'Fuel in bunded tanks'], LINES],
  [SL + 'material_handling', 'Material handling', 'How materials are moved around site.', ['Telehandlers for pallets', 'Crane for steel'], LINES],
  [SL + 'cranes_and_hoists', 'Cranes & hoists', 'Cranes and hoists on site and where.', ['Tower crane, centre of site, 50 m jib'], LINES],
  [SL + 'site_security', 'Site security', 'How the site is kept secure.', ['2.4 m hoarding', '24-hour guard', 'CCTV at gates'], LINES],
  [SL + 'neighbour_considerations', 'Neighbour considerations', 'How neighbours are protected and kept informed.', ['Monthly newsletter to neighbours', 'No deliveries before 07:30'], LINES],
  [SL + 'noise_and_dust_controls', 'Noise & dust controls', 'How noise and dust are kept down.', ['Water spray on haul roads', 'Noisy work only 08:00–18:00'], LINES],
  [SL + 'temporary_utilities', 'Temporary utilities', 'Temporary power, water and other services.', ['Generator 500 kVA until mains connection', 'Temporary water from the main road'], LINES],
]

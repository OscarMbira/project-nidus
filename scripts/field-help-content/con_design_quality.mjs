// v1345 slice 2, wave 5b — CON design, handover, inspection, quality, materials, RFI, instruction and permit registers (source for SQL/v1511).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies:
// role titles, "Example … Ltd", globally familiar places, no product or brand names.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const AM = 'Amounts show in {currency}.'
const LINES = 'One item per line.'
const ROWS_T = 'One row per line; each column has its own cell.'
const PCT = 'A percentage from 0 to 100.'
const CALC = 'Worked out for you.'
const D = (key, title, purpose, notes = null) => [key, title, purpose, ['{example_date}'], DF, notes]
const M = (key, title, purpose, example, notes = null) => [key, title, purpose, [example], AM, notes]
const DE = 'register:con_cat_design_engineering:'
const HC = 'register:con_cat_handover_commissioning:'
const IN = 'register:con_cat_inspections:'
const QC = 'register:con_cat_quality_control:'
const MA = 'register:con_cat_materials:'
const RF = 'register:con_cat_rfis:'
const SI = 'register:con_cat_site_instructions:'
const PE = 'register:con_cat_permits:'

export const MODULE = 'registers_con_design_quality'
export const ROWS = [
  // ── Design & Engineering ──
  [DE + 'package_reference', 'Package reference', 'The reference of this design package.', ['DP-04 Structural frame']],
  [DE + 'design_stage', 'Design stage', 'How far the design has developed.', ['Technical design']],
  [DE + 'designer', 'Designer', 'The company producing the design.', ['Example Design Consultants Ltd']],
  [DE + 'design_lead', 'Design lead', 'The person leading the design.', ['Lead Structural Engineer']],
  D(DE + 'planned_issue', 'Planned issue', 'When the design was planned to be issued.'),
  D(DE + 'forecast_issue', 'Forecast issue', 'When the design is now expected to be issued.'),
  D(DE + 'actual_issue', 'Actual issue', 'When the design was actually issued.'),
  D(DE + 'needed_on_site', 'Needed on site', 'When the site needs the design to keep working.'),
  [DE + 'deliverables', 'Deliverables', 'Each design deliverable, its reference and status.', ['Foundation layout – S-101 – Issued'], ROWS_T],
  [DE + 'drawings_planned', 'Drawings planned', 'How many drawings the package needs.', ['48']],
  [DE + 'drawings_issued', 'Drawings issued', 'How many have been issued.', ['36']],
  [DE + 'issued_percent', 'Issued (%)', 'Drawings issued as a share of drawings planned.', ['75'], PCT],
  [DE + 'open_comments', 'Open review comments', 'How many review comments are not yet closed.', ['7']],
  [DE + 'drawing_number', 'Drawing number', 'The drawing’s unique number.', ['S-101']],
  [DE + 'drawing_type', 'Drawing type', 'The kind of drawing.', ['General arrangement']],
  [DE + 'scale', 'Scale', 'The drawing scale.', ['1:100']],
  [DE + 'design_package', 'Design package', 'The design package the drawing belongs to.', ['DP-04 Structural frame']],
  [DE + 'originator', 'Originator', 'The company that produced the drawing.', ['Example Design Consultants Ltd']],
  [DE + 'suitability', 'Suitability', 'What the drawing may be used for.', ['For construction']],
  [DE + 'checked_by', 'Checked by', 'The person who checked the drawing.', ['Senior Structural Engineer']],
  [DE + 'revision_history', 'Revision history', 'Each revision, its date and what changed.', ['C02 – {example_date} – beam sizes updated'], ROWS_T],
  [DE + 'spec_reference', 'Specification reference', 'The reference of this specification.', ['SPEC-03 Concrete']],
  [DE + 'author', 'Author', 'The person who wrote the specification.', ['Specification Writer']],
  [DE + 'materials_covered', 'Materials covered', 'The materials the specification covers.', ['Ready-mixed concrete', 'Reinforcement steel'], LINES],
  [DE + 'performance_requirements', 'Performance requirements', 'How the materials or work must perform.', ['Concrete strength at least 40 N/mm² at 28 days'], LINES],
  [DE + 'testing_requirements', 'Testing requirements', 'Tests needed to prove the requirements are met.', ['Cube tests – 1 set per 50 m³'], LINES],
  [DE + 'submittals_required', 'Submittals required', 'What the contractor must submit for approval and when.', ['Concrete mix design – 4 weeks before first pour'], ROWS_T],
  [DE + 'review_reference', 'Review reference', 'The reference of this design review.', ['DR-012']],
  [DE + 'review_type', 'Review type', 'The kind of design review.', ['Buildability review']],
  [DE + 'participants', 'Participants', 'Who took part and their organisation.', ['Lead Structural Engineer – Example Design Consultants Ltd'], ROWS_T],
  [DE + 'comments', 'Comments', 'Each comment, its severity, owner and status.', ['Clash between duct and beam at C4 – High – Lead MEP Engineer – Open'], ROWS_T],
  [DE + 'comments_raised', 'Comments raised', 'How many comments were raised.', ['24']],
  [DE + 'comments_closed', 'Comments closed', 'How many comments have been closed.', ['17']],
  [DE + 'closure_rate', 'Closed (%)', 'Comments closed as a share of comments raised.', ['71%']],
  [DE + 'outcome', 'Outcome', 'The result of the review.', ['Approved with comments']],
  D(DE + 'next_review', 'Next review', 'When the next review takes place.'),
  [DE + 'change_reference', 'Change reference', 'The reference of this design change.', ['DC-009']],
  [DE + 'reason', 'Reason', 'Why the design is changing.', ['Site condition']],
  [DE + 'affected_packages', 'Affected packages', 'The design or construction packages affected.', ['DP-04 Structural frame, PKG-02 Groundworks']],
  [DE + 'description', 'Change description', 'What is changing in the design.', ['Deepen pad foundations at grid A1–A4 by 600 mm because of soft ground.']],
  [DE + 'affected_drawings', 'Affected drawings', 'The drawings that must be revised.', ['S-101', 'S-110'], LINES],
  [DE + 'time_impact_days', 'Time impact (days)', 'Extra days the change adds.', ['5']],
  [DE + 'other_impacts', 'Other impacts', 'Effects on safety, quality or operations.', ['Deeper excavation needs shoring'], LINES],
  D(DE + 'implemented_date', 'Implemented', 'When the change was built on site.'),
  [DE + 'tq_reference', 'TQ reference', 'The reference of this technical query.', ['TQ-031']],
  [DE + 'addressed_to', 'Addressed to', 'The person or company asked to answer.', ['Example Design Consultants Ltd']],
  [DE + 'proposed_solution', 'Proposed solution', 'The answer the person asking suggests, if any.', ['Use the 350 mm beam shown on S-205.']],
  [DE + 'references', 'Drawings and specifications referenced', 'The documents the query refers to.', ['S-101', 'S-205'], LINES],

  // ── Handover & Commissioning ──
  [HC + 'checklist_reference', 'Checklist reference', 'The reference of this pre-commissioning checklist.', ['PCC-018']],
  [HC + 'equipment', 'Equipment / area', 'The equipment or area checked.', ['Air handling unit 2, roof']],
  [HC + 'check_type', 'Check type', 'The kind of check.', ['Mechanical completion']],
  [HC + 'open_items', 'Open items', 'How many items are still open.', ['2']],
  [HC + 'signed_by', 'Signed off by', 'The person who signed off the check.', ['Commissioning Engineer']],
  [HC + 'procedure_reference', 'Procedure', 'The test procedure followed.', ['CP-AHU-02']],
  [HC + 'witnessed_by', 'Witnessed by', 'The person who watched the test for the client.', ['Client Building Services Engineer']],
  [HC + 'results', 'Results', 'Each parameter, what was required, what was measured and the result.', ['Air flow – 2.5 m³/s – 2.6 m³/s – Pass'], ROWS_T],
  D(HC + 'retest_date', 'Retest date', 'When a failed test is repeated.'),
  [HC + 'drawing_number', 'Drawing number', 'The as-built drawing number.', ['S-101-AB']],
  [HC + 'construction_drawing', 'Construction drawing it replaces', 'The construction drawing this as-built drawing replaces.', ['S-101 rev C02']],
  [HC + 'revision', 'As-built revision', 'The revision of the as-built drawing.', ['AB1']],
  [HC + 'file_format', 'Format', 'The file format provided.', ['PDF']],
  [HC + 'comments', 'Comments', 'Review comments on the document.', ['Add the final drainage levels'], LINES],
  [HC + 'manual_reference', 'Manual reference', 'The reference of this operation and maintenance manual.', ['OMM-HVAC-01']],
  [HC + 'format', 'Format', 'How the manual is provided.', ['Electronic']],
  [HC + 'sections', 'Sections', 'Each section the manual needs and whether it is included.', ['Maintenance schedules – Yes'], ROWS_T],
  [HC + 'warranty_months', 'Warranty (months)', 'How long the equipment warranty lasts.', ['24']],
  [HC + 'spares_list', 'Spare parts list included', 'Tick if the manual lists spare parts.', ['Ticked']],
  [HC + 'trainer_company', 'Trainer company', 'The company giving the training.', ['Example Building Services Ltd']],
  [HC + 'audience', 'Audience', 'Who the training is for.', ['Client facilities team']],
  [HC + 'topics', 'Topics', 'What the training covers.', ['Daily checks', 'Alarm response', 'Filter changes'], LINES],
  [HC + 'attendees_planned', 'Attendees planned', 'How many people should attend.', ['12']],
  [HC + 'attendees_actual', 'Attendees', 'How many people attended.', ['10']],
  [HC + 'attendance_rate', 'Attendance (%)', 'Attendees as a share of attendees planned.', ['83%'], null, CALC],
  [HC + 'materials_provided', 'Training materials provided', 'Tick if handouts or slides were given.', ['Ticked']],
  [HC + 'recording_reference', 'Recording reference', 'Where a recording of the training is kept.', ['TRN-REC-004']],
  [HC + 'certificate_type', 'Certificate type', 'The kind of completion certificate.', ['Practical completion']],
  [HC + 'section', 'Section / zone', 'The part of the site the certificate covers.', ['Zone A – Warehouse']],
  [HC + 'issued_by', 'Issued by', 'The person or body that issued the certificate.', ['Contract Administrator']],
  [HC + 'milestone', 'Linked milestone', 'The milestone this certificate achieves.', ['Zone A sectional completion']],
  D(HC + 'issued_date', 'Issued', 'When the certificate was issued.'),
  [HC + 'outstanding_items', 'Outstanding items at issue', 'How many minor items were still open at issue.', ['14']],
  [HC + 'dlp_reference', 'DLP reference', 'The reference of this defects liability period.', ['DLP-01']],
  [HC + 'contract', 'Contract / package', 'The contract the period applies to.', ['Main contract – Example Construction Ltd']],
  D(HC + 'dlp_start', 'DLP start', 'When the defects period starts, usually at completion.'),
  D(HC + 'dlp_end', 'DLP end', 'When the defects period ends.'),
  M(HC + 'retention_held', 'Retention held', 'The money held until the defects period ends.', '312,500'),
  [HC + 'defects_reported', 'Defects reported', 'How many defects have been reported.', ['46']],
  [HC + 'defects_closed', 'Defects closed', 'How many have been fixed.', ['39']],
  [HC + 'closure_rate', 'Closed (%)', 'Defects closed as a share of defects reported.', ['85%'], null, CALC],
  [HC + 'defect_list', 'Defects', 'Each defect, when it was reported and its status.', ['Leaking roof light – {example_date} – Fixed'], ROWS_T],
  D(HC + 'end_inspection', 'End-of-period inspection', 'When the final inspection was held.'),
  D(HC + 'making_good_certificate', 'Making good certificate', 'When the certificate confirming all defects are fixed was issued.'),
  [HC + 'closeout_checks', 'Close-out checks', 'Each close-out check and whether it is done.', ['Retention released – Yes'], ROWS_T],

  // ── Inspections ──
  [IN + 'inspection_type', 'Inspection type', 'The kind of inspection.', ['Pre-pour']],
  [IN + 'requested_by', 'Requested by', 'The person who asked for the inspection.', ['Site Engineer']],
  D(IN + 'requested_for', 'Requested for', 'When the inspection is wanted.'),
  D(IN + 'inspection_date', 'Inspected on', 'When the inspection happened.'),
  [IN + 'checklist', 'Checklist', 'Each check and its result.', ['Cover to reinforcement – Pass'], ROWS_T],
  [IN + 'result', 'Result', 'The overall result.', ['Pass with comments']],
  D(IN + 'reinspection_date', 'Re-inspection date', 'When the work is inspected again after a fail.'),

  // ── Quality Control ──
  [QC + 'inspection_point', 'Inspection point', 'The kind of inspection point.', ['Hold point']],
  D(QC + 'inspection_date', 'Date', 'When the inspection happened.'),
  [QC + 'photos_reference', 'Photo reference', 'Where the inspection photos are kept.', ['PHOTO-INS-0231']],
  [QC + 'element', 'Element / system', 'The part of the works tested or inspected.', ['Fire alarm system, office block']],
  [QC + 'standard', 'Standard / specification', 'The standard the result is checked against.', ['SPEC-03 Concrete']],
  [QC + 'result', 'Result', 'Whether the test passed.', ['Pass']],
  [QC + 'linked_test', 'Linked test record', 'The test record behind this certificate.', ['TST-0112']],
  [QC + 'received_by', 'Received by', 'The person who received the certificate.', ['Document Controller']],
  [QC + 'handover_file', 'Handover file section', 'Where the certificate goes in the handover file.', ['Section 5 – Fire systems']],
  [QC + 'nonconformance', 'Non-conformance', 'What is wrong.', ['Slab level 15 mm below design at grid B2.']],
  [QC + 'requirement', 'Requirement not met', 'The requirement the work fails to meet.', ['Floor level tolerance ±5 mm']],
  [QC + 'disposition', 'Disposition', 'What will be done with the faulty work.', ['Repair']],
  [QC + 'corrective_action', 'Corrective action', 'How the fault is fixed and stopped from happening again.', ['Grind and level the slab; survey levels before every pour.']],
  M(QC + 'cost_of_quality', 'Cost to fix', 'What fixing the fault costs.', '4,800'),
  [QC + 'snag_reference', 'Snag reference', 'The reference of this snag.', ['SNG-0412']],
  [QC + 'photo_reference', 'Photo reference', 'Where the snag photo is kept.', ['PHOTO-SNG-0412']],
  [QC + 'action_reference', 'Action reference', 'The reference of this quality action.', ['QA-ACT-019']],
  [QC + 'preventive', 'Prevents recurrence', 'Tick if the action stops the problem happening again, not just fixes it.', ['Ticked']],

  // ── Materials ──
  [MA + 'submittal_reference', 'Submittal reference', 'The reference of this material submittal.', ['MAT-027']],
  [MA + 'material', 'Material / product', 'The material or product proposed.', ['Insulated roof panels, 120 mm']],
  [MA + 'manufacturer', 'Manufacturer / supplier', 'Who makes or supplies it.', ['Example Panels Ltd']],
  [MA + 'spec_section', 'Specification section', 'The specification section it must meet.', ['SPEC-07 Roofing']],
  [MA + 'submitted_by', 'Submitted by', 'The person or company that submitted it.', ['Example Construction Ltd']],
  D(MA + 'required_by', 'Approval needed by', 'When approval is needed to order in time.'),
  [MA + 'documents', 'Documents submitted', 'Each document submitted and its reference.', ['Product data sheet – PDS-120'], ROWS_T],
  [MA + 'review_comments', 'Review comments', 'Comments from the reviewer.', ['Confirm the fire rating certificate'], LINES],
  [MA + 'lead_time_weeks', 'Lead time (weeks)', 'How long it takes to deliver after ordering.', ['8']],
  D(MA + 'delivery_date', 'Planned delivery', 'When delivery is planned.'),
  [MA + 'laboratory', 'Laboratory / tester', 'Who tested the material.', ['Example Testing Laboratory Ltd']],
  D(MA + 'sample_date', 'Sampled', 'When the sample was taken.'),
  [MA + 'specified_value', 'Specified value (minimum)', 'The minimum the result must reach.', ['40']],
  [MA + 'result_value', 'Result', 'The value measured.', ['46.5']],
  [MA + 'result_vs_spec', 'Result vs specified (%)', 'The result as a share of the specified value; 100% or more passes.', ['116']],

  // ── RFIs ──
  [RF + 'rfi_reference', 'RFI reference', 'The reference of this request for information.', ['RFI-104']],
  [RF + 'from', 'From', 'The person or company asking.', ['Site Engineer, Example Construction Ltd']],
  [RF + 'to', 'To', 'The person or company asked to answer.', ['Lead Architect']],
  [RF + 'drawings_referenced', 'Drawings referenced', 'The drawings the question refers to.', ['A-201', 'S-101'], LINES],
  [RF + 'linked_instruction', 'Linked site instruction / change', 'The instruction or change raised from the answer, if any.', ['SI-031']],

  // ── Site Instructions ──
  [SI + 'si_reference', 'Instruction reference', 'The reference of this site instruction.', ['SI-031']],
  [SI + 'issued_to', 'Issued to', 'The company that must carry out the instruction.', ['Example Construction Ltd']],
  [SI + 'instruction_type', 'Instruction type', 'The kind of instruction.', ['Variation']],
  [SI + 'instruction', 'Instruction', 'What must be done, clearly stated.', ['Widen the loading bay doors at Zone A from 4 m to 5 m.']],
  [SI + 'reason', 'Reason', 'Why the instruction is given.', ['The client’s new trucks need a wider door.']],
  [SI + 'cost_implication', 'Cost implication', 'Tick if the instruction is likely to change the cost.', ['Ticked']],
  M(SI + 'estimated_cost', 'Estimated cost', 'The estimated cost of the instruction.', '18,000'),
  [SI + 'time_implication_days', 'Time implication (days)', 'Extra days the instruction may add.', ['3']],
  [SI + 'confirmed_in_writing', 'Confirmed in writing', 'Tick once a verbal instruction has been confirmed in writing.', ['Ticked']],
  D(SI + 'actioned_date', 'Actioned', 'When the instruction was carried out.'),
  [SI + 'closed_by', 'Closed by', 'The person who closed the instruction.', ['Contract Administrator']],

  // ── Permits ──
  [PE + 'permit_reference', 'Permit reference', 'The reference of this permit or consent.', ['PRM-006']],
  [PE + 'permit_type', 'Permit type', 'The kind of permit.', ['Building permit']],
  [PE + 'issuing_authority', 'Issuing authority', 'The authority that issues the permit.', ['Example City Council']],
  [PE + 'permit_holder', 'Permit holder', 'The organisation the permit is issued to.', ['Example Developments Ltd']],
  D(PE + 'application_date', 'Applied', 'When the application was made.'),
  D(PE + 'issue_date', 'Issued', 'When the permit was issued.'),
  D(PE + 'expiry_date', 'Expires', 'When the permit expires.'),
  [PE + 'renewal_needed', 'Renewal needed', 'Tick if the permit must be renewed before the work finishes.', ['Ticked']],
  [PE + 'inspections', 'Inspections', 'Each authority inspection, its date and result.', ['Foundations – {example_date} – Approved'], ROWS_T],
  M(PE + 'fees', 'Fees', 'The fees paid for the permit.', '6,500'),
]

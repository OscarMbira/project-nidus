// v1345 slice 2, wave 3d part 1 — FIN change management and training field help (source for SQL/v1503).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
// Use the typographic apostrophe (’); never the word "into" (SQL editor trap).
const DF = 'Dates show as {date_format}.'
const DT = 'Date and time, in your organisation’s format.'
const D = (key, title, purpose, notes = null) => [key, title, purpose, ['{example_date}'], DF, notes]
const T = (key, title, purpose, example) => [key, title, purpose, [example], DT]
const SCORE = 'A score from 1 (low) to 5 (high).'
const C = 'register:*:'
const CS = 'register:fin_change_strategy:'
const CI = 'register:fin_change_impacts:'
const CR = 'register:fin_change_readiness:'
const CC = 'register:fin_change_communications:'
const CN = 'register:fin_change_network:'
const CA = 'register:fin_change_adoption:'
const RZ = 'register:fin_change_resistance:'
const CO = 'register:fin_change_sign_off:'
const TS = 'register:fin_training_strategy:'
const TN = 'register:fin_training_needs:'
const TC = 'register:fin_training_curriculum:'
const TM = 'register:fin_training_materials:'
const SE = 'register:fin_training_sessions:'
const AT = 'register:fin_training_attendance:'
const TT = 'register:fin_training_trainers:'
const TE = 'register:fin_training_environment:'
const EF = 'register:fin_training_effectiveness:'
const TO = 'register:fin_training_sign_off:'
const RT = 'register:fin_readiness_training:'

export const MODULE = 'registers_fin_change_training'
export const ROWS = [
  // ── Common fields ──
  [C + 'delivery_method', 'Delivery method', 'How the training is delivered.', ['Classroom', 'E-learning', 'Virtual classroom']],
  [C + 'duration_hours', 'Duration (hours)', 'How long the course or session lasts, in hours.', ['3.5']],
  [C + 'staff_targeted', 'Staff targeted', 'How many people need this training.', ['850']],
  [C + 'staff_trained', 'Staff trained', 'How many people have completed it so far.', ['640']],
  [C + 'completion', 'Completion', 'Staff trained as a share of staff targeted, as a percentage.', ['75']],
  [C + 'enrolled', 'Enrolled', 'How many people are booked on.', ['18']],
  [C + 'session_reference', 'Session reference', 'The reference of the training session.', ['TRN-101-LON-03']],
  [C + 'trainer', 'Trainer', 'The person delivering the session.', ['Core Trainer']],
  [C + 'respondents', 'Respondents', 'How many people answered.', ['120']],
  [C + 'impact_level', 'Impact level', 'How strongly people are affected.', ['High', 'Medium', 'Low']],
  [C + 'feedback', 'Feedback', 'What people said.', ['Asked for more practice time on the new teller screens']],
  [C + 'key_messages', 'Key messages', 'The main points the audience must understand.', ['Why we are changing', 'What it means for your daily work'], null, 'One message per line.'],
  [C + 'training_lead', 'Training lead', 'The person accountable for the training.', ['Head of Learning and Development']],

  // ── Change Management Strategy ──
  [CS + 'change_lead', 'Change management lead', 'The person leading the people side of the change.', ['Change Manager']],
  [CS + 'sponsor', 'Executive sponsor', 'The senior leader who visibly backs the change.', ['Chief Operating Officer']],
  [CS + 'change_scale', 'Scale of change', 'How big the change is for the organisation.', ['Transformational', 'Moderate']],
  [CS + 'change_vision', 'Change vision', 'A short picture of the future the change creates.', ['Every customer served faster, in branch or online, on one modern system']],
  [CS + 'case_for_change', 'Case for change', 'Why the organisation must change now.', ['The legacy system is out of support and slows down every customer request']],
  [CS + 'what_changes', 'What changes', 'For each area: how it works today and how it will work in future.', ['Account opening – Paper forms – On screen in 10 minutes']],
  [CS + 'what_stays', 'What stays the same', 'What will not change, to reassure people.', ['Branch opening hours', 'Customer account numbers on cards']],
  [CS + 'change_approach', 'Change approach', 'How the change will be led and supported.', ['Leader-led, supported by a network of local champions']],
  [CS + 'change_phases', 'Change phases', 'The phases of the change, when they happen and their focus.', ['Awareness – Months 1–3 – Explain why we are changing']],
  [CS + 'impacted_groups', 'Impacted groups', 'Each group affected, its size and impact level.', ['Branch tellers – 420 – High']],
  [CS + 'governance', 'Governance', 'How the change work is overseen and decisions made.', ['Monthly change board chaired by the sponsor']],
  [CS + 'network_model', 'Change network model', 'How the network of champions is organised.', ['One champion per branch, coordinated by regional leads']],
  [CS + 'champion_ratio', 'Champion ratio', 'How many staff each champion supports.', ['1 champion per 25 staff']],
  [CS + 'champion_commitment', 'Champion time commitment', 'How much time champions give.', ['Half a day per week']],
  [CS + 'engagement_principles', 'Engagement principles', 'The rules the team follows when engaging people.', ['Tell people early', 'Listen and act on feedback']],
  [CS + 'engagement_calendar', 'Engagement calendar', 'Planned engagement activities, when, for whom and who leads.', ['Month 2 – Town hall – All staff – Sponsor']],
  [CS + 'readiness_measures', 'Readiness measures', 'How readiness will be measured, the target and when.', ['Staff confident in new processes – 80% – Before go-live']],
  [CS + 'adoption_measures', 'Adoption measures', 'How use of the new way of working will be measured.', ['Accounts opened on the new screens – 95% – System report']],
  [CS + 'sustainment', 'Sustaining the change', 'How the change will be kept in place after go-live.', ['New ways of working added to performance objectives']],

  // ── Change Impact Assessment ──
  [CI + 'impact_reference', 'Impact reference', 'The reference of this change impact.', ['CIA-014']],
  [CI + 'change_area', 'What changes', 'The process or area that changes.', ['Cash withdrawals at the counter']],
  [CI + 'impacted_group', 'Impacted group', 'The group of people affected.', ['Branch tellers']],
  [CI + 'headcount', 'People affected', 'How many people are affected.', ['420']],
  [CI + 'impact_types', 'Type of impact', 'What kind of change people experience.', ['Process', 'Technology']],
  [CI + 'current_state', 'Today', 'How the work is done today.', ['Teller fills a paper slip and keys it in later']],
  [CI + 'future_state', 'In future', 'How the work will be done after the change.', ['Teller records the withdrawal on screen while the customer waits']],
  [CI + 'key_differences', 'Key differences', 'The main differences people will notice.', ['No paper slips', 'Customer signs on a pad']],
  [CI + 'people_impact', 'People impact', 'How much roles and skills change.', ['3'], SCORE],
  [CI + 'process_impact', 'Process impact', 'How much the process changes.', ['4'], SCORE],
  [CI + 'technology_impact', 'Technology impact', 'How much the tools change.', ['5'], SCORE],
  [CI + 'overall_impact', 'Overall impact', 'The combined impact score.', ['4']],
  [CI + 'training_required', 'Training required', 'Tick if people need training for this change.', ['Ticked']],
  [CI + 'linked_courses', 'Linked courses', 'Courses that prepare people for this change.', ['TRN-101 Teller essentials']],

  // ── Change Readiness ──
  [CR + 'assessment_reference', 'Assessment reference', 'The reference of this readiness assessment.', ['CRA-03']],
  [CR + 'assessed_group', 'Group assessed', 'The group whose readiness was measured.', ['Contact centre, Cairo']],
  [CR + 'assessment_point', 'Assessment point', 'When in the programme the assessment was done.', ['Before go-live']],
  [CR + 'method', 'Method', 'How readiness was measured.', ['Survey', 'Workshop']],
  [CR + 'aware', 'Aware of the change', 'How aware people are that the change is coming.', ['4'], SCORE],
  [CR + 'understand', 'Understand what it means for them', 'How well people understand the effect on their work.', ['3'], SCORE],
  [CR + 'accept', 'Accept and support it', 'How much people accept and support the change.', ['3'], SCORE],
  [CR + 'able', 'Able to work the new way', 'How able people feel to work the new way.', ['2'], SCORE],
  [CR + 'sustain', 'Likely to sustain it', 'How likely people are to keep working the new way.', ['3'], SCORE],
  [CR + 'readiness_score', 'Readiness score', 'The combined readiness score.', ['3.0']],
  [CR + 'readiness_rag', 'Readiness RAG', 'Readiness at a glance.', ['Green: ready', 'Amber: some gaps', 'Red: not ready']],
  [CR + 'key_findings', 'Key findings', 'The main points from the assessment.', ['Staff want more hands-on practice before go-live']],

  // ── Change Communications & Engagement ──
  [CC + 'comm_reference', 'Reference', 'The reference of this communication.', ['CHG-COMM-07']],
  [CC + 'comm_type', 'Type', 'What kind of communication or event this is.', ['Town hall', 'Manager briefing']],
  [CC + 'audiences', 'Audiences', 'Who it is for.', ['Retail branches', 'Contact centre']],
  [CC + 'channels', 'Channels', 'How it reaches people.', ['Face to face', 'Intranet']],
  [CC + 'change_phase', 'Change phase', 'The phase of the change this supports.', ['Awareness', 'Reinforcement']],
  [CC + 'message_body', 'Message / agenda', 'The full message or the event agenda.', ['Welcome, why we are changing, demo, questions']],
  [CC + 'linked_impacts', 'Linked impacts', 'The change impacts this communication addresses.', ['CIA-014, CIA-015']],
  [CC + 'audience_size', 'Audience size', 'How many people it is aimed at.', ['420']],
  [CC + 'reached', 'Reached / attended', 'How many people it actually reached.', ['380']],
  [CC + 'reach_rate', 'Reach rate', 'Reached as a share of the audience, as a percentage.', ['90']],
  [CC + 'sentiment', 'Sentiment', 'How people felt about it overall.', ['Positive', 'Mixed']],

  // ── Change Network ──
  [CN + 'champion_reference', 'Champion reference', 'The reference of this change champion.', ['CH-LON-04']],
  [CN + 'job_title', 'Job title', 'The champion’s job title.', ['Senior Teller']],
  [CN + 'line_manager', 'Line manager', 'The champion’s line manager.', ['Branch Manager, London']],
  D(CN + 'appointed_date', 'Appointed on', 'When the person became a champion.'),
  [CN + 'time_commitment', 'Time commitment', 'How much time the champion gives.', ['Half a day per week']],
  [CN + 'units_covered', 'Teams / branches covered', 'The teams or branches this champion supports.', ['London central branch', 'London east branch']],
  [CN + 'staff_covered', 'Staff covered', 'How many staff the champion supports.', ['25']],
  [CN + 'briefings_attended', 'Champion briefings attended', 'How many champion briefings they have attended.', ['6']],
  [CN + 'champion_training_complete', 'Champion training complete', 'Tick once the champion has been trained.', ['Ticked']],
  [CN + 'toolkit_issued', 'Champion toolkit issued', 'Tick once the champion has the toolkit.', ['Ticked']],
  [CN + 'activities', 'Activities', 'What the champion has done: date, activity, audience and attendance.', ['{example_date} – Team huddle – Tellers – 12']],
  [CN + 'feedback_raised', 'Feedback raised', 'Concerns and ideas the champion has passed on.', ['Staff unsure how to handle joint accounts']],

  // ── Adoption Tracking ──
  [CA + 'measure_reference', 'Measure reference', 'The reference of this adoption measure.', ['ADP-02']],
  [CA + 'measure', 'Measure', 'What is measured to show the new way is being used.', ['Share of accounts opened on screen']],
  [CA + 'measure_type', 'Measure type', 'What kind of measure this is.', ['Usage', 'Workaround use']],
  [CA + 'target_value', 'Target', 'The value to reach.', ['95']],
  [CA + 'baseline_value', 'Baseline (before go-live)', 'The value before go-live.', ['0']],
  [CA + 'latest_value', 'Latest value', 'The most recent value.', ['88']],
  D(CA + 'latest_reading_date', 'Latest reading on', 'When the latest value was measured.'),
  [CA + 'gap_to_target', 'Gap to target', 'Target minus latest value.', ['7']],
  [CA + 'readings', 'Readings', 'Values over time.', ['{example_date} – 88 – Week 3 after go-live']],

  // ── Resistance & Concerns ──
  [RZ + 'concern_reference', 'Reference', 'The reference of this concern.', ['RES-009']],
  [RZ + 'source_group', 'Raised by (group)', 'The group that raised the concern.', ['Contact centre agents']],
  [RZ + 'raised_through', 'Raised through', 'How the concern reached the team.', ['Change champion', 'Survey']],
  [RZ + 'concern_type', 'Type of concern', 'What the concern is about.', ['Workload', 'Skills / confidence']],
  [RZ + 'people_affected', 'People affected', 'How many people share the concern.', ['60']],
  [RZ + 'response_plan', 'Response', 'How the team will respond to the concern.', ['Extra practice sessions and a floor-walker in the first week']],
  D(RZ + 'target_date', 'Target date', 'When the response should be in place.'),
  [RZ + 'response_actions', 'Actions taken', 'What has been done: date, action and who.', ['{example_date} – Extra practice session – Training Lead']],

  // ── Change Sign-Off ──
  [CO + 'readiness_score', 'Readiness score at sign-off (%)', 'The overall readiness score when the change was signed off.', ['82']],

  // ── Training Strategy ──
  D(TS + 'training_start', 'Training start', 'When training starts.'),
  D(TS + 'training_end', 'Training end', 'When all training must be finished.'),
  [TS + 'audiences', 'Audiences', 'Each group to be trained, its size, priority and approach.', ['Branch tellers – 420 – High – Classroom plus practice']],
  [TS + 'delivery_approach', 'Delivery approach', 'How training will be delivered overall.', ['Classroom for high-impact roles, e-learning for everyone else']],
  [TS + 'delivery_methods', 'Delivery methods', 'Each delivery method and what it is used for.', ['E-learning – Awareness and basic navigation']],
  [TS + 'train_the_trainer', 'Train-the-trainer approach', 'How trainers are prepared before they teach.', ['Vendor trains 20 core trainers, who then train super users']],
  [TS + 'curriculum_overview', 'Curriculum overview', 'The courses, who they are for, how long and how delivered.', ['Teller essentials – Tellers – 1 day – Classroom']],
  [TS + 'trainer_model', 'Trainer model', 'Who delivers the training.', ['Core trainers plus super users in each region']],
  [TS + 'environment_approach', 'Training environment', 'The system environment used for training.', ['Dedicated training environment refreshed before each session']],
  [TS + 'training_schedule', 'Schedule', 'Training phases with dates and focus.', ['Phase 1 – {example_date} – {example_date} – Super users']],
  [TS + 'assessment_approach', 'Assessment approach', 'How learning is checked.', ['Practical exercise at the end of each course']],
  [TS + 'effectiveness_measures', 'Effectiveness measures', 'How the training’s effect is measured, at each level, with targets.', ['Learning – Assessment pass rate – 90%']],
  [TS + 'completion_criteria', 'Completion criteria', 'When training counts as complete.', ['95% of staff trained', 'All super users certified']],

  // ── Training Needs Analysis ──
  [TN + 'tna_reference', 'Reference', 'The reference of this training needs record.', ['TNA-12']],
  [TN + 'role_name', 'Role / job family', 'The role whose training needs are described.', ['Branch teller']],
  [TN + 'people_in_role', 'People in role', 'How many people hold the role.', ['420']],
  [TN + 'tasks_changing', 'Tasks changing', 'Each task that changes: today, the new way and how often.', ['Cash withdrawal – Paper slip – On screen – Daily']],
  [TN + 'skills_gap', 'Skills gap', 'Each skill, the current level and the level needed (1–5).', ['Using the teller screen – 1 – 4']],
  [TN + 'required_courses', 'Required courses', 'The courses this role needs, whether mandatory and when.', ['Teller essentials – Yes – Before go-live']],
  [TN + 'training_hours', 'Training hours per person', 'How many hours of training each person needs.', ['7']],

  // ── Curriculum ──
  [TC + 'course_owner', 'Course owner', 'The person responsible for the course content.', ['Learning Designer']],
  [TC + 'mandatory', 'Mandatory', 'Tick if staff must complete the course.', ['Ticked']],
  [TC + 'max_class_size', 'Maximum class size', 'The most learners per session.', ['12']],
  [TC + 'learning_objectives', 'Learning objectives', 'What learners will be able to do after the course.', ['Open a current account', 'Process a cash withdrawal']],
  [TC + 'content_outline', 'Content outline', 'The modules, their topics and length.', ['Module 1 – Navigation and search – 45']],
  [TC + 'prerequisites', 'Prerequisites', 'What learners must do or know first.', ['Complete the e-learning introduction']],
  [TC + 'assessment_method', 'Assessment', 'How learning is checked at the end.', ['Practical exercise', 'Quiz']],
  [TC + 'pass_mark', 'Pass mark (%)', 'The score needed to pass.', ['80']],

  // ── Training Materials ──
  [TM + 'material_reference', 'Reference', 'The reference of this training material.', ['MAT-TEL-03']],
  [TM + 'material_type', 'Type', 'What kind of material this is.', ['Quick reference card', 'Trainer guide']],
  [TM + 'author', 'Author', 'The person who wrote the material.', ['Learning Designer']],
  [TM + 'version', 'Version', 'The version of the material.', ['1.2']],
  [TM + 'reviewers', 'Reviewers', 'Who reviewed it, which area, the result and date.', ['Branch Supervisor – Content – Approved – {example_date}']],
  [TM + 'published_location', 'Published location', 'Where learners find the material.', ['Learning portal › Core banking › Tellers']],

  // ── Training Sessions ──
  [SE + 'venue', 'Venue / link', 'Where the session takes place, or the meeting link.', ['Training room 2, London head office']],
  T(SE + 'start_at', 'Start', 'When the session starts.', 'Monday 09:00'),
  T(SE + 'end_at', 'End', 'When the session ends.', 'Monday 16:30'),
  [SE + 'duration_minutes', 'Elapsed time', 'How long the session lasted, in minutes.', ['450']],
  [SE + 'capacity', 'Capacity', 'The most learners the session can take.', ['12']],
  [SE + 'fill_rate', 'Fill rate', 'Enrolled as a share of capacity, as a percentage.', ['92']],
  [SE + 'waiting_list', 'Waiting list', 'How many people are waiting for a place.', ['4']],

  // ── Attendance & Assessment ──
  D(AT + 'session_date', 'Session date', 'When the session took place.'),
  [AT + 'attended', 'Attended', 'How many people attended.', ['11']],
  [AT + 'attendance_rate', 'Attendance rate', 'Attended as a share of enrolled, as a percentage.', ['92']],
  [AT + 'assessed', 'Assessed', 'How many learners took the assessment.', ['11']],
  [AT + 'average_score', 'Average score (%)', 'The average assessment score.', ['86']],
  [AT + 'follow_up', 'Follow-up', 'Learners who need follow-up, why, the action and due date.', ['Two tellers – Missed the practical – Rebook – {example_date}']],

  // ── Trainers ──
  [TT + 'trainer_reference', 'Reference', 'The reference of this trainer.', ['TRN-T-07']],
  [TT + 'trainer_type', 'Trainer type', 'What kind of trainer this is.', ['Core trainer', 'Super user trainer']],
  [TT + 'courses_certified', 'Courses certified', 'The courses this trainer may deliver, with date and status.', ['Teller essentials – {example_date} – Certified']],
  [TT + 'ttt_complete', 'Train-the-trainer complete', 'Tick once the trainer has finished train-the-trainer.', ['Ticked']],
  D(TT + 'ttt_date', 'Train-the-trainer date', 'When the trainer completed train-the-trainer.'),
  D(TT + 'available_from', 'Available from', 'The first date the trainer can deliver sessions.'),
  D(TT + 'available_to', 'Available to', 'The last date the trainer can deliver sessions.'),
  [TT + 'days_per_week', 'Training days per week', 'How many days a week the trainer can teach.', ['3']],

  // ── Training Environment ──
  [TE + 'item_reference', 'Reference', 'The reference of this training-environment item.', ['TENV-04']],
  [TE + 'environment_name', 'Environment', 'The environment used for training.', ['Training environment 1']],
  [TE + 'item_type', 'Item', 'What needs to be ready for training.', ['Training data', 'Training user IDs']],
  D(TE + 'needed_by', 'Needed by', 'When the item must be ready.'),
  D(TE + 'ready_date', 'Ready date', 'When the item was confirmed ready.'),
  [TE + 'training_users', 'Training user IDs', 'How many training log-ins are needed.', ['40']],
  [TE + 'data_set', 'Training data set', 'The data loaded for training.', ['Fictional customers and accounts for exercises']],
  [TE + 'refresh_frequency', 'Refresh frequency', 'How often training data is reset.', ['Before each session', 'Weekly']],

  // ── Training Effectiveness ──
  [EF + 'evaluation_reference', 'Reference', 'The reference of this evaluation.', ['EVAL-05']],
  [EF + 'evaluation_point', 'When', 'When the evaluation was done.', ['End of course', 'After go-live (30 days)']],
  D(EF + 'evaluation_date', 'Evaluation date', 'The date of the evaluation.'),
  [EF + 'reaction', 'Reaction – was the training useful?', 'How useful learners found the training.', ['4'], SCORE],
  [EF + 'learning', 'Learning – did they learn it?', 'How well learners learned the content.', ['4'], SCORE],
  [EF + 'behaviour', 'Behaviour – do they use it on the job?', 'How far learners apply it in their daily work.', ['3'], SCORE],
  [EF + 'results', 'Results – better business outcomes?', 'Whether the business results improved.', ['3'], SCORE],
  [EF + 'effectiveness_score', 'Effectiveness score', 'The combined effectiveness score.', ['3.5']],

  // ── Training Sign-Off (common staff_targeted / staff_trained / completion apply) ──

  // ── Readiness: Training ──
  [RT + 'training_reference', 'Training reference', 'The reference of this training readiness record.', ['RTRN-03']],
  [RT + 'target_roles', 'Target roles', 'The roles this training is for.', ['Branch tellers', 'Customer service officers']],
  [RT + 'training_environment', 'Training environment', 'The environment learners practise in.', ['Training environment', 'Sandbox']],
  [RT + 'sessions', 'Sessions', 'Each session with date, location, trainer and capacity.', ['Session 3 – {example_date} – Dubai – Core Trainer – 12']],
  [RT + 'assessment_pass_rate', 'Assessment pass rate (%)', 'The share of learners who passed the assessment.', ['92']],
  [RT + 'materials', 'Materials', 'The training materials and their status.', ['Quick reference card – PDF – Published']],
  [RT + 'average_rating', 'Average rating (out of 5)', 'How learners rated the training on average.', ['4.3']],
  [RT + 'follow_up_actions', 'Follow-up actions', 'Actions to close gaps found during training.', ['Extra practice session for the night shift']],
]

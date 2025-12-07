-- ============================================================================
-- PM Simulator Seed Data
-- Version: v68
-- Description: Initial seed data for scenarios, badges, and assessment questions
-- ============================================================================

-- ============================================================================
-- BADGES
-- ============================================================================
INSERT INTO sim.badges (
  badge_key, name, description, icon_url, category, xp_reward, requirements, is_active
) VALUES
-- Progression Badges
('first_sim', 'First Steps', 'Complete your first simulation', '/badges/first-steps.png', 'progression', 50, '{"type": "simulations_completed", "value": 1}'::jsonb, true),
('fast_learner', 'Fast Learner', 'Complete 5 simulations', '/badges/fast-learner.png', 'progression', 100, '{"type": "simulations_completed", "value": 5}'::jsonb, true),
('dedicated', 'Dedicated Learner', 'Complete 10 simulations', '/badges/dedicated.png', 'progression', 200, '{"type": "simulations_completed", "value": 10}'::jsonb, true),
('veteran', 'PM Veteran', 'Complete 25 simulations', '/badges/veteran.png', 'progression', 500, '{"type": "simulations_completed", "value": 25}'::jsonb, true),
('master', 'Simulation Master', 'Complete 50 simulations', '/badges/master.png', 'progression', 1000, '{"type": "simulations_completed", "value": 50}'::jsonb, true),

-- Skill Badges
('perfect_score', 'Perfectionist', 'Achieve a perfect 100% score', '/badges/perfectionist.png', 'skill', 150, '{"type": "score_achieved", "value": 100}'::jsonb, true),
('high_achiever', 'High Achiever', 'Score above 90% in 5 simulations', '/badges/high-achiever.png', 'skill', 250, '{"type": "high_scores", "value": 5}'::jsonb, true),
('consistent', 'Consistency King', 'Complete 10 simulations in a row above 80%', '/badges/consistent.png', 'skill', 300, '{"type": "consistent_scores", "value": 10}'::jsonb, true),
('scrum_starter', 'Scrum Starter', 'Complete your first Scrum simulation', '/badges/scrum-starter.png', 'skill', 100, '{"type": "methodology", "methodology": "Scrum", "value": 1}'::jsonb, true),
('kanban_novice', 'Kanban Novice', 'Complete your first Kanban simulation', '/badges/kanban-novice.png', 'skill', 100, '{"type": "methodology", "methodology": "Kanban", "value": 1}'::jsonb, true),
('structured_beginner', 'Structured PM Beginner', 'Complete your first Structured PM simulation', '/badges/structured-beginner.png', 'skill', 100, '{"type": "methodology", "methodology": "Structured PM", "value": 1}'::jsonb, true),
('agile_enthusiast', 'Agile Enthusiast', 'Complete 5 Agile/Scrum simulations', '/badges/agile-enthusiast.png', 'skill', 250, '{"type": "methodology", "methodology": "Agile", "value": 5}'::jsonb, true),
('hybrid_expert', 'Hybrid Expert', 'Complete simulations in 3 different methodologies', '/badges/hybrid-expert.png', 'skill', 300, '{"type": "methodologies_completed", "value": 3}'::jsonb, true),

-- Achievement Badges
('tech_savvy', 'Tech Savvy', 'Complete 5 IT/Software simulations', '/badges/tech-savvy.png', 'achievement', 200, '{"type": "industry", "industry": "IT/Software", "value": 5}'::jsonb, true),
('builder', 'The Builder', 'Complete 3 Construction simulations', '/badges/builder.png', 'achievement', 200, '{"type": "industry", "industry": "Construction", "value": 3}'::jsonb, true),
('healthcare_hero', 'Healthcare Hero', 'Complete 3 Healthcare simulations', '/badges/healthcare-hero.png', 'achievement', 200, '{"type": "industry", "industry": "Healthcare", "value": 3}'::jsonb, true),
('finance_wizard', 'Finance Wizard', 'Complete 3 Finance simulations', '/badges/finance-wizard.png', 'achievement', 200, '{"type": "industry", "industry": "Finance", "value": 3}'::jsonb, true),
('industry_explorer', 'Industry Explorer', 'Complete simulations in 5 different industries', '/badges/industry-explorer.png', 'achievement', 400, '{"type": "industries_completed", "value": 5}'::jsonb, true),
('team_player', 'Team Player', 'Complete 5 simulations as Team Member', '/badges/team-player.png', 'achievement', 150, '{"type": "role", "role": "team_member", "value": 5}'::jsonb, true),
('leader_rising', 'Rising Leader', 'Complete 5 simulations as Team Lead', '/badges/rising-leader.png', 'achievement', 200, '{"type": "role", "role": "team_lead", "value": 5}'::jsonb, true),
('pm_pro', 'PM Professional', 'Complete 5 simulations as Project Manager', '/badges/pm-pro.png', 'achievement', 250, '{"type": "role", "role": "project_manager", "value": 5}'::jsonb, true),
('programme_guru', 'Programme Guru', 'Complete 3 simulations as Programme Manager', '/badges/programme-guru.png', 'achievement', 300, '{"type": "role", "role": "programme_manager", "value": 3}'::jsonb, true),

-- Streak Badges
('streak_3', 'On Fire', 'Maintain a 3-day streak', '/badges/on-fire.png', 'streak', 75, '{"type": "streak_days", "value": 3}'::jsonb, true),
('streak_7', 'Week Warrior', 'Maintain a 7-day streak', '/badges/week-warrior.png', 'streak', 150, '{"type": "streak_days", "value": 7}'::jsonb, true),
('streak_30', 'Monthly Dedication', 'Maintain a 30-day streak', '/badges/monthly.png', 'streak', 500, '{"type": "streak_days", "value": 30}'::jsonb, true),

-- Special Badges
('early_adopter', 'Early Adopter', 'Joined during beta period', '/badges/early-adopter.png', 'special', 200, '{"type": "special", "event": "beta"}'::jsonb, true),
('premium_member', 'Premium Member', 'Upgraded to a paid plan', '/badges/premium-member.png', 'special', 100, '{"type": "subscription", "value": 1}'::jsonb, true),
('custom_creator', 'Scenario Creator', 'Create your first custom scenario', '/badges/creator.png', 'special', 250, '{"type": "custom_scenarios", "value": 1}'::jsonb, true),
('community_star', 'Community Star', 'Receive 10 positive reviews on a custom scenario', '/badges/community-star.png', 'special', 500, '{"type": "positive_reviews", "value": 10}'::jsonb, true)

ON CONFLICT (badge_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  requirements = EXCLUDED.requirements;

-- ============================================================================
-- SCENARIOS
-- ============================================================================
INSERT INTO sim.scenarios (
  id, name, short_description, description, industry, methodology,
  difficulty_level, duration_minutes, target_role, is_premium, is_active
) VALUES

-- IT/Software Scenarios
(
  gen_random_uuid(),
  'IT Project Kickoff',
  'Learn to initiate and plan a software development project using Scrum methodology.',
  'As a newly assigned Project Manager, you will lead the kickoff of a mobile banking app development project. You''ll work with stakeholders to define requirements, set up the Scrum framework, create the initial product backlog, and plan the first sprint. This simulation covers project charter creation, stakeholder identification, team formation, and establishing communication protocols.',
  'IT/Software',
  'Scrum',
  'beginner',
  60,
  'project_manager',
  false,
  true
),
(
  gen_random_uuid(),
  'Mobile App Development',
  'Build a mobile application from concept to app store release.',
  'Lead a cross-functional team to develop a fitness tracking mobile app. You''ll manage the entire development lifecycle from requirements gathering through deployment. The simulation includes sprint planning, daily standups, managing technical debt, coordinating with QA, and handling scope changes from stakeholders.',
  'IT/Software',
  'Agile',
  'beginner',
  75,
  'project_manager',
  false,
  true
),
(
  gen_random_uuid(),
  'Legacy System Migration',
  'Migrate a critical legacy system to modern cloud infrastructure.',
  'Plan and execute the migration of a 15-year-old monolithic application to a microservices architecture on AWS. This advanced simulation covers technical risk assessment, data migration planning, parallel running strategies, rollback procedures, and coordinating with multiple vendor teams.',
  'IT/Software',
  'Hybrid',
  'advanced',
  150,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Cybersecurity Overhaul',
  'Lead a comprehensive security upgrade across the enterprise.',
  'As Programme Manager, oversee a multi-project security transformation program. You''ll coordinate multiple work streams including network security, identity management, endpoint protection, and security awareness training. Manage dependencies, resolve conflicts, and report to the executive board.',
  'IT/Software',
  'Structured PM',
  'expert',
  240,
  'programme_manager',
  true,
  true
),

-- Construction Scenarios
(
  gen_random_uuid(),
  'Construction Site Management',
  'Manage a building construction project from foundation to completion using Structured PM.',
  'Lead the construction of a 10-story commercial building. You''ll manage contractors, ensure safety compliance, handle permits, coordinate material deliveries, and deal with weather-related delays. This simulation emphasizes stage-gate processes, quality control, and stakeholder communication.',
  'Construction',
  'Structured PM',
  'intermediate',
  120,
  'project_manager',
  false,
  true
),
(
  gen_random_uuid(),
  'Infrastructure Renovation',
  'Renovate aging infrastructure while maintaining operations.',
  'Manage the renovation of a busy hospital wing while keeping services running. Balance patient safety, contractor coordination, and strict deadlines. Deal with unexpected discoveries, change requests, and budget pressures.',
  'Construction',
  'Structured PM',
  'advanced',
  180,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Sustainable Building Project',
  'Lead a LEED-certified green building construction.',
  'As Team Lead, coordinate the specialized requirements of a sustainable building project. Manage solar panel installation, rainwater harvesting systems, and green material sourcing. Balance environmental goals with budget constraints.',
  'Construction',
  'Hybrid',
  'intermediate',
  90,
  'team_lead',
  false,
  true
),

-- Healthcare Scenarios
(
  gen_random_uuid(),
  'Healthcare System Implementation',
  'Lead the implementation of a new healthcare information system.',
  'Implement an Electronic Health Records (EHR) system across a regional hospital network. Manage vendor relationships, data migration, staff training, and regulatory compliance (HIPAA). Handle resistance to change and ensure patient care continuity during the transition.',
  'Healthcare',
  'Hybrid',
  'advanced',
  180,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Clinical Trial Coordination',
  'Coordinate a multi-site pharmaceutical clinical trial.',
  'As Programme Manager, oversee a Phase 3 clinical trial across 12 sites in 4 countries. Manage regulatory submissions, patient recruitment, data collection, and adverse event reporting. Coordinate with medical monitors, ethics committees, and the FDA.',
  'Healthcare',
  'Structured PM',
  'expert',
  300,
  'programme_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Telemedicine Launch',
  'Launch a telemedicine service for a healthcare network.',
  'Lead the rapid deployment of a telemedicine platform. Select vendors, integrate with existing systems, train clinicians, and ensure compliance. Manage the balance between speed-to-market and quality.',
  'Healthcare',
  'Agile',
  'intermediate',
  90,
  'project_manager',
  false,
  true
),

-- Finance Scenarios
(
  gen_random_uuid(),
  'Financial System Migration',
  'Manage a complex financial system migration with strict compliance requirements.',
  'Migrate a core banking system to a new platform while ensuring zero data loss and minimal downtime. Navigate regulatory requirements, manage parallel running, coordinate weekend cutovers, and handle audit trails. This expert-level simulation tests your ability to manage high-stakes technical projects.',
  'Finance',
  'Structured PM',
  'expert',
  240,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Fraud Detection System',
  'Implement an AI-based fraud detection system.',
  'Lead the implementation of a machine learning fraud detection system for a credit card company. Balance model accuracy with false positive rates, integrate with existing systems, and manage regulatory review.',
  'Finance',
  'Agile',
  'advanced',
  120,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Branch Digitalization',
  'Transform traditional bank branches into digital-first locations.',
  'As Team Lead, coordinate the transformation of 50 bank branches. Manage equipment installation, staff training, and customer communication. Handle legacy system integration and change resistance.',
  'Finance',
  'Kanban',
  'intermediate',
  90,
  'team_lead',
  false,
  true
),

-- Marketing Scenarios
(
  gen_random_uuid(),
  'Product Launch Campaign',
  'Coordinate a multi-team product launch using Kanban for continuous delivery.',
  'Lead a major product launch campaign across digital, print, and event channels. Coordinate with creative agencies, manage content production, and handle last-minute changes. Use Kanban to visualize and optimize the flow of marketing deliverables.',
  'Marketing',
  'Kanban',
  'intermediate',
  90,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Brand Refresh Initiative',
  'Coordinate a company-wide brand refresh.',
  'Manage the rollout of a new brand identity across all touchpoints. Coordinate with multiple agencies, manage trademark registrations, and ensure consistent implementation across 20+ countries.',
  'Marketing',
  'Hybrid',
  'advanced',
  150,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Social Media Campaign',
  'Execute a viral social media campaign for a new product.',
  'As Team Member, contribute to a fast-paced social media campaign. Create content, respond to trends, and coordinate with influencers. Learn to work within tight deadlines and iterate based on real-time metrics.',
  'Marketing',
  'Agile',
  'beginner',
  45,
  'team_member',
  false,
  true
),

-- Manufacturing Scenarios
(
  gen_random_uuid(),
  'Manufacturing Process Improvement',
  'Lead a Six Sigma project to improve manufacturing efficiency.',
  'Apply DMAIC methodology to reduce defect rates in an electronics manufacturing line. Collect and analyze data, identify root causes, implement solutions, and establish control mechanisms. This simulation teaches you statistical process control and change management.',
  'Manufacturing',
  'Structured PM',
  'advanced',
  150,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Factory Automation Project',
  'Implement robotics and automation in a production facility.',
  'Lead the introduction of robotic assembly lines in an automotive plant. Manage vendor selection, installation, staff retraining, and safety compliance. Handle union concerns and production continuity.',
  'Manufacturing',
  'Structured PM',
  'expert',
  200,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Quality Management System',
  'Implement ISO 9001 certification for a manufacturing plant.',
  'As Team Lead, coordinate the documentation, training, and process changes required for ISO certification. Manage internal audits and prepare for external assessment.',
  'Manufacturing',
  'Structured PM',
  'intermediate',
  100,
  'team_lead',
  false,
  true
),

-- Events Scenarios
(
  gen_random_uuid(),
  'Event Planning & Execution',
  'Plan and execute a major corporate event with multiple stakeholders.',
  'Organize a 500-person annual conference including venue selection, speaker management, catering, AV setup, and registration. Handle budget constraints, sponsor requirements, and last-minute changes. Use Kanban to track deliverables across multiple workstreams.',
  'Events',
  'Kanban',
  'beginner',
  60,
  'project_manager',
  false,
  true
),
(
  gen_random_uuid(),
  'Virtual Conference',
  'Organize a large-scale virtual conference.',
  'Plan and execute a 3-day virtual conference with 2000 attendees. Select platforms, manage speakers across time zones, create engagement strategies, and handle technical issues in real-time.',
  'Events',
  'Agile',
  'intermediate',
  75,
  'project_manager',
  false,
  true
),
(
  gen_random_uuid(),
  'Product Showcase Event',
  'Coordinate a major product showcase at an industry trade show.',
  'As Team Lead, manage the logistics of exhibiting at a major trade show. Coordinate booth design, demo equipment, staffing schedule, and lead capture. Handle shipping, setup, and breakdown.',
  'Events',
  'Kanban',
  'beginner',
  45,
  'team_lead',
  false,
  true
),

-- Retail Scenarios
(
  gen_random_uuid(),
  'E-commerce Platform Launch',
  'Launch a new e-commerce platform for a retail chain.',
  'Lead the development and launch of an online store integrated with inventory and logistics systems. Manage development, testing, marketing, and go-live. Handle SEO, payment gateway integration, and customer service setup.',
  'Retail',
  'Agile',
  'intermediate',
  120,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Store Network Rollout',
  'Open 20 new retail locations across the country.',
  'As Programme Manager, coordinate the simultaneous opening of multiple retail locations. Manage construction, staffing, inventory, and marketing for each location. Handle dependencies and resource conflicts.',
  'Retail',
  'Structured PM',
  'expert',
  200,
  'programme_manager',
  true,
  true
),

-- Education Scenarios
(
  gen_random_uuid(),
  'Learning Management System',
  'Implement a new LMS for a university.',
  'Lead the implementation of a learning management system across multiple faculties. Manage vendor selection, data migration, faculty training, and student onboarding. Handle integration with existing systems and accessibility requirements.',
  'Education',
  'Hybrid',
  'intermediate',
  90,
  'project_manager',
  false,
  true
),
(
  gen_random_uuid(),
  'Curriculum Redesign',
  'Coordinate a major curriculum overhaul.',
  'As Team Lead, coordinate subject matter experts, instructional designers, and technology specialists to redesign a professional certification curriculum. Manage reviews, approvals, and pilot testing.',
  'Education',
  'Agile',
  'intermediate',
  75,
  'team_lead',
  false,
  true
),

-- ============================================================================
-- PHASE 2: INTERMEDIATE SCENARIOS (20 scenarios)
-- ============================================================================

-- IT/Software Intermediate Scenarios (5)
(
  gen_random_uuid(),
  'Microservices Migration',
  'Migrate a monolithic application to microservices architecture.',
  'Lead the strategic migration of a legacy monolithic e-commerce platform to a microservices architecture. Manage service decomposition, API design, data migration, and team coordination across multiple squads. Handle technical debt, deployment strategies, and minimize downtime during transition.',
  'IT/Software',
  'Agile',
  'intermediate',
  120,
  'project_manager',
  false,
  true
),
(
  gen_random_uuid(),
  'DevOps Pipeline Implementation',
  'Establish CI/CD pipelines and DevOps practices for a development team.',
  'As Team Lead, implement automated testing, continuous integration, and deployment pipelines. Train team on DevOps practices, select tools, configure infrastructure, and establish monitoring. Balance speed with quality and security requirements.',
  'IT/Software',
  'Agile',
  'intermediate',
  90,
  'team_lead',
  false,
  true
),
(
  gen_random_uuid(),
  'API Gateway Development',
  'Build a centralized API gateway for multiple services.',
  'Design and implement an API gateway to consolidate access to 15+ microservices. Manage API versioning, rate limiting, authentication, and documentation. Coordinate with multiple service teams and handle backward compatibility.',
  'IT/Software',
  'Scrum',
  'intermediate',
  100,
  'project_manager',
  false,
  true
),
(
  gen_random_uuid(),
  'Data Warehouse Modernization',
  'Modernize legacy data warehouse to cloud-based analytics platform.',
  'Migrate a 10-year-old on-premise data warehouse to a cloud-based analytics platform. Manage ETL pipeline redesign, data quality validation, user training, and cutover planning. Handle data governance and compliance requirements.',
  'IT/Software',
  'Hybrid',
  'intermediate',
  150,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Mobile App Backend Development',
  'Build scalable backend infrastructure for a mobile application.',
  'Develop the backend API and infrastructure for a consumer mobile app expected to scale to 1M+ users. Manage database design, caching strategies, API development, and cloud infrastructure. Handle performance optimization and cost management.',
  'IT/Software',
  'Agile',
  'intermediate',
  110,
  'project_manager',
  false,
  true
),

-- Construction Intermediate Scenarios (4)
(
  gen_random_uuid(),
  'Commercial Building Renovation',
  'Renovate a 20-story office building while maintaining tenant operations.',
  'Manage the phased renovation of a occupied commercial building. Coordinate with tenants, manage construction schedules, ensure safety compliance, and minimize disruption. Handle change orders, budget overruns, and quality control across multiple contractors.',
  'Construction',
  'Structured PM',
  'intermediate',
  180,
  'project_manager',
  false,
  true
),
(
  gen_random_uuid(),
  'Highway Infrastructure Project',
  'Lead a highway expansion project with multiple stakeholders.',
  'Manage a highway expansion project involving multiple municipalities, utility companies, and environmental agencies. Coordinate permits, manage traffic diversions, handle public relations, and ensure safety compliance. Balance schedule with budget and quality.',
  'Construction',
  'Structured PM',
  'intermediate',
  200,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Residential Complex Development',
  'Develop a 200-unit residential complex from planning to completion.',
  'As Team Lead, coordinate the development of a residential complex. Manage design, permits, construction phases, quality control, and handover. Handle vendor relationships, budget tracking, and timeline management across multiple workstreams.',
  'Construction',
  'Hybrid',
  'intermediate',
  240,
  'team_lead',
  true,
  true
),
(
  gen_random_uuid(),
  'Retrofit Project for Energy Efficiency',
  'Retrofit existing buildings to meet new energy efficiency standards.',
  'Lead a program to retrofit 50 existing buildings with energy-efficient systems. Manage vendor selection, installation scheduling, tenant coordination, and compliance verification. Handle budget constraints and minimize disruption to building occupants.',
  'Construction',
  'Kanban',
  'intermediate',
  130,
  'project_manager',
  false,
  true
),

-- Healthcare Intermediate Scenarios (4)
(
  gen_random_uuid(),
  'Hospital Information System Upgrade',
  'Upgrade hospital information systems with minimal service disruption.',
  'Manage the upgrade of critical hospital information systems including EMR, pharmacy, and lab systems. Coordinate with clinical staff, manage data migration, ensure HIPAA compliance, and minimize impact on patient care. Handle training and change management.',
  'Healthcare',
  'Hybrid',
  'intermediate',
  150,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Telehealth Platform Implementation',
  'Implement a telehealth platform across a healthcare network.',
  'Deploy a telehealth platform across 10 clinic locations. Manage vendor selection, integration with existing systems, clinician training, and patient onboarding. Handle regulatory compliance, technical support, and adoption metrics.',
  'Healthcare',
  'Agile',
  'intermediate',
  100,
  'project_manager',
  false,
  true
),
(
  gen_random_uuid(),
  'Medical Device Integration Project',
  'Integrate new medical devices into existing hospital workflows.',
  'As Team Lead, coordinate the integration of new diagnostic equipment into hospital workflows. Manage installation, staff training, workflow redesign, and quality assurance. Handle vendor relationships and ensure regulatory compliance.',
  'Healthcare',
  'Structured PM',
  'intermediate',
  90,
  'team_lead',
  false,
  true
),
(
  gen_random_uuid(),
  'Patient Portal Enhancement',
  'Enhance patient portal with new features and improved UX.',
  'Lead the enhancement of a patient portal with appointment scheduling, prescription refills, and test results. Manage user research, design iterations, development sprints, and user acceptance testing. Balance feature requests with technical constraints.',
  'Healthcare',
  'Scrum',
  'intermediate',
  80,
  'project_manager',
  false,
  true
),

-- Finance Intermediate Scenarios (4)
(
  gen_random_uuid(),
  'Payment Processing System Upgrade',
  'Upgrade payment processing infrastructure for PCI DSS compliance.',
  'Upgrade payment processing systems to meet new PCI DSS requirements. Manage security assessments, system upgrades, testing, and certification. Coordinate with payment processors, ensure zero downtime, and maintain transaction integrity.',
  'Finance',
  'Structured PM',
  'intermediate',
  120,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Regulatory Reporting Automation',
  'Automate regulatory reporting for financial compliance.',
  'Implement automated reporting systems for regulatory compliance (SOX, Basel III). Manage requirements gathering, system design, testing, and audit trails. Handle data quality, validation, and stakeholder approvals.',
  'Finance',
  'Hybrid',
  'intermediate',
  140,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Customer Onboarding Platform',
  'Build a digital customer onboarding platform for a bank.',
  'Develop a digital onboarding platform for new banking customers. Manage KYC compliance, identity verification, document management, and integration with core banking systems. Balance user experience with regulatory requirements.',
  'Finance',
  'Agile',
  'intermediate',
  110,
  'project_manager',
  false,
  true
),
(
  gen_random_uuid(),
  'Investment Portfolio Management System',
  'Implement portfolio management system for wealth management division.',
  'As Team Lead, coordinate the implementation of a portfolio management system. Manage vendor selection, data migration, advisor training, and client communication. Handle integration with trading platforms and reporting systems.',
  'Finance',
  'Structured PM',
  'intermediate',
  130,
  'team_lead',
  true,
  true
),

-- Crisis Management Scenarios (3)
(
  gen_random_uuid(),
  'Data Breach Response',
  'Lead incident response for a major data breach.',
  'Manage the response to a significant data breach affecting customer data. Coordinate with security team, legal, PR, and regulatory bodies. Manage containment, investigation, notification, and recovery. Handle media relations and customer communication.',
  'IT/Software',
  'Structured PM',
  'intermediate',
  180,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'Supply Chain Disruption Recovery',
  'Recover from a critical supply chain disruption.',
  'Lead recovery efforts after a major supplier failure disrupts production. Identify alternative suppliers, negotiate contracts, manage logistics, and restore operations. Coordinate with procurement, operations, and customer service teams.',
  'Manufacturing',
  'Hybrid',
  'intermediate',
  150,
  'project_manager',
  true,
  true
),
(
  gen_random_uuid(),
  'System Outage Recovery',
  'Manage recovery from a critical system outage.',
  'Lead recovery from a 48-hour system outage affecting customer operations. Coordinate technical recovery, customer communication, business continuity, and post-incident review. Manage stakeholder expectations and implement preventive measures.',
  'IT/Software',
  'Structured PM',
  'intermediate',
  120,
  'project_manager',
  false,
  true
)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- ASSESSMENT QUESTIONS
-- ============================================================================
INSERT INTO sim.assessment_questions (
  category, question_text, question_type, options, correct_answer, difficulty, sort_order, is_active
) VALUES
-- Experience Questions
(
  'experience',
  'How many years of project management experience do you have?',
  'multiple_choice',
  '[
    {"value": "none", "label": "No experience", "score": 0},
    {"value": "1-2", "label": "1-2 years", "score": 1},
    {"value": "3-5", "label": "3-5 years", "score": 2},
    {"value": "5+", "label": "More than 5 years", "score": 3}
  ]'::jsonb,
  NULL,
  'beginner',
  1,
  true
),
-- Methodology Questions
(
  'methodology',
  'Which project management methodology are you most familiar with?',
  'multiple_choice',
  '[
    {"value": "none", "label": "None / Not sure", "score": 0},
    {"value": "traditional", "label": "Traditional/Waterfall", "score": 1},
    {"value": "agile", "label": "Agile/Scrum", "score": 1},
    {"value": "both", "label": "Both Traditional and Agile", "score": 2}
  ]'::jsonb,
  NULL,
  'beginner',
  2,
  true
),
-- Planning Questions
(
  'planning',
  'How comfortable are you creating a Work Breakdown Structure (WBS)?',
  'scale',
  '[
    {"value": 1, "label": "Not at all", "score": 0},
    {"value": 2, "label": "Somewhat", "score": 1},
    {"value": 3, "label": "Comfortable", "score": 2},
    {"value": 4, "label": "Very comfortable", "score": 3}
  ]'::jsonb,
  NULL,
  'beginner',
  3,
  true
),
-- Risk Questions
(
  'risk',
  'How would you rate your risk management skills?',
  'scale',
  '[
    {"value": 1, "label": "Beginner", "score": 0},
    {"value": 2, "label": "Basic", "score": 1},
    {"value": 3, "label": "Intermediate", "score": 2},
    {"value": 4, "label": "Advanced", "score": 3}
  ]'::jsonb,
  NULL,
  'beginner',
  4,
  true
),
-- Leadership Questions
(
  'leadership',
  'Have you led a project team before?',
  'multiple_choice',
  '[
    {"value": "no", "label": "No", "score": 0},
    {"value": "small", "label": "Yes, small team (2-5 people)", "score": 1},
    {"value": "medium", "label": "Yes, medium team (6-15 people)", "score": 2},
    {"value": "large", "label": "Yes, large team (15+ people)", "score": 3}
  ]'::jsonb,
  NULL,
  'beginner',
  5,
  true
),
-- Tools Questions
(
  'tools',
  'Which project management tools have you used?',
  'multiple_choice',
  '[
    {"value": "none", "label": "None", "score": 0},
    {"value": "basic", "label": "Basic (Excel, Google Sheets)", "score": 1},
    {"value": "intermediate", "label": "PM Tools (Jira, Trello, Asana)", "score": 2},
    {"value": "advanced", "label": "Enterprise (MS Project, Primavera)", "score": 3}
  ]'::jsonb,
  NULL,
  'beginner',
  6,
  true
),
-- Communication Questions
(
  'communication',
  'How often do you create project status reports?',
  'multiple_choice',
  '[
    {"value": "never", "label": "Never", "score": 0},
    {"value": "rarely", "label": "Occasionally", "score": 1},
    {"value": "often", "label": "Regularly", "score": 2},
    {"value": "always", "label": "For every project", "score": 3}
  ]'::jsonb,
  NULL,
  'beginner',
  7,
  true
),
-- Role Preference Questions
(
  'role_preference',
  'Which role interests you most?',
  'multiple_choice',
  '[
    {"value": "team_member", "label": "Team Member - Execute tasks and collaborate", "score": 0, "role": "team_member"},
    {"value": "team_lead", "label": "Team Lead - Coordinate team activities", "score": 1, "role": "team_lead"},
    {"value": "project_manager", "label": "Project Manager - Lead entire projects", "score": 2, "role": "project_manager"},
    {"value": "programme_manager", "label": "Programme Manager - Oversee multiple projects", "score": 3, "role": "programme_manager"}
  ]'::jsonb,
  NULL,
  'beginner',
  8,
  true
);

-- ============================================================================
-- SCENARIO PHASES (for a sample scenario)
-- ============================================================================
DO $$
DECLARE
  scenario_id UUID;
BEGIN
  -- Get the IT Project Kickoff scenario ID
  SELECT id INTO scenario_id
  FROM sim.scenarios
  WHERE name = 'IT Project Kickoff'
  LIMIT 1;

  IF scenario_id IS NOT NULL THEN
    -- Insert phases for this scenario
    INSERT INTO sim.scenario_phases (
      scenario_id, phase_name, phase_order, description, duration_minutes, phase_data
    ) VALUES
    (
      scenario_id,
      'Project Initiation',
      1,
      'Define the project charter and identify key stakeholders',
      15,
      '{"objectives": ["Create project charter", "Identify stakeholders", "Define success criteria"], "deliverables": ["Project charter document", "Stakeholder register", "Success metrics"]}'::jsonb
    ),
    (
      scenario_id,
      'Team Formation',
      2,
      'Assemble and onboard the Scrum team',
      10,
      '{"objectives": ["Select team members", "Define roles", "Set working agreements"], "deliverables": ["Team roster", "RACI matrix", "Team charter"]}'::jsonb
    ),
    (
      scenario_id,
      'Product Backlog Creation',
      3,
      'Work with Product Owner to create initial backlog',
      20,
      '{"objectives": ["Gather requirements", "Write user stories", "Prioritize backlog"], "deliverables": ["Product backlog", "User story map", "Release plan"]}'::jsonb
    ),
    (
      scenario_id,
      'Sprint Planning',
      4,
      'Plan the first sprint with the team',
      15,
      '{"objectives": ["Define sprint goal", "Select backlog items", "Estimate effort"], "deliverables": ["Sprint backlog", "Sprint goal", "Capacity plan"]}'::jsonb
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- SCENARIO PACKS
-- ============================================================================
INSERT INTO sim.scenario_packs (
  name, description, industry, price, is_active
) VALUES
(
  'IT Professional Bundle',
  'Complete collection of IT and software development scenarios',
  'IT/Software',
  29.99,
  true
),
(
  'Healthcare Excellence Pack',
  'Specialized scenarios for healthcare project management',
  'Healthcare',
  39.99,
  true
),
(
  'Finance & Compliance Pack',
  'Advanced scenarios for financial services with compliance focus',
  'Finance',
  49.99,
  true
),
(
  'Construction Master Pack',
  'Comprehensive construction project management scenarios',
  'Construction',
  34.99,
  true
),
(
  'All Industries Bundle',
  'Complete access to all scenarios across all industries',
  NULL,
  99.99,
  true
);

-- ============================================================================
-- Register tables in database_tables registry
-- ============================================================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.scenarios', 'PM Simulator scenario definitions and configurations', false, true),
  ('sim.simulation_runs', 'User simulation run sessions and progress', false, true),
  ('sim.ai_events', 'AI-generated events during simulations', false, true),
  ('sim.module_scores', 'Scores per module within simulations', false, true),
  ('sim.user_progress', 'User XP, level, and achievement tracking', false, true),
  ('sim.custom_scenarios', 'User-created custom scenarios', false, true),
  ('sim.certificates', 'Earned certificates and credentials', false, true),
  ('sim.leaderboard_entries', 'Leaderboard rankings and scores', false, true),
  ('sim.simulator_subscriptions', 'User subscription plans for simulator', false, true),
  ('sim.scenario_packs', 'Purchasable scenario bundles', false, true),
  ('sim.user_purchases', 'User purchase history for packs', false, true),
  ('sim.badges', 'Achievement badge definitions', false, true),
  ('sim.user_badges', 'User earned badges', false, true),
  ('sim.assessment_questions', 'Skill assessment questions', false, true),
  ('sim.assessment_responses', 'User assessment responses', false, true),
  ('sim.scenario_reviews', 'User reviews of scenarios', false, true),
  ('sim.scenario_phases', 'Phase definitions within scenarios', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'PM Simulator seed data loaded successfully';
  RAISE NOTICE 'Badges: %', (SELECT COUNT(*) FROM sim.badges);
  RAISE NOTICE 'Scenarios: %', (SELECT COUNT(*) FROM sim.scenarios);
  RAISE NOTICE 'Assessment Questions: %', (SELECT COUNT(*) FROM sim.assessment_questions);
  RAISE NOTICE 'Scenario Packs: %', (SELECT COUNT(*) FROM sim.scenario_packs);
END $$;

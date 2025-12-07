-- ============================================================================
-- PM Simulator Expert Scenarios
-- Version: v75
-- Description: Expert-level scenarios including full lifecycle, programme manager, 
--              multi-methodology hybrid, and industry-specific deep dives
-- ============================================================================

-- ============================================================================
-- EXPERT SCENARIOS (15 scenarios)
-- ============================================================================

INSERT INTO sim.scenarios (
  id, name, short_description, description, industry, methodology,
  difficulty_level, duration_minutes, target_role, is_premium, is_active,
  learning_objectives, skills_covered, scenario_data
) VALUES

-- ============================================================================
-- FULL LIFECYCLE SIMULATIONS (4+ hours)
-- ============================================================================

-- 1. Enterprise Digital Transformation Programme
(
  gen_random_uuid(),
  'Enterprise Digital Transformation Programme',
  'Lead a multi-year digital transformation programme across 5 business units with 200+ team members.',
  'As Programme Manager, you''ll orchestrate a comprehensive digital transformation initiative spanning 5 years and affecting 200+ employees across Finance, HR, Operations, Sales, and Customer Service. This full lifecycle simulation covers programme initiation, business case development, stakeholder engagement across C-suite executives, portfolio management, risk mitigation, change management, vendor coordination, and benefits realization. You''ll navigate budget constraints, technology selection, organizational resistance, and regulatory compliance while delivering measurable business value.',
  'IT/Software',
  'Hybrid',
  'expert',
  300, -- 5 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Develop comprehensive programme business cases',
    'Manage complex stakeholder relationships at executive level',
    'Coordinate multiple interdependent projects',
    'Implement enterprise-wide change management',
    'Realize and measure programme benefits',
    'Navigate regulatory and compliance requirements'
  ]),
  to_jsonb(ARRAY[
    'Programme Management',
    'Strategic Planning',
    'Stakeholder Management',
    'Change Management',
    'Portfolio Management',
    'Benefits Realization',
    'Risk Management',
    'Vendor Management'
  ]),
  '{
    "phases": ["initiation", "planning", "execution", "monitoring", "closure"],
    "complexity": "very_high",
    "team_size": 200,
    "budget_range": "50M-100M",
    "duration_years": 5,
    "projects_count": 12,
    "stakeholders_count": 50
  }'::jsonb
),

-- 2. Global Infrastructure Modernization
(
  gen_random_uuid(),
  'Global Infrastructure Modernization Programme',
  'Modernize legacy infrastructure across 15 countries while maintaining 99.9% uptime.',
  'Lead a global infrastructure modernization programme affecting 15 countries, 50+ data centers, and 10,000+ servers. This expert-level simulation requires balancing technical complexity with business continuity. You''ll manage phased rollouts, coordinate with international teams across time zones, handle regulatory requirements in multiple jurisdictions, manage vendor relationships, and ensure zero-downtime migrations. The simulation includes crisis management, disaster recovery planning, and post-implementation optimization.',
  'IT/Software',
  'Structured PM',
  'expert',
  360, -- 6 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Plan and execute global infrastructure programmes',
    'Manage technical complexity at enterprise scale',
    'Coordinate international teams and vendors',
    'Ensure business continuity during transformation',
    'Navigate multi-jurisdictional regulatory requirements',
    'Implement disaster recovery and business continuity plans'
  ]),
  to_jsonb(ARRAY[
    'Programme Management',
    'Infrastructure Management',
    'International Project Management',
    'Vendor Management',
    'Risk Management',
    'Business Continuity',
    'Regulatory Compliance',
    'Technical Architecture'
  ]),
  '{
    "phases": ["assessment", "planning", "pilot", "rollout", "optimization"],
    "complexity": "very_high",
    "geographic_scope": "global",
    "countries": 15,
    "data_centers": 50,
    "servers": 10000,
    "uptime_requirement": "99.9%"
  }'::jsonb
),

-- 3. Healthcare System Integration Programme
(
  gen_random_uuid(),
  'Healthcare System Integration Programme',
  'Integrate 8 hospital systems into a unified electronic health records platform while maintaining patient safety.',
  'Manage a critical healthcare integration programme connecting 8 hospitals, 3 clinics, and 500+ healthcare providers. This expert simulation emphasizes patient safety, HIPAA compliance, clinical workflow optimization, and change management in a highly regulated environment. You''ll coordinate with medical staff, IT teams, compliance officers, and external vendors while ensuring zero impact on patient care during the transition.',
  'Healthcare',
  'Hybrid',
  'expert',
  300, -- 5 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Manage healthcare IT integration programmes',
    'Ensure HIPAA and regulatory compliance',
    'Coordinate clinical and technical teams',
    'Maintain patient safety during transitions',
    'Implement change management in healthcare settings',
    'Optimize clinical workflows'
  ]),
  to_jsonb(ARRAY[
    'Programme Management',
    'Healthcare IT',
    'Regulatory Compliance',
    'Change Management',
    'Clinical Workflow',
    'Patient Safety',
    'System Integration',
    'Stakeholder Management'
  ]),
  '{
    "phases": ["planning", "pilot", "phased_rollout", "optimization"],
    "complexity": "very_high",
    "hospitals": 8,
    "clinics": 3,
    "providers": 500,
    "compliance_standard": "HIPAA",
    "patient_safety_requirement": "zero_impact"
  }'::jsonb
),

-- ============================================================================
-- PROGRAMME MANAGER SCENARIOS
-- ============================================================================

-- 4. Multi-Project Portfolio Optimization
(
  gen_random_uuid(),
  'Multi-Project Portfolio Optimization',
  'Optimize a portfolio of 20 concurrent projects with competing resources and priorities.',
  'As Programme Manager, optimize a portfolio of 20 active projects with shared resources, competing priorities, and interdependencies. You''ll make strategic decisions about resource allocation, project prioritization, scope adjustments, and portfolio rebalancing. The simulation includes stakeholder negotiations, executive presentations, risk portfolio management, and benefits optimization across the entire portfolio.',
  'General',
  'Hybrid',
  'expert',
  240, -- 4 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Optimize project portfolios',
    'Allocate resources across multiple projects',
    'Prioritize projects strategically',
    'Manage portfolio-level risks',
    'Maximize portfolio benefits',
    'Present to executive stakeholders'
  ]),
  to_jsonb(ARRAY[
    'Portfolio Management',
    'Resource Optimization',
    'Strategic Planning',
    'Stakeholder Management',
    'Risk Management',
    'Benefits Management',
    'Executive Communication'
  ]),
  '{
    "projects_count": 20,
    "shared_resources": true,
    "interdependencies": true,
    "competing_priorities": true,
    "budget_constraints": true
  }'::jsonb
),

-- 5. Strategic Initiative Programme
(
  gen_random_uuid(),
  'Strategic Initiative Programme',
  'Deliver a strategic business initiative with 15 interdependent projects and $30M budget.',
  'Lead a strategic business initiative programme with 15 interdependent projects, $30M budget, and 150 team members. This programme-level simulation requires strategic thinking, executive alignment, cross-functional coordination, and benefits realization. You''ll manage programme governance, coordinate project managers, handle escalations, and ensure strategic objectives are met.',
  'General',
  'Structured PM',
  'expert',
  270, -- 4.5 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Lead strategic business initiatives',
    'Manage programme governance',
    'Coordinate multiple project managers',
    'Align with executive strategy',
    'Realize strategic benefits',
    'Handle programme-level escalations'
  ]),
  to_jsonb(ARRAY[
    'Programme Management',
    'Strategic Planning',
    'Governance',
    'Executive Management',
    'Benefits Realization',
    'Cross-functional Coordination'
  ]),
  '{
    "projects_count": 15,
    "budget": 30000000,
    "team_size": 150,
    "strategic_initiative": true,
    "executive_sponsorship": true
  }'::jsonb
),

-- 6. Merger & Acquisition Integration Programme
(
  gen_random_uuid(),
  'M&A Integration Programme',
  'Integrate two organizations following a $500M acquisition across 8 countries.',
  'Manage the post-merger integration programme for a $500M acquisition involving two organizations across 8 countries. This complex programme requires cultural integration, system consolidation, process harmonization, and organizational change management. You''ll coordinate with legal, HR, IT, Finance, and Operations teams while managing stakeholder expectations and ensuring business continuity.',
  'General',
  'Hybrid',
  'expert',
  300, -- 5 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Manage M&A integration programmes',
    'Navigate cultural integration challenges',
    'Consolidate systems and processes',
    'Coordinate cross-functional teams',
    'Manage organizational change',
    'Ensure business continuity during integration'
  ]),
  to_jsonb(ARRAY[
    'Programme Management',
    'M&A Integration',
    'Change Management',
    'Cultural Integration',
    'System Integration',
    'Organizational Design',
    'Stakeholder Management'
  ]),
  '{
    "acquisition_value": 500000000,
    "countries": 8,
    "organizations": 2,
    "integration_scope": "full",
    "cultural_challenges": true
  }'::jsonb
),

-- ============================================================================
-- MULTI-METHODOLOGY HYBRID SCENARIOS
-- ============================================================================

-- 7. Agile-Structured Hybrid Transformation
(
  gen_random_uuid(),
  'Agile-Structured Hybrid Transformation',
  'Transform a waterfall organization to hybrid Agile-Structured PM while maintaining delivery.',
  'Lead an organizational transformation from pure waterfall to a hybrid Agile-Structured PM approach. This expert simulation requires balancing Agile flexibility with Structured PM governance. You''ll establish hybrid frameworks, train teams, adapt processes, manage resistance, and demonstrate value while maintaining ongoing project delivery. The simulation includes methodology selection, framework design, training programmes, and cultural change.',
  'IT/Software',
  'Hybrid',
  'expert',
  240, -- 4 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Design hybrid PM methodologies',
    'Transform organizational PM practices',
    'Balance Agile and Structured approaches',
    'Manage cultural change',
    'Train and coach teams',
    'Demonstrate methodology value'
  ]),
  to_jsonb(ARRAY[
    'Methodology Design',
    'Organizational Transformation',
    'Agile Methodologies',
    'Structured PM',
    'Change Management',
    'Training & Coaching',
    'Process Improvement'
  ]),
  '{
    "transformation_scope": "organization_wide",
    "methodologies": ["Agile", "Structured PM"],
    "hybrid_framework": true,
    "cultural_change": true,
    "ongoing_delivery": true
  }'::jsonb
),

-- 8. DevOps-Scrum-Kanban Hybrid Delivery
(
  gen_random_uuid(),
  'DevOps-Scrum-Kanban Hybrid Delivery',
  'Implement a three-methodology hybrid approach for continuous delivery.',
  'Design and implement a hybrid delivery model combining DevOps, Scrum, and Kanban for a continuous delivery pipeline. This expert scenario requires deep understanding of all three methodologies and how to integrate them effectively. You''ll establish CI/CD pipelines, implement Scrum for feature development, use Kanban for operations, and create seamless handoffs between methodologies.',
  'IT/Software',
  'Hybrid',
  'expert',
  240, -- 4 hours
  'project_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Integrate DevOps, Scrum, and Kanban',
    'Design continuous delivery pipelines',
    'Establish methodology handoffs',
    'Optimize development-operations flow',
    'Implement CI/CD practices',
    'Balance speed and quality'
  ]),
  to_jsonb(ARRAY[
    'DevOps',
    'Scrum',
    'Kanban',
    'CI/CD',
    'Continuous Delivery',
    'Methodology Integration',
    'Process Optimization'
  ]),
  '{
    "methodologies": ["DevOps", "Scrum", "Kanban"],
    "continuous_delivery": true,
    "ci_cd_pipeline": true,
    "hybrid_integration": true
  }'::jsonb
),

-- 9. SAFe-Structured Hybrid Programme
(
  gen_random_uuid(),
  'SAFe-Structured Hybrid Programme',
  'Implement Scaled Agile Framework with Structured PM governance for enterprise delivery.',
  'Lead a large-scale programme using Scaled Agile Framework (SAFe) for delivery while maintaining Structured PM governance for compliance and reporting. This expert simulation requires coordinating multiple Agile Release Trains (ARTs), managing programme-level governance, ensuring regulatory compliance, and maintaining executive visibility. You''ll balance Agile autonomy with governance requirements.',
  'IT/Software',
  'Hybrid',
  'expert',
  300, -- 5 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Implement SAFe at enterprise scale',
    'Balance Agile delivery with governance',
    'Coordinate multiple Agile Release Trains',
    'Ensure regulatory compliance',
    'Maintain executive visibility',
    'Manage large-scale Agile transformations'
  ]),
  to_jsonb(ARRAY[
    'SAFe',
    'Scaled Agile',
    'Programme Management',
    'Governance',
    'Regulatory Compliance',
    'Agile Transformation',
    'Enterprise Agile'
  ]),
  '{
    "framework": "SAFe",
    "governance_model": "Structured PM",
    "arts_count": 5,
    "enterprise_scale": true,
    "regulatory_compliance": true
  }'::jsonb
),

-- ============================================================================
-- INDUSTRY-SPECIFIC DEEP DIVES
-- ============================================================================

-- 10. Pharmaceutical R&D Programme
(
  gen_random_uuid(),
  'Pharmaceutical R&D Programme',
  'Manage a drug development programme from discovery through FDA approval.',
  'Lead a pharmaceutical R&D programme taking a drug candidate from discovery through Phase III clinical trials to FDA approval. This expert simulation requires deep understanding of pharmaceutical regulations, clinical trial management, regulatory submissions, and risk management in a highly regulated environment. You''ll coordinate with scientists, clinicians, regulatory affairs, and manufacturing teams while managing timelines, budgets, and compliance requirements.',
  'Healthcare',
  'Structured PM',
  'expert',
  300, -- 5 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Manage pharmaceutical R&D programmes',
    'Navigate FDA regulatory processes',
    'Coordinate clinical trials',
    'Manage scientific and clinical teams',
    'Ensure regulatory compliance',
    'Handle R&D risk and uncertainty'
  ]),
  to_jsonb(ARRAY[
    'Pharmaceutical R&D',
    'Regulatory Affairs',
    'Clinical Trials',
    'FDA Compliance',
    'Scientific Management',
    'Risk Management',
    'Programme Management'
  ]),
  '{
    "industry": "Pharmaceutical",
    "regulatory_body": "FDA",
    "phases": ["Discovery", "Pre-clinical", "Phase I", "Phase II", "Phase III", "NDA"],
    "compliance_critical": true,
    "scientific_complexity": "very_high"
  }'::jsonb
),

-- 11. Aerospace Systems Development
(
  gen_random_uuid(),
  'Aerospace Systems Development Programme',
  'Develop a new aircraft system meeting FAA and EASA certification requirements.',
  'Manage the development of a new aircraft avionics system requiring FAA and EASA certification. This expert simulation emphasizes safety-critical systems, certification processes, systems engineering, and international regulatory compliance. You''ll coordinate with engineering teams, certification authorities, suppliers, and test facilities while ensuring the highest safety standards.',
  'Aerospace',
  'Structured PM',
  'expert',
  300, -- 5 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Manage aerospace systems development',
    'Navigate FAA and EASA certification',
    'Ensure safety-critical system quality',
    'Coordinate systems engineering',
    'Manage international regulatory compliance',
    'Handle complex technical requirements'
  ]),
  to_jsonb(ARRAY[
    'Aerospace Engineering',
    'Systems Engineering',
    'Certification Management',
    'Safety Management',
    'Regulatory Compliance',
    'Technical Leadership',
    'Programme Management'
  ]),
  '{
    "industry": "Aerospace",
    "regulatory_bodies": ["FAA", "EASA"],
    "safety_critical": true,
    "certification_required": true,
    "systems_engineering": true
  }'::jsonb
),

-- 12. Financial Services Digital Banking Platform
(
  gen_random_uuid(),
  'Digital Banking Platform Programme',
  'Build a next-generation digital banking platform with regulatory compliance.',
  'Lead the development of a next-generation digital banking platform requiring PCI-DSS, GDPR, and financial services regulatory compliance. This expert simulation combines technical complexity with strict regulatory requirements. You''ll manage security architecture, compliance validation, third-party integrations, and customer experience while ensuring regulatory approval.',
  'Finance',
  'Hybrid',
  'expert',
  270, -- 4.5 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Manage financial services technology programmes',
    'Ensure PCI-DSS and GDPR compliance',
    'Navigate financial services regulations',
    'Manage security architecture',
    'Coordinate third-party integrations',
    'Balance innovation with compliance'
  ]),
  to_jsonb(ARRAY[
    'Financial Services',
    'Regulatory Compliance',
    'Security Architecture',
    'PCI-DSS',
    'GDPR',
    'Digital Banking',
    'Programme Management'
  ]),
  '{
    "industry": "Financial Services",
    "compliance_standards": ["PCI-DSS", "GDPR", "Financial Services Regulations"],
    "security_critical": true,
    "regulatory_approval": true,
    "third_party_integrations": true
  }'::jsonb
),

-- 13. Energy Sector Smart Grid Programme
(
  gen_random_uuid(),
  'Smart Grid Modernization Programme',
  'Modernize electrical grid infrastructure with IoT and renewable energy integration.',
  'Lead a smart grid modernization programme integrating IoT sensors, renewable energy sources, and advanced analytics. This expert simulation requires understanding of energy sector regulations, grid operations, technology integration, and stakeholder management with utilities, regulators, and consumers. You''ll manage technical complexity, regulatory approvals, and public acceptance.',
  'Energy',
  'Hybrid',
  'expert',
  270, -- 4.5 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Manage energy sector infrastructure programmes',
    'Integrate IoT and renewable energy technologies',
    'Navigate energy sector regulations',
    'Coordinate with utilities and regulators',
    'Manage public stakeholder engagement',
    'Handle technical and regulatory complexity'
  ]),
  to_jsonb(ARRAY[
    'Energy Sector',
    'Infrastructure Management',
    'IoT Integration',
    'Renewable Energy',
    'Regulatory Management',
    'Stakeholder Engagement',
    'Programme Management'
  ]),
  '{
    "industry": "Energy",
    "infrastructure_type": "Smart Grid",
    "technologies": ["IoT", "Renewable Energy", "Analytics"],
    "regulatory_approval": true,
    "public_stakeholders": true
  }'::jsonb
),

-- 14. Construction Mega-Project Programme
(
  gen_random_uuid(),
  'Mega-Construction Programme',
  'Deliver a $2B infrastructure mega-project with 50+ subcontractors and 5-year timeline.',
  'Manage a $2B infrastructure mega-project involving 50+ subcontractors, multiple phases, and a 5-year timeline. This expert simulation emphasizes contract management, risk management, stakeholder coordination, safety management, and quality control at scale. You''ll coordinate with architects, engineers, contractors, regulators, and community stakeholders while managing budget, schedule, and quality.',
  'Construction',
  'Structured PM',
  'expert',
  300, -- 5 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Manage mega-construction projects',
    'Coordinate large subcontractor networks',
    'Manage complex contracts and procurement',
    'Ensure safety and quality at scale',
    'Navigate regulatory and community requirements',
    'Balance budget, schedule, and quality'
  ]),
  to_jsonb(ARRAY[
    'Construction Management',
    'Mega-Project Management',
    'Contract Management',
    'Procurement',
    'Safety Management',
    'Quality Control',
    'Stakeholder Management',
    'Programme Management'
  ]),
  '{
    "industry": "Construction",
    "project_value": 2000000000,
    "subcontractors": 50,
    "duration_years": 5,
    "mega_project": true,
    "infrastructure": true
  }'::jsonb
),

-- 15. Manufacturing Industry 4.0 Transformation
(
  gen_random_uuid(),
  'Industry 4.0 Manufacturing Transformation',
  'Transform manufacturing operations with IoT, AI, and automation technologies.',
  'Lead an Industry 4.0 transformation programme integrating IoT sensors, AI analytics, robotics, and automation across manufacturing facilities. This expert simulation requires understanding of manufacturing operations, technology integration, change management with factory workers, and ROI demonstration. You''ll coordinate with operations, IT, engineering, and HR teams while managing technical implementation and organizational change.',
  'Manufacturing',
  'Hybrid',
  'expert',
  270, -- 4.5 hours
  'programme_manager',
  true,
  true,
  to_jsonb(ARRAY[
    'Lead Industry 4.0 transformations',
    'Integrate IoT, AI, and automation technologies',
    'Manage manufacturing operations change',
    'Coordinate technical and operational teams',
    'Demonstrate ROI for technology investments',
    'Balance automation with workforce management'
  ]),
  to_jsonb(ARRAY[
    'Manufacturing',
    'Industry 4.0',
    'IoT Integration',
    'AI & Analytics',
    'Automation',
    'Change Management',
    'Operations Management',
    'Programme Management'
  ]),
  '{
    "industry": "Manufacturing",
    "transformation_type": "Industry 4.0",
    "technologies": ["IoT", "AI", "Robotics", "Automation"],
    "facilities_count": 10,
    "workforce_impact": true,
    "roi_demonstration": true
  }'::jsonb
)

ON CONFLICT DO NOTHING;

-- ============================================================================
-- UPDATE SCENARIO COUNTS
-- ============================================================================

-- Update scenario pack counts if needed
-- (This would be done when scenarios are added to packs)

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Expert scenarios created successfully';
  RAISE NOTICE 'Total expert scenarios: 15';
  RAISE NOTICE 'Full lifecycle scenarios: 3 (4-6 hours each)';
  RAISE NOTICE 'Programme manager scenarios: 3';
  RAISE NOTICE 'Multi-methodology hybrid scenarios: 3';
  RAISE NOTICE 'Industry-specific deep dives: 6';
END $$;


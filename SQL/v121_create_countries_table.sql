-- ================================================
-- File: v121_create_countries_table.sql
-- Description: Create countries lookup table with RLS policies
-- Version: 1.0
-- Date: 2025-01-XX
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- Creates countries lookup table for organisation setup and other forms
-- This table stores country codes and names for dropdown selections

-- ================================================
-- CREATE COUNTRIES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS countries (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Country Information
    code VARCHAR(2) UNIQUE NOT NULL,  -- ISO 3166-1 alpha-2 code (e.g., 'US', 'GB', 'ZA')
    name VARCHAR(100) NOT NULL,       -- Country name (e.g., 'United States', 'United Kingdom', 'South Africa')
    
    -- Additional Information (optional)
    iso3_code VARCHAR(3),             -- ISO 3166-1 alpha-3 code (e.g., 'USA', 'GBR', 'ZAF')
    numeric_code VARCHAR(3),          -- ISO 3166-1 numeric code
    continent VARCHAR(50),            -- Continent name
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_countries_code_unique ON countries(code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON countries(is_active) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER trg_countries_before_insert
    BEFORE INSERT ON countries
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_countries_before_update
    BEFORE UPDATE ON countries
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE countries IS 'Lookup table for countries used in organisation setup and other forms';
COMMENT ON COLUMN countries.code IS 'ISO 3166-1 alpha-2 country code (e.g., US, GB, ZA)';
COMMENT ON COLUMN countries.name IS 'Full country name';
COMMENT ON COLUMN countries.is_active IS 'Whether this country is active and should appear in dropdowns';

-- ================================================
-- RLS POLICIES
-- ================================================

-- Enable RLS
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Policy 1: All authenticated users can read active countries
CREATE POLICY policy_countries_select_authenticated
    ON countries FOR SELECT
    TO authenticated
    USING (is_active = TRUE AND is_deleted = FALSE);

-- Policy 2: Public read access for active countries (for registration forms)
CREATE POLICY policy_countries_select_public
    ON countries FOR SELECT
    TO anon
    USING (is_active = TRUE AND is_deleted = FALSE);

-- Policy 3: Only admins can insert/update/delete countries
CREATE POLICY policy_countries_admin_all
    ON countries FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND r.role_name IN ('System Admin', 'Superuser')
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND r.role_name IN ('System Admin', 'Superuser')
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
        )
    );

-- ================================================
-- SEED DATA - All Countries (ISO 3166-1)
-- ================================================

-- Insert ALL countries (marked as inactive by default)
INSERT INTO countries (code, name, iso3_code, continent, is_active)
VALUES
    -- Common Active Countries (50 countries - will be set to active below)
    ('US', 'United States', 'USA', 'North America', false),
    ('GB', 'United Kingdom', 'GBR', 'Europe', false),
    ('CA', 'Canada', 'CAN', 'North America', false),
    ('AU', 'Australia', 'AUS', 'Oceania', false),
    ('DE', 'Germany', 'DEU', 'Europe', false),
    ('FR', 'France', 'FRA', 'Europe', false),
    ('IN', 'India', 'IND', 'Asia', false),
    ('SG', 'Singapore', 'SGP', 'Asia', false),
    ('AE', 'United Arab Emirates', 'ARE', 'Asia', false),
    ('KE', 'Kenya', 'KEN', 'Africa', false),
    ('NG', 'Nigeria', 'NGA', 'Africa', false),
    ('ZA', 'South Africa', 'ZAF', 'Africa', false),
    ('ZW', 'Zimbabwe', 'ZWE', 'Africa', false),
    ('CN', 'China', 'CHN', 'Asia', false),
    ('JP', 'Japan', 'JPN', 'Asia', false),
    ('BR', 'Brazil', 'BRA', 'South America', false),
    ('MX', 'Mexico', 'MEX', 'North America', false),
    ('IT', 'Italy', 'ITA', 'Europe', false),
    ('ES', 'Spain', 'ESP', 'Europe', false),
    ('NL', 'Netherlands', 'NLD', 'Europe', false),
    ('SE', 'Sweden', 'SWE', 'Europe', false),
    ('NO', 'Norway', 'NOR', 'Europe', false),
    ('DK', 'Denmark', 'DNK', 'Europe', false),
    ('FI', 'Finland', 'FIN', 'Europe', false),
    ('CH', 'Switzerland', 'CHE', 'Europe', false),
    ('AT', 'Austria', 'AUT', 'Europe', false),
    ('BE', 'Belgium', 'BEL', 'Europe', false),
    ('PL', 'Poland', 'POL', 'Europe', false),
    ('PT', 'Portugal', 'PRT', 'Europe', false),
    ('GR', 'Greece', 'GRC', 'Europe', false),
    ('IE', 'Ireland', 'IRL', 'Europe', false),
    ('NZ', 'New Zealand', 'NZL', 'Oceania', false),
    ('KR', 'South Korea', 'KOR', 'Asia', false),
    ('TW', 'Taiwan', 'TWN', 'Asia', false),
    ('HK', 'Hong Kong', 'HKG', 'Asia', false),
    ('MY', 'Malaysia', 'MYS', 'Asia', false),
    ('TH', 'Thailand', 'THA', 'Asia', false),
    ('ID', 'Indonesia', 'IDN', 'Asia', false),
    ('PH', 'Philippines', 'PHL', 'Asia', false),
    ('VN', 'Vietnam', 'VNM', 'Asia', false),
    ('SA', 'Saudi Arabia', 'SAU', 'Asia', false),
    ('IL', 'Israel', 'ISR', 'Asia', false),
    ('TR', 'Turkey', 'TUR', 'Asia', false),
    ('EG', 'Egypt', 'EGY', 'Africa', false),
    ('GH', 'Ghana', 'GHA', 'Africa', false),
    ('TZ', 'Tanzania', 'TZA', 'Africa', false),
    ('UG', 'Uganda', 'UGA', 'Africa', false),
    ('ET', 'Ethiopia', 'ETH', 'Africa', false),
    ('AR', 'Argentina', 'ARG', 'South America', false),
    ('CL', 'Chile', 'CHL', 'South America', false),
    ('CO', 'Colombia', 'COL', 'South America', false),
    ('PE', 'Peru', 'PER', 'South America', false),
    
    -- All Other Countries (inactive)
    ('AF', 'Afghanistan', 'AFG', 'Asia', false),
    ('AL', 'Albania', 'ALB', 'Europe', false),
    ('DZ', 'Algeria', 'DZA', 'Africa', false),
    ('AS', 'American Samoa', 'ASM', 'Oceania', false),
    ('AD', 'Andorra', 'AND', 'Europe', false),
    ('AO', 'Angola', 'AGO', 'Africa', false),
    ('AI', 'Anguilla', 'AIA', 'North America', false),
    ('AQ', 'Antarctica', 'ATA', 'Antarctica', false),
    ('AG', 'Antigua and Barbuda', 'ATG', 'North America', false),
    ('AM', 'Armenia', 'ARM', 'Asia', false),
    ('AW', 'Aruba', 'ABW', 'North America', false),
    ('AZ', 'Azerbaijan', 'AZE', 'Asia', false),
    ('BS', 'Bahamas', 'BHS', 'North America', false),
    ('BH', 'Bahrain', 'BHR', 'Asia', false),
    ('BD', 'Bangladesh', 'BGD', 'Asia', false),
    ('BB', 'Barbados', 'BRB', 'North America', false),
    ('BY', 'Belarus', 'BLR', 'Europe', false),
    ('BZ', 'Belize', 'BLZ', 'North America', false),
    ('BJ', 'Benin', 'BEN', 'Africa', false),
    ('BM', 'Bermuda', 'BMU', 'North America', false),
    ('BT', 'Bhutan', 'BTN', 'Asia', false),
    ('BO', 'Bolivia', 'BOL', 'South America', false),
    ('BA', 'Bosnia and Herzegovina', 'BIH', 'Europe', false),
    ('BW', 'Botswana', 'BWA', 'Africa', false),
    ('BV', 'Bouvet Island', 'BVT', 'Antarctica', false),
    ('IO', 'British Indian Ocean Territory', 'IOT', 'Asia', false),
    ('BN', 'Brunei', 'BRN', 'Asia', false),
    ('BG', 'Bulgaria', 'BGR', 'Europe', false),
    ('BF', 'Burkina Faso', 'BFA', 'Africa', false),
    ('BI', 'Burundi', 'BDI', 'Africa', false),
    ('CV', 'Cape Verde', 'CPV', 'Africa', false),
    ('KH', 'Cambodia', 'KHM', 'Asia', false),
    ('CM', 'Cameroon', 'CMR', 'Africa', false),
    ('KY', 'Cayman Islands', 'CYM', 'North America', false),
    ('CF', 'Central African Republic', 'CAF', 'Africa', false),
    ('TD', 'Chad', 'TCD', 'Africa', false),
    ('CX', 'Christmas Island', 'CXR', 'Asia', false),
    ('CC', 'Cocos (Keeling) Islands', 'CCK', 'Asia', false),
    ('KM', 'Comoros', 'COM', 'Africa', false),
    ('CG', 'Congo', 'COG', 'Africa', false),
    ('CD', 'Congo, Democratic Republic', 'COD', 'Africa', false),
    ('CK', 'Cook Islands', 'COK', 'Oceania', false),
    ('CR', 'Costa Rica', 'CRI', 'North America', false),
    ('CI', 'Côte d''Ivoire', 'CIV', 'Africa', false),
    ('HR', 'Croatia', 'HRV', 'Europe', false),
    ('CU', 'Cuba', 'CUB', 'North America', false),
    ('CY', 'Cyprus', 'CYP', 'Asia', false),
    ('CZ', 'Czech Republic', 'CZE', 'Europe', false),
    ('DJ', 'Djibouti', 'DJI', 'Africa', false),
    ('DM', 'Dominica', 'DMA', 'North America', false),
    ('DO', 'Dominican Republic', 'DOM', 'North America', false),
    ('EC', 'Ecuador', 'ECU', 'South America', false),
    ('SV', 'El Salvador', 'SLV', 'North America', false),
    ('GQ', 'Equatorial Guinea', 'GNQ', 'Africa', false),
    ('ER', 'Eritrea', 'ERI', 'Africa', false),
    ('EE', 'Estonia', 'EST', 'Europe', false),
    ('FK', 'Falkland Islands', 'FLK', 'South America', false),
    ('FO', 'Faroe Islands', 'FRO', 'Europe', false),
    ('FJ', 'Fiji', 'FJI', 'Oceania', false),
    ('GF', 'French Guiana', 'GUF', 'South America', false),
    ('PF', 'French Polynesia', 'PYF', 'Oceania', false),
    ('TF', 'French Southern Territories', 'ATF', 'Antarctica', false),
    ('GA', 'Gabon', 'GAB', 'Africa', false),
    ('GM', 'Gambia', 'GMB', 'Africa', false),
    ('GE', 'Georgia', 'GEO', 'Asia', false),
    ('GI', 'Gibraltar', 'GIB', 'Europe', false),
    ('GL', 'Greenland', 'GRL', 'North America', false),
    ('GD', 'Grenada', 'GRD', 'North America', false),
    ('GP', 'Guadeloupe', 'GLP', 'North America', false),
    ('GU', 'Guam', 'GUM', 'Oceania', false),
    ('GT', 'Guatemala', 'GTM', 'North America', false),
    ('GG', 'Guernsey', 'GGY', 'Europe', false),
    ('GN', 'Guinea', 'GIN', 'Africa', false),
    ('GW', 'Guinea-Bissau', 'GNB', 'Africa', false),
    ('GY', 'Guyana', 'GUY', 'South America', false),
    ('HT', 'Haiti', 'HTI', 'North America', false),
    ('HM', 'Heard Island and McDonald Islands', 'HMD', 'Antarctica', false),
    ('VA', 'Holy See (Vatican City)', 'VAT', 'Europe', false),
    ('HN', 'Honduras', 'HND', 'North America', false),
    ('IS', 'Iceland', 'ISL', 'Europe', false),
    ('IR', 'Iran', 'IRN', 'Asia', false),
    ('IQ', 'Iraq', 'IRQ', 'Asia', false),
    ('IM', 'Isle of Man', 'IMN', 'Europe', false),
    ('JM', 'Jamaica', 'JAM', 'North America', false),
    ('JE', 'Jersey', 'JEY', 'Europe', false),
    ('JO', 'Jordan', 'JOR', 'Asia', false),
    ('KZ', 'Kazakhstan', 'KAZ', 'Asia', false),
    ('KI', 'Kiribati', 'KIR', 'Oceania', false),
    ('KP', 'North Korea', 'PRK', 'Asia', false),
    ('KW', 'Kuwait', 'KWT', 'Asia', false),
    ('KG', 'Kyrgyzstan', 'KGZ', 'Asia', false),
    ('LA', 'Laos', 'LAO', 'Asia', false),
    ('LV', 'Latvia', 'LVA', 'Europe', false),
    ('LB', 'Lebanon', 'LBN', 'Asia', false),
    ('LS', 'Lesotho', 'LSO', 'Africa', false),
    ('LR', 'Liberia', 'LBR', 'Africa', false),
    ('LY', 'Libya', 'LBY', 'Africa', false),
    ('LI', 'Liechtenstein', 'LIE', 'Europe', false),
    ('LT', 'Lithuania', 'LTU', 'Europe', false),
    ('LU', 'Luxembourg', 'LUX', 'Europe', false),
    ('MO', 'Macao', 'MAC', 'Asia', false),
    ('MK', 'North Macedonia', 'MKD', 'Europe', false),
    ('MG', 'Madagascar', 'MDG', 'Africa', false),
    ('MW', 'Malawi', 'MWI', 'Africa', false),
    ('MV', 'Maldives', 'MDV', 'Asia', false),
    ('ML', 'Mali', 'MLI', 'Africa', false),
    ('MT', 'Malta', 'MLT', 'Europe', false),
    ('MH', 'Marshall Islands', 'MHL', 'Oceania', false),
    ('MQ', 'Martinique', 'MTQ', 'North America', false),
    ('MR', 'Mauritania', 'MRT', 'Africa', false),
    ('MU', 'Mauritius', 'MUS', 'Africa', false),
    ('YT', 'Mayotte', 'MYT', 'Africa', false),
    ('FM', 'Micronesia', 'FSM', 'Oceania', false),
    ('MD', 'Moldova', 'MDA', 'Europe', false),
    ('MC', 'Monaco', 'MCO', 'Europe', false),
    ('MN', 'Mongolia', 'MNG', 'Asia', false),
    ('ME', 'Montenegro', 'MNE', 'Europe', false),
    ('MS', 'Montserrat', 'MSR', 'North America', false),
    ('MA', 'Morocco', 'MAR', 'Africa', false),
    ('MZ', 'Mozambique', 'MOZ', 'Africa', false),
    ('MM', 'Myanmar', 'MMR', 'Asia', false),
    ('NA', 'Namibia', 'NAM', 'Africa', false),
    ('NR', 'Nauru', 'NRU', 'Oceania', false),
    ('NP', 'Nepal', 'NPL', 'Asia', false),
    ('NC', 'New Caledonia', 'NCL', 'Oceania', false),
    ('NI', 'Nicaragua', 'NIC', 'North America', false),
    ('NE', 'Niger', 'NER', 'Africa', false),
    ('NU', 'Niue', 'NIU', 'Oceania', false),
    ('NF', 'Norfolk Island', 'NFK', 'Oceania', false),
    ('MP', 'Northern Mariana Islands', 'MNP', 'Oceania', false),
    ('OM', 'Oman', 'OMN', 'Asia', false),
    ('PK', 'Pakistan', 'PAK', 'Asia', false),
    ('PW', 'Palau', 'PLW', 'Oceania', false),
    ('PS', 'Palestine', 'PSE', 'Asia', false),
    ('PA', 'Panama', 'PAN', 'North America', false),
    ('PG', 'Papua New Guinea', 'PNG', 'Oceania', false),
    ('PY', 'Paraguay', 'PRY', 'South America', false),
    ('PN', 'Pitcairn', 'PCN', 'Oceania', false),
    ('PR', 'Puerto Rico', 'PRI', 'North America', false),
    ('QA', 'Qatar', 'QAT', 'Asia', false),
    ('RE', 'Réunion', 'REU', 'Africa', false),
    ('RO', 'Romania', 'ROU', 'Europe', false),
    ('RU', 'Russia', 'RUS', 'Europe', false),
    ('RW', 'Rwanda', 'RWA', 'Africa', false),
    ('BL', 'Saint Barthélemy', 'BLM', 'North America', false),
    ('SH', 'Saint Helena', 'SHN', 'Africa', false),
    ('KN', 'Saint Kitts and Nevis', 'KNA', 'North America', false),
    ('LC', 'Saint Lucia', 'LCA', 'North America', false),
    ('MF', 'Saint Martin', 'MAF', 'North America', false),
    ('PM', 'Saint Pierre and Miquelon', 'SPM', 'North America', false),
    ('VC', 'Saint Vincent and the Grenadines', 'VCT', 'North America', false),
    ('WS', 'Samoa', 'WSM', 'Oceania', false),
    ('SM', 'San Marino', 'SMR', 'Europe', false),
    ('ST', 'Sao Tome and Principe', 'STP', 'Africa', false),
    ('SN', 'Senegal', 'SEN', 'Africa', false),
    ('RS', 'Serbia', 'SRB', 'Europe', false),
    ('SC', 'Seychelles', 'SYC', 'Africa', false),
    ('SL', 'Sierra Leone', 'SLE', 'Africa', false),
    ('SK', 'Slovakia', 'SVK', 'Europe', false),
    ('SI', 'Slovenia', 'SVN', 'Europe', false),
    ('SB', 'Solomon Islands', 'SLB', 'Oceania', false),
    ('SO', 'Somalia', 'SOM', 'Africa', false),
    ('GS', 'South Georgia and the South Sandwich Islands', 'SGS', 'Antarctica', false),
    ('SS', 'South Sudan', 'SSD', 'Africa', false),
    ('LK', 'Sri Lanka', 'LKA', 'Asia', false),
    ('SD', 'Sudan', 'SDN', 'Africa', false),
    ('SR', 'Suriname', 'SUR', 'South America', false),
    ('SJ', 'Svalbard and Jan Mayen', 'SJM', 'Europe', false),
    ('SZ', 'Eswatini', 'SWZ', 'Africa', false),
    ('SY', 'Syria', 'SYR', 'Asia', false),
    ('TJ', 'Tajikistan', 'TJK', 'Asia', false),
    ('TL', 'Timor-Leste', 'TLS', 'Asia', false),
    ('TG', 'Togo', 'TGO', 'Africa', false),
    ('TK', 'Tokelau', 'TKL', 'Oceania', false),
    ('TO', 'Tonga', 'TON', 'Oceania', false),
    ('TT', 'Trinidad and Tobago', 'TTO', 'North America', false),
    ('TN', 'Tunisia', 'TUN', 'Africa', false),
    ('TM', 'Turkmenistan', 'TKM', 'Asia', false),
    ('TC', 'Turks and Caicos Islands', 'TCA', 'North America', false),
    ('TV', 'Tuvalu', 'TUV', 'Oceania', false),
    ('UA', 'Ukraine', 'UKR', 'Europe', false),
    ('UM', 'United States Minor Outlying Islands', 'UMI', 'Oceania', false),
    ('UY', 'Uruguay', 'URY', 'South America', false),
    ('UZ', 'Uzbekistan', 'UZB', 'Asia', false),
    ('VU', 'Vanuatu', 'VUT', 'Oceania', false),
    ('VE', 'Venezuela', 'VEN', 'South America', false),
    ('VG', 'British Virgin Islands', 'VGB', 'North America', false),
    ('VI', 'U.S. Virgin Islands', 'VIR', 'North America', false),
    ('WF', 'Wallis and Futuna', 'WLF', 'Oceania', false),
    ('EH', 'Western Sahara', 'ESH', 'Africa', false),
    ('YE', 'Yemen', 'YEM', 'Asia', false),
    ('ZM', 'Zambia', 'ZMB', 'Africa', false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    iso3_code = EXCLUDED.iso3_code,
    continent = EXCLUDED.continent,
    updated_at = NOW();

-- Activate the 50 common countries
UPDATE countries
SET is_active = true,
    updated_at = NOW()
WHERE code IN (
    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IN', 'SG', 'AE', 'KE',
    'NG', 'ZA', 'ZW', 'CN', 'JP', 'BR', 'MX', 'IT', 'ES', 'NL',
    'SE', 'NO', 'DK', 'FI', 'CH', 'AT', 'BE', 'PL', 'PT', 'GR',
    'IE', 'NZ', 'KR', 'TW', 'HK', 'MY', 'TH', 'ID', 'PH', 'VN',
    'SA', 'IL', 'TR', 'EG', 'GH', 'TZ', 'UG', 'ET', 'AR', 'CL',
    'CO', 'PE'
);

-- ================================================
-- REGISTER TABLE
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('countries', 'Lookup table for countries used in organisation setup and other forms', false, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_country_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_country_count
    FROM countries
    WHERE is_active = TRUE AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Countries Table Created';
    RAISE NOTICE 'Active Countries: %', v_country_count;
    RAISE NOTICE '================================================';
END $$;


-- ============================================================================
-- Activate Common Countries
-- Version: v125
-- Description: Activates the most commonly used countries in the countries table
-- Author: Claude Code
-- Date: 2025-12-13
-- ============================================================================

-- Purpose:
-- The countries table was created with all countries marked as inactive (is_active = false)
-- This script activates the most commonly used countries for the country dropdown

-- Issue:
-- RLS policies only allow reading countries where is_active = TRUE
-- But all countries were inserted with is_active = FALSE
-- This caused the country dropdown to be empty

-- ============================================================================
-- ACTIVATE COMMON COUNTRIES
-- ============================================================================

-- Activate 50+ most commonly used countries (adjust list as needed)
UPDATE countries
SET is_active = TRUE, updated_at = NOW()
WHERE code IN (
    -- Major English-speaking countries
    'US', -- United States
    'GB', -- United Kingdom
    'CA', -- Canada
    'AU', -- Australia
    'NZ', -- New Zealand
    'IE', -- Ireland

    -- Major European countries
    'DE', -- Germany
    'FR', -- France
    'IT', -- Italy
    'ES', -- Spain
    'NL', -- Netherlands
    'BE', -- Belgium
    'CH', -- Switzerland
    'AT', -- Austria
    'SE', -- Sweden
    'NO', -- Norway
    'DK', -- Denmark
    'FI', -- Finland
    'PL', -- Poland
    'PT', -- Portugal
    'GR', -- Greece

    -- Major Asian countries
    'IN', -- India
    'CN', -- China
    'JP', -- Japan
    'SG', -- Singapore
    'HK', -- Hong Kong
    'TH', -- Thailand
    'MY', -- Malaysia
    'ID', -- Indonesia
    'PH', -- Philippines
    'VN', -- Vietnam
    'KR', -- South Korea
    'TW', -- Taiwan
    'PK', -- Pakistan
    'BD', -- Bangladesh

    -- Middle East
    'AE', -- United Arab Emirates
    'SA', -- Saudi Arabia
    'IL', -- Israel
    'QA', -- Qatar
    'KW', -- Kuwait

    -- Africa
    'ZA', -- South Africa
    'NG', -- Nigeria
    'KE', -- Kenya
    'EG', -- Egypt
    'GH', -- Ghana
    'ZW', -- Zimbabwe
    'TZ', -- Tanzania
    'UG', -- Uganda
    'BW', -- Botswana
    'MU', -- Mauritius

    -- Latin America
    'BR', -- Brazil
    'MX', -- Mexico
    'AR', -- Argentina
    'CL', -- Chile
    'CO', -- Colombia
    'PE', -- Peru
    'VE', -- Venezuela

    -- Other
    'RU', -- Russia
    'TR', -- Turkey
    'UA', -- Ukraine
    'CZ', -- Czech Republic
    'RO', -- Romania
    'HU', -- Hungary
    'BG', -- Bulgaria
    'HR', -- Croatia
    'SK', -- Slovakia
    'SI', -- Slovenia
    'LT', -- Lithuania
    'LV', -- Latvia
    'EE', -- Estonia
    'IS', -- Iceland
    'LU', -- Luxembourg
    'MT', -- Malta
    'CY', -- Cyprus
    'RS', -- Serbia
    'BA', -- Bosnia and Herzegovina
    'AL', -- Albania
    'MK', -- North Macedonia
    'ME', -- Montenegro
    'MD', -- Moldova
    'GE', -- Georgia
    'AM', -- Armenia
    'AZ', -- Azerbaijan
    'KZ', -- Kazakhstan
    'UZ', -- Uzbekistan
    'TM', -- Turkmenistan
    'KG', -- Kyrgyzstan
    'TJ', -- Tajikistan
    'MN', -- Mongolia
    'NP', -- Nepal
    'LK', -- Sri Lanka
    'MM', -- Myanmar
    'KH', -- Cambodia
    'LA', -- Laos
    'BN', -- Brunei
    'BT', -- Bhutan
    'MV', -- Maldives
    'AF', -- Afghanistan
    'IQ', -- Iraq
    'IR', -- Iran
    'JO', -- Jordan
    'LB', -- Lebanon
    'SY', -- Syria
    'YE', -- Yemen
    'OM', -- Oman
    'BH', -- Bahrain
    'PS', -- Palestine
    'ET', -- Ethiopia
    'MA', -- Morocco
    'TN', -- Tunisia
    'DZ', -- Algeria
    'LY', -- Libya
    'SD', -- Sudan
    'SN', -- Senegal
    'CI', -- Ivory Coast
    'CM', -- Cameroon
    'AO', -- Angola
    'MZ', -- Mozambique
    'ZM', -- Zambia
    'MW', -- Malawi
    'NA', -- Namibia
    'RW', -- Rwanda
    'BI', -- Burundi
    'BJ', -- Benin
    'TG', -- Togo
    'BF', -- Burkina Faso
    'ML', -- Mali
    'NE', -- Niger
    'TD', -- Chad
    'MR', -- Mauritania
    'GM', -- Gambia
    'GN', -- Guinea
    'SL', -- Sierra Leone
    'LR', -- Liberia
    'GQ', -- Equatorial Guinea
    'GA', -- Gabon
    'CG', -- Congo
    'CD', -- Democratic Republic of the Congo
    'CF', -- Central African Republic
    'SO', -- Somalia
    'DJ', -- Djibouti
    'ER', -- Eritrea
    'SS', -- South Sudan
    'MG', -- Madagascar
    'KM', -- Comoros
    'SC', -- Seychelles
    'SZ', -- Eswatini
    'LS', -- Lesotho
    'CR', -- Costa Rica
    'PA', -- Panama
    'GT', -- Guatemala
    'HN', -- Honduras
    'SV', -- El Salvador
    'NI', -- Nicaragua
    'BZ', -- Belize
    'JM', -- Jamaica
    'TT', -- Trinidad and Tobago
    'BB', -- Barbados
    'GY', -- Guyana
    'SR', -- Suriname
    'UY', -- Uruguay
    'PY', -- Paraguay
    'BO', -- Bolivia
    'EC', -- Ecuador
    'CU', -- Cuba
    'DO', -- Dominican Republic
    'HT', -- Haiti
    'PR', -- Puerto Rico
    'FJ', -- Fiji
    'PG', -- Papua New Guinea
    'NC', -- New Caledonia
    'PF', -- French Polynesia
    'WS', -- Samoa
    'TO', -- Tonga
    'VU', -- Vanuatu
    'SB', -- Solomon Islands
    'GU', -- Guam
    'FM', -- Micronesia
    'PW', -- Palau
    'MH', -- Marshall Islands
    'KI', -- Kiribati
    'TV', -- Tuvalu
    'NR', -- Nauru
    'AS', -- American Samoa
    'CK', -- Cook Islands
    'NU', -- Niue
    'TK', -- Tokelau
    'WF'  -- Wallis and Futuna
)
AND is_deleted = FALSE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_active_count INTEGER;
    v_total_count INTEGER;
BEGIN
    -- Count active countries
    SELECT COUNT(*)
    INTO v_active_count
    FROM countries
    WHERE is_active = TRUE AND is_deleted = FALSE;

    -- Count total countries
    SELECT COUNT(*)
    INTO v_total_count
    FROM countries
    WHERE is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Countries Activated Successfully';
    RAISE NOTICE 'Active Countries: %', v_active_count;
    RAISE NOTICE 'Total Countries: %', v_total_count;
    RAISE NOTICE 'Inactive Countries: %', (v_total_count - v_active_count);
    RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- TESTING
-- ============================================================================

-- Test query to see active countries (run in Supabase SQL Editor to verify)
-- SELECT code, name, continent
-- FROM countries
-- WHERE is_active = TRUE AND is_deleted = FALSE
-- ORDER BY name
-- LIMIT 20;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To deactivate all countries again:
-- UPDATE countries SET is_active = FALSE WHERE is_active = TRUE;

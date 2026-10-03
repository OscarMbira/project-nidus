-- ================================================
-- File: v1161_create_currencies_table.sql
-- Description: Create currencies lookup table with RLS policies (mirrors v121 countries)
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- Replaces hardcoded currency option lists (CURRENCY_OPTIONS constant, ad-hoc CURRENCIES
-- arrays) with a DB-backed lookup table, per CLAUDE.md rule 25.1 (no hardcoding) and rule 15
-- (dropdown lists must read from an is_active-filtered DB table, same pattern as countries).

-- ================================================
-- CREATE CURRENCIES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS currencies (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Currency Information
    code VARCHAR(3) UNIQUE NOT NULL,   -- ISO 4217 alpha code (e.g., 'USD', 'EUR', 'ZAR')
    name VARCHAR(100) NOT NULL,        -- Currency name (e.g., 'US Dollar')
    symbol VARCHAR(10),                -- Currency symbol (e.g., '$', '€', '£')
    decimal_places SMALLINT DEFAULT 2, -- Minor unit decimal places (e.g., 0 for JPY, 3 for KWD)

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
CREATE UNIQUE INDEX IF NOT EXISTS idx_currencies_code_unique ON currencies(code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_currencies_is_active ON currencies(is_active) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_currencies_name ON currencies(name) WHERE is_deleted = FALSE;

-- Triggers (reuse the same generic audit-field trigger functions countries uses)
CREATE TRIGGER trg_currencies_before_insert
    BEFORE INSERT ON currencies
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();

CREATE TRIGGER trg_currencies_before_update
    BEFORE UPDATE ON currencies
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

-- Comments
COMMENT ON TABLE currencies IS 'Lookup table for currencies used in resource costing, regional format settings, and other forms';
COMMENT ON COLUMN currencies.code IS 'ISO 4217 alpha currency code (e.g., USD, EUR, ZAR)';
COMMENT ON COLUMN currencies.name IS 'Full currency name';
COMMENT ON COLUMN currencies.symbol IS 'Common currency symbol, where one exists';
COMMENT ON COLUMN currencies.decimal_places IS 'Minor unit decimal places for display/rounding (ISO 4217 exponent)';
COMMENT ON COLUMN currencies.is_active IS 'Whether this currency is active and should appear in dropdowns';

-- ================================================
-- RLS POLICIES
-- ================================================

ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_currencies_select_authenticated
    ON currencies FOR SELECT
    TO authenticated
    USING (is_active = TRUE AND is_deleted = FALSE);

CREATE POLICY policy_currencies_select_public
    ON currencies FOR SELECT
    TO anon
    USING (is_active = TRUE AND is_deleted = FALSE);

CREATE POLICY policy_currencies_admin_all
    ON currencies FOR ALL
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
-- SEED DATA - ISO 4217 currencies
-- ================================================

-- Common active currencies (the set previously hardcoded in CURRENCY_OPTIONS / CURRENCIES
-- constants across the app) plus full ISO 4217 coverage marked inactive by default.
INSERT INTO currencies (code, name, symbol, decimal_places, is_active)
VALUES
    -- Previously-hardcoded set — activated below
    ('USD', 'US Dollar', '$', 2, false),
    ('EUR', 'Euro', '€', 2, false),
    ('GBP', 'British Pound', '£', 2, false),
    ('ZAR', 'South African Rand', 'R', 2, false),
    ('AUD', 'Australian Dollar', '$', 2, false),
    ('CAD', 'Canadian Dollar', '$', 2, false),
    ('NZD', 'New Zealand Dollar', '$', 2, false),
    ('CHF', 'Swiss Franc', 'Fr', 2, false),
    ('JPY', 'Japanese Yen', '¥', 0, false),
    ('CNY', 'Chinese Yuan', '¥', 2, false),
    ('INR', 'Indian Rupee', '₹', 2, false),
    ('KES', 'Kenyan Shilling', 'KSh', 2, false),
    ('NGN', 'Nigerian Naira', '₦', 2, false),
    ('BWP', 'Botswana Pula', 'P', 2, false),
    ('MWK', 'Malawian Kwacha', 'MK', 2, false),
    ('ZMW', 'Zambian Kwacha', 'ZK', 2, false),

    -- Remaining ISO 4217 currencies (inactive by default)
    ('AED', 'UAE Dirham', 'د.إ', 2, false),
    ('AFN', 'Afghan Afghani', '؋', 2, false),
    ('ALL', 'Albanian Lek', 'L', 2, false),
    ('AMD', 'Armenian Dram', '֏', 2, false),
    ('ANG', 'Netherlands Antillean Guilder', 'ƒ', 2, false),
    ('AOA', 'Angolan Kwanza', 'Kz', 2, false),
    ('ARS', 'Argentine Peso', '$', 2, false),
    ('AZN', 'Azerbaijani Manat', '₼', 2, false),
    ('BAM', 'Bosnia-Herzegovina Convertible Mark', 'KM', 2, false),
    ('BBD', 'Barbadian Dollar', '$', 2, false),
    ('BDT', 'Bangladeshi Taka', '৳', 2, false),
    ('BGN', 'Bulgarian Lev', 'лв', 2, false),
    ('BHD', 'Bahraini Dinar', '.د.ب', 3, false),
    ('BIF', 'Burundian Franc', 'FBu', 0, false),
    ('BMD', 'Bermudan Dollar', '$', 2, false),
    ('BND', 'Brunei Dollar', '$', 2, false),
    ('BOB', 'Bolivian Boliviano', 'Bs.', 2, false),
    ('BRL', 'Brazilian Real', 'R$', 2, false),
    ('BSD', 'Bahamian Dollar', '$', 2, false),
    ('BTN', 'Bhutanese Ngultrum', 'Nu.', 2, false),
    ('BYN', 'Belarusian Ruble', 'Br', 2, false),
    ('BZD', 'Belize Dollar', 'BZ$', 2, false),
    ('CDF', 'Congolese Franc', 'FC', 2, false),
    ('CLP', 'Chilean Peso', '$', 0, false),
    ('COP', 'Colombian Peso', '$', 2, false),
    ('CRC', 'Costa Rican Colón', '₡', 2, false),
    ('CUP', 'Cuban Peso', '$', 2, false),
    ('CVE', 'Cape Verdean Escudo', '$', 2, false),
    ('CZK', 'Czech Koruna', 'Kč', 2, false),
    ('DJF', 'Djiboutian Franc', 'Fdj', 0, false),
    ('DKK', 'Danish Krone', 'kr', 2, false),
    ('DOP', 'Dominican Peso', 'RD$', 2, false),
    ('DZD', 'Algerian Dinar', 'دج', 2, false),
    ('EGP', 'Egyptian Pound', '£', 2, false),
    ('ERN', 'Eritrean Nakfa', 'Nfk', 2, false),
    ('ETB', 'Ethiopian Birr', 'Br', 2, false),
    ('FJD', 'Fijian Dollar', '$', 2, false),
    ('GEL', 'Georgian Lari', '₾', 2, false),
    ('GHS', 'Ghanaian Cedi', '₵', 2, false),
    ('GMD', 'Gambian Dalasi', 'D', 2, false),
    ('GNF', 'Guinean Franc', 'FG', 0, false),
    ('GTQ', 'Guatemalan Quetzal', 'Q', 2, false),
    ('GYD', 'Guyanaese Dollar', '$', 2, false),
    ('HKD', 'Hong Kong Dollar', '$', 2, false),
    ('HNL', 'Honduran Lempira', 'L', 2, false),
    ('HRK', 'Croatian Kuna', 'kn', 2, false),
    ('HTG', 'Haitian Gourde', 'G', 2, false),
    ('HUF', 'Hungarian Forint', 'Ft', 2, false),
    ('IDR', 'Indonesian Rupiah', 'Rp', 2, false),
    ('ILS', 'Israeli New Shekel', '₪', 2, false),
    ('IQD', 'Iraqi Dinar', 'ع.د', 3, false),
    ('IRR', 'Iranian Rial', '﷼', 2, false),
    ('ISK', 'Icelandic Króna', 'kr', 0, false),
    ('JMD', 'Jamaican Dollar', 'J$', 2, false),
    ('JOD', 'Jordanian Dinar', 'د.ا', 3, false),
    ('KGS', 'Kyrgystani Som', 'лв', 2, false),
    ('KHR', 'Cambodian Riel', '៛', 2, false),
    ('KMF', 'Comorian Franc', 'CF', 0, false),
    ('KRW', 'South Korean Won', '₩', 0, false),
    ('KWD', 'Kuwaiti Dinar', 'د.ك', 3, false),
    ('KZT', 'Kazakhstani Tenge', '₸', 2, false),
    ('LAK', 'Laotian Kip', '₭', 2, false),
    ('LBP', 'Lebanese Pound', 'ل.ل', 2, false),
    ('LKR', 'Sri Lankan Rupee', 'Rs', 2, false),
    ('LRD', 'Liberian Dollar', '$', 2, false),
    ('LSL', 'Lesotho Loti', 'L', 2, false),
    ('LYD', 'Libyan Dinar', 'ل.د', 3, false),
    ('MAD', 'Moroccan Dirham', 'د.م.', 2, false),
    ('MDL', 'Moldovan Leu', 'L', 2, false),
    ('MGA', 'Malagasy Ariary', 'Ar', 0, false),
    ('MKD', 'Macedonian Denar', 'ден', 2, false),
    ('MMK', 'Myanmar Kyat', 'K', 2, false),
    ('MNT', 'Mongolian Tugrik', '₮', 2, false),
    ('MOP', 'Macanese Pataca', 'MOP$', 2, false),
    ('MRU', 'Mauritanian Ouguiya', 'UM', 2, false),
    ('MUR', 'Mauritian Rupee', '₨', 2, false),
    ('MVR', 'Maldivian Rufiyaa', 'Rf', 2, false),
    ('MXN', 'Mexican Peso', '$', 2, false),
    ('MYR', 'Malaysian Ringgit', 'RM', 2, false),
    ('MZN', 'Mozambican Metical', 'MT', 2, false),
    ('NAD', 'Namibian Dollar', '$', 2, false),
    ('NIO', 'Nicaraguan Córdoba', 'C$', 2, false),
    ('NOK', 'Norwegian Krone', 'kr', 2, false),
    ('NPR', 'Nepalese Rupee', '₨', 2, false),
    ('OMR', 'Omani Rial', 'ر.ع.', 3, false),
    ('PAB', 'Panamanian Balboa', 'B/.', 2, false),
    ('PEN', 'Peruvian Sol', 'S/.', 2, false),
    ('PGK', 'Papua New Guinean Kina', 'K', 2, false),
    ('PHP', 'Philippine Peso', '₱', 2, false),
    ('PKR', 'Pakistani Rupee', '₨', 2, false),
    ('PLN', 'Polish Złoty', 'zł', 2, false),
    ('PYG', 'Paraguayan Guarani', '₲', 0, false),
    ('QAR', 'Qatari Rial', 'ر.ق', 2, false),
    ('RON', 'Romanian Leu', 'lei', 2, false),
    ('RSD', 'Serbian Dinar', 'дин.', 2, false),
    ('RUB', 'Russian Ruble', '₽', 2, false),
    ('RWF', 'Rwandan Franc', 'FRw', 0, false),
    ('SAR', 'Saudi Riyal', 'ر.س', 2, false),
    ('SBD', 'Solomon Islands Dollar', '$', 2, false),
    ('SCR', 'Seychellois Rupee', '₨', 2, false),
    ('SDG', 'Sudanese Pound', 'ج.س.', 2, false),
    ('SEK', 'Swedish Krona', 'kr', 2, false),
    ('SGD', 'Singapore Dollar', '$', 2, false),
    ('SLL', 'Sierra Leonean Leone', 'Le', 2, false),
    ('SOS', 'Somali Shilling', 'S', 2, false),
    ('SRD', 'Surinamese Dollar', '$', 2, false),
    ('SSP', 'South Sudanese Pound', '£', 2, false),
    ('STN', 'São Tomé and Príncipe Dobra', 'Db', 2, false),
    ('SYP', 'Syrian Pound', '£', 2, false),
    ('SZL', 'Swazi Lilangeni', 'L', 2, false),
    ('THB', 'Thai Baht', '฿', 2, false),
    ('TJS', 'Tajikistani Somoni', 'ЅМ', 2, false),
    ('TMT', 'Turkmenistani Manat', 'm', 2, false),
    ('TND', 'Tunisian Dinar', 'د.ت', 3, false),
    ('TOP', 'Tongan Paʻanga', 'T$', 2, false),
    ('TRY', 'Turkish Lira', '₺', 2, false),
    ('TTD', 'Trinidad and Tobago Dollar', 'TT$', 2, false),
    ('TWD', 'New Taiwan Dollar', 'NT$', 2, false),
    ('TZS', 'Tanzanian Shilling', 'TSh', 2, false),
    ('UAH', 'Ukrainian Hryvnia', '₴', 2, false),
    ('UGX', 'Ugandan Shilling', 'USh', 0, false),
    ('UYU', 'Uruguayan Peso', '$U', 2, false),
    ('UZS', 'Uzbekistan Som', 'лв', 2, false),
    ('VES', 'Venezuelan Bolívar', 'Bs.', 2, false),
    ('VND', 'Vietnamese Dong', '₫', 0, false),
    ('VUV', 'Vanuatu Vatu', 'VT', 0, false),
    ('WST', 'Samoan Tala', 'WS$', 2, false),
    ('XAF', 'Central African CFA Franc', 'FCFA', 0, false),
    ('XCD', 'East Caribbean Dollar', '$', 2, false),
    ('XOF', 'West African CFA Franc', 'CFA', 0, false),
    ('XPF', 'CFP Franc', '₣', 0, false),
    ('YER', 'Yemeni Rial', '﷼', 2, false),
    ('ZWL', 'Zimbabwean Dollar', '$', 2, false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    decimal_places = EXCLUDED.decimal_places,
    updated_at = NOW();

-- Activate the previously-hardcoded common set
UPDATE currencies
SET is_active = true,
    updated_at = NOW()
WHERE code IN (
    'USD', 'EUR', 'GBP', 'ZAR', 'AUD', 'CAD', 'NZD', 'CHF',
    'JPY', 'CNY', 'INR', 'KES', 'NGN', 'BWP', 'MWK', 'ZMW'
);

-- ================================================
-- REGISTER TABLE
-- ================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('currencies', 'Lookup table for currencies used in resource costing, regional format settings, and other forms', false, true, 'system')
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
    v_currency_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_currency_count
    FROM currencies
    WHERE is_active = TRUE AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Currencies Table Created';
    RAISE NOTICE 'Active Currencies: %', v_currency_count;
    RAISE NOTICE '================================================';
END $$;

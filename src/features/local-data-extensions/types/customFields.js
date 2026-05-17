/**
 * @typedef {object} CustomFieldDefinition
 * @property {string} id
 * @property {string} account_id
 * @property {string} field_code
 * @property {string} label
 * @property {string} [description]
 * @property {string} field_type
 * @property {string} workflow_status
 * @property {Record<string, unknown>} [validation_rules]
 * @property {boolean} [include_in_export]
 * @property {boolean} [is_sensitive]
 */

/**
 * @typedef {object} CustomFieldValueRow
 * @property {string} id
 * @property {string} field_definition_id
 * @property {string|null} [value_text]
 * @property {number|null} [value_number]
 * @property {boolean|null} [value_boolean]
 * @property {string|null} [value_date]
 * @property {string|null} [value_timestamptz]
 * @property {unknown|null} [value_json]
 */

export {}

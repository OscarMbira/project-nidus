// v1345 fix 2026-11-22 — register fields that never had help (found by the real-register-key audit).
// Shape: [help_key, title, purpose, examples[], format_notes?, extra_notes?]. CLAUDE.md rule 77 applies.
const t = (key, title, purpose, ex) => [key, title, purpose, [ex]]
const R = 'register:ict_requirements_specification:'
export const MODULE = 'registers_ict'
export const ROWS = [
  t(R + 'document_type', 'Document type', 'Whether this is a business requirements document or a functional requirements specification.', 'Functional Requirements Specification'),
  t(R + 'functional_requirements', 'Functional requirements', 'Functional requirement records linked to this specification. Pick existing records from the Requirements register.', 'REQ-014 Scan every pallet on arrival'),
]

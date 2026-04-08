# Smart Amount Input Implementation Plan
## v200 - Shorthand Numeric Conversion Feature

**Created:** 2026-01-28
**Completed:** 2026-01-28
**Status:** ✅ COMPLETED
**Priority:** High (New CLAUDE.md Rule #36)

---

## Overview

Implement a feature that allows users to enter shorthand values for numeric/amount fields. For example:
- `10k` or `10K` → `10,000` (thousand)
- `10t` or `10T` → `10,000` (thousand - alternative)
- `3m` or `3M` → `3,000,000` (million)
- `2b` or `2B` → `2,000,000,000` (billion)
- `1.5k` → `1,500` (supports decimals)

The conversion happens when the user presses **Enter** or when the field loses focus (blur event).

---

## Best Practice Conversion Multipliers

| Suffix | Multiplier | Full Name | Example Input | Result |
|--------|------------|-----------|---------------|--------|
| `k` / `K` | 1,000 | Thousand | `5k` | 5,000 |
| `t` / `T` | 1,000 | Thousand (alternative) | `5t` | 5,000 |
| `m` / `M` | 1,000,000 | Million | `2.5m` | 2,500,000 |
| `b` / `B` | 1,000,000,000 | Billion | `1b` | 1,000,000,000 |
| `tr` / `TR` | 1,000,000,000,000 | Trillion | `1tr` | 1,000,000,000,000 |

**Note:** Both `k` and `t` represent thousand (common in different regions).

---

## Current State Analysis

### Findings from Codebase Exploration:
- **78+ components** use numeric inputs
- **No centralized** CurrencyInput or AmountInput component
- **Inconsistent patterns** - each form implements inputs independently
- **Common pattern used:**
  ```jsx
  <input
    type="number"
    step="0.01"
    value={value}
    onChange={(e) => onChange(parseFloat(e.target.value))}
  />
  ```

### Key Components Requiring Update:
1. Budget sections (ProjectPlanBudgetSection, StagePlanBudgetSection)
2. Financial controls (FinancialControlsSection)
3. Resource forms (ResourceForm, WPResourceForm)
4. Risk response costs (ResponseForm)
5. Benefit calculations (BenefitForm)
6. Payment/subscription forms
7. Quality metrics
8. Constraint value inputs

---

## Implementation Architecture

### Component Structure
```
src/
├── components/
│   └── ui/
│       ├── SmartAmountInput.jsx      # Main reusable component
│       └── SmartAmountInput.test.jsx # Unit tests
├── utils/
│   └── amountShorthand.js            # Conversion utilities
│   └── amountShorthand.test.js       # Utility tests
└── hooks/
    └── useAmountShorthand.js         # React hook for conversion logic
```

---

## Todo List

### Phase 1: Core Utilities & Component ✅ COMPLETED
- [x] **1.1** Create `src/utils/amountShorthand.js` - Conversion utility functions ✅
- [x] **1.2** Create `src/hooks/useAmountShorthand.js` - React hook for state management ✅
- [x] **1.3** Create `src/components/ui/SmartAmountInput.jsx` - Reusable input component ✅
- [x] **1.4** Create unit tests for utilities and component ✅
- [x] **1.5** Create documentation for the component usage ✅

### Phase 2: High-Priority Component Integration ✅ COMPLETED
- [x] **2.1** Update `FinancialControlsSection.jsx` - Budget fields ✅
- [x] **2.2** Update `ProjectPlanBudgetSection.jsx` - Project budget ✅
- [x] **2.3** Update `StagePlanBudgetSection.jsx` - Stage budget ✅
- [x] **2.4** Update `ResourceForm.jsx` - Cost per unit ✅
- [x] **2.5** Update `ResponseForm.jsx` - Estimated cost ✅

### Phase 3: Medium-Priority Integration ✅ COMPLETED
- [x] **3.1** Update `BenefitForm.jsx` - Benefit values ✅
- [x] **3.2** Update `ConstraintValueInput.jsx` - Numeric constraints ✅
- [x] **3.3** Update `QualityInspectionForm.jsx` - Quality metrics ⏭️ SKIPPED (fields are counts/percentages, not amounts)
- [x] **3.4** Update payment/subscription forms ⏭️ SKIPPED (prices are calculated, not entered)

### Phase 4: Simulator Parity ✅ COMPLETED
- [x] **4.1** Ensure SmartAmountInput works in simulator components ✅ (Component is in shared `src/components/ui/` folder)
- [x] **4.2** Update simulator-specific forms with shorthand support ⏭️ N/A (Simulator pages use text areas for costs, no numeric amount inputs found)

### Phase 5: Documentation & Testing ✅ COMPLETED
- [x] **5.1** Create user documentation ✅ (`Documentation/SmartAmountInput_User_Guide.md`)
- [x] **5.2** Add unit tests ✅ (56 tests passing)
- [x] **5.3** Update CLAUDE.md with component usage guidelines ✅ (Rule #36 already exists)

---

## Technical Specifications

### 1. Conversion Utility (`amountShorthand.js`)

```javascript
/**
 * Parse shorthand amount string to numeric value
 * @param {string} input - User input (e.g., "10k", "3.5m")
 * @returns {number|null} - Parsed numeric value or null if invalid
 */
export function parseShorthandAmount(input) {
  // Implementation details...
}

/**
 * Format number to shorthand display
 * @param {number} value - Numeric value
 * @param {object} options - Formatting options
 * @returns {string} - Formatted shorthand string
 */
export function formatToShorthand(value, options = {}) {
  // Implementation details...
}

/**
 * Format number with locale-aware thousands separators
 * @param {number} value - Numeric value
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} - Formatted string with separators
 */
export function formatWithSeparators(value, decimals = 2) {
  // Implementation details...
}
```

### 2. SmartAmountInput Component Props

```typescript
interface SmartAmountInputProps {
  // Value & Change
  value: number | null;
  onChange: (value: number | null) => void;

  // Optional Configuration
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;

  // Currency Support
  currency?: string;           // e.g., "USD", "ZAR"
  showCurrencySymbol?: boolean;

  // Shorthand Configuration
  enableShorthand?: boolean;   // Default: true
  convertOnEnter?: boolean;    // Default: true
  convertOnBlur?: boolean;     // Default: true
  showConversionHint?: boolean; // Default: true

  // Styling
  className?: string;
  inputClassName?: string;
  size?: 'sm' | 'md' | 'lg';

  // Callbacks
  onConversion?: (original: string, converted: number) => void;
  onValidationError?: (error: string) => void;
}
```

### 3. Component Behavior

1. **Normal Input Mode:**
   - User types numbers normally
   - Standard number validation applies

2. **Shorthand Detection:**
   - Detect suffixes: k, K, t, T, m, M, b, B, tr, TR
   - Support decimal numbers before suffix (e.g., `1.5k`)

3. **Conversion Triggers:**
   - **Enter key:** Convert and keep focus
   - **Tab/Blur:** Convert and move to next field
   - **Paste:** Auto-detect and offer conversion

4. **Visual Feedback:**
   - Show tooltip/hint: "Press Enter to convert 10k → 10,000"
   - Brief animation on successful conversion
   - Format display value with thousands separators

5. **Error Handling:**
   - Invalid input: Show error state
   - Out of range: Show warning
   - Negative values: Allow or restrict based on prop

### 4. Theme Support

```jsx
// Dark mode (default)
const darkStyles = {
  input: 'bg-gray-700 border-gray-600 text-white',
  hint: 'text-gray-400',
  error: 'border-red-500 text-red-400'
};

// Light mode
const lightStyles = {
  input: 'bg-white border-gray-300 text-gray-900',
  hint: 'text-gray-500',
  error: 'border-red-500 text-red-600'
};
```

---

## Usage Examples

### Basic Usage
```jsx
import { SmartAmountInput } from '@/components/ui/SmartAmountInput';

<SmartAmountInput
  value={budget}
  onChange={setBudget}
  placeholder="Enter budget (e.g., 50k)"
/>
```

### With Currency
```jsx
<SmartAmountInput
  value={cost}
  onChange={setCost}
  currency="USD"
  showCurrencySymbol
  placeholder="0.00"
/>
```

### In Form Context
```jsx
<div className="form-group">
  <label>Project Budget</label>
  <SmartAmountInput
    value={formData.budget}
    onChange={(val) => setFormData({...formData, budget: val})}
    min={0}
    max={1000000000}
    required
  />
  <small className="text-gray-400">
    Tip: Type 50k for 50,000 or 2m for 2,000,000
  </small>
</div>
```

---

## Accessibility Considerations

1. **ARIA Labels:**
   - `aria-label` for screen readers
   - `aria-describedby` for conversion hints

2. **Keyboard Navigation:**
   - Full keyboard support
   - Enter key conversion doesn't submit form

3. **Screen Reader Announcements:**
   - Announce converted value
   - Announce validation errors

---

## Testing Strategy

### Unit Tests (amountShorthand.test.js)
```javascript
describe('parseShorthandAmount', () => {
  test('converts k suffix to thousands', () => {
    expect(parseShorthandAmount('10k')).toBe(10000);
    expect(parseShorthandAmount('10K')).toBe(10000);
  });

  test('converts t suffix to thousands', () => {
    expect(parseShorthandAmount('5t')).toBe(5000);
    expect(parseShorthandAmount('5T')).toBe(5000);
  });

  test('converts m suffix to millions', () => {
    expect(parseShorthandAmount('3m')).toBe(3000000);
    expect(parseShorthandAmount('3M')).toBe(3000000);
  });

  test('supports decimal values', () => {
    expect(parseShorthandAmount('1.5k')).toBe(1500);
    expect(parseShorthandAmount('2.5m')).toBe(2500000);
  });

  test('returns null for invalid input', () => {
    expect(parseShorthandAmount('abc')).toBeNull();
    expect(parseShorthandAmount('')).toBeNull();
  });
});
```

### Component Tests (SmartAmountInput.test.jsx)
```javascript
describe('SmartAmountInput', () => {
  test('renders with placeholder', () => {});
  test('converts shorthand on Enter key', () => {});
  test('converts shorthand on blur', () => {});
  test('displays formatted value with separators', () => {});
  test('shows conversion hint', () => {});
  test('handles theme toggle', () => {});
});
```

---

## Migration Strategy

### Gradual Adoption
1. Create component without breaking existing inputs
2. Update high-traffic forms first
3. Provide migration guide for developers
4. Eventually deprecate raw number inputs for amounts

### Backward Compatibility
- Component accepts same props as standard input
- Can be used as drop-in replacement
- Fallback to standard behavior if shorthand disabled

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| User confusion | Medium | Clear hints, documentation |
| Accidental conversion | Low | Require explicit trigger (Enter) |
| Data precision loss | Low | Use precise decimal handling |
| Performance | Low | Debounced conversion |

---

## Success Metrics

1. **Adoption Rate:** 80%+ of amount fields using SmartAmountInput
2. **User Satisfaction:** Reduced data entry time
3. **Error Reduction:** Fewer typos in large numbers
4. **Code Quality:** Centralized input handling

---

## Dependencies

- React 18+
- Tailwind CSS (for styling)
- ThemeContext (for dark/light mode)
- Vitest (for testing)

---

## Timeline Estimate

- **Phase 1:** Core component creation
- **Phase 2:** High-priority integrations
- **Phase 3:** Medium-priority integrations
- **Phase 4:** Simulator parity
- **Phase 5:** Documentation & testing

---

## Review Section

**Completed:** 2026-01-28
**Status:** ✅ FULLY IMPLEMENTED

### Files Created
1. `src/utils/amountShorthand.js` - Core utility functions for shorthand parsing and formatting
2. `src/hooks/useAmountShorthand.js` - React hook for state management
3. `src/components/ui/SmartAmountInput.jsx` - Reusable input component with theme support
4. `src/utils/__tests__/amountShorthand.test.js` - Unit tests for utilities (56 tests)
5. `src/components/ui/__tests__/SmartAmountInput.test.jsx` - Component tests
6. `Documentation/SmartAmountInput_User_Guide.md` - User and developer documentation

### Files Modified
1. `src/components/project/FinancialControlsSection.jsx` - Budget amount field
2. `src/components/plans/ProjectPlanBudgetSection.jsx` - Total budget, contingency fields
3. `src/components/plans/StagePlanBudgetSection.jsx` - Stage budget, contingency fields
4. `src/components/plans/ResourceForm.jsx` - Cost per unit field
5. `src/components/risks/ResponseForm.jsx` - Estimated cost field
6. `src/components/benefits/BenefitForm.jsx` - Baseline, target, current, realized, estimated value fields
7. `src/components/constraints/ConstraintValueInput.jsx` - Numeric constraint values

### Testing Results
- **Unit Tests:** 56 tests passing (100%)
- **Utilities Coverage:**
  - parseShorthandAmount: All conversion patterns tested
  - formatToShorthand: Formatting options tested
  - formatWithSeparators: Locale formatting tested
  - formatCurrency: Currency formatting tested
  - validateAmountRange: Range validation tested

### Shorthand Conversions Implemented
| Suffix | Multiplier | Example |
|--------|------------|---------|
| k/K | 1,000 | 10k → 10,000 |
| t/T | 1,000 | 10t → 10,000 |
| m/M | 1,000,000 | 3m → 3,000,000 |
| b/B | 1,000,000,000 | 2b → 2,000,000,000 |
| tr/TR | 1,000,000,000,000 | 1tr → 1,000,000,000,000 |

### Features Implemented
- ✅ Shorthand conversion on Enter key
- ✅ Shorthand conversion on blur/tab
- ✅ Visual conversion hints
- ✅ Green flash animation on successful conversion
- ✅ Dark/light theme support
- ✅ Currency symbol prefix support
- ✅ Min/max validation
- ✅ Accessibility (ARIA labels, keyboard navigation)
- ✅ Decimal support (e.g., 1.5k → 1,500)
- ✅ Negative value support (e.g., -10k → -10,000)

### Known Limitations
- Shorthand is English-centric (k, m, b). International alternatives not implemented.
- The `t` suffix may confuse users expecting "trillion" (it means thousand, same as `k`)

### Future Improvements
- [ ] Add locale-specific shorthand support
- [ ] Add `tr` for trillion more prominently
- [ ] Consider adding `cr` for crore (Indian numbering)
- [ ] Add voice input support for accessibility
- [ ] Integration tests with form submission flows

---

## Appendix: Components to Update

### High Priority (Budget/Financial)
1. `src/components/project/FinancialControlsSection.jsx`
2. `src/components/plans/ProjectPlanBudgetSection.jsx`
3. `src/components/plans/StagePlanBudgetSection.jsx`
4. `src/components/plans/ResourceForm.jsx`
5. `src/components/risks/ResponseForm.jsx`

### Medium Priority (Benefits/Quality)
6. `src/components/benefits/BenefitForm.jsx`
7. `src/components/constraints/ConstraintValueInput.jsx`
8. `src/components/quality/QualityInspectionForm.jsx`
9. `src/components/quality/QualityReviewForm.jsx`

### Payment/Subscription
10. `src/components/subscription/PaymentForm.jsx`
11. `src/components/app/PurchaseExtraSeatsModal.jsx`
12. `src/pages/onboarding/PaidProjectSetup.jsx`

### Simulator Components
13. All corresponding simulator forms (to be identified during Phase 4)

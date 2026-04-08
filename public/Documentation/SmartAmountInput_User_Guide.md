# SmartAmountInput Component - User Guide

**Created:** 2026-01-28
**Version:** 1.0.0

---

## Overview

The `SmartAmountInput` component provides an enhanced numeric input experience that supports shorthand notation for large numbers. Users can type values like `10k` and press Enter to automatically convert to `10,000`.

---

## Supported Shorthand Notations

| Shorthand | Multiplier | Full Name | Example |
|-----------|------------|-----------|---------|
| `k` / `K` | 1,000 | Thousand | `10k` → 10,000 |
| `t` / `T` | 1,000 | Thousand (alt) | `10t` → 10,000 |
| `m` / `M` | 1,000,000 | Million | `3m` → 3,000,000 |
| `b` / `B` | 1,000,000,000 | Billion | `2b` → 2,000,000,000 |
| `tr` / `TR` | 1,000,000,000,000 | Trillion | `1tr` → 1,000,000,000,000 |

**Note:** Both uppercase and lowercase suffixes are accepted. Decimal values are also supported (e.g., `1.5k` → 1,500).

---

## How to Use (For End Users)

### Basic Entry

1. Click on the amount field
2. Type your value with a shorthand suffix:
   - `50k` for $50,000
   - `2.5m` for $2,500,000
   - `1b` for $1,000,000,000

3. Press **Enter** or **Tab** to convert

### Visual Feedback

- **Conversion Hint:** When you type a shorthand value, a hint appears showing what it will convert to
- **Green Flash:** After conversion, the field briefly flashes green to confirm
- **Formatted Display:** After conversion, the number shows with thousand separators (e.g., 10,000.00)

### Examples

| You Type | Press Enter | Result |
|----------|-------------|--------|
| `50k` | ↵ | 50,000.00 |
| `2.5m` | ↵ | 2,500,000.00 |
| `100` | ↵ | 100.00 |
| `-10k` | ↵ | -10,000.00 |

---

## Developer Documentation

### Installation

The component is already part of the Project Nidus codebase:

```javascript
import { SmartAmountInput } from '@/components/ui/SmartAmountInput';
// or
import { SmartCurrencyInput, SmartBudgetInput } from '@/components/ui/SmartAmountInput';
```

### Basic Usage

```jsx
import { SmartAmountInput } from '@/components/ui/SmartAmountInput';

function MyForm() {
  const [amount, setAmount] = useState(null);

  return (
    <SmartAmountInput
      value={amount}
      onChange={setAmount}
      placeholder="Enter amount (e.g., 50k)"
    />
  );
}
```

### With Currency Symbol

```jsx
<SmartAmountInput
  value={budget}
  onChange={setBudget}
  currency="USD"
  showCurrencySymbol
  placeholder="0.00"
/>
```

### With Validation

```jsx
<SmartAmountInput
  value={cost}
  onChange={setCost}
  min={0}
  max={1000000}
  onValidationError={(error) => console.log(error)}
/>
```

### Convenience Wrappers

```jsx
// Pre-configured for currency fields
<SmartCurrencyInput
  value={price}
  onChange={setPrice}
  currency="USD"
/>

// Pre-configured for budget fields (min=0, shows helper)
<SmartBudgetInput
  value={budget}
  onChange={setBudget}
/>
```

---

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| null` | - | Current numeric value |
| `onChange` | `function` | **Required** | Callback when value changes |
| `placeholder` | `string` | `"Enter amount (e.g., 10k)"` | Placeholder text |
| `disabled` | `boolean` | `false` | Disable the input |
| `required` | `boolean` | `false` | Mark as required |
| `min` | `number` | - | Minimum allowed value |
| `max` | `number` | - | Maximum allowed value |
| `step` | `number` | `0.01` | Step increment |
| `decimals` | `number` | `2` | Decimal places for display |
| `currency` | `string` | - | Currency code (e.g., "USD") |
| `showCurrencySymbol` | `boolean` | `false` | Show currency symbol prefix |
| `enableShorthand` | `boolean` | `true` | Enable shorthand conversion |
| `convertOnEnter` | `boolean` | `true` | Convert on Enter key |
| `convertOnBlur` | `boolean` | `true` | Convert on blur/tab |
| `showConversionHint` | `boolean` | `true` | Show hint when shorthand detected |
| `showShorthandHelper` | `boolean` | `false` | Show help tooltip button |
| `className` | `string` | - | Wrapper CSS classes |
| `inputClassName` | `string` | - | Input CSS classes |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Input size variant |
| `id` | `string` | - | Input ID |
| `name` | `string` | - | Input name |
| `onConversion` | `function` | - | Callback after shorthand conversion |
| `onValidationError` | `function` | - | Callback for validation errors |
| `ariaLabel` | `string` | - | Accessibility label |

---

## Utility Functions

The component uses utility functions that can be imported directly:

```javascript
import {
  parseShorthandAmount,
  formatToShorthand,
  formatWithSeparators,
  formatCurrency,
} from '@/utils/amountShorthand';
```

### parseShorthandAmount(input)

Parse a shorthand string to numeric value:

```javascript
parseShorthandAmount('10k')
// { value: 10000, wasShorthand: true, original: '10k' }

parseShorthandAmount('100')
// { value: 100, wasShorthand: false, original: '100' }
```

### formatToShorthand(value, options)

Format a number to shorthand notation:

```javascript
formatToShorthand(10000)        // "10K"
formatToShorthand(3500000)      // "3.5M"
formatToShorthand(500)          // "500" (below threshold)
```

### formatWithSeparators(value, options)

Format with thousand separators:

```javascript
formatWithSeparators(10000)     // "10,000.00"
formatWithSeparators(10000, { decimals: 0 })  // "10,000"
```

---

## React Hook

For custom implementations, use the hook directly:

```javascript
import { useAmountShorthand } from '@/hooks/useAmountShorthand';

function CustomInput() {
  const {
    displayValue,
    numericValue,
    inputProps,
    hasShorthand,
    conversionHint,
  } = useAmountShorthand({
    onChange: (value) => console.log(value),
  });

  return (
    <div>
      <input type="text" {...inputProps} />
      {hasShorthand && <span>{conversionHint}</span>}
    </div>
  );
}
```

---

## Theme Support

The component automatically adapts to dark/light theme:

- **Dark Mode (Default):** Dark backgrounds, light text
- **Light Mode:** Light backgrounds, dark text

No additional configuration needed - it uses the `ThemeContext` automatically.

---

## Accessibility

The component includes:

- Proper `aria-label` support
- `aria-invalid` for error states
- `aria-describedby` for hints and errors
- `role="status"` for live hints
- `role="alert"` for error messages
- Full keyboard navigation support

---

## Migration Guide

To replace existing number inputs with SmartAmountInput:

### Before

```jsx
<input
  type="number"
  step="0.01"
  value={budget}
  onChange={(e) => setBudget(parseFloat(e.target.value))}
  placeholder="Enter budget"
/>
```

### After

```jsx
<SmartAmountInput
  value={budget}
  onChange={setBudget}
  placeholder="Enter budget (e.g., 50k)"
/>
```

---

## Best Practices

1. **Always use for large amounts:** Budget, cost, price, and financial fields benefit most
2. **Show the helper:** For first-time users, enable `showShorthandHelper`
3. **Set reasonable limits:** Use `min` and `max` to prevent unrealistic values
4. **Provide feedback:** Use `onConversion` to show toast notifications if desired
5. **Consider currency:** Use `SmartCurrencyInput` for fields with currency context

---

## Troubleshooting

### Value not converting?

- Ensure `enableShorthand` is `true` (default)
- Check that the suffix is valid (k, t, m, b, tr)
- Press Enter or Tab to trigger conversion

### Validation errors?

- Check `min` and `max` constraints
- The `onValidationError` callback receives the error message

### Theme not applying?

- Ensure the component is wrapped in `ThemeProvider`
- The component must be inside the app's provider tree

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-28 | Initial release |

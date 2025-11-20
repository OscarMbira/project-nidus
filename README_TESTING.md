# Testing Guide

## Testing Framework Setup

This project uses **Vitest** (Vite-compatible testing framework) with **React Testing Library** for component testing.

## Installation

Dependencies are already included in `package.json`. Install them with:

```bash
npm install
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Structure

Tests are organized as follows:

```
src/
├── components/
│   ├── __tests__/
│   │   ├── RiskHeatMap.test.jsx
│   │   ├── RiskList.test.jsx
│   │   ├── IssueList.test.jsx
│   │   ├── QualityCriteria.test.jsx
│   │   └── MitigationPlan.test.jsx
├── utils/
│   ├── __tests__/
│   │   └── flowMetricsCalculator.test.js
└── test/
    ├── setup.js          # Test setup and mocks
    └── utils/
        └── testUtils.jsx # Test utilities
```

## Writing Tests

### Component Tests

Example component test:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Utility Function Tests

Example utility test:

```js
import { describe, it, expect } from 'vitest'
import { myFunction } from '../myFunction'

describe('myFunction', () => {
  it('returns expected value', () => {
    expect(myFunction('input')).toBe('expected')
  })
})
```

## Test Coverage Goals

- **Target:** 70%+ overall coverage
- **Critical paths:** 100% coverage
- **New components:** 60%+ coverage minimum

## Mocking

### Supabase Client

The Supabase client is automatically mocked in `src/test/setup.js`. You can override mocks in individual tests if needed.

### React Router

Use `BrowserRouter` wrapper for components that use routing:

```jsx
import { BrowserRouter } from 'react-router-dom'

render(
  <BrowserRouter>
    <MyComponent />
  </BrowserRouter>
)
```

## Best Practices

1. **Test user behavior, not implementation details**
2. **Use semantic queries** (getByRole, getByLabelText, etc.)
3. **Keep tests focused** - one assertion per test when possible
4. **Use descriptive test names** - describe what is being tested
5. **Mock external dependencies** - Supabase, APIs, etc.
6. **Test edge cases** - empty states, error states, null values

## CI/CD Integration

Tests should run automatically on:
- Every commit (via GitHub Actions or similar)
- Pull requests
- Before deployment

## Troubleshooting

### Tests failing with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check import paths are correct

### Tests timing out
- Check for infinite loops in components
- Ensure async operations are properly awaited
- Use `waitFor` for async updates

### Mock not working
- Ensure mocks are set up before imports
- Check mock paths match actual import paths
- Verify mock return values match expected structure


/**
 * Unit tests for SmartAmountInput component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartAmountInput, SmartCurrencyInput, SmartBudgetInput } from '../SmartAmountInput';
import { ThemeProvider } from '../../../context/ThemeContext';

// Wrapper component with ThemeProvider
const TestWrapper = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

// Helper to render with theme
const renderWithTheme = (ui) => {
  return render(ui, { wrapper: TestWrapper });
};

describe('SmartAmountInput', () => {
  describe('rendering', () => {
    it('renders with default placeholder', () => {
      renderWithTheme(<SmartAmountInput onChange={() => {}} />);
      expect(screen.getByPlaceholderText(/enter amount/i)).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      renderWithTheme(
        <SmartAmountInput onChange={() => {}} placeholder="Custom placeholder" />
      );
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('renders with initial value', () => {
      renderWithTheme(<SmartAmountInput value={10000} onChange={() => {}} />);
      expect(screen.getByDisplayValue('10,000.00')).toBeInTheDocument();
    });

    it('renders disabled state', () => {
      renderWithTheme(<SmartAmountInput disabled onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('renders with currency symbol', () => {
      renderWithTheme(
        <SmartAmountInput
          currency="USD"
          showCurrencySymbol
          onChange={() => {}}
        />
      );
      expect(screen.getByText('$')).toBeInTheDocument();
    });
  });

  describe('shorthand conversion', () => {
    it('converts k suffix on Enter', async () => {
      const onChange = vi.fn();
      renderWithTheme(<SmartAmountInput onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '10k');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(10000);
      });
    });

    it('converts K suffix (uppercase)', async () => {
      const onChange = vi.fn();
      renderWithTheme(<SmartAmountInput onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '10K');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(10000);
      });
    });

    it('converts t suffix to thousands', async () => {
      const onChange = vi.fn();
      renderWithTheme(<SmartAmountInput onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '5t');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(5000);
      });
    });

    it('converts m suffix to millions', async () => {
      const onChange = vi.fn();
      renderWithTheme(<SmartAmountInput onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '3m');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(3000000);
      });
    });

    it('converts b suffix to billions', async () => {
      const onChange = vi.fn();
      renderWithTheme(<SmartAmountInput onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '2b');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(2000000000);
      });
    });

    it('supports decimal shorthand values', async () => {
      const onChange = vi.fn();
      renderWithTheme(<SmartAmountInput onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '1.5k');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(1500);
      });
    });

    it('converts on blur when convertOnBlur is true', async () => {
      const onChange = vi.fn();
      renderWithTheme(<SmartAmountInput onChange={onChange} convertOnBlur />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '10k');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(10000);
      });
    });

    it('does not convert when enableShorthand is false', async () => {
      const onChange = vi.fn();
      renderWithTheme(<SmartAmountInput onChange={onChange} enableShorthand={false} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '10k');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        // Should not have converted to 10000
        expect(onChange).not.toHaveBeenCalledWith(10000);
      });
    });
  });

  describe('regular number handling', () => {
    it('handles regular integer input', async () => {
      const onChange = vi.fn();
      renderWithTheme(<SmartAmountInput onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '500');

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(500);
      });
    });

    it('handles decimal input', async () => {
      const onChange = vi.fn();
      renderWithTheme(<SmartAmountInput onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '100.50');

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(100.5);
      });
    });

    it('handles clearing input', async () => {
      const onChange = vi.fn();
      renderWithTheme(<SmartAmountInput value={1000} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.clear(input);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('validation', () => {
    it('shows error for value below min', async () => {
      const onValidationError = vi.fn();
      renderWithTheme(
        <SmartAmountInput
          onChange={() => {}}
          min={100}
          onValidationError={onValidationError}
        />
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '50');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onValidationError).toHaveBeenCalled();
      });
    });

    it('shows error for value above max', async () => {
      const onValidationError = vi.fn();
      renderWithTheme(
        <SmartAmountInput
          onChange={() => {}}
          max={1000}
          onValidationError={onValidationError}
        />
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '5000');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onValidationError).toHaveBeenCalled();
      });
    });
  });

  describe('conversion hint', () => {
    it('shows conversion hint when shorthand detected', async () => {
      renderWithTheme(
        <SmartAmountInput onChange={() => {}} showConversionHint />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await userEvent.type(input, '10k');

      await waitFor(() => {
        expect(screen.getByText(/press enter/i)).toBeInTheDocument();
      });
    });

    it('does not show hint when showConversionHint is false', async () => {
      renderWithTheme(
        <SmartAmountInput onChange={() => {}} showConversionHint={false} />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      await userEvent.type(input, '10k');

      await waitFor(() => {
        expect(screen.queryByText(/press enter/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('callbacks', () => {
    it('calls onConversion when shorthand is converted', async () => {
      const onConversion = vi.fn();
      renderWithTheme(
        <SmartAmountInput onChange={() => {}} onConversion={onConversion} />
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '10k');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onConversion).toHaveBeenCalledWith('10k', 10000);
      });
    });
  });

  describe('size variants', () => {
    it('renders small size', () => {
      renderWithTheme(<SmartAmountInput onChange={() => {}} size="sm" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('text-sm');
    });

    it('renders medium size (default)', () => {
      renderWithTheme(<SmartAmountInput onChange={() => {}} size="md" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('text-base');
    });

    it('renders large size', () => {
      renderWithTheme(<SmartAmountInput onChange={() => {}} size="lg" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('text-lg');
    });
  });

  describe('accessibility', () => {
    it('has proper aria-label', () => {
      renderWithTheme(
        <SmartAmountInput onChange={() => {}} ariaLabel="Budget amount" />
      );
      expect(screen.getByLabelText('Budget amount')).toBeInTheDocument();
    });

    it('sets aria-invalid when there is an error', async () => {
      renderWithTheme(
        <SmartAmountInput onChange={() => {}} min={100} />
      );

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '50');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });
});

describe('SmartCurrencyInput', () => {
  it('renders with currency symbol by default', () => {
    renderWithTheme(<SmartCurrencyInput currency="USD" onChange={() => {}} />);
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('respects currency prop', () => {
    renderWithTheme(<SmartCurrencyInput currency="EUR" onChange={() => {}} />);
    expect(screen.getByText('€')).toBeInTheDocument();
  });
});

describe('SmartBudgetInput', () => {
  it('renders with budget-specific placeholder', () => {
    renderWithTheme(<SmartBudgetInput onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/budget/i)).toBeInTheDocument();
  });

  it('has min=0 by default', async () => {
    const onValidationError = vi.fn();
    renderWithTheme(
      <SmartBudgetInput onChange={() => {}} onValidationError={onValidationError} />
    );

    const input = screen.getByRole('textbox');
    await userEvent.type(input, '-100');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onValidationError).toHaveBeenCalled();
    });
  });
});

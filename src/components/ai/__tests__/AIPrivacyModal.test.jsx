/**
 * Unit tests for AIPrivacyModal (Phase 4.2 — first-time privacy disclosure)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AIPrivacyModal from '../AIPrivacyModal';

describe('AIPrivacyModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <AIPrivacyModal open={false} mode="claude" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when open is true', () => {
    render(
      <AIPrivacyModal open={true} mode="claude" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Data privacy disclosure/i)).toBeInTheDocument();
  });

  it('shows Anthropic for claude mode', () => {
    render(
      <AIPrivacyModal open={true} mode="claude" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText(/Anthropic/)).toBeInTheDocument();
  });

  it('shows Google for gemini mode', () => {
    render(
      <AIPrivacyModal open={true} mode="gemini" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText(/Google/)).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(
      <AIPrivacyModal open={true} mode="claude" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when I accept is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <AIPrivacyModal open={true} mode="claude" onConfirm={onConfirm} onCancel={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /I accept/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

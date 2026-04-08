/**
 * Quality Activity Entry Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import QualityActivityEntry from '../quality/QualityActivityEntry';

describe('QualityActivityEntry', () => {
  const mockActivity = {
    activity_identifier: 'QA-2026-0001',
    product_title: 'Test Product',
    product_identifier: 'PPD-001',
    quality_method: 'Technical Review',
    result: 'passed',
    planned_date: '2026-02-01',
    forecast_date: '2026-02-01',
    actual_date: '2026-02-01',
    sign_off_planned_date: '2026-02-03',
    sign_off_forecast_date: '2026-02-03',
    sign_off_actual_date: '2026-02-03',
    is_reassessment: false,
    project_name: 'Test Project',
    programme_name: 'Test Programme'
  };

  it('should render activity identifier', () => {
    render(<QualityActivityEntry activity={mockActivity} />);
    
    expect(screen.getByText('QA-2026-0001')).toBeInTheDocument();
  });

  it('should render product information', () => {
    render(<QualityActivityEntry activity={mockActivity} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('PPD-001')).toBeInTheDocument();
  });

  it('should display reassessment indicator', () => {
    const reassessmentActivity = { ...mockActivity, is_reassessment: true };
    render(<QualityActivityEntry activity={reassessmentActivity} />);
    
    expect(screen.getByText(/Reassessment/i)).toBeInTheDocument();
  });

  it('should display result status', () => {
    render(<QualityActivityEntry activity={mockActivity} />);
    
    expect(screen.getByText(/Passed/i)).toBeInTheDocument();
  });

  it('should format dates correctly', () => {
    render(<QualityActivityEntry activity={mockActivity} />);
    
    // Check that dates are formatted (not raw ISO strings)
    const dateElements = screen.getAllByText(/\d{2} \w{3} \d{4}/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('should call onView when view button clicked', () => {
    const mockOnView = vi.fn();
    render(<QualityActivityEntry activity={mockActivity} onView={mockOnView} />);
    
    const viewButton = screen.getByText(/View Full Details/i);
    viewButton.click();
    
    expect(mockOnView).toHaveBeenCalledWith('details');
  });

  it('should handle missing optional fields', () => {
    const minimalActivity = {
      activity_identifier: 'QA-2026-0001',
      product_title: 'Test Product'
    };

    render(<QualityActivityEntry activity={minimalActivity} />);
    
    expect(screen.getByText('QA-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });
});

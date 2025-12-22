// src/components/common/__tests__/LoadingStates.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import LoadingSpinner from '../LoadingSpinner';
import {
  LoadingOverlay,
  CameraSkeleton,
  MapSkeleton,
} from '../LoadingStates';

describe('LoadingSpinner', () => {
  it('should render spinner with default props', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByLabelText('Loading...');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should render spinner with custom size', () => {
    render(<LoadingSpinner size="large" />);

    const spinner = screen.getByLabelText('Loading...');
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('should render spinner with custom color', () => {
    render(<LoadingSpinner color="blue" />);

    const spinner = screen.getByLabelText('Loading...');
    expect(spinner).toHaveClass('border-blue-400');
  });

  it('should render spinner with custom text', () => {
    render(<LoadingSpinner text="Processing..." />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });


});

describe('LoadingOverlay', () => {
  it('should render overlay when loading is true', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div data-testid="child-content">Child content</div>
      </LoadingOverlay>
    );

    expect(screen.getByLabelText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should not render overlay when loading is false', () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div data-testid="child-content">Child content</div>
      </LoadingOverlay>
    );

    expect(screen.queryByLabelText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('should render custom loading message', () => {
    render(
      <LoadingOverlay isLoading={true} message="Processing data...">
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Processing data...')).toBeInTheDocument();
  });

  it('should blur children when blur is true', () => {
    render(
      <LoadingOverlay isLoading={true} blur={true}>
        <div data-testid="child-content">Child content</div>
      </LoadingOverlay>
    );

    const childContent = screen.getByTestId('child-content').parentElement;
    expect(childContent).toHaveClass('blur-sm');
  });

  it('should not blur children when blur is false', () => {
    render(
      <LoadingOverlay isLoading={true} blur={false}>
        <div data-testid="child-content">Child content</div>
      </LoadingOverlay>
    );

    const childContent = screen.getByTestId('child-content').parentElement;
    expect(childContent).not.toHaveClass('blur-sm');
  });

  it('should apply custom className', () => {
    render(
      <LoadingOverlay isLoading={true} className="custom-class">
        <div>Content</div>
      </LoadingOverlay>
    );

    const container = screen.getByLabelText('Loading...').closest('.custom-class');
    expect(container).toBeInTheDocument();
  });
});

describe('CameraSkeleton', () => {
  it('should render camera skeleton with default props', () => {
    render(<CameraSkeleton />);

    const skeleton = screen.getByTestId('camera-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('bg-gray-800', 'rounded-lg');
  });

  it('should render with custom className', () => {
    render(<CameraSkeleton className="custom-camera-class" />);

    const skeleton = screen.getByTestId('camera-skeleton');
    expect(skeleton).toHaveClass('custom-camera-class');
  });

  it('should show camera info placeholder', () => {
    render(<CameraSkeleton />);

    // Should have placeholder elements for camera info
    const placeholders = screen.getAllByRole('generic');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('should show bounding box placeholders', () => {
    render(<CameraSkeleton />);

    // Should have animated pulse elements
    const animatedElements = document.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });
});

describe('MapSkeleton', () => {
  it('should render map skeleton', () => {
    render(<MapSkeleton />);

    const skeleton = screen.getByTestId('map-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('bg-gray-700', 'rounded-lg');
  });

  it('should render with custom className', () => {
    render(<MapSkeleton className="custom-map-class" />);

    const skeleton = screen.getByTestId('map-skeleton');
    expect(skeleton).toHaveClass('custom-map-class');
  });

  it('should show map placeholder content', () => {
    render(<MapSkeleton />);

    expect(screen.getByText('🗺️')).toBeInTheDocument();
    expect(screen.getByText('Loading Map...')).toBeInTheDocument();
  });
});
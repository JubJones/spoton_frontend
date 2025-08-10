// src/components/common/__tests__/LoadingStates.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  LoadingSpinner,
  LoadingOverlay,
  CameraSkeleton,
  MapSkeleton,
  TrackingSkeleton,
  ChartSkeleton,
  TableSkeleton,
  ButtonSkeleton,
  ListSkeleton,
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

  it('should render centered spinner', () => {
    render(<LoadingSpinner centered />);
    
    const container = screen.getByLabelText('Loading...').parentElement;
    expect(container).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('should not show text when showText is false', () => {
    render(<LoadingSpinner text="Loading..." showText={false} />);
    
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
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

describe('TrackingSkeleton', () => {
  it('should render tracking skeleton', () => {
    render(<TrackingSkeleton />);
    
    const skeleton = screen.getByTestId('tracking-skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<TrackingSkeleton className="custom-tracking-class" />);
    
    const skeleton = screen.getByTestId('tracking-skeleton');
    expect(skeleton).toHaveClass('custom-tracking-class');
  });

  it('should show tracking data placeholders', () => {
    render(<TrackingSkeleton />);
    
    // Should have multiple animated elements representing tracking data
    const animatedElements = document.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(2);
  });
});

describe('ChartSkeleton', () => {
  it('should render chart skeleton', () => {
    render(<ChartSkeleton />);
    
    const skeleton = screen.getByTestId('chart-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('bg-gray-800', 'rounded-lg');
  });

  it('should render with custom height', () => {
    render(<ChartSkeleton height="300px" />);
    
    const skeleton = screen.getByTestId('chart-skeleton');
    expect(skeleton).toHaveStyle({ height: '300px' });
  });

  it('should show chart placeholder', () => {
    render(<ChartSkeleton />);
    
    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('Loading Chart...')).toBeInTheDocument();
  });
});

describe('TableSkeleton', () => {
  it('should render table skeleton with default rows', () => {
    render(<TableSkeleton />);
    
    const skeleton = screen.getByTestId('table-skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('should render custom number of rows', () => {
    render(<TableSkeleton rows={3} />);
    
    const skeleton = screen.getByTestId('table-skeleton');
    // Should have 3 rows plus header row
    const rows = skeleton.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('should render custom number of columns', () => {
    render(<TableSkeleton columns={4} />);
    
    const skeleton = screen.getByTestId('table-skeleton');
    const firstRow = skeleton.querySelector('tbody tr');
    const cells = firstRow?.querySelectorAll('td');
    expect(cells).toHaveLength(4);
  });

  it('should show table headers', () => {
    render(<TableSkeleton />);
    
    const headerRow = screen.getByTestId('table-skeleton').querySelector('thead tr');
    expect(headerRow).toBeInTheDocument();
    
    const headerCells = headerRow?.querySelectorAll('th');
    expect(headerCells?.length).toBeGreaterThan(0);
  });
});

describe('ButtonSkeleton', () => {
  it('should render button skeleton', () => {
    render(<ButtonSkeleton />);
    
    const skeleton = screen.getByTestId('button-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('bg-gray-600', 'rounded');
  });

  it('should render with custom width', () => {
    render(<ButtonSkeleton width="200px" />);
    
    const skeleton = screen.getByTestId('button-skeleton');
    expect(skeleton).toHaveStyle({ width: '200px' });
  });

  it('should render with custom height', () => {
    render(<ButtonSkeleton height="50px" />);
    
    const skeleton = screen.getByTestId('button-skeleton');
    expect(skeleton).toHaveStyle({ height: '50px' });
  });

  it('should render with custom className', () => {
    render(<ButtonSkeleton className="custom-button-class" />);
    
    const skeleton = screen.getByTestId('button-skeleton');
    expect(skeleton).toHaveClass('custom-button-class');
  });
});

describe('ListSkeleton', () => {
  it('should render list skeleton with default items', () => {
    render(<ListSkeleton />);
    
    const skeleton = screen.getByTestId('list-skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('should render custom number of items', () => {
    render(<ListSkeleton items={3} />);
    
    const skeleton = screen.getByTestId('list-skeleton');
    const listItems = skeleton.querySelectorAll('li');
    expect(listItems).toHaveLength(3);
  });

  it('should render with custom className', () => {
    render(<ListSkeleton className="custom-list-class" />);
    
    const skeleton = screen.getByTestId('list-skeleton');
    expect(skeleton).toHaveClass('custom-list-class');
  });

  it('should show animated placeholder items', () => {
    render(<ListSkeleton items={2} />);
    
    const animatedElements = document.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it('should render list items with varied widths for natural appearance', () => {
    render(<ListSkeleton items={3} />);
    
    const skeleton = screen.getByTestId('list-skeleton');
    const listItems = skeleton.querySelectorAll('li');
    
    // Check that items have different width classes
    const widthClasses = Array.from(listItems).map(item => 
      Array.from(item.classList).find(cls => cls.includes('w-'))
    );
    
    // Should have varied widths (not all the same)
    const uniqueWidths = new Set(widthClasses);
    expect(uniqueWidths.size).toBeGreaterThan(1);
  });
});
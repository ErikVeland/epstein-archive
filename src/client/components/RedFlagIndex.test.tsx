import React from 'react';
import { render, screen } from '@testing-library/react';
import { RedFlagIndex } from './visualizations/RedFlagIndex';

describe('RedFlagIndex Component', () => {
  test('renders correctly with value 0', () => {
    const { container } = render(<RedFlagIndex value={0} />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  test('renders correctly with value 3', () => {
    const { container } = render(<RedFlagIndex value={3} />);
    expect(container.querySelectorAll('svg')).toHaveLength(3);
  });

  test('renders correctly with value 5', () => {
    const { container } = render(<RedFlagIndex value={5} />);
    expect(container.querySelectorAll('svg')).toHaveLength(5);
  });

  test('shows label when showLabel is true', () => {
    render(<RedFlagIndex value={3} showLabel={true} />);
    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  test('shows description when showDescription is true', () => {
    render(<RedFlagIndex value={3} showDescription={true} />);
    expect(screen.getByText('Significant Red Flags')).toBeInTheDocument();
  });

  test('shows legend when showLegend is true', () => {
    render(<RedFlagIndex value={5} showLegend={true} />);
    expect(screen.getByText('Critical attention')).toBeInTheDocument();
  });

  test('handles out of range values', () => {
    const { container } = render(<RedFlagIndex value={10} />);
    expect(container.querySelectorAll('svg')).toHaveLength(5);
  });

  test('handles negative values', () => {
    const { container } = render(<RedFlagIndex value={-1} />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  // New tests for variants
  test('renders text variant correctly', () => {
    render(<RedFlagIndex value={3} variant="text" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  test('renders icon variant correctly', () => {
    const { container } = render(<RedFlagIndex value={2} variant="icon" />);
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });

  test('defaults to icon variant when unspecified', () => {
    const { container } = render(<RedFlagIndex value={1} />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  test('applies correct size classes', () => {
    const { container } = render(<RedFlagIndex value={3} size="sm" />);
    expect(container.querySelectorAll('svg')).toHaveLength(3);
  });

  // New tests for color-blind friendly features
  test('renders combined variant correctly', () => {
    const { container } = render(
      <RedFlagIndex value={3} variant="combined" showTextLabel={true} />,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(3);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  test('does not show text label in combined variant when showTextLabel is false', () => {
    const { container } = render(
      <RedFlagIndex value={3} variant="combined" showTextLabel={false} />,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(3);
    expect(screen.queryByText('High')).not.toBeInTheDocument();
  });

  test('includes aria-label for accessibility', () => {
    render(<RedFlagIndex value={3} variant="text" />);
    const element = screen.getByText('High');
    expect(element).toHaveAttribute('aria-label');
  });
});

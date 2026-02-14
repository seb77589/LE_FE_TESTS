/**
 * Tests for ChartContainer component
 *
 * @description Tests for the ChartContainer wrapper component including:
 * - Loading state rendering
 * - Initialization state handling
 * - Dimension detection
 * - Deferred rendering via createRenderScheduler
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import {
  ChartContainer,
  ChartLoadingSpinner,
  createRenderScheduler,
} from '@/components/admin/charts/ChartContainer';

// Mock the useChartContainer hook
jest.mock('@/hooks/useChartContainer', () => ({
  useChartContainer: jest.fn(),
}));

import { useChartContainer } from '@/hooks/useChartContainer';

const mockUseChartContainer = useChartContainer as jest.MockedFunction<
  typeof useChartContainer
>;

describe('ChartLoadingSpinner', () => {
  it('should render with default message', () => {
    render(<ChartLoadingSpinner />);

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<ChartLoadingSpinner message="Loading data..." />);

    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should apply custom height', () => {
    const { container } = render(<ChartLoadingSpinner height="500px" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ height: '500px' });
  });

  it('should render spinner animation', () => {
    const { container } = render(<ChartLoadingSpinner />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});

describe('ChartContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading spinner when isLoading is true', () => {
    mockUseChartContainer.mockReturnValue({
      containerRef: { current: null },
      hasValidDimensions: true,
      renderKey: 1,
      isMounted: true,
    });

    render(
      <ChartContainer isLoading={true}>
        {({ renderKey }) => <div data-testid="chart-content">{renderKey}</div>}
      </ChartContainer>,
    );

    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-content')).not.toBeInTheDocument();
  });

  it('should render custom loading message', () => {
    mockUseChartContainer.mockReturnValue({
      containerRef: { current: null },
      hasValidDimensions: true,
      renderKey: 1,
      isMounted: true,
    });

    render(
      <ChartContainer isLoading={true} loadingMessage="Fetching data...">
        {({ renderKey }) => <div data-testid="chart-content">{renderKey}</div>}
      </ChartContainer>,
    );

    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('should render initializing state when not mounted', () => {
    mockUseChartContainer.mockReturnValue({
      containerRef: { current: null },
      hasValidDimensions: false,
      renderKey: 1,
      isMounted: false,
    });

    render(
      <ChartContainer>
        {({ renderKey }) => <div data-testid="chart-content">{renderKey}</div>}
      </ChartContainer>,
    );

    expect(screen.getByText('Initializing chart...')).toBeInTheDocument();
  });

  it('should render initializing state when dimensions are invalid', () => {
    mockUseChartContainer.mockReturnValue({
      containerRef: { current: null },
      hasValidDimensions: false,
      renderKey: 1,
      isMounted: true,
    });

    render(
      <ChartContainer>
        {({ renderKey }) => <div data-testid="chart-content">{renderKey}</div>}
      </ChartContainer>,
    );

    expect(screen.getByText('Initializing chart...')).toBeInTheDocument();
  });

  it('should render children when mounted and has valid dimensions', () => {
    mockUseChartContainer.mockReturnValue({
      containerRef: { current: null },
      hasValidDimensions: true,
      renderKey: 42,
      isMounted: true,
    });

    render(
      <ChartContainer>
        {({ renderKey }) => <div data-testid="chart-content">{renderKey}</div>}
      </ChartContainer>,
    );

    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    expect(screen.getByTestId('chart-content')).toHaveTextContent('wrapper-42');
  });

  it('should apply custom height', () => {
    mockUseChartContainer.mockReturnValue({
      containerRef: { current: null },
      hasValidDimensions: true,
      renderKey: 1,
      isMounted: true,
    });

    const { container } = render(
      <ChartContainer height="400px">
        {({ renderKey }) => <div data-testid="chart-content">{renderKey}</div>}
      </ChartContainer>,
    );

    const chartWrapper = container.firstChild as HTMLElement;
    expect(chartWrapper).toHaveStyle({ height: '400px', minHeight: '400px' });
  });

  it('should pass custom dimensions to useChartContainer', () => {
    mockUseChartContainer.mockReturnValue({
      containerRef: { current: null },
      hasValidDimensions: true,
      renderKey: 1,
      isMounted: true,
    });

    render(
      <ChartContainer minWidth={300} minHeight={350}>
        {({ renderKey }) => <div data-testid="chart-content">{renderKey}</div>}
      </ChartContainer>,
    );

    expect(mockUseChartContainer).toHaveBeenCalledWith({
      minWidth: 300,
      minHeight: 350,
    });
  });

  it('should render custom initializing message', () => {
    mockUseChartContainer.mockReturnValue({
      containerRef: { current: null },
      hasValidDimensions: false,
      renderKey: 1,
      isMounted: true,
    });

    render(
      <ChartContainer initializingMessage="Setting up...">
        {({ renderKey }) => <div data-testid="chart-content">{renderKey}</div>}
      </ChartContainer>,
    );

    expect(screen.getByText('Setting up...')).toBeInTheDocument();
  });
});

describe('createRenderScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create a scheduler function', () => {
    const callback = jest.fn();
    const scheduler = createRenderScheduler(callback);

    expect(typeof scheduler).toBe('function');
    expect(callback).not.toHaveBeenCalled();
  });

  it('should call callback after RAF chain and timeout', async () => {
    const callback = jest.fn();
    const scheduler = createRenderScheduler(callback);

    // Execute the scheduler
    scheduler();

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled();

    // Advance through the RAF chain
    await act(async () => {
      // First RAF
      jest.advanceTimersByTime(16);
      // Second RAF
      jest.advanceTimersByTime(16);
      // setTimeout(50)
      jest.advanceTimersByTime(50);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

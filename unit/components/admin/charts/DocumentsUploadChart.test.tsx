/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { DocumentsUploadChart } from '@/components/admin/charts/DocumentsUploadChart';

// Mock next/dynamic
jest.mock('next/dynamic', () => {
  return jest.fn().mockImplementation((fn: () => Promise<any>) => {
    // Return a simple component that wraps children
    const DynamicComponent = ({ children, ...props }: any) => (
      <div data-testid="responsive-container" {...props}>
        {children}
      </div>
    );
    return DynamicComponent;
  });
});

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children, ...props }: any) => (
    <div data-testid="responsive-container" {...props}>
      {children}
    </div>
  ),
  BarChart: ({ children, data, margin, ...props }: any) => (
    <div data-testid="bar-chart" data-length={data?.length} {...props}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill, radius, name, ...props }: any) => (
    <div
      data-testid="bar"
      data-datakey={dataKey}
      data-fill={fill}
      data-name={name}
      {...props}
    />
  ),
  XAxis: ({ dataKey, stroke, ...props }: any) => (
    <div data-testid="x-axis" data-datakey={dataKey} data-stroke={stroke} {...props} />
  ),
  YAxis: ({ stroke, ...props }: any) => (
    <div data-testid="y-axis" data-stroke={stroke} {...props} />
  ),
  CartesianGrid: ({ strokeDasharray, stroke, ...props }: any) => (
    <div
      data-testid="cartesian-grid"
      data-strokedasharray={strokeDasharray}
      data-stroke={stroke}
      {...props}
    />
  ),
  Tooltip: ({ contentStyle, cursor, ...props }: any) => (
    <div data-testid="tooltip" {...props} />
  ),
  Legend: ({ wrapperStyle, ...props }: any) => (
    <div data-testid="legend" {...props} />
  ),
}));

// Mock ChartContainer
const mockChartContainerRenderKey = 'test-key';
jest.mock('@/components/admin/charts/ChartContainer', () => ({
  ChartContainer: ({ isLoading, loadingMessage, children }: any) =>
    isLoading ? (
      <div data-testid="chart-loading">{loadingMessage || 'Loading...'}</div>
    ) : (
      <div data-testid="chart-container">{children(mockChartContainerRenderKey)}</div>
    ),
  createRenderScheduler: jest.fn((callback: () => void) => () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(callback, 50);
      });
    });
  }),
}));

describe('DocumentsUploadChart', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render without props using sample data', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('should render with custom data', async () => {
      const customData = [
        { date: 'Day 1', documents: 100 },
        { date: 'Day 2', documents: 200 },
      ];
      
      render(<DocumentsUploadChart data={customData} />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('should render loading state when isLoading is true', () => {
      render(<DocumentsUploadChart isLoading={true} />);
      
      expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
    });

    it('should not render loading state when isLoading is false', async () => {
      render(<DocumentsUploadChart isLoading={false} />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
    });

    it('should render BarChart component', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('should render bar with correct dataKey', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const bar = screen.getByTestId('bar');
        expect(bar).toHaveAttribute('data-datakey', 'documents');
      });
    });

    it('should render bar with correct fill color', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const bar = screen.getByTestId('bar');
        expect(bar).toHaveAttribute('data-fill', '#f59e0b');
      });
    });

    it('should render bar with correct name', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const bar = screen.getByTestId('bar');
        expect(bar).toHaveAttribute('data-name', 'Documents Uploaded');
      });
    });

    it('should render XAxis with date dataKey', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const xAxis = screen.getByTestId('x-axis');
        expect(xAxis).toHaveAttribute('data-datakey', 'date');
      });
    });

    it('should render YAxis', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      });
    });

    it('should render CartesianGrid', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      });
    });

    it('should render Tooltip', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      });
    });

    it('should render Legend', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('legend')).toBeInTheDocument();
      });
    });
  });

  describe('data handling', () => {
    it('should use sample data when data prop is undefined', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const barChart = screen.getByTestId('bar-chart');
        expect(barChart).toHaveAttribute('data-length', '7');
      });
    });

    it('should use provided data when data prop is defined', async () => {
      const customData = [
        { date: 'Jan', documents: 10 },
        { date: 'Feb', documents: 20 },
        { date: 'Mar', documents: 30 },
      ];
      
      render(<DocumentsUploadChart data={customData} />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const barChart = screen.getByTestId('bar-chart');
        expect(barChart).toHaveAttribute('data-length', '3');
      });
    });

    it('should handle empty data array', async () => {
      render(<DocumentsUploadChart data={[]} />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const barChart = screen.getByTestId('bar-chart');
        expect(barChart).toHaveAttribute('data-length', '0');
      });
    });

    it('should handle data with varying document counts', async () => {
      const customData = [
        { date: 'A', documents: 0 },
        { date: 'B', documents: 1000 },
        { date: 'C', documents: 500 },
      ];
      
      render(<DocumentsUploadChart data={customData} />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });
  });

  describe('ChartWrapper deferred rendering', () => {
    it('should not render chart immediately', () => {
      render(<DocumentsUploadChart />);
      
      // Before timers run, ChartWrapper should not render the chart
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    it('should render chart after RAF chain completes', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });
  });

  describe('props', () => {
    it('should accept readonly data prop', async () => {
      const readonlyData: readonly { date: string; documents: number }[] = [
        { date: 'Mon', documents: 45 },
      ];
      
      render(<DocumentsUploadChart data={readonlyData as any} />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('should handle isLoading prop changes', async () => {
      const { rerender } = render(<DocumentsUploadChart isLoading={true} />);
      
      expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
      
      rerender(<DocumentsUploadChart isLoading={false} />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should render XAxis with correct stroke color', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const xAxis = screen.getByTestId('x-axis');
        expect(xAxis).toHaveAttribute('data-stroke', '#6b7280');
      });
    });

    it('should render YAxis with correct stroke color', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const yAxis = screen.getByTestId('y-axis');
        expect(yAxis).toHaveAttribute('data-stroke', '#6b7280');
      });
    });

    it('should render CartesianGrid with correct stroke dasharray', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const grid = screen.getByTestId('cartesian-grid');
        expect(grid).toHaveAttribute('data-strokedasharray', '3 3');
      });
    });

    it('should render CartesianGrid with correct stroke color', async () => {
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const grid = screen.getByTestId('cartesian-grid');
        expect(grid).toHaveAttribute('data-stroke', '#e5e7eb');
      });
    });
  });

  describe('sample data', () => {
    it('should have correct sample data values', async () => {
      // Access the module to verify sample data exists
      // This tests that the component can work standalone with sample data
      render(<DocumentsUploadChart />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      await waitFor(() => {
        const barChart = screen.getByTestId('bar-chart');
        // Sample data has 7 days (Mon-Sun)
        expect(barChart).toHaveAttribute('data-length', '7');
      });
    });
  });
});

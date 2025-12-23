/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { UsersOverTimeChart } from '@/components/admin/charts/UsersOverTimeChart';

// Mock next/dynamic
jest.mock('next/dynamic', () => {
  return jest.fn().mockImplementation((fn: () => Promise<any>) => {
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
  LineChart: ({ children, data, margin, ...props }: any) => (
    <div data-testid="line-chart" data-length={data?.length} {...props}>
      {children}
    </div>
  ),
  Line: ({
    type,
    dataKey,
    stroke,
    strokeWidth,
    dot,
    activeDot,
    name,
    ...props
  }: any) => (
    <div
      data-testid={`line-${dataKey}`}
      data-type={type}
      data-datakey={dataKey}
      data-stroke={stroke}
      data-strokewidth={strokeWidth}
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
  Tooltip: ({ contentStyle, ...props }: any) => (
    <div data-testid="tooltip" {...props} />
  ),
  Legend: ({ wrapperStyle, ...props }: any) => <div data-testid="legend" {...props} />,
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

describe('UsersOverTimeChart', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render without props using sample data', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('should render with custom data', async () => {
      const customData = [
        { date: 'Q1', users: 100, activeUsers: 80 },
        { date: 'Q2', users: 200, activeUsers: 160 },
      ];

      render(<UsersOverTimeChart data={customData} />);

      await act(async () => {
        jest.runAllTimers();
      });

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('should render loading state when isLoading is true', () => {
      render(<UsersOverTimeChart isLoading={true} />);

      expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
    });

    it('should not render loading state when isLoading is false', async () => {
      render(<UsersOverTimeChart isLoading={false} />);

      await act(async () => {
        jest.runAllTimers();
      });

      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
    });

    it('should render LineChart component', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should render two Line components', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-users')).toBeInTheDocument();
        expect(screen.getByTestId('line-activeUsers')).toBeInTheDocument();
      });
    });

    it('should render XAxis with date dataKey', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const xAxis = screen.getByTestId('x-axis');
        expect(xAxis).toHaveAttribute('data-datakey', 'date');
      });
    });

    it('should render YAxis', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      });
    });

    it('should render CartesianGrid', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      });
    });

    it('should render Tooltip', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      });
    });

    it('should render Legend', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('legend')).toBeInTheDocument();
      });
    });
  });

  describe('users line properties', () => {
    it('should render users line with correct dataKey', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const usersLine = screen.getByTestId('line-users');
        expect(usersLine).toHaveAttribute('data-datakey', 'users');
      });
    });

    it('should render users line with correct stroke color (blue)', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const usersLine = screen.getByTestId('line-users');
        expect(usersLine).toHaveAttribute('data-stroke', '#3b82f6');
      });
    });

    it('should render users line with correct name', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const usersLine = screen.getByTestId('line-users');
        expect(usersLine).toHaveAttribute('data-name', 'Total Users');
      });
    });

    it('should render users line with monotone type', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const usersLine = screen.getByTestId('line-users');
        expect(usersLine).toHaveAttribute('data-type', 'monotone');
      });
    });

    it('should render users line with correct stroke width', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const usersLine = screen.getByTestId('line-users');
        expect(usersLine).toHaveAttribute('data-strokewidth', '2');
      });
    });
  });

  describe('activeUsers line properties', () => {
    it('should render activeUsers line with correct dataKey', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const activeUsersLine = screen.getByTestId('line-activeUsers');
        expect(activeUsersLine).toHaveAttribute('data-datakey', 'activeUsers');
      });
    });

    it('should render activeUsers line with correct stroke color (green)', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const activeUsersLine = screen.getByTestId('line-activeUsers');
        expect(activeUsersLine).toHaveAttribute('data-stroke', '#10b981');
      });
    });

    it('should render activeUsers line with correct name', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const activeUsersLine = screen.getByTestId('line-activeUsers');
        expect(activeUsersLine).toHaveAttribute('data-name', 'Active Users');
      });
    });

    it('should render activeUsers line with monotone type', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const activeUsersLine = screen.getByTestId('line-activeUsers');
        expect(activeUsersLine).toHaveAttribute('data-type', 'monotone');
      });
    });

    it('should render activeUsers line with correct stroke width', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const activeUsersLine = screen.getByTestId('line-activeUsers');
        expect(activeUsersLine).toHaveAttribute('data-strokewidth', '2');
      });
    });
  });

  describe('data handling', () => {
    it('should use sample data when data prop is undefined', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const lineChart = screen.getByTestId('line-chart');
        expect(lineChart).toHaveAttribute('data-length', '6');
      });
    });

    it('should use provided data when data prop is defined', async () => {
      const customData = [
        { date: 'Jan', users: 10, activeUsers: 8 },
        { date: 'Feb', users: 20, activeUsers: 16 },
        { date: 'Mar', users: 30, activeUsers: 24 },
        { date: 'Apr', users: 40, activeUsers: 32 },
      ];

      render(<UsersOverTimeChart data={customData} />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const lineChart = screen.getByTestId('line-chart');
        expect(lineChart).toHaveAttribute('data-length', '4');
      });
    });

    it('should handle empty data array', async () => {
      render(<UsersOverTimeChart data={[]} />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const lineChart = screen.getByTestId('line-chart');
        expect(lineChart).toHaveAttribute('data-length', '0');
      });
    });

    it('should handle data with varying user counts', async () => {
      const customData = [
        { date: 'A', users: 0, activeUsers: 0 },
        { date: 'B', users: 10000, activeUsers: 5000 },
        { date: 'C', users: 500, activeUsers: 250 },
      ];

      render(<UsersOverTimeChart data={customData} />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should handle data where activeUsers equals users', async () => {
      const customData = [
        { date: 'Jan', users: 100, activeUsers: 100 },
        { date: 'Feb', users: 200, activeUsers: 200 },
      ];

      render(<UsersOverTimeChart data={customData} />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should handle data with zero activeUsers', async () => {
      const customData = [
        { date: 'Jan', users: 100, activeUsers: 0 },
        { date: 'Feb', users: 200, activeUsers: 0 },
      ];

      render(<UsersOverTimeChart data={customData} />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });

  describe('ChartWrapper deferred rendering', () => {
    it('should not render chart immediately', () => {
      render(<UsersOverTimeChart />);

      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('should render chart after RAF chain completes', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });

  describe('props', () => {
    it('should accept readonly data prop', async () => {
      const readonlyData: readonly {
        date: string;
        users: number;
        activeUsers: number;
      }[] = [{ date: 'Jan', users: 100, activeUsers: 80 }];

      render(<UsersOverTimeChart data={readonlyData as any} />);

      await act(async () => {
        jest.runAllTimers();
      });

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('should handle isLoading prop changes', async () => {
      const { rerender } = render(<UsersOverTimeChart isLoading={true} />);

      expect(screen.getByTestId('chart-loading')).toBeInTheDocument();

      rerender(<UsersOverTimeChart isLoading={false} />);

      await act(async () => {
        jest.runAllTimers();
      });

      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
    });

    it('should default isLoading to false', async () => {
      render(<UsersOverTimeChart />);

      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should render XAxis with correct stroke color', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const xAxis = screen.getByTestId('x-axis');
        expect(xAxis).toHaveAttribute('data-stroke', '#6b7280');
      });
    });

    it('should render YAxis with correct stroke color', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const yAxis = screen.getByTestId('y-axis');
        expect(yAxis).toHaveAttribute('data-stroke', '#6b7280');
      });
    });

    it('should render CartesianGrid with correct stroke dasharray', async () => {
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const grid = screen.getByTestId('cartesian-grid');
        expect(grid).toHaveAttribute('data-strokedasharray', '3 3');
      });
    });

    it('should render CartesianGrid with correct stroke color', async () => {
      render(<UsersOverTimeChart />);

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
      render(<UsersOverTimeChart />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const lineChart = screen.getByTestId('line-chart');
        // Sample data has 6 months (Jan-Jun)
        expect(lineChart).toHaveAttribute('data-length', '6');
      });
    });
  });
});

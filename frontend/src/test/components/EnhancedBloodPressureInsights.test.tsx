import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EnhancedBloodPressureInsights from '../../components/EnhancedBloodPressureInsights';
import { HealthData } from '../../types/health';

// Mock Recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const mockBloodPressureData: HealthData[] = [
  {
    id: 1,
    metric_type: 'blood_pressure',
    value: 120,
    systolic: 120,
    diastolic: 80,
    unit: 'mmHg',
    recorded_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    user_id: 1,
    notes: null,
    additional_data: null,
  },
  {
    id: 2,
    metric_type: 'blood_pressure',
    value: 140,
    systolic: 140,
    diastolic: 90,
    unit: 'mmHg',
    recorded_at: '2024-01-16T10:00:00Z',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
    user_id: 1,
    notes: null,
    additional_data: null,
  },
  {
    id: 3,
    metric_type: 'blood_pressure',
    value: 180,
    systolic: 180,
    diastolic: 110,
    unit: 'mmHg',
    recorded_at: '2024-01-17T10:00:00Z',
    created_at: '2024-01-17T10:00:00Z',
    updated_at: '2024-01-17T10:00:00Z',
    user_id: 1,
    notes: null,
    additional_data: null,
  },
];

describe('EnhancedBloodPressureInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with empty data', () => {
    render(<EnhancedBloodPressureInsights data={[]} />);
    expect(screen.getByText('Enhanced Blood Pressure Insights')).toBeInTheDocument();
  });

  it('displays blood pressure categories correctly', async () => {
    render(<EnhancedBloodPressureInsights data={mockBloodPressureData} />);

    await waitFor(() => {
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('High Blood Pressure Stage 1')).toBeInTheDocument();
      expect(screen.getByText('High Blood Pressure Stage 2')).toBeInTheDocument();
    });
  });

  it('shows clinical categorization with correct counts', async () => {
    render(<EnhancedBloodPressureInsights data={mockBloodPressureData} />);

    await waitFor(() => {
      // Should show distribution of readings across categories
      expect(screen.getByText(/Normal/)).toBeInTheDocument();
      expect(screen.getByText(/High Blood Pressure/)).toBeInTheDocument();
    });
  });

  it('renders chart components', () => {
    render(<EnhancedBloodPressureInsights data={mockBloodPressureData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('displays trend analysis for improving readings', async () => {
    const improvingData = [
      { ...mockBloodPressureData[0], systolic: 150, diastolic: 95 },
      { ...mockBloodPressureData[1], systolic: 140, diastolic: 88 },
      { ...mockBloodPressureData[2], systolic: 125, diastolic: 82 },
    ];

    render(<EnhancedBloodPressureInsights data={improvingData} />);

    await waitFor(() => {
      expect(screen.getByText(/trending/i)).toBeInTheDocument();
    });
  });

  it('displays trend analysis for worsening readings', async () => {
    const worseningData = [
      { ...mockBloodPressureData[0], systolic: 120, diastolic: 80 },
      { ...mockBloodPressureData[1], systolic: 140, diastolic: 90 },
      { ...mockBloodPressureData[2], systolic: 160, diastolic: 100 },
    ];

    render(<EnhancedBloodPressureInsights data={worseningData} />);

    await waitFor(() => {
      expect(screen.getByText(/trending/i)).toBeInTheDocument();
    });
  });

  it('shows average readings calculation', async () => {
    render(<EnhancedBloodPressureInsights data={mockBloodPressureData} />);

    await waitFor(() => {
      // Should calculate and display average systolic and diastolic
      expect(screen.getByText(/Average/i)).toBeInTheDocument();
    });
  });

  it('displays health recommendations based on readings', async () => {
    render(<EnhancedBloodPressureInsights data={mockBloodPressureData} />);

    await waitFor(() => {
      // Should show recommendations for high BP readings
      expect(screen.getByText(/Recommendations/i)).toBeInTheDocument();
    });
  });

  it('handles missing systolic/diastolic values gracefully', () => {
    const incompleteData = [
      {
        ...mockBloodPressureData[0],
        systolic: null,
        diastolic: null,
      },
    ];

    render(<EnhancedBloodPressureInsights data={incompleteData} />);

    expect(screen.getByText('Enhanced Blood Pressure Insights')).toBeInTheDocument();
  });

  it('shows time-based analysis for recent readings', async () => {
    const recentData = mockBloodPressureData.map((item, index) => ({
      ...item,
      recorded_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
    }));

    render(<EnhancedBloodPressureInsights data={recentData} />);

    await waitFor(() => {
      expect(screen.getByText(/Recent/i)).toBeInTheDocument();
    });
  });

  it('displays risk assessment for dangerous readings', async () => {
    const dangerousData = [
      {
        ...mockBloodPressureData[0],
        systolic: 200,
        diastolic: 120,
      },
    ];

    render(<EnhancedBloodPressureInsights data={dangerousData} />);

    await waitFor(() => {
      expect(screen.getByText(/Crisis/i)).toBeInTheDocument();
    });
  });
});
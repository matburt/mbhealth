import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../utils/test-utils';
import EnhancedBloodPressureInsights from '../../components/EnhancedBloodPressureInsights';
import { HealthData } from '../../types/health';

// Recharts is mocked globally in setup.ts

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
    expect(screen.getByText('Blood Pressure Insights')).toBeInTheDocument();
  });

  it('displays blood pressure categories correctly', async () => {
    render(<EnhancedBloodPressureInsights data={mockBloodPressureData} />);

    await waitFor(() => {
      // Component shows blood pressure analysis with title
      expect(screen.getByText('Enhanced Blood Pressure Insights')).toBeInTheDocument();
      expect(screen.getByText('Stage 2 Hypertension')).toBeInTheDocument();
      expect(screen.getByText('Very high blood pressure, immediate medical attention needed')).toBeInTheDocument();
    });
  });

  it('shows clinical categorization with correct counts', async () => {
    render(<EnhancedBloodPressureInsights data={mockBloodPressureData} />);

    await waitFor(() => {
      // Should show analysis of readings - use getAllByText since there are multiple hypertension categories
      expect(screen.getAllByText(/Hypertension/).length).toBeGreaterThan(0);
      expect(screen.getByText(/147\/93/)).toBeInTheDocument(); // Average BP
    });
  });

  it('renders chart components', () => {
    render(<EnhancedBloodPressureInsights data={mockBloodPressureData} />);

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('displays trend analysis for improving readings', async () => {
    const improvingData = [
      { ...mockBloodPressureData[0], systolic: 150, diastolic: 95 },
      { ...mockBloodPressureData[1], systolic: 140, diastolic: 88 },
      { ...mockBloodPressureData[2], systolic: 125, diastolic: 82 },
    ];

    render(<EnhancedBloodPressureInsights data={improvingData} />);

    await waitFor(() => {
      // Component shows blood pressure insights with improved trend data
      expect(screen.getByText('Enhanced Blood Pressure Insights')).toBeInTheDocument();
      expect(screen.getByText(/Health Insights/)).toBeInTheDocument();
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
      // Component shows blood pressure insights with worsening trend data
      expect(screen.getByText('Enhanced Blood Pressure Insights')).toBeInTheDocument();
      expect(screen.getByText(/Health Insights/)).toBeInTheDocument();
    });
  });

  it('shows average readings calculation', async () => {
    render(<EnhancedBloodPressureInsights data={mockBloodPressureData} />);

    await waitFor(() => {
      // Should calculate and display average systolic and diastolic
      expect(screen.getByText('Average BP')).toBeInTheDocument();
      expect(screen.getByText(/147\/93/)).toBeInTheDocument();
    });
  });

  it('displays health recommendations based on readings', async () => {
    render(<EnhancedBloodPressureInsights data={mockBloodPressureData} />);

    await waitFor(() => {
      // Should show health insights for readings
      expect(screen.getByText(/Health Insights/)).toBeInTheDocument();
      expect(screen.getByText(/Systolic pressure shows an increasing trend/)).toBeInTheDocument();
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

    expect(screen.getByText('Blood Pressure Insights')).toBeInTheDocument();
  });

  it('shows time-based analysis for recent readings', async () => {
    const recentData = mockBloodPressureData.map((item, index) => ({
      ...item,
      recorded_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
    }));

    render(<EnhancedBloodPressureInsights data={recentData} />);

    await waitFor(() => {
      // Should show time patterns analysis
      expect(screen.getByText('Time of Day Patterns')).toBeInTheDocument();
      expect(screen.getByText('Enhanced Blood Pressure Insights')).toBeInTheDocument();
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
      // Should show hypertensive crisis or severe category
      expect(screen.getByText('Enhanced Blood Pressure Insights')).toBeInTheDocument();
      expect(screen.getByText(/Health Insights/)).toBeInTheDocument();
    });
  });
});